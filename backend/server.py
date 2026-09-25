from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import bcrypt
import jwt
import stripe
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import (
    FastAPI, APIRouter, Request, Response, HTTPException, Depends,
    UploadFile, File, Form,
)
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
from bson.errors import InvalidId
from gridfs.errors import NoFile

# ------------------------------------------------------------------ DB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")
stripe.api_key = STRIPE_API_KEY

# ------------------------------------------------------------------ Object storage (GridFS, in the same MongoDB)
fs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="assets")
MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif",
    "webp": "image/webp", "pdf": "application/pdf", "zip": "application/zip",
    "mp4": "video/mp4", "mov": "video/quicktime", "csv": "text/csv", "txt": "text/plain",
}

async def put_object(filename: str, data: bytes, content_type: str) -> str:
    file_id = await fs_bucket.upload_from_stream(
        filename, data, metadata={"content_type": content_type},
    )
    return str(file_id)

async def get_object(file_id: str):
    try:
        stream = await fs_bucket.open_download_stream(ObjectId(file_id))
    except (InvalidId, NoFile):
        raise HTTPException(status_code=404, detail="File not found")
    data = await stream.read()
    content_type = (stream.metadata or {}).get("content_type", "application/octet-stream")
    return data, content_type

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------ Catalog (server-side)
CATALOG = {
    "indicator_pro": {
        "id": "indicator_pro",
        "name": "Techin Momentum Indicator",
        "type": "indicator",
        "amount": 5499.0,
        "currency": "inr",
        "tagline": "The signature multi-timeframe trading indicator, designed by Raj.",
    },
    "course_beginner": {
        "id": "course_beginner",
        "name": "Beginner Trader Course",
        "type": "course",
        "amount": 2999.0,
        "currency": "inr",
        "tagline": "Foundations of price action, risk & psychology for new traders.",
    },
    "course_pro": {
        "id": "course_pro",
        "name": "Pro Trader Masterclass",
        "type": "course",
        "amount": 7999.0,
        "currency": "inr",
        "tagline": "Advanced strategies, live setups and the Techin edge for pros.",
    },
}

# ------------------------------------------------------------------ Password / JWT
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ------------------------------------------------------------------ Schemas
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class CheckoutInput(BaseModel):
    package_id: str
    origin_url: str

# ------------------------------------------------------------------ Auth routes
def public_user(user: dict) -> dict:
    return {"id": str(user.get("_id", user.get("id"))), "name": user["name"],
            "email": user["email"], "role": user.get("role", "user"),
            "purchases": user.get("purchases", [])}

@api_router.post("/auth/register")
async def register(input: RegisterInput, response: Response):
    email = input.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {"name": input.name, "email": email,
           "password_hash": hash_password(input.password), "role": "user",
           "purchases": [], "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    set_auth_cookie(response, create_access_token(str(res.inserted_id), email))
    return public_user(doc)

@api_router.post("/auth/login")
async def login(input: LoginInput, request: Request, response: Response):
    email = input.email.lower()
    fwd = request.headers.get("x-forwarded-for", "")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")
    identifier = f"{ip}:{email}"
    now = datetime.now(timezone.utc)

    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("locked_until"):
        locked_until = datetime.fromisoformat(attempt["locked_until"])
        if locked_until > now:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in a few minutes.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input.password, user["password_hash"]):
        count = (attempt.get("count", 0) if attempt else 0) + 1
        update = {"count": count, "updated_at": now.isoformat()}
        if count >= 5:
            update["locked_until"] = (now + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    set_auth_cookie(response, create_access_token(str(user["_id"]), email))
    return public_user(user)

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"status": "ok"}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)

# ------------------------------------------------------------------ Catalog routes
@api_router.get("/products")
async def products():
    return list(CATALOG.values())

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def asset_public(a: dict) -> dict:
    return {"id": a["id"], "package_id": a["package_id"], "title": a["title"],
            "original_filename": a["original_filename"], "content_type": a["content_type"],
            "size": a["size"], "created_at": a["created_at"]}

