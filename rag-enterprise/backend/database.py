from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Integer, Enum, inspect, text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
from datetime import datetime
import enum

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required but not set")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ── ENUMS ──────────────────────────────────────────────────
class ProfileImageSource(str, enum.Enum):
    INITIAL = "initial"    # First letter of name
    GOOGLE = "google"      # From Google OAuth
    UPLOAD = "upload"      # Manually uploaded

# ── USER TABLE ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id                   = Column(String, primary_key=True)
    email                = Column(String, unique=True, nullable=False, index=True)
    name                 = Column(String, nullable=True)
    hashed_password      = Column(String, nullable=True)
    google_id            = Column(String, nullable=True)
    picture              = Column(String, nullable=True)  # URL to profile image
    profile_image_source = Column(String, default=ProfileImageSource.INITIAL.value)
    plan                 = Column(String, default="free")
    is_active            = Column(Boolean, default=True)
    created_at           = Column(DateTime, default=datetime.utcnow)
    last_login           = Column(DateTime, nullable=True)
    # Billing fields
    billing_cycle        = Column(String, nullable=True)   # "monthly" or "yearly"
    plan_started_at      = Column(DateTime, nullable=True)
    plan_expires_at      = Column(DateTime, nullable=True)
    cancelled_at         = Column(DateTime, nullable=True)  # When subscription was cancelled
    # User profession for targeted tips
    profession           = Column(String, nullable=True)  # "law_firm", "ca_firm", "other"
    # Email verification fields
    email_verified                = Column(Boolean, default=False)
    email_verification_code_hash  = Column(String, nullable=True)
    email_verification_token_hash = Column(String, nullable=True)
    email_verification_expires_at = Column(DateTime, nullable=True)
    email_verification_attempts   = Column(Integer, default=0)
    email_verification_sent_at    = Column(DateTime, nullable=True)

# ── DOCUMENT TABLE ─────────────────────────────────────────
# Each uploaded PDF gets its own row
# document.id is used as the Pinecone namespace
# Each document has its own isolated conversation
class Document(Base):
    __tablename__ = "documents"

    id          = Column(String, primary_key=True)   # UUID — also Pinecone namespace
    user_id     = Column(String, nullable=False, index=True)
    filename    = Column(String, nullable=False)
    file_path   = Column(String, nullable=False)
    file_size   = Column(String, nullable=True)
    chunk_count = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    status      = Column(String, default="ready")   # "pending" | "ready" | "failed"

# ── CONVERSATION TABLE ─────────────────────────────────────
# Each document gets its own conversation
# Linked to BOTH user_id and document_id
class Conversation(Base):
    __tablename__ = "conversations"

    id          = Column(String, primary_key=True)
    user_id     = Column(String, nullable=False, index=True)
    document_id = Column(String, nullable=False, index=True)
    messages    = Column(String, default="[]")
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ── USAGE LOG TABLE ───────────────────────────────────────
# Track usage for plan enforcement (questions, uploads, etc.)
class UsageLog(Base):
    __tablename__ = "usage_logs"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(String, nullable=False, index=True)
    action     = Column(String, nullable=False)  # "question", "upload", "download"
    extra_data = Column(String, nullable=True)   # JSON string with extra info
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

# ── COUPON TABLE ──────────────────────────────────────────
# Promo codes for discounts
class Coupon(Base):
    __tablename__ = "coupons"

    id              = Column(String, primary_key=True)  # Coupon code (e.g., "LAUNCH20")
    discount_type   = Column(String, nullable=False)    # "percentage" or "flat"
    discount_value  = Column(Float, nullable=False)     # 20 for 20% or 200 for ₹200
    applicable_plans = Column(String, nullable=True)    # JSON array: ["basic", "pro"] or null for all
    min_amount      = Column(Float, default=0)          # Minimum order amount
    max_uses        = Column(Integer, nullable=True)    # Max total uses (null = unlimited)
    used_count      = Column(Integer, default=0)        # Current usage count
    per_user_limit  = Column(Integer, default=1)        # Max uses per user
    valid_from      = Column(DateTime, default=datetime.utcnow)
    valid_until     = Column(DateTime, nullable=True)   # null = no expiry
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

