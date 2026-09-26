from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import json
import logging
import uuid
import bcrypt
import jwt
import razorpay
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import (
    FastAPI, APIRouter, Request, Response, HTTPException, Depends,
    UploadFile, File, Form,
)
from fastapi.responses import StreamingResponse
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
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET")
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID or "", RAZORPAY_KEY_SECRET or ""))

# ------------------------------------------------------------------ Object storage (GridFS, in the same MongoDB)
fs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="assets")
MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif",
    "webp": "image/webp", "pdf": "application/pdf", "zip": "application/zip",
    "mp4": "video/mp4", "mov": "video/quicktime", "webm": "video/webm", "mkv": "video/x-matroska",
    "m4v": "video/x-m4v", "csv": "text/csv", "txt": "text/plain",
}

STREAM_CHUNK = 1024 * 1024

async def put_upload(file: UploadFile):
    """Stream an upload into GridFS without loading it fully into memory. Returns (id, type, size)."""
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    content_type = file.content_type or MIME_TYPES.get(ext, "application/octet-stream")
    if content_type == "application/octet-stream":
        content_type = MIME_TYPES.get(ext, content_type)
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    file_id = await fs_bucket.upload_from_stream(
        file.filename, file.file, metadata={"content_type": content_type},
    )
    return str(file_id), content_type, size

async def delete_object(file_id: str):
    try:
        await fs_bucket.delete(ObjectId(file_id))
    except (InvalidId, NoFile):
        pass

async def open_object(file_id: str):
    try:
        return await fs_bucket.open_download_stream(ObjectId(file_id))
    except (InvalidId, NoFile):
        raise HTTPException(status_code=404, detail="File not found")

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

class VerifyInput(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

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
            "description": a.get("description", ""), "position": a.get("position", 0),
            "original_filename": a["original_filename"], "content_type": a["content_type"],
            "is_video": a["content_type"].startswith("video/"),
            "size": a["size"], "created_at": a["created_at"], "updated_at": a.get("updated_at")}

async def list_package_assets(package_id: str) -> list:
    docs = await db.product_assets.find({"package_id": package_id, "is_deleted": False}) \
        .sort([("position", 1), ("created_at", 1)]).to_list(1000)
    return [asset_public(d) for d in docs]

