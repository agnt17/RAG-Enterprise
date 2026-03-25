from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from database import get_db, create_tables, User, Document, Conversation
from auth import (hash_password, verify_password, create_token,
                  validate_password_strength,
                  get_current_user, verify_google_token,
                  get_or_create_google_user, normalize_email,
                  generate_otp_code, generate_magic_token,
                  hash_verification_value, JWT_SECRET)
from ingest import ingest_pdf
from email_service import send_verification_email
from slowapi import Limiter, _rate_limit_exceeded_handler
from sqlalchemy import and_
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os, uuid, json
from datetime import datetime, timedelta

# ── App setup ──────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app     = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

create_tables()

if JWT_SECRET == "change-this-in-production":
    raise RuntimeError("JWT_SECRET is using the default insecure value. Set a secure secret.")

VERIFICATION_EXPIRY_MINUTES = int(os.getenv("EMAIL_VERIFICATION_EXPIRY_MINUTES", "15"))
VERIFICATION_MAX_ATTEMPTS = int(os.getenv("EMAIL_VERIFICATION_MAX_ATTEMPTS", "5"))
VERIFICATION_RESEND_COOLDOWN_SECONDS = int(os.getenv("EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS", "60"))
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")

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
    email: EmailStr
    password: str
    name: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    token: str


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str | None = None
    token: str | None = None


class ResendVerificationRequest(BaseModel):
    email: EmailStr

class QueryRequest(BaseModel):
    question: str


class AdminCleanupRequest(BaseModel):
    mode: str = "all-users"  # "all-users" or "email-contains"
    email_filter: str | None = None
    delete_upload_files: bool = True
    skip_pinecone: bool = False
    confirm: bool = False  # Must be True to execute (vs. dry-run)


def _build_magic_link(email: str, magic_token: str) -> str:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    return f"{frontend_url}/?verify_token={magic_token}&email={email}"


def _issue_verification_challenge(user: User, db: Session) -> tuple[str, datetime]:
    otp_code = generate_otp_code()
    magic_token = generate_magic_token()
    expires_at = datetime.utcnow() + timedelta(minutes=VERIFICATION_EXPIRY_MINUTES)

    user.email_verification_code_hash = hash_verification_value(otp_code)
    user.email_verification_token_hash = hash_verification_value(magic_token)
    user.email_verification_expires_at = expires_at
    user.email_verification_attempts = 0
    user.email_verification_sent_at = datetime.utcnow()
    db.commit()

    magic_link = _build_magic_link(user.email, magic_token)
    send_verification_email(user.email, user.name, otp_code, magic_link, VERIFICATION_EXPIRY_MINUTES)
    return user.email, expires_at


def _verification_pending_payload(email: str, expires_at: datetime) -> dict:
    return {
        "needs_verification": True,
        "email": email,
        "expires_at": expires_at.isoformat(),
        "resend_after_seconds": VERIFICATION_RESEND_COOLDOWN_SECONDS,
        "message": "Verification required. Check your inbox for OTP or magic link."
    }


def _verify_admin_token(request: Request) -> None:
    if not ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Admin access not configured")
    auth_header = request.headers.get("X-Admin-Secret", "")
    if not auth_header or auth_header != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid or missing admin token")


def _list_cleanup_targets(db: Session, mode: str, email_filter: str | None) -> tuple[list[User], list[Document], list[Conversation]]:
    user_query = db.query(User)
    filters = []

    if mode == "all-users":
        users = user_query.all()
    elif mode == "email-contains" and email_filter:
        users = user_query.filter(User.email.ilike(f"%{email_filter}%")).all()
    else:
        users = []

    user_ids = [u.id for u in users]
    docs = db.query(Document).filter(Document.user_id.in_(user_ids)).all() if user_ids else []
    convs = db.query(Conversation).filter(Conversation.user_id.in_(user_ids)).all() if user_ids else []

    return users, docs, convs


def _execute_cleanup(db: Session, users: list[User], docs: list[Document], convs: list[Conversation],
                     delete_files: bool, skip_pinecone: bool) -> dict:
    from ingest import delete_namespace
    import os

    # Delete Pinecone namespaces first
    deleted_namespaces = 0
    failed_namespaces = 0
    if not skip_pinecone:
        for doc in docs:
            try:
                delete_namespace(doc.id)
                deleted_namespaces += 1
            except Exception:
                failed_namespaces += 1

    # Delete local files
    deleted_files = 0
    if delete_files:
        for doc in docs:
            if doc.file_path:
                try:
                    file_path = os.path.join("uploads", doc.file_path)
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        deleted_files += 1
                except Exception:
                    pass

    # Delete DB rows in safe order
    user_ids = [u.id for u in users]
    deleted_convs = db.query(Conversation).filter(Conversation.user_id.in_(user_ids)).delete(synchronize_session=False) if user_ids else 0
    deleted_docs = db.query(Document).filter(Document.user_id.in_(user_ids)).delete(synchronize_session=False) if user_ids else 0
    deleted_users = db.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False) if user_ids else 0
    db.commit()

    return {
        "deleted_users": deleted_users,
        "deleted_documents": deleted_docs,
        "deleted_conversations": deleted_convs,
        "deleted_files": deleted_files,
        "deleted_pinecone_namespaces": deleted_namespaces,
        "pinecone_failures": failed_namespaces,
    }


