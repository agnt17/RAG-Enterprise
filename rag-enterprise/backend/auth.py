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
import re

# ── PASSWORD HASHING ───────────────────────────────────────
# Argon2 is a modern password hashing algorithm.
# Keep bcrypt as fallback so existing hashes remain valid.
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long."
        )
    if not re.search(r"[A-Za-z]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must include at least one letter."
        )
    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=400,
            detail="Password must include at least one number."
        )
    if not re.search(r"[^A-Za-z0-9]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must include at least one special character."
        )

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
    from database import ProfileImageSource
    
    # Check if user already exists
    user = db.query(User).filter(User.email == google_info["email"]).first()
    if user:
        # Update Google picture if user doesn't have a custom uploaded one
        if user.profile_image_source != ProfileImageSource.UPLOAD.value:
            google_picture = google_info.get("picture")
            if google_picture:
                user.picture = google_picture
                user.profile_image_source = ProfileImageSource.GOOGLE.value
        user.last_login = datetime.utcnow()
        db.commit()
        return user
    # Create new user from Google data
    google_picture = google_info.get("picture")
    user = User(
        id                   = str(uuid.uuid4()),
        email                = google_info["email"],
        name                 = google_info.get("name"),
        picture              = google_picture,
        google_id            = google_info.get("sub"),
        profile_image_source = ProfileImageSource.GOOGLE.value if google_picture else ProfileImageSource.INITIAL.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user