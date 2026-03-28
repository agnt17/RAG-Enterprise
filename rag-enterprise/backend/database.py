from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Integer, Enum, inspect, text
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


def create_tables():
    Base.metadata.create_all(bind=engine)
    _ensure_user_columns()

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