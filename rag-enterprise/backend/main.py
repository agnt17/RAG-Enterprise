from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, create_tables, User, Document, Conversation
from auth import (hash_password, verify_password, create_token,
                  validate_password_strength,
                  get_current_user, verify_google_token,
                  get_or_create_google_user)
from ingest import ingest_pdf
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os, uuid, json
from datetime import datetime

# ── App setup ──────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app     = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

create_tables()

# ── Serve uploaded files for preview ──────────────────────
# Creates a /files/filename.pdf public URL for each upload
# Users can preview their PDFs directly in the browser
os.makedirs("uploads", exist_ok=True)
app.mount("/files", StaticFiles(directory="uploads"), name="files")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://rag-enterprise.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request Models ─────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    token: str

class QueryRequest(BaseModel):
    question: str

# ── Auth Endpoints ─────────────────────────────────────────
@app.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    validate_password_strength(req.password)

    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        # Modern account-linking flow: if user first signed up with Google,
        # allow them to set a password for traditional login.
        if existing_user.hashed_password:
            raise HTTPException(status_code=400, detail="Email already registered")

        existing_user.hashed_password = hash_password(req.password)
        if req.name:
            existing_user.name = req.name
        existing_user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(existing_user)
        token = create_token(existing_user.id, existing_user.email)
        return {
            "token": token,
            "user": {
                "email": existing_user.email,
                "name": existing_user.name,
                "picture": existing_user.picture
            }
        }

    user = User(
        id              = str(uuid.uuid4()),
        email           = req.email,
        name            = req.name,
        hashed_password = hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token(user.id, user.email)
    return {"token": token, "user": {"email": user.email, "name": user.name, "picture": user.picture}}

@app.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password or ""):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_token(user.id, user.email)
    return {"token": token, "user": {"email": user.email, "name": user.name, "picture": user.picture}}

@app.post("/auth/google")
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    google_info = verify_google_token(req.token)
    user  = get_or_create_google_user(db, google_info)
    token = create_token(user.id, user.email)
    return {"token": token, "user": {"email": user.email, "name": user.name, "picture": user.picture}}

@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "email":   current_user.email,
        "name":    current_user.name,
        "picture": current_user.picture,
        "plan":    current_user.plan
    }