# ── COUPON USAGE TABLE ────────────────────────────────────
# Track which users used which coupons
class CouponUsage(Base):
    __tablename__ = "coupon_usages"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    coupon_id  = Column(String, nullable=False, index=True)
    user_id    = Column(String, nullable=False, index=True)
    used_at    = Column(DateTime, default=datetime.utcnow)

# ── PAYMENT/TRANSACTION TABLE ─────────────────────────────
# Billing history for users
class Payment(Base):
    __tablename__ = "payments"

    id                  = Column(String, primary_key=True)  # UUID
    user_id             = Column(String, nullable=False, index=True)
    razorpay_order_id   = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    plan                = Column(String, nullable=False)    # "basic", "pro"
    billing_cycle       = Column(String, nullable=False)    # "monthly", "yearly"
    amount              = Column(Float, nullable=False)     # Total paid in rupees
    base_amount         = Column(Float, nullable=True)      # Before discount
    discount_amount     = Column(Float, default=0)          # Coupon discount
    gst_amount          = Column(Float, nullable=True)      # GST component
    coupon_code         = Column(String, nullable=True)     # Applied coupon
    status              = Column(String, default="pending") # pending, success, failed, refunded
    payment_method      = Column(String, nullable=True)     # card, upi, netbanking
    created_at          = Column(DateTime, default=datetime.utcnow)
    completed_at        = Column(DateTime, nullable=True)