@api_router.post("/admin/products/{package_id}/assets")
async def upload_asset(package_id: str, title: str = Form(...), file: UploadFile = File(...),
                       admin: dict = Depends(require_admin)):
    if package_id not in CATALOG:
        raise HTTPException(status_code=404, detail="Product not found")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    data = await file.read()
    content_type = file.content_type or MIME_TYPES.get(ext, "application/octet-stream")
    file_id = await put_object(file.filename, data, content_type)
    doc = {"id": str(uuid.uuid4()), "package_id": package_id, "title": title,
           "storage_id": file_id, "original_filename": file.filename,
           "content_type": content_type, "size": len(data),
           "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.product_assets.insert_one(doc)
    return asset_public(doc)

@api_router.get("/admin/products/{package_id}/assets")
async def list_assets_admin(package_id: str, admin: dict = Depends(require_admin)):
    docs = await db.product_assets.find({"package_id": package_id, "is_deleted": False}).to_list(1000)
    return [asset_public(d) for d in docs]

@api_router.delete("/admin/assets/{asset_id}")
async def delete_asset(asset_id: str, admin: dict = Depends(require_admin)):
    await db.product_assets.update_one({"id": asset_id}, {"$set": {"is_deleted": True}})
    return {"status": "ok"}

@api_router.get("/my/library")
async def my_library(user: dict = Depends(get_current_user)):
    """Owned products with their downloadable assets."""
    owned_ids = user.get("purchases", [])
    result = []
    for pid in owned_ids:
        if pid not in CATALOG:
            continue
        docs = await db.product_assets.find({"package_id": pid, "is_deleted": False}).to_list(1000)
        result.append({"product": CATALOG[pid], "assets": [asset_public(d) for d in docs]})
    return result

@api_router.get("/assets/{asset_id}/download")
async def download_asset(asset_id: str, user: dict = Depends(get_current_user)):
    record = await db.product_assets.find_one({"id": asset_id, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="Asset not found")
    owns = record["package_id"] in user.get("purchases", [])
    if not owns and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You don't own this product")
    data, content_type = await get_object(record["storage_id"])
    return Response(content=data, media_type=record.get("content_type", content_type),
                    headers={"Content-Disposition": f'attachment; filename="{record["original_filename"]}"'})

# ------------------------------------------------------------------ Payments
def _map_session_status(session) -> str:
    """Map a Stripe Checkout Session to our internal payment_status vocabulary."""
    if session.get("payment_status") == "paid":
        return "paid"
    if session.get("status") == "expired":
        return "expired"
    return "pending"

@api_router.post("/payments/checkout")
async def checkout(input: CheckoutInput, request: Request, user: dict = Depends(get_current_user)):
    pkg = CATALOG.get(input.package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Product not found")
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Payments are not configured (missing STRIPE_API_KEY)")
    success_url = f"{input.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{input.origin_url}/payment/cancel"
    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": pkg["currency"],
                    "unit_amount": round(pkg["amount"] * 100),
                    "product_data": {"name": pkg["name"]},
                },
                "quantity": 1,
            }],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": user["id"], "package_id": pkg["id"]},
        )
    except stripe.error.StripeError as e:
        logger.warning(f"checkout create error: {e}")
        raise HTTPException(status_code=502, detail="Could not start checkout")
    await db.payment_transactions.insert_one({
        "session_id": session.id, "user_id": user["id"],
        "package_id": pkg["id"], "amount": pkg["amount"], "currency": pkg["currency"],
        "status": "initiated", "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.id}

async def _fulfill(record: dict):
    """Grant the purchased package to the user (idempotent)."""
    await db.users.update_one(
        {"_id": ObjectId(record["user_id"])},
        {"$addToSet": {"purchases": record["package_id"]}},
    )

async def _apply_status(session_id: str, record: dict, new_status: str):
    if new_status == record.get("payment_status"):
        return record
    upd = await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed" if new_status == "paid" else new_status,
                  "payment_status": new_status,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if upd.modified_count and new_status == "paid" and record.get("user_id"):
        await _fulfill(record)
    return await db.payment_transactions.find_one({"session_id": session_id})

@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    record = await db.payment_transactions.find_one({"session_id": session_id})
    if not record:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if record.get("payment_status") != "paid" and STRIPE_API_KEY:
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            mapped = _map_session_status(session)
            if mapped != "pending":
                record = await _apply_status(session_id, record, mapped)
        except stripe.error.StripeError as e:
            logger.warning(f"status poll error: {e}")
    return {"session_id": record["session_id"], "status": record["status"],
            "payment_status": record["payment_status"], "package_id": record.get("package_id")}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook is not configured (missing STRIPE_WEBHOOK_SECRET)")
    try:
        event = stripe.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.warning(f"webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook error")

    if event["type"] in ("checkout.session.completed", "checkout.session.async_payment_succeeded",
                          "checkout.session.expired"):
        session = event["data"]["object"]
        record = await db.payment_transactions.find_one({"session_id": session["id"]})
        if record:
            await _apply_status(session["id"], record, _map_session_status(session))
    return {"status": "ok"}

# ------------------------------------------------------------------ Startup
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"name": "Raj", "email": admin_email,
            "password_hash": hash_password(admin_pw), "role": "admin",
            "purchases": [], "created_at": datetime.now(timezone.utc).isoformat()})
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_pw)}})

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o for o in os.environ.get("FRONTEND_URL", "").split(",") if o] or ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
