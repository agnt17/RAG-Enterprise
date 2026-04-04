from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from database import get_db, create_tables, ensure_user_columns, User, Document, Conversation, ProfileImageSource, Coupon, CouponUsage, Payment
from auth import (hash_password, verify_password, create_token,
                  validate_password_strength,
                  get_current_user, verify_google_token,
                  get_or_create_google_user, normalize_email,
                  generate_otp_code, generate_magic_token,
                  hash_verification_value, JWT_SECRET)
from email_service import send_verification_email
from ingest import ingest_pdf
from supabase_storage import (
    is_supabase_configured, ensure_buckets_exist,
    upload_profile_image, delete_profile_image,
    upload_document, get_document_url, download_document, delete_document
)
from slowapi import Limiter, _rate_limit_exceeded_handler
from sqlalchemy import and_
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os, uuid, json, tempfile
from datetime import datetime, timedelta
from typing import Optional

# ── App setup ──────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app     = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Email Verification Constants ───────────────────────────
VERIFICATION_EXPIRY_MINUTES = 15
VERIFICATION_MAX_ATTEMPTS = 5
VERIFICATION_RESEND_COOLDOWN_SECONDS = 60
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

create_tables()
ensure_user_columns()  # Ensure new columns exist
ensure_buckets_exist()  # Ensure Supabase storage buckets exist

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

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    profession: Optional[str] = None  # "law_firm", "ca_firm", "other"

class AdminCleanupRequest(BaseModel):
    mode: str = "all"  # "all", "test", or specific filter
    email_filter: Optional[str] = None
    confirm: bool = False
    delete_upload_files: bool = True
    skip_pinecone: bool = False

class CreateOrderRequest(BaseModel):
    plan: str  # "basic" or "pro"
    billing_cycle: str = "monthly"  # "monthly" or "yearly"
    coupon_code: Optional[str] = None  # Optional coupon code

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str
    billing_cycle: str = "monthly"
    coupon_code: Optional[str] = None

class ValidateCouponRequest(BaseModel):
    code: str
    plan: str
    billing_cycle: str

class CancelSubscriptionRequest(BaseModel):
    reason: Optional[str] = None

# ── Plan Expiration Helper ─────────────────────────────────
def check_and_expire_plan(user: User, db: Session) -> bool:
    """Check if user's plan has expired and downgrade to free if so.
    Returns True if plan was expired."""
    if user.plan == "free":
        return False
    
    if user.plan_expires_at and user.plan_expires_at < datetime.utcnow():
        user.plan = "free"
        user.billing_cycle = None
        user.plan_started_at = None
        user.plan_expires_at = None
        db.commit()
        return True
    
    return False

# ── Email Verification Helpers ─────────────────────────────
def _issue_verification_challenge(user: User, db: Session) -> tuple[str, datetime]:
    """Generate and store verification codes, send email, return (email, expires_at)."""
    otp_code = generate_otp_code()
    magic_token = generate_magic_token()
    expires_at = datetime.utcnow() + timedelta(minutes=VERIFICATION_EXPIRY_MINUTES)
    
    # Store hashed values in database
    user.email_verification_code_hash = hash_verification_value(otp_code)
    user.email_verification_token_hash = hash_verification_value(magic_token)
    user.email_verification_expires_at = expires_at
    user.email_verification_sent_at = datetime.utcnow()
    user.email_verification_attempts = 0
    db.commit()
    
    # Build magic link
    magic_link = f"{FRONTEND_URL}/?email={user.email}&verify_token={magic_token}"
    
    # Send email (may raise RuntimeError if SMTP not configured)
    send_verification_email(
        email=user.email,
        name=user.name,
        otp_code=otp_code,
        magic_link=magic_link,
        expires_minutes=VERIFICATION_EXPIRY_MINUTES
    )
    
    return user.email, expires_at

def _verification_pending_payload(email: str, expires_at: datetime) -> dict:
    """Return standard response for 'verification pending' state."""
    return {
        "needs_verification": True,
        "status": "verification_pending",
        "message": "Please verify your email to continue.",
        "email": email,
        "expires_at": expires_at.isoformat(),
        "expires_in_minutes": VERIFICATION_EXPIRY_MINUTES,
        "resend_after_seconds": VERIFICATION_RESEND_COOLDOWN_SECONDS
    }

