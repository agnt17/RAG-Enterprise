from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

engine = create_engine(
    os.getenv("DATABASE_URL"),
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ── USER TABLE ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id              = Column(String, primary_key=True)
    email           = Column(String, unique=True, nullable=False, index=True)
    name            = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    google_id       = Column(String, nullable=True)
    picture         = Column(String, nullable=True)
    plan            = Column(String, default="free")
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    last_login      = Column(DateTime, nullable=True)

# ── DOCUMENT TABLE ─────────────────────────────────────────
# Each uploaded PDF gets its own row
# Each document has its own Pinecone namespace (document.id)
# Each document has its own conversation
class Document(Base):
    __tablename__ = "documents"

    id          = Column(String, primary_key=True)   # UUID — also used as Pinecone namespace
    user_id     = Column(String, nullable=False, index=True)
    filename    = Column(String, nullable=False)
    file_path   = Column(String, nullable=False)
    file_size   = Column(String, nullable=True)      # bytes as string
    chunk_count = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)      # only one active per user at a time
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    # namespace in Pinecone = document.id
    # This means each document's vectors are completely isolated

# ── CONVERSATION TABLE ─────────────────────────────────────
# Each document gets its own conversation row
# Linked to BOTH user_id and document_id
# This is the core of Architecture 2
class Conversation(Base):
    __tablename__ = "conversations"

    id          = Column(String, primary_key=True)
    user_id     = Column(String, nullable=False, index=True)
    document_id = Column(String, nullable=False, index=True)  # ← linked to specific document
    messages    = Column(String, default="[]")   # JSON array of {type, content}
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()