# ── DOCUMENT CHUNK TABLE ──────────────────────────────────
# Stores raw text chunks for BM25 keyword search (hybrid retrieval)
class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    document_id  = Column(String, nullable=False, index=True)
    user_id      = Column(String, nullable=False, index=True)
    content      = Column(String, nullable=False)
    chunk_index  = Column(Integer, nullable=True)
    page_num     = Column(Integer, nullable=True)
    source       = Column(String, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

def _ensure_user_columns():
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {col["name"] for col in inspector.get_columns("users")}
    migration_sql = {
        "email_verified": "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE",
        "email_verification_code_hash": "ALTER TABLE users ADD COLUMN email_verification_code_hash VARCHAR",
        "email_verification_token_hash": "ALTER TABLE users ADD COLUMN email_verification_token_hash VARCHAR",
        "email_verification_expires_at": "ALTER TABLE users ADD COLUMN email_verification_expires_at TIMESTAMP",
        "email_verification_attempts": "ALTER TABLE users ADD COLUMN email_verification_attempts INTEGER DEFAULT 0",
        "email_verification_sent_at": "ALTER TABLE users ADD COLUMN email_verification_sent_at TIMESTAMP",
        # Billing columns
        "billing_cycle": "ALTER TABLE users ADD COLUMN billing_cycle VARCHAR",
        "plan_started_at": "ALTER TABLE users ADD COLUMN plan_started_at TIMESTAMP",
        "plan_expires_at": "ALTER TABLE users ADD COLUMN plan_expires_at TIMESTAMP",
        "cancelled_at": "ALTER TABLE users ADD COLUMN cancelled_at TIMESTAMP",
        # Profession for targeted tips
        "profession": "ALTER TABLE users ADD COLUMN profession VARCHAR",
    }

    with engine.begin() as connection:
        for column_name, sql in migration_sql.items():
            if column_name in existing_columns:
                continue
            connection.execute(text(sql))

        # Backfill old users as verified to avoid locking out existing accounts.
        connection.execute(
            text(
                """
                UPDATE users
                SET email_verified = TRUE
                WHERE (email_verified IS NULL OR email_verified = FALSE)
                  AND email_verification_code_hash IS NULL
                  AND email_verification_token_hash IS NULL
                  AND email_verification_sent_at IS NULL
                  AND (hashed_password IS NOT NULL OR google_id IS NOT NULL)
                """
            )
        )


def _ensure_document_columns():
    inspector = inspect(engine)
    if "documents" not in inspector.get_table_names():
        return
    existing = {col["name"] for col in inspector.get_columns("documents")}
    with engine.begin() as connection:
        if "status" not in existing:
            connection.execute(text("ALTER TABLE documents ADD COLUMN status VARCHAR DEFAULT 'ready'"))
            connection.execute(text("UPDATE documents SET status = 'ready' WHERE status IS NULL"))


def _ensure_coupon_columns():
    inspector = inspect(engine)
    if "coupons" not in inspector.get_table_names():
        return

    existing_columns = {col["name"] for col in inspector.get_columns("coupons")}
    migration_sql = {
        "applicable_plans": "ALTER TABLE coupons ADD COLUMN applicable_plans VARCHAR",
        "min_amount": "ALTER TABLE coupons ADD COLUMN min_amount FLOAT DEFAULT 0",
        "max_uses": "ALTER TABLE coupons ADD COLUMN max_uses INTEGER",
        "used_count": "ALTER TABLE coupons ADD COLUMN used_count INTEGER DEFAULT 0",
        "per_user_limit": "ALTER TABLE coupons ADD COLUMN per_user_limit INTEGER DEFAULT 1",
        "valid_from": "ALTER TABLE coupons ADD COLUMN valid_from TIMESTAMP",
        "valid_until": "ALTER TABLE coupons ADD COLUMN valid_until TIMESTAMP",
        "is_active": "ALTER TABLE coupons ADD COLUMN is_active BOOLEAN DEFAULT TRUE",
        "created_at": "ALTER TABLE coupons ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    }

    with engine.begin() as connection:
        for column_name, sql in migration_sql.items():
            if column_name in existing_columns:
                continue
            connection.execute(text(sql))


def _ensure_coupon_usage_columns():
    inspector = inspect(engine)
    if "coupon_usages" not in inspector.get_table_names():
        return

    existing_columns = {col["name"] for col in inspector.get_columns("coupon_usages")}
    migration_sql = {
        "used_at": "ALTER TABLE coupon_usages ADD COLUMN used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    }

    with engine.begin() as connection:
        for column_name, sql in migration_sql.items():
            if column_name in existing_columns:
                continue
            connection.execute(text(sql))


def _ensure_payment_columns():
    inspector = inspect(engine)
    if "payments" not in inspector.get_table_names():
        return

    existing_columns = {col["name"] for col in inspector.get_columns("payments")}
    migration_sql = {
        "razorpay_order_id": "ALTER TABLE payments ADD COLUMN razorpay_order_id VARCHAR",
        "razorpay_payment_id": "ALTER TABLE payments ADD COLUMN razorpay_payment_id VARCHAR",
        "billing_cycle": "ALTER TABLE payments ADD COLUMN billing_cycle VARCHAR",
        "base_amount": "ALTER TABLE payments ADD COLUMN base_amount FLOAT",
        "discount_amount": "ALTER TABLE payments ADD COLUMN discount_amount FLOAT DEFAULT 0",
        "gst_amount": "ALTER TABLE payments ADD COLUMN gst_amount FLOAT",
        "coupon_code": "ALTER TABLE payments ADD COLUMN coupon_code VARCHAR",
        "status": "ALTER TABLE payments ADD COLUMN status VARCHAR DEFAULT 'pending'",
        "payment_method": "ALTER TABLE payments ADD COLUMN payment_method VARCHAR",
        "created_at": "ALTER TABLE payments ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "completed_at": "ALTER TABLE payments ADD COLUMN completed_at TIMESTAMP",
    }

    with engine.begin() as connection:
        for column_name, sql in migration_sql.items():
            if column_name in existing_columns:
                continue
            connection.execute(text(sql))

def create_tables():
    Base.metadata.create_all(bind=engine)
    _ensure_user_columns()
    _ensure_document_columns()
    _ensure_coupon_columns()
    _ensure_coupon_usage_columns()
    _ensure_payment_columns()

def ensure_user_columns():
    """Add new columns to existing users table if they don't exist"""
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("users")]
    
    with engine.connect() as conn:
        if "profile_image_source" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN profile_image_source VARCHAR DEFAULT 'initial'"))
            conn.commit()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()