# ── Auth Endpoints ─────────────────────────────────────────
@app.post("/register")
@limiter.limit("5/minute")
def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    email = normalize_email(req.email)
    validate_password_strength(req.password)

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        # If user exists but not verified, allow re-registration (update password, resend verification)
        if not existing_user.email_verified:
            existing_user.hashed_password = hash_password(req.password)
            if req.name:
                existing_user.name = req.name
            try:
                issued_email, expires_at = _issue_verification_challenge(existing_user, db)
            except RuntimeError as exc:
                raise HTTPException(status_code=500, detail=str(exc)) from exc
            return _verification_pending_payload(issued_email, expires_at)
        raise HTTPException(status_code=400, detail="Email already registered")

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
    
    # Check and expire plan if needed
    check_and_expire_plan(user, db)
    
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_token(user.id, user.email)
    return {"token": token, "user": {"email": user.email, "name": user.name, "picture": user.picture}}


@app.post("/verify-email")
@limiter.limit("10/15minute")
def verify_email(request: Request, req: VerifyEmailRequest, db: Session = Depends(get_db)):
    email = normalize_email(req.email)
    if not req.otp and not req.token:
        raise HTTPException(status_code=400, detail="Provide either OTP or magic link token.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    # Check expiry
    if not user.email_verification_expires_at or user.email_verification_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification has expired. Request a new code.")
    
    # Check max attempts
    if (user.email_verification_attempts or 0) >= VERIFICATION_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Request a new verification email.")

    # Validate OTP or magic token
    valid = False
    if req.otp and user.email_verification_code_hash:
        valid = hash_verification_value(req.otp.strip()) == user.email_verification_code_hash
    if req.token and user.email_verification_token_hash:
        valid = hash_verification_value(req.token.strip()) == user.email_verification_token_hash

    if not valid:
        user.email_verification_attempts = (user.email_verification_attempts or 0) + 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid verification code or link")

    # Success - mark as verified
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

    # Check cooldown
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
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check and expire plan if needed
    check_and_expire_plan(current_user, db)
    
    # Calculate days until expiry for warning
    days_until_expiry = None
    if current_user.plan_expires_at and current_user.plan != "free":
        delta = current_user.plan_expires_at - datetime.utcnow()
        days_until_expiry = max(0, delta.days)
    
    return {
        "email":                current_user.email,
        "name":                 current_user.name,
        "picture":              current_user.picture,
        "plan":                 current_user.plan,
        "billing_cycle":        current_user.billing_cycle,
        "plan_expires_at":      current_user.plan_expires_at.isoformat() if current_user.plan_expires_at else None,
        "plan_started_at":      current_user.plan_started_at.isoformat() if current_user.plan_started_at else None,
        "days_until_expiry":    days_until_expiry,
        "is_cancelled":         current_user.cancelled_at is not None,
        "profile_image_source": current_user.profile_image_source or ProfileImageSource.INITIAL.value,
        "has_password":         current_user.hashed_password is not None,
        "is_google_user":       current_user.google_id is not None,
        "profession":           current_user.profession
    }

@app.get("/usage")
def get_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get usage statistics for the current user"""
    # Check and expire plan if needed
    check_and_expire_plan(current_user, db)
    
    from plan_limits import get_usage_summary
    return get_usage_summary(db, current_user.id, current_user.plan)

# ── Profile Photo Endpoints ────────────────────────────────
@app.post("/profile/photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a profile photo to Supabase Storage"""
    # Check if Supabase is configured
    if not is_supabase_configured():
        raise HTTPException(500, "Image upload service not configured. Please contact support.")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Only JPEG, PNG, GIF, and WebP images are allowed.")
    
    # Read file content
    contents = await file.read()
    
    # Validate file size (5MB max)
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(400, "Image too large. Maximum size is 5MB.")
    
    try:
        result = upload_profile_image(contents, current_user.id, file.filename)
        
        # Update user record
        current_user.picture = result["url"]
        current_user.profile_image_source = ProfileImageSource.UPLOAD.value
        db.commit()
        
        return {
            "message": "Profile photo updated successfully",
            "picture": result["url"]
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to upload image: {str(e)}")

@app.delete("/profile/photo")
async def delete_profile_photo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete profile photo and revert to initial"""
    # Try to delete from Supabase if it was uploaded
    if current_user.profile_image_source == ProfileImageSource.UPLOAD.value:
        if is_supabase_configured():
            delete_profile_image(current_user.id)
    
    # Revert to initial
    current_user.picture = None
    current_user.profile_image_source = ProfileImageSource.INITIAL.value
    
    db.commit()
    
    return {
        "message": "Profile photo removed",
        "profile_image_source": current_user.profile_image_source
    }

# ── Profile Details Endpoint ───────────────────────────────
@app.put("/profile/details")
async def update_profile_details(
    req: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile details (name, password, profession). Email cannot be changed."""
    
    # Update name if provided
    if req.name is not None:
        if len(req.name.strip()) < 1:
            raise HTTPException(400, "Name cannot be empty")
        if len(req.name) > 100:
            raise HTTPException(400, "Name is too long (max 100 characters)")
        current_user.name = req.name.strip()
    
    # Update profession if provided
    if req.profession is not None:
        valid_professions = ["law_firm", "ca_firm", "other"]
        if req.profession not in valid_professions:
            raise HTTPException(400, f"Invalid profession. Choose from: {', '.join(valid_professions)}")
        current_user.profession = req.profession
    
    # Handle password change
    if req.new_password:
        # For Google-only users who haven't set a password yet, allow setting without current_password
        if current_user.hashed_password:
            # User has an existing password - require current password
            if not req.current_password:
                raise HTTPException(400, "Current password is required to change password")
            if not verify_password(req.current_password, current_user.hashed_password):
                raise HTTPException(401, "Current password is incorrect")
        
        # Validate new password strength
        try:
            validate_password_strength(req.new_password)
        except HTTPException as e:
            raise e
        
        current_user.hashed_password = hash_password(req.new_password)
    
    db.commit()
    
    return {
        "message": "Profile updated successfully",
        "name": current_user.name,
        "profession": current_user.profession
    }

# ── Admin Helper Functions ─────────────────────────────────
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")

def _verify_admin_token(request: Request):
    """Verify admin authorization header"""
    auth_header = request.headers.get("Authorization", "")
    if not ADMIN_SECRET or auth_header != f"Bearer {ADMIN_SECRET}":
        raise HTTPException(403, "Admin access denied")

def _list_cleanup_targets(db: Session, mode: str, email_filter: Optional[str]):
    """List users, documents, and conversations matching cleanup criteria"""
    query = db.query(User)
    
    if mode == "test":
        query = query.filter(User.email.like("%test%"))
    elif email_filter:
        query = query.filter(User.email.like(f"%{email_filter}%"))
    
    users = query.all()
    user_ids = [u.id for u in users]
    
    docs = db.query(Document).filter(Document.user_id.in_(user_ids)).all() if user_ids else []
    convs = db.query(Conversation).filter(Conversation.user_id.in_(user_ids)).all() if user_ids else []
    
    return users, docs, convs

def _execute_cleanup(db: Session, users: list, docs: list, convs: list, delete_files: bool, skip_pinecone: bool):
    """Execute the actual cleanup"""
    result = {"users_deleted": 0, "documents_deleted": 0, "conversations_deleted": 0}
    
    # Delete conversations
    for conv in convs:
        db.delete(conv)
        result["conversations_deleted"] += 1
    
    # Delete documents (and optionally their files)
    for doc in docs:
        if delete_files:
            try:
                delete_document(doc.id, doc.user_id)
            except Exception:
                pass  # File may not exist
        db.delete(doc)
        result["documents_deleted"] += 1
    
    # Delete users
    for user in users:
        db.delete(user)
        result["users_deleted"] += 1
    
    db.commit()
    return result

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
    # Check if Supabase is configured
    if not is_supabase_configured():
        raise HTTPException(500, "Storage service not configured. Please contact support.")
    
    # ═══ PLAN ENFORCEMENT ═══════════════════════════════════
    from plan_limits import check_document_limit, check_file_size_limit, log_usage
    
    # Check document count limit
    doc_limit = check_document_limit(db, current_user.id, current_user.plan)
    if not doc_limit["can_upload"]:
        raise HTTPException(
            status_code=403, 
            detail={
                "error": "Document limit reached",
                "message": f"Your {current_user.plan.title()} plan allows {doc_limit['max_allowed']} documents. You have {doc_limit['current_count']}.",
                "upgrade_required": True,
                "current_plan": current_user.plan
            }
        )
    
    # Validation 1 — file type
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDF files are allowed. Please upload a .pdf file.")

    # Validation 2 — file size (plan-based limit)
    contents = await file.read()
    
    # Check file size against plan limits
    size_limit = check_file_size_limit(current_user.plan, len(contents))
    if not size_limit["allowed"]:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "File size limit exceeded",
                "message": f"Your {current_user.plan.title()} plan allows files up to {size_limit['max_allowed_mb']}MB. This file is {size_limit['file_size_mb']}MB.",
                "upgrade_required": True,
                "current_plan": current_user.plan
            }
        )
    
    # Also apply absolute 25MB limit for all plans
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(400, "File too large. Maximum allowed size is 25MB.")

    # Validation 3 — magic bytes (real PDF check)
    if not contents.startswith(b"%PDF"):
        raise HTTPException(400, "Invalid PDF file. File appears to be corrupted or not a real PDF.")

    # Generate unique document ID — used as both DB primary key and Pinecone namespace
    doc_id = str(uuid.uuid4())

    # Upload to Supabase Storage
    try:
        storage_result = upload_document(contents, current_user.id, doc_id, file.filename)
        stored_filename = storage_result["stored_filename"]
    except Exception as e:
        raise HTTPException(500, f"Failed to upload document: {str(e)}")

    # Save to temp file for ingestion (ingest_pdf needs a file path)
    temp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(contents)
            temp_file_path = temp_file.name

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

        # Ingest into this document's own Pinecone namespace.
        # Pass db so chunks are also persisted to PostgreSQL for BM25 hybrid search.
        result = ingest_pdf(
            temp_file_path,
            namespace=doc_id,
            db=db,
            user_id=current_user.id,
            document_id=doc_id,
        )
        
        # Log usage for plan tracking
        log_usage(db, current_user.id, "upload", {"document_id": doc_id, "filename": file.filename})

        return {
            "message":     result,
            "filename":    file.filename,
            "document_id": doc_id,
            "file_path":   stored_filename
        }
    finally:
        # Clean up temp file
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

