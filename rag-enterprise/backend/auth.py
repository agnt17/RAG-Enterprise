from jose import JWTError, jwt         # JWT = JSON Web Token (a signed proof of identity)
from passlib.context import CryptContext  # handles password hashing
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from sqlalchemy.orm import Session
from database import get_db, User
import os, uuid

# ── PASSWORD HASHING ───────────────────────────────────────
# bcrypt = slow hashing algorithm specifically designed for passwords
# "slow" is good — it stops brute force attacks
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ── JWT TOKENS ─────────────────────────────────────────────
# JWT = three base64 parts separated by dots
# Header.Payload.Signature
# Payload contains user info, Signature proves nobody tampered with it
JWT_SECRET    = os.getenv("JWT_SECRET", "change-this-in-production")
JWT_ALGORITHM = "HS256"       # HMAC SHA-256 — the signing algorithm
JWT_EXPIRY    = 60 * 24 * 7  # 7 days in minutes

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,        # "sub" = subject = who this token is for
        "email": email,
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRY)  # expiry time
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

# ── AUTH DEPENDENCY ────────────────────────────────────────
# This is what protects your endpoints
# Add `current_user = Depends(get_current_user)` to any route
# FastAPI will automatically reject requests without a valid token
bearer = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
) -> User:
    token   = credentials.credentials     # extract token from "Bearer <token>"
    payload = decode_token(token)
    user    = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ── GOOGLE OAUTH VERIFICATION ──────────────────────────────
def verify_google_token(id_token_str: str) -> dict:
    # Google gives the frontend a token after user signs in
    # We verify it's actually from Google (not forged)
    try:
        info = id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            os.getenv("GOOGLE_CLIENT_ID")
        )
        return info  # contains: email, name, picture, sub (google user id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")

# ── USER HELPERS ───────────────────────────────────────────
def get_or_create_google_user(db: Session, google_info: dict) -> User:
    # Check if user already exists
    user = db.query(User).filter(User.email == google_info["email"]).first()
    if user:
        user.last_login = datetime.utcnow()
        db.commit()
        return user
    # Create new user from Google data
    user = User(
        id        = str(uuid.uuid4()),
        email     = google_info["email"],
        name      = google_info.get("name"),
        picture   = google_info.get("picture"),
        google_id = google_info.get("sub"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user