# ── Upload ─────────────────────────────────────────────────
@app.post("/upload")
@limiter.limit("10/day")
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validation 1 — file type
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDF files are allowed. Please upload a .pdf file.")

    # Validation 2 — file size (25MB limit)
    contents = await file.read()
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(400, "File too large. Maximum allowed size is 25MB.")

    # Validation 3 — magic bytes (real PDF check)
    if not contents.startswith(b"%PDF"):
        raise HTTPException(400, "Invalid PDF file. File appears to be corrupted or not a real PDF.")

    # Generate unique document ID — used as both DB primary key and Pinecone namespace
    doc_id    = str(uuid.uuid4())

    # Store with doc_id prefix so filenames don't collide between users
    stored_filename = f"{doc_id}_{file.filename}"
    file_path       = f"uploads/{stored_filename}"
    os.makedirs("uploads", exist_ok=True)
    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    # Deactivate all previous documents for this user
    all_docs = db.query(Document).filter(
        Document.user_id == current_user.id
    ).all()
    for old_doc in all_docs:
        old_doc.is_active = False
    db.commit()

    # Create new document record
    doc = Document(
        id             = doc_id,
        user_id        = current_user.id,
        filename       = file.filename,          # original name for display
        file_path      = stored_filename,        # stored name (with doc_id prefix)
        file_size      = str(len(contents)),
        chunk_count    = 0,
        is_active      = True
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Ingest into this document's own Pinecone namespace
    result = ingest_pdf(file_path, namespace=doc_id)

    return {
        "message":     result,
        "filename":    file.filename,
        "document_id": doc_id,
        "file_path":   stored_filename
    }

# ── Query ──────────────────────────────────────────────────
@app.post("/query")
@limiter.limit("20/day")
async def query(
    request: Request,
    req: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    active_doc = db.query(Document).filter(
        Document.user_id   == current_user.id,
        Document.is_active == True
    ).first()

    if not active_doc:
        raise HTTPException(400, "No document uploaded. Please upload a PDF first.")

    # Import the new function — not get_rag_chain anymore
    from rag import query_with_sources

    result = query_with_sources(
        question    = req.question,
        namespace   = active_doc.id,
        db          = db,
        user_id     = current_user.id,
        document_id = active_doc.id
    )

    return {
        "answer":  result["answer"],
        "sources": result["sources"]   # ← new field
    }

# ── History ────────────────────────────────────────────────
@app.get("/history")
async def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    active_doc = db.query(Document).filter(
        Document.user_id   == current_user.id,
        Document.is_active == True
    ).first()

    if not active_doc:
        return {"messages": [], "document": None}

    record = db.query(Conversation).filter(
        Conversation.user_id     == current_user.id,
        Conversation.document_id == active_doc.id
    ).first()

    messages = []
    if record:
        messages = json.loads(record.messages)

    return {
        "messages": messages,
        "document": {
            "id":          active_doc.id,
            "filename":    active_doc.filename,
            "file_path":   active_doc.file_path,
            "uploaded_at": active_doc.uploaded_at.isoformat(),
            "file_size":   active_doc.file_size
        }
    }

# ── Documents list ─────────────────────────────────────────
@app.get("/documents")
async def get_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    docs = db.query(Document).filter(
        Document.user_id == current_user.id
    ).order_by(Document.uploaded_at.desc()).all()

    return {
        "documents": [
            {
                "id":          d.id,
                "filename":    d.filename,
                "file_path":   d.file_path,
                "uploaded_at": d.uploaded_at.isoformat(),
                "file_size":   d.file_size,
                "is_active":   d.is_active
            }
            for d in docs
        ]
    }

# ── Switch active document ─────────────────────────────────
@app.post("/documents/{document_id}/activate")
async def activate_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(
        Document.id      == document_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(404, "Document not found.")

    all_docs = db.query(Document).filter(
        Document.user_id == current_user.id
    ).all()
    for d in all_docs:
        d.is_active = (d.id == document_id)
    db.commit()

    record = db.query(Conversation).filter(
        Conversation.user_id     == current_user.id,
        Conversation.document_id == document_id
    ).first()

    messages = []
    if record:
        messages = json.loads(record.messages)

    return {
        "messages": messages,
        "document": {
            "id":          doc.id,
            "filename":    doc.filename,
            "file_path":   doc.file_path,
            "uploaded_at": doc.uploaded_at.isoformat(),
            "file_size":   doc.file_size
        }
    }

# ── Delete document ────────────────────────────────────────
@app.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(
        Document.id      == document_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(404, "Document not found.")

    was_active  = doc.is_active
    stored_name = doc.file_path

    # Delete Pinecone vectors for this document
    try:
        from ingest import delete_namespace
        delete_namespace(document_id)
    except Exception:
        pass

    # Delete file from disk
    try:
        disk_path = f"uploads/{stored_name}"
        if os.path.exists(disk_path):
            os.remove(disk_path)
    except Exception:
        pass

    # Delete conversation
    db.query(Conversation).filter(
        Conversation.document_id == document_id
    ).delete()

    # Delete document record
    db.delete(doc)
    db.commit()

    # If deleted doc was active, activate most recent remaining one
    if was_active:
        latest = db.query(Document).filter(
            Document.user_id == current_user.id
        ).order_by(Document.uploaded_at.desc()).first()
        if latest:
            latest.is_active = True
            db.commit()

            # Return new active doc's history
            record = db.query(Conversation).filter(
                Conversation.user_id     == current_user.id,
                Conversation.document_id == latest.id
            ).first()
            messages = json.loads(record.messages) if record else []
            return {
                "message": f"'{doc.filename}' deleted.",
                "new_active": {
                    "id":          latest.id,
                    "filename":    latest.filename,
                    "file_path":   latest.file_path,
                    "uploaded_at": latest.uploaded_at.isoformat(),
                    "file_size":   latest.file_size
                },
                "messages": messages
            }

    return {"message": f"'{doc.filename}' deleted.", "new_active": None, "messages": []}

# ── Health ─────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}