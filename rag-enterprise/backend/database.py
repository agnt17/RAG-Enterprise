from sqlalchemy import create_engine, Column, String, DateTime, Boolean
from sqlalchemy import Text as SAText
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

# create_engine = creates the connection to PostgreSQL
# The DATABASE_URL tells SQLAlchemy where your database is
engine = create_engine(
    os.getenv("DATABASE_URL"),
    pool_pre_ping=True  # checks connection is alive before using it
)

# SessionLocal = a factory that creates database sessions
# Each request gets its own session — like a transaction window
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base = all your database models (tables) will inherit from this
Base = declarative_base()

# ── USER TABLE ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id            = Column(String, primary_key=True)  # UUID string
    email         = Column(String, unique=True, nullable=False, index=True)
    name          = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)  # None for Google users
    google_id     = Column(String, nullable=True)    # None for email users
    picture       = Column(String, nullable=True)    # Google profile pic
    plan          = Column(String, default="free")   # free | starter | pro
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    last_login    = Column(DateTime, nullable=True)

# ── CONVERSATION TABLE ─────────────────────────────────────
class Conversation(Base):
    __tablename__ = "conversations"

    id         = Column(String, primary_key=True)   # UUID
    user_id    = Column(String, nullable=False, index=True)  # links to users.id
    messages = Column(SAText, default="[]")  # JSON string of all messages
    # We store messages as a JSON string because PostgreSQL Text column
    # is simpler than a separate messages table for this use case.
    # Format: [{"type": "human", "content": "..."}, {"type": "ai", "content": "..."}]
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
def create_tables():
    # This creates all tables in PostgreSQL if they don't exist yet
    Base.metadata.create_all(bind=engine)

def get_db():
    # Dependency injection — FastAPI calls this to get a DB session per request
    # yield = give the session to the route, then close it when done
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()