async def get_asset_or_404(asset_id: str) -> dict:
    record = await db.product_assets.find_one({"id": asset_id, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="Asset not found")
    return record

# ---- Admin: content (videos & files)
class AssetUpdateInput(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = None
    package_id: Optional[str] = None

class ReorderInput(BaseModel):
    asset_ids: List[str]

@api_router.post("/admin/products/{package_id}/assets")
async def upload_asset(package_id: str, title: str = Form(...), description: str = Form(""),
                       file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    if package_id not in CATALOG:
        raise HTTPException(status_code=404, detail="Product not found")
    file_id, content_type, size = await put_upload(file)
    last = await db.product_assets.find_one({"package_id": package_id, "is_deleted": False},
                                            sort=[("position", -1)])
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": str(uuid.uuid4()), "package_id": package_id, "title": title,
           "description": description, "position": (last or {}).get("position", -1) + 1,
           "storage_id": file_id, "original_filename": file.filename,
           "content_type": content_type, "size": size,
           "is_deleted": False, "created_at": now, "updated_at": now}
    await db.product_assets.insert_one(doc)
    return asset_public(doc)

@api_router.get("/admin/products/{package_id}/assets")
async def list_assets_admin(package_id: str, admin: dict = Depends(require_admin)):
    return await list_package_assets(package_id)

@api_router.patch("/admin/assets/{asset_id}")
async def update_asset(asset_id: str, input: AssetUpdateInput, admin: dict = Depends(require_admin)):
    record = await get_asset_or_404(asset_id)
    changes = input.model_dump(exclude_none=True)
    if "package_id" in changes and changes["package_id"] not in CATALOG:
        raise HTTPException(status_code=404, detail="Product not found")
    changes["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.product_assets.update_one({"id": asset_id}, {"$set": changes})
    return asset_public({**record, **changes})

@api_router.put("/admin/assets/{asset_id}/file")
async def replace_asset_file(asset_id: str, file: UploadFile = File(...),
                             admin: dict = Depends(require_admin)):
    """Swap the video/file behind an asset, keeping its title, order and buyers' access."""
    record = await get_asset_or_404(asset_id)
    file_id, content_type, size = await put_upload(file)
    changes = {"storage_id": file_id, "original_filename": file.filename,
               "content_type": content_type, "size": size,
               "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.product_assets.update_one({"id": asset_id}, {"$set": changes})
    await delete_object(record["storage_id"])
    return asset_public({**record, **changes})

@api_router.post("/admin/products/{package_id}/assets/reorder")
async def reorder_assets(package_id: str, input: ReorderInput, admin: dict = Depends(require_admin)):
    for i, aid in enumerate(input.asset_ids):
        await db.product_assets.update_one({"id": aid, "package_id": package_id}, {"$set": {"position": i}})
    return await list_package_assets(package_id)

@api_router.delete("/admin/assets/{asset_id}")
async def delete_asset(asset_id: str, admin: dict = Depends(require_admin)):
    record = await get_asset_or_404(asset_id)
    await db.product_assets.update_one({"id": asset_id}, {"$set": {"is_deleted": True}})
    await delete_object(record["storage_id"])
    return {"status": "ok"}

# ---- Admin: users & access
class UserUpdateInput(BaseModel):
    role: Optional[str] = Field(default=None, pattern="^(user|admin)$")
    purchases: Optional[List[str]] = None
    name: Optional[str] = Field(default=None, min_length=1)

def admin_user_view(u: dict) -> dict:
    return {**public_user(u), "created_at": u.get("created_at")}

@api_router.get("/admin/users")
async def list_users(q: str = "", admin: dict = Depends(require_admin)):
    query = {}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query = {"$or": [{"email": rx}, {"name": rx}]}
    docs = await db.users.find(query, {"password_hash": 0}).sort("created_at", -1).to_list(1000)
    return [admin_user_view(u) for u in docs]

async def get_user_or_404(user_id: str) -> dict:
    u = await db.users.find_one({"_id": ObjectId(user_id)}) if ObjectId.is_valid(user_id) else None
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u

@api_router.patch("/admin/users/{user_id}")
async def update_user(user_id: str, input: UserUpdateInput, admin: dict = Depends(require_admin)):
    target = await get_user_or_404(user_id)
    changes = input.model_dump(exclude_none=True)
    if user_id == admin["id"] and changes.get("role") == "user":
        raise HTTPException(status_code=400, detail="You can't remove your own admin access")
    if "purchases" in changes:
        unknown = [p for p in changes["purchases"] if p not in CATALOG]
        if unknown:
            raise HTTPException(status_code=400, detail=f"Unknown product: {', '.join(unknown)}")
        changes["purchases"] = list(dict.fromkeys(changes["purchases"]))
    if changes:
        await db.users.update_one({"_id": target["_id"]}, {"$set": changes})
    return admin_user_view({**target, **changes})

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    target = await get_user_or_404(user_id)
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You can't delete your own account")
    await db.users.delete_one({"_id": target["_id"]})
    return {"status": "ok"}

# ---- Admin: payments & overview
@api_router.get("/admin/payments")
async def list_payments(admin: dict = Depends(require_admin)):
    docs = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    oids = list({ObjectId(d["user_id"]) for d in docs if ObjectId.is_valid(d.get("user_id") or "")})
    users = {str(u["_id"]): u for u in await db.users.find({"_id": {"$in": oids}}).to_list(None)}
    for d in docs:
        u = users.get(d.get("user_id"))
        d["user_email"] = u["email"] if u else None
        d["user_name"] = u["name"] if u else None
        d["product_name"] = CATALOG.get(d.get("package_id"), {}).get("name", d.get("package_id"))
    return docs

@api_router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    paid = await db.payment_transactions.find({"payment_status": "paid"}, {"amount": 1}).to_list(None)
    per_product = {}
    for pid in CATALOG:
        per_product[pid] = {
            "buyers": await db.users.count_documents({"purchases": pid}),
            "assets": await db.product_assets.count_documents({"package_id": pid, "is_deleted": False}),
        }
    return {
        "users": await db.users.count_documents({}),
        "admins": await db.users.count_documents({"role": "admin"}),
        "paid_orders": len(paid),
        "revenue": sum(p.get("amount", 0) for p in paid),
        "videos": await db.product_assets.count_documents(
            {"is_deleted": False, "content_type": {"$regex": "^video/"}}),
        "files": await db.product_assets.count_documents({"is_deleted": False}),
        "per_product": per_product,
    }

# ---- Customer library, streaming & downloads
@api_router.get("/my/library")
async def my_library(user: dict = Depends(get_current_user)):
    """Owned products with their assets. Admins see every product."""
    owned_ids = list(CATALOG) if user.get("role") == "admin" else user.get("purchases", [])
    result = []
    for pid in owned_ids:
        if pid not in CATALOG:
            continue
        result.append({"product": CATALOG[pid], "assets": await list_package_assets(pid)})
    return result

async def authorized_asset(asset_id: str, user: dict) -> dict:
    record = await get_asset_or_404(asset_id)
    owns = record["package_id"] in user.get("purchases", [])
    if not owns and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You don't own this product")
    return record

def parse_range(header: Optional[str], size: int):
    """Parse a single 'bytes=start-end' range. Returns (start, end), or None for a full response."""
    if not header or not header.startswith("bytes=") or size == 0:
        return None
    first, _, last = header[6:].split(",")[0].strip().partition("-")
    try:
        if first:
            start, end = int(first), int(last) if last else size - 1
        else:
            start, end = max(size - int(last), 0), size - 1
    except ValueError:
        return None
    end = min(end, size - 1)
    if start > end:
        raise HTTPException(status_code=416, detail="Range not satisfiable",
                            headers={"Content-Range": f"bytes */{size}"})
    return start, end

async def stream_record(record: dict, request: Request, disposition: str):
    grid_out = await open_object(record["storage_id"])
    size = grid_out.length
    rng = parse_range(request.headers.get("range"), size)
    start, end = rng if rng else (0, size - 1)
    if start:
        grid_out.seek(start)

    async def body():
        remaining = end - start + 1
        while remaining > 0:
            chunk = await grid_out.read(min(STREAM_CHUNK, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk

    filename = record["original_filename"].replace('"', "")
    headers = {"Accept-Ranges": "bytes", "Content-Length": str(max(end - start + 1, 0)),
               "Content-Disposition": f'{disposition}; filename="{filename}"',
               "Cache-Control": "private, no-store"}
    if rng:
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"
    return StreamingResponse(body(), status_code=206 if rng else 200,
                             media_type=record.get("content_type"), headers=headers)

@api_router.get("/assets/{asset_id}/stream")
async def stream_asset(asset_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Range-enabled playback for the in-browser video player."""
    return await stream_record(await authorized_asset(asset_id, user), request, "inline")

@api_router.get("/assets/{asset_id}/download")
async def download_asset(asset_id: str, request: Request, user: dict = Depends(get_current_user)):
    return await stream_record(await authorized_asset(asset_id, user), request, "attachment")

# ------------------------------------------------------------------ Payments
@api_router.post("/payments/checkout")
async def checkout(input: CheckoutInput, user: dict = Depends(get_current_user)):
    pkg = CATALOG.get(input.package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Product not found")
    if not (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET):
        raise HTTPException(status_code=500, detail="Payments are not configured (missing Razorpay keys)")
    amount_paise = round(pkg["amount"] * 100)
    try:
        order = razorpay_client.order.create({
            "amount": amount_paise,
            "currency": pkg["currency"].upper(),
            "receipt": f"rcpt_{uuid.uuid4().hex[:20]}",
            "notes": {"user_id": user["id"], "package_id": pkg["id"]},
        })
    except razorpay.errors.BadRequestError as e:
        logger.warning(f"checkout create error: {e}")
        raise HTTPException(status_code=502, detail="Could not start checkout")
    await db.payment_transactions.insert_one({
        "order_id": order["id"], "user_id": user["id"],
        "package_id": pkg["id"], "amount": pkg["amount"], "currency": pkg["currency"],
        "status": "initiated", "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "order_id": order["id"], "amount": amount_paise, "currency": pkg["currency"].upper(),
        "key_id": RAZORPAY_KEY_ID, "name": pkg["name"], "package_id": pkg["id"],
    }

async def _fulfill(record: dict):
    """Grant the purchased package to the user (idempotent)."""
    await db.users.update_one(
        {"_id": ObjectId(record["user_id"])},
        {"$addToSet": {"purchases": record["package_id"]}},
    )

async def _apply_status(order_id: str, record: dict, new_status: str):
    if new_status == record.get("payment_status"):
        return record
    upd = await db.payment_transactions.update_one(
        {"order_id": order_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed" if new_status == "paid" else new_status,
                  "payment_status": new_status,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if upd.modified_count and new_status == "paid" and record.get("user_id"):
        await _fulfill(record)
    return await db.payment_transactions.find_one({"order_id": order_id})

@api_router.post("/payments/verify")
async def verify_payment(input: VerifyInput, user: dict = Depends(get_current_user)):
    """Called by the frontend right after Razorpay's checkout modal reports success."""
    record = await db.payment_transactions.find_one({"order_id": input.razorpay_order_id})
    if not record:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if record.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Not your transaction")
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": input.razorpay_order_id,
            "razorpay_payment_id": input.razorpay_payment_id,
            "razorpay_signature": input.razorpay_signature,
        })
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Payment verification failed")
    record = await _apply_status(input.razorpay_order_id, record, "paid")
    return {"status": "ok", "package_id": record.get("package_id")}

@api_router.get("/payments/status/{order_id}")
async def payment_status(order_id: str):
    record = await db.payment_transactions.find_one({"order_id": order_id})
    if not record:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if record.get("payment_status") != "paid" and RAZORPAY_KEY_ID:
        try:
            order = razorpay_client.order.fetch(order_id)
            if order.get("status") == "paid":
                record = await _apply_status(order_id, record, "paid")
        except razorpay.errors.BadRequestError as e:
            logger.warning(f"status poll error: {e}")
    return {"order_id": record["order_id"], "status": record["status"],
            "payment_status": record["payment_status"], "package_id": record.get("package_id")}

@api_router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    if not RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook is not configured (missing RAZORPAY_WEBHOOK_SECRET)")
    try:
        razorpay_client.utility.verify_webhook_signature(body.decode("utf-8"), sig, RAZORPAY_WEBHOOK_SECRET)
    except razorpay.errors.SignatureVerificationError as e:
        logger.warning(f"webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook error")

    payload = json.loads(body)
    event = payload.get("event")
    if event in ("payment.captured", "order.paid"):
        entity = (payload.get("payload", {}).get("payment", {}).get("entity")
                  or payload.get("payload", {}).get("order", {}).get("entity"))
        order_id = (entity or {}).get("order_id") or (entity or {}).get("id")
        if order_id:
            record = await db.payment_transactions.find_one({"order_id": order_id})
            if record:
                await _apply_status(order_id, record, "paid")
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