# ── Auth Endpoints ─────────────────────────────────────────
@app.post("/register")
@limiter.limit("5/minute")
def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    email = normalize_email(req.email)
    validate_password_strength(req.password)

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        if existing_user.email_verified:
            raise HTTPException(status_code=400, detail="Email already registered")

        existing_user.hashed_password = hash_password(req.password)
        if req.name:
            existing_user.name = req.name
        try:
            issued_email, expires_at = _issue_verification_challenge(existing_user, db)
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return _verification_pending_payload(issued_email, expires_at)

    user = User(
        id              = str(uuid.uuid4()),
        email           = email,
        name            = req.name,
        hashed_password = hash_password(req.password),
        email_verified  = False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        issued_email, expires_at = _issue_verification_challenge(user, db)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return _verification_pending_payload(issued_email, expires_at)

@app.post("/login")
@limiter.limit("10/minute")
def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    email = normalize_email(req.email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(req.password, user.hashed_password or ""):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Email is not verified. Complete verification first.",
                "email": user.email,
            }
        )
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_token(user.id, user.email)
    return {"token": token, "user": {"email": user.email, "name": user.name, "picture": user.picture}}


@app.post("/verify-email")
@limiter.limit("10/15minute")
def verify_email(request: Request, req: VerifyEmailRequest, db: Session = Depends(get_db)):
    email = normalize_email(req.email)
    if not req.otp and not req.token:
        raise HTTPException(status_code=400, detail="Provide either OTP or token.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    if not user.email_verification_expires_at or user.email_verification_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification has expired. Request a new code.")
    if (user.email_verification_attempts or 0) >= VERIFICATION_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Request a new verification email.")

    valid = False
    if req.otp and user.email_verification_code_hash:
        valid = hash_verification_value(req.otp.strip()) == user.email_verification_code_hash
    if req.token and user.email_verification_token_hash:
        valid = hash_verification_value(req.token.strip()) == user.email_verification_token_hash

    if not valid:
        user.email_verification_attempts = (user.email_verification_attempts or 0) + 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid verification code or link")

    user.email_verified = True
    user.email_verification_code_hash = None
    user.email_verification_token_hash = None
    user.email_verification_expires_at = None
    user.email_verification_attempts = 0
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_token(user.id, user.email)
    return {
        "token": token,
        "user": {"email": user.email, "name": user.name, "picture": user.picture}
    }


@app.post("/resend-verification")
@limiter.limit("3/15minute")
def resend_verification(request: Request, req: ResendVerificationRequest, db: Session = Depends(get_db)):
    email = normalize_email(req.email)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    sent_at = user.email_verification_sent_at
    if sent_at:
        elapsed = (datetime.utcnow() - sent_at).total_seconds()
        if elapsed < VERIFICATION_RESEND_COOLDOWN_SECONDS:
            retry_after = int(VERIFICATION_RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=429,
                detail={
                    "message": "Please wait before requesting another verification email.",
                    "retry_after_seconds": retry_after,
                }
            )

    try:
        issued_email, expires_at = _issue_verification_challenge(user, db)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return _verification_pending_payload(issued_email, expires_at)

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

# ── Admin Endpoints ────────────────────────────────────────
@app.post("/admin/cleanup-data")
@limiter.limit("1/minute")
def admin_cleanup_data(request: Request, req: AdminCleanupRequest, db: Session = Depends(get_db)):
    _verify_admin_token(request)

    users, docs, convs = _list_cleanup_targets(db, req.mode, req.email_filter)

    result = {
        "mode": "DRY-RUN" if not req.confirm else "APPLIED",
        "preview": {
            "users_found": len(users),
            "documents_found": len(docs),
            "conversations_found": len(convs),
        }
    }

    if req.confirm:
        cleanup_result = _execute_cleanup(db, users, docs, convs, req.delete_upload_files, req.skip_pinecone)
        result["result"] = cleanup_result
    else:
        result["message"] = "This is a dry-run preview. Re-submit with confirm=true to execute."

    return result

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