# ── Serve Document Files ───────────────────────────────────
@app.get("/files/{document_id}")
async def get_document_file(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a signed URL for a document or redirect to it"""
    # Find the document
    doc = db.query(Document).filter(Document.id == document_id).first()
    
    if not doc:
        raise HTTPException(404, "Document not found")
    
    # Ensure user owns this document
    if doc.user_id != current_user.id:
        raise HTTPException(403, "Access denied")
    
    # Get signed URL from Supabase (valid for 1 hour)
    url = get_document_url(current_user.id, doc.file_path, expires_in=3600)
    
    if not url:
        raise HTTPException(500, "Could not generate document URL")
    
    return {"url": url, "filename": doc.filename}

@app.get("/files/{document_id}/download")
async def download_document_file(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a document file directly"""
    # Find the document
    doc = db.query(Document).filter(Document.id == document_id).first()
    
    if not doc:
        raise HTTPException(404, "Document not found")
    
    # Ensure user owns this document
    if doc.user_id != current_user.id:
        raise HTTPException(403, "Access denied")
    
    # Download from Supabase
    contents = download_document(current_user.id, doc.file_path)
    
    if not contents:
        raise HTTPException(500, "Could not download document")
    
    return Response(
        content=contents,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{doc.filename}"'}
    )

# ── Query ──────────────────────────────────────────────────
@app.post("/query")
@limiter.limit("20/day")
async def query(
    request: Request,
    req: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ═══ PLAN ENFORCEMENT ═══════════════════════════════════
    from plan_limits import check_question_limit, log_usage
    
    question_limit = check_question_limit(db, current_user.id, current_user.plan)
    if not question_limit["can_ask"]:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Question limit reached",
                "message": f"Your {current_user.plan.title()} plan allows {question_limit['max_allowed']} questions per month. You've used {question_limit['current_count']}.",
                "upgrade_required": True,
                "current_plan": current_user.plan,
                "questions_used": question_limit["current_count"],
                "questions_limit": question_limit["max_allowed"]
            }
        )
    
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
    
    # Log usage for plan tracking
    log_usage(db, current_user.id, "question", {"document_id": active_doc.id, "question": req.question[:100]})

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

