from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest, CheckoutStatusResponse,
)

# ------------------------------------------------------------------ DB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")

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
async def login(input: LoginInput, response: Response):
    email = input.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
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

# ------------------------------------------------------------------ Payments
@api_router.post("/payments/checkout")
async def checkout(input: CheckoutInput, request: Request, user: dict = Depends(get_current_user)):
    pkg = CATALOG.get(input.package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Product not found")
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    success_url = f"{input.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{input.origin_url}/payment/cancel"
    req = CheckoutSessionRequest(
        amount=pkg["amount"], currency=pkg["currency"],
        success_url=success_url, cancel_url=cancel_url,
        metadata={"user_id": user["id"], "package_id": pkg["id"]},
    )
    session = await stripe_checkout.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id, "user_id": user["id"],
        "package_id": pkg["id"], "amount": pkg["amount"], "currency": pkg["currency"],
        "status": "initiated", "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.session_id}

async def _fulfill(record: dict):
    """Grant the purchased package to the user (idempotent)."""
    await db.users.update_one(
        {"_id": ObjectId(record["user_id"])},
        {"$addToSet": {"purchases": record["package_id"]}},
    )

@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    record = await db.payment_transactions.find_one({"session_id": session_id})
    if not record:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if record.get("payment_status") != "paid":
        try:
            stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
            status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
            if status.payment_status == "paid":
                upd = await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid",
                              "updated_at": datetime.now(timezone.utc).isoformat()}},
                )
                if upd.modified_count and record.get("user_id"):
                    await _fulfill(record)
                record = await db.payment_transactions.find_one({"session_id": session_id})
        except Exception as e:
            logger.warning(f"status poll error: {e}")
    return {"session_id": record["session_id"], "status": record["status"],
            "payment_status": record["payment_status"], "package_id": record.get("package_id")}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        wh = await stripe_checkout.handle_webhook(body, sig)
    except Exception as e:
        logger.warning(f"webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook error")
    if wh.payment_status == "paid":
        record = await db.payment_transactions.find_one({"session_id": wh.session_id})
        if record:
            upd = await db.payment_transactions.update_one(
                {"session_id": wh.session_id, "payment_status": {"$ne": "paid"}},
                {"$set": {"status": "completed", "payment_status": "paid",
                          "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            if upd.modified_count and record.get("user_id"):
                await _fulfill(record)
    return {"status": "ok"}

# ------------------------------------------------------------------ Startup
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
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