# ── Payment Endpoints ──────────────────────────────────────
from payment import (
    create_order, verify_payment_signature, is_razorpay_configured, 
    calculate_expiry_date, get_plan_level, PLAN_PRICES, calculate_proration, GST_RATE
)

@app.get("/payment/calculate-upgrade")
async def calculate_upgrade_price(
    plan: str,
    billing_cycle: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate prorated price with GST breakdown for plan changes.
    
    IMPORTANT: Credit is calculated based on what user ACTUALLY PAID, not base plan price.
    This prevents exploit where users use coupons and get credit for full price.
    
    Allowed transitions:
    - Free → Any paid plan (monthly or yearly)
    - Any paid plan → Higher tier (monthly or yearly)
    - Any paid monthly → Same plan yearly (billing cycle upgrade)
    - Any paid plan → Lower tier yearly (switching to yearly of lower tier)
    
    NOT allowed:
    - Same plan + same cycle (no change)
    - Lower tier monthly (downgrade)
    
    Returns full price breakdown including GST.
    """
    if plan not in ["basic", "pro"]:
        raise HTTPException(400, "Invalid plan. Choose 'basic' or 'pro'.")
    
    if billing_cycle not in ["monthly", "yearly"]:
        raise HTTPException(400, "Invalid billing cycle. Choose 'monthly' or 'yearly'.")
    
    current_plan_level = get_plan_level(current_user.plan)
    new_plan_level = get_plan_level(plan)
    current_billing_cycle = current_user.billing_cycle or "monthly"
    
    # Check if this is a valid transition
    is_same_plan = plan == current_user.plan
    is_same_cycle = billing_cycle == current_billing_cycle
    is_lower_tier = new_plan_level < current_plan_level
    is_higher_tier = new_plan_level > current_plan_level
    
    # Block: same plan + same cycle
    if is_same_plan and is_same_cycle:
        raise HTTPException(400, "You're already on this plan with this billing cycle.")
    
    # Block: same plan + yearly → monthly (downgrade billing cycle)
    if is_same_plan and current_billing_cycle == "yearly" and billing_cycle == "monthly":
        raise HTTPException(400, "Cannot switch from yearly to monthly billing. Your yearly plan is a better value!")
    
    # Block: lower tier + monthly (pure downgrade)
    if is_lower_tier and billing_cycle == "monthly":
        raise HTTPException(400, "Cannot downgrade to a lower tier monthly plan.")
    
    # Block: lower tier + yearly IF user is already on yearly billing
    # Business logic: They already committed yearly at higher tier, switching to lower yearly = refund
    if is_lower_tier and current_billing_cycle == "yearly":
        raise HTTPException(400, "Cannot switch to a lower tier when you're already on yearly billing. Your current plan offers more value!")
    
    # CRITICAL: Fetch actual amount paid for current plan (prevents coupon exploit)
    # Get the most recent successful payment for current plan
    actual_amount_paid = None
    if current_user.plan != "free" and current_user.plan_started_at:
        latest_payment = db.query(Payment).filter(
            Payment.user_id == current_user.id,
            Payment.plan == current_user.plan,
            Payment.billing_cycle == current_user.billing_cycle,
            Payment.status == "success"
        ).order_by(Payment.completed_at.desc()).first()
        
        if latest_payment:
            # Use the total amount actually paid (includes GST, after all discounts)
            actual_amount_paid = latest_payment.amount
    
    # Allow: same plan + monthly → yearly (billing cycle upgrade)
    # Allow: higher tier (any cycle)
    # Allow: lower tier + yearly ONLY if user is on monthly (yearly commitment is valuable)
    
    # Calculate proration using ACTUAL amount paid
    breakdown = calculate_proration(
        current_plan=current_user.plan,
        current_billing_cycle=current_user.billing_cycle or "monthly",
        plan_started_at=current_user.plan_started_at,
        plan_expires_at=current_user.plan_expires_at,
        new_plan=plan,
        new_billing_cycle=billing_cycle,
        actual_amount_paid=actual_amount_paid  # Pass actual paid amount
    )
    
    return {
        **breakdown,
        "current_plan": {
            "plan": current_user.plan,
            "billing_cycle": current_user.billing_cycle,
            "started_at": current_user.plan_started_at.isoformat() if current_user.plan_started_at else None,
            "expires_at": current_user.plan_expires_at.isoformat() if current_user.plan_expires_at else None
        },
        "new_plan": {
            "plan": plan,
            "billing_cycle": billing_cycle
        }
    }

@app.post("/payment/create-order")
@limiter.limit("5/minute")
async def create_payment_order(
    request: Request,
    req: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Razorpay order for subscription with proration"""
    if not is_razorpay_configured():
        raise HTTPException(500, "Payment service not configured. Please contact support.")
    
    if req.plan not in ["basic", "pro"]:
        raise HTTPException(400, "Invalid plan. Choose 'basic' or 'pro'.")
    
    if req.billing_cycle not in ["monthly", "yearly"]:
        raise HTTPException(400, "Invalid billing cycle. Choose 'monthly' or 'yearly'.")
    
    # Check if this is a valid transition
    current_plan_level = get_plan_level(current_user.plan)
    new_plan_level = get_plan_level(req.plan)
    current_billing_cycle = current_user.billing_cycle or "monthly"
    
    is_same_plan = req.plan == current_user.plan
    is_same_cycle = req.billing_cycle == current_billing_cycle
    is_lower_tier = new_plan_level < current_plan_level
    
    # Block: same plan + same cycle
    if is_same_plan and is_same_cycle:
        raise HTTPException(400, "You're already on this plan with this billing cycle.")
    
    # Block: same plan + yearly → monthly (downgrade billing cycle)
    if is_same_plan and current_billing_cycle == "yearly" and req.billing_cycle == "monthly":
        raise HTTPException(400, "Cannot switch from yearly to monthly billing.")
    
    # Block: lower tier + monthly (pure downgrade)
    if is_lower_tier and req.billing_cycle == "monthly":
        raise HTTPException(400, "Cannot downgrade to a lower tier monthly plan.")
    
    # Block: lower tier + yearly IF user is already on yearly billing
    if is_lower_tier and current_billing_cycle == "yearly":
        raise HTTPException(400, "Cannot switch to a lower tier when you're already on yearly billing.")
    
    try:
        # CRITICAL: Fetch actual amount paid for current plan (prevents coupon exploit)
        actual_amount_paid = None
        if current_user.plan != "free" and current_user.plan_started_at:
            latest_payment = db.query(Payment).filter(
                Payment.user_id == current_user.id,
                Payment.plan == current_user.plan,
                Payment.billing_cycle == current_user.billing_cycle,
                Payment.status == "success"
            ).order_by(Payment.completed_at.desc()).first()
            
            if latest_payment:
                actual_amount_paid = latest_payment.amount
        
        # Calculate prorated amount using ACTUAL paid amount
        breakdown = calculate_proration(
            current_plan=current_user.plan,
            current_billing_cycle=current_user.billing_cycle or "monthly",
            plan_started_at=current_user.plan_started_at,
            plan_expires_at=current_user.plan_expires_at,
            new_plan=req.plan,
            new_billing_cycle=req.billing_cycle,
            actual_amount_paid=actual_amount_paid
        )
        
        # Apply coupon discount if provided
        coupon_discount = 0
        if req.coupon_code:
            coupon = db.query(Coupon).filter(Coupon.id == req.coupon_code.strip().upper()).first()
            if coupon and coupon.is_active:
                if coupon.discount_type == "percentage":
                    coupon_discount = round(breakdown["subtotal"] * (coupon.discount_value / 100), 2)
                else:
                    coupon_discount = min(coupon.discount_value, breakdown["subtotal"])
        
        # Calculate final amount with coupon
        adjusted_subtotal = max(0, breakdown["subtotal"] - coupon_discount)
        adjusted_gst = adjusted_subtotal * (breakdown["gst_rate"] / 100)
        adjusted_total = adjusted_subtotal + adjusted_gst
        
        # Convert total (in rupees) to paise for Razorpay
        amount_paise = int(adjusted_total * 100)
        
        # Minimum amount check (Razorpay minimum is ₹1)
        if amount_paise < 100:
            amount_paise = 100  # Minimum ₹1
        
        order_data = create_order(req.plan, req.billing_cycle, current_user.email, amount_paise)
        
        # Include breakdown in response with coupon info
        order_data["breakdown"] = {
            **breakdown,
            "coupon_code": req.coupon_code.upper() if req.coupon_code else None,
            "coupon_discount": coupon_discount,
            "adjusted_subtotal": adjusted_subtotal,
            "adjusted_gst": adjusted_gst,
            "adjusted_total": adjusted_total
        }
        
        return order_data
    except Exception as e:
        raise HTTPException(500, f"Failed to create order: {str(e)}")

@app.post("/payment/verify")
@limiter.limit("10/minute")
async def verify_payment(
    request: Request,
    req: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify Razorpay payment and upgrade user plan"""
    if not is_razorpay_configured():
        raise HTTPException(500, "Payment service not configured.")
    
    # Verify signature
    is_valid = verify_payment_signature(
        req.razorpay_order_id,
        req.razorpay_payment_id,
        req.razorpay_signature
    )
    
    if not is_valid:
        raise HTTPException(400, "Payment verification failed. Invalid signature.")
    
    # Update user plan
    if req.plan not in ["basic", "pro"]:
        raise HTTPException(400, "Invalid plan.")
    
    now = datetime.utcnow()
    
    # CRITICAL: Fetch actual amount paid for current plan (prevents coupon exploit)
    actual_amount_paid = None
    if current_user.plan != "free" and current_user.plan_started_at:
        latest_payment = db.query(Payment).filter(
            Payment.user_id == current_user.id,
            Payment.plan == current_user.plan,
            Payment.billing_cycle == current_user.billing_cycle,
            Payment.status == "success"
        ).order_by(Payment.completed_at.desc()).first()
        
        if latest_payment:
            actual_amount_paid = latest_payment.amount
    
    # Calculate amounts for payment record using ACTUAL paid amount
    breakdown = calculate_proration(
        current_plan=current_user.plan,
        current_billing_cycle=current_user.billing_cycle or "monthly",
        plan_started_at=current_user.plan_started_at,
        plan_expires_at=current_user.plan_expires_at,
        new_plan=req.plan,
        new_billing_cycle=req.billing_cycle,
        actual_amount_paid=actual_amount_paid
    )
    
    # Handle coupon if provided
    coupon_discount = 0
    if req.coupon_code:
        coupon = db.query(Coupon).filter(Coupon.id == req.coupon_code.strip().upper()).first()
        if coupon and coupon.is_active:
            if coupon.discount_type == "percentage":
                coupon_discount = round(breakdown["subtotal"] * (coupon.discount_value / 100), 2)
            else:
                coupon_discount = min(coupon.discount_value, breakdown["subtotal"])
            
            # Record coupon usage
            coupon_usage = CouponUsage(
                coupon_id=coupon.id,
                user_id=current_user.id
            )
            db.add(coupon_usage)
            coupon.used_count += 1
    
    # Calculate final amounts with coupon
    adjusted_subtotal = max(0, breakdown["subtotal"] - coupon_discount)
    adjusted_gst = adjusted_subtotal * (breakdown["gst_rate"] / 100)
    adjusted_total = adjusted_subtotal + adjusted_gst
    
    # Create payment record
    payment = Payment(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        razorpay_order_id=req.razorpay_order_id,
        razorpay_payment_id=req.razorpay_payment_id,
        plan=req.plan,
        billing_cycle=req.billing_cycle,
        amount=adjusted_total,
        base_amount=breakdown["base_price"],
        discount_amount=breakdown["credit"] + coupon_discount,
        gst_amount=adjusted_gst,
        coupon_code=req.coupon_code.strip().upper() if req.coupon_code else None,
        status="success",
        completed_at=now
    )
    db.add(payment)
    
    # Update user plan
    current_user.plan = req.plan
    current_user.billing_cycle = req.billing_cycle
    current_user.plan_started_at = now
    # Use the calculated expiry date from breakdown (accounts for extended time from credit)
    current_user.plan_expires_at = datetime.fromisoformat(breakdown["new_plan_expires_at"].replace('Z', '+00:00'))
    current_user.cancelled_at = None  # Clear any previous cancellation
    db.commit()
    
    return {
        "success": True,
        "message": f"Successfully upgraded to {req.plan.capitalize()} plan ({req.billing_cycle})",
        "plan": req.plan,
        "billing_cycle": req.billing_cycle,
        "expires_at": current_user.plan_expires_at.isoformat(),
        "payment_id": payment.id
    }

@app.get("/payment/prices")
def get_prices():
    """Get current plan prices"""
    return {
        "basic": {
            "monthly": PLAN_PRICES["basic"]["monthly"] / 100,
            "yearly": PLAN_PRICES["basic"]["yearly"] / 100,
        },
        "pro": {
            "monthly": PLAN_PRICES["pro"]["monthly"] / 100,
            "yearly": PLAN_PRICES["pro"]["yearly"] / 100,
        }
    }

# ── Coupon Endpoints ──────────────────────────────────────
@app.post("/coupon/validate")
async def validate_coupon(
    req: ValidateCouponRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate a coupon code and return discount details"""
    code = req.code.strip().upper()
    
    coupon = db.query(Coupon).filter(Coupon.id == code).first()
    if not coupon:
        raise HTTPException(400, "Uh oh... we couldn't find that coupon code. Please check and try again!")
    
    if not coupon.is_active:
        raise HTTPException(400, "Uh oh... this coupon is no longer active. Try another one!")
    
    now = datetime.utcnow()
    if coupon.valid_from and coupon.valid_from > now:
        raise HTTPException(400, "Hmm... this coupon isn't active yet. Come back soon!")
    
    if coupon.valid_until and coupon.valid_until < now:
        raise HTTPException(400, "Uh oh... seems like this coupon has expired. Try another one!")
    
    if coupon.max_uses and coupon.used_count >= coupon.max_uses:
        raise HTTPException(400, "Oh no! This coupon has been fully redeemed. Try another one!")
    
    # Check per-user limit
    user_usage_count = db.query(CouponUsage).filter(
        CouponUsage.coupon_id == code,
        CouponUsage.user_id == current_user.id
    ).count()
    
    if user_usage_count >= coupon.per_user_limit:
        raise HTTPException(400, "You've already used this coupon! Each coupon can only be used once.")
    
    # Check applicable plans
    if coupon.applicable_plans:
        try:
            applicable = json.loads(coupon.applicable_plans)
            if req.plan not in applicable:
                plan_name = req.plan.capitalize()
                raise HTTPException(400, f"Oops! This coupon doesn't work for the {plan_name} plan. Try it with another plan!")
        except json.JSONDecodeError:
            pass
    
    # Calculate discount
    base_price = PLAN_PRICES[req.plan][req.billing_cycle] / 100  # Convert to rupees
    
    if coupon.min_amount and base_price < coupon.min_amount:
        raise HTTPException(400, f"This coupon requires a minimum order of ₹{int(coupon.min_amount)}. Try a yearly plan!")
    
    if coupon.discount_type == "percentage":
        discount = round(base_price * (coupon.discount_value / 100), 2)
    else:  # flat
        discount = min(coupon.discount_value, base_price)  # Can't discount more than price
    
    return {
        "valid": True,
        "code": code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "discount_amount": discount,
        "message": f"🎉 Coupon applied! You save ₹{discount:.0f}"
    }

@app.post("/subscription/cancel")
async def cancel_subscription(
    req: CancelSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel current subscription - will remain active until expiry"""
    if current_user.plan == "free":
        raise HTTPException(400, "You don't have an active subscription to cancel")
    
    if current_user.cancelled_at:
        raise HTTPException(400, "Your subscription is already cancelled")
    
    current_user.cancelled_at = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "message": "Your subscription has been cancelled",
        "active_until": current_user.plan_expires_at.isoformat() if current_user.plan_expires_at else None,
        "note": "You'll retain access to premium features until your current billing period ends"
    }

@app.get("/billing/history")
async def get_billing_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's billing/payment history"""
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.id,
        Payment.status == "success"
    ).order_by(Payment.created_at.desc()).limit(20).all()
    
    return {
        "payments": [
            {
                "id": p.id,
                "date": p.created_at.isoformat(),
                "plan": p.plan,
                "billing_cycle": p.billing_cycle,
                "amount": p.amount,
                "base_amount": p.base_amount,
                "discount": p.discount_amount,
                "gst": p.gst_amount,
                "coupon": p.coupon_code,
                "payment_method": p.payment_method,
                "razorpay_payment_id": p.razorpay_payment_id
            }
            for p in payments
        ],
        "current_plan": {
            "plan": current_user.plan,
            "billing_cycle": current_user.billing_cycle,
            "started_at": current_user.plan_started_at.isoformat() if current_user.plan_started_at else None,
            "expires_at": current_user.plan_expires_at.isoformat() if current_user.plan_expires_at else None,
            "cancelled": current_user.cancelled_at is not None
        }
    }

# ── Analytics ─────────────────────────────────────────────
@app.get("/analytics")
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Usage analytics for the current user.

    Returns:
    - Total queries and uploads this month
    - Daily query counts for the last 30 days (for trend chart)
    - Total document and conversation counts
    - Top documents by query volume
    """
    from sqlalchemy import func
    from database import UsageLog, Document, Conversation

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = now - timedelta(days=30)

    # ── Monthly totals ───────────────────────────────────────
    monthly_queries = db.query(UsageLog).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.action == "question",
        UsageLog.created_at >= month_start,
    ).count()

    monthly_uploads = db.query(UsageLog).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.action == "upload",
        UsageLog.created_at >= month_start,
    ).count()

    # ── All-time totals ──────────────────────────────────────
    total_queries = db.query(UsageLog).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.action == "question",
    ).count()

    total_documents = db.query(Document).filter(
        Document.user_id == current_user.id,
    ).count()

    # ── Daily query trend (last 30 days) ─────────────────────
    # Produces a list of {date, count} objects for charting
    daily_rows = (
        db.query(
            func.date(UsageLog.created_at).label("day"),
            func.count(UsageLog.id).label("count"),
        )
        .filter(
            UsageLog.user_id == current_user.id,
            UsageLog.action == "question",
            UsageLog.created_at >= thirty_days_ago,
        )
        .group_by(func.date(UsageLog.created_at))
        .order_by(func.date(UsageLog.created_at))
        .all()
    )
    daily_trend = [{"date": str(row.day), "queries": row.count} for row in daily_rows]

    # ── Top documents by query count ─────────────────────────
    # Joins UsageLog with Document to surface most-queried files
    doc_rows = (
        db.query(
            UsageLog.extra_data,
            func.count(UsageLog.id).label("count"),
        )
        .filter(
            UsageLog.user_id == current_user.id,
            UsageLog.action == "question",
        )
        .group_by(UsageLog.extra_data)
        .order_by(func.count(UsageLog.id).desc())
        .limit(5)
        .all()
    )

    top_documents = []
    seen_doc_ids = set()
    for row in doc_rows:
        try:
            data = json.loads(row.extra_data or "{}")
            doc_id = data.get("document_id")
            if not doc_id or doc_id in seen_doc_ids:
                continue
            seen_doc_ids.add(doc_id)
            doc = db.query(Document).filter(Document.id == doc_id).first()
            top_documents.append({
                "document_id": doc_id,
                "filename": doc.filename if doc else "Unknown",
                "query_count": row.count,
            })
        except (json.JSONDecodeError, AttributeError):
            continue

    return {
        "monthly": {
            "queries": monthly_queries,
            "uploads": monthly_uploads,
            "month": month_start.strftime("%B %Y"),
        },
        "all_time": {
            "queries": total_queries,
            "documents": total_documents,
        },
        "daily_trend": daily_trend,
        "top_documents": top_documents,
    }


# ── Health ─────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}