"""
Supabase Storage service for all file storage needs.

Supabase Storage free tier includes:
- 1GB storage
- 2GB bandwidth/month
- Perfect for profile images and PDF documents

Setup:
1. Create project at https://supabase.com (free)
2. Go to Storage and create buckets:
   - 'profile-images' (public)
   - 'documents' (private)
3. Set environment variables:
   - SUPABASE_URL (e.g., https://xxx.supabase.co)
   - SUPABASE_SERVICE_KEY (service_role key, not anon key)
"""

import os
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Bucket names
PROFILE_IMAGES_BUCKET = "profile-images"
DOCUMENTS_BUCKET = "documents"

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """Get or create Supabase client singleton"""
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        return None
    
    _supabase_client = create_client(url, key)
    return _supabase_client


def is_supabase_configured() -> bool:
    """Check if Supabase is properly configured"""
    return all([
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY")
    ])


def ensure_buckets_exist():
    """Ensure required storage buckets exist (call on startup)"""
    client = get_supabase_client()
    if not client:
        return
    
    try:
        # List existing buckets
        existing = client.storage.list_buckets()
        existing_names = [b.name for b in existing]
        
        # Create profile-images bucket (public)
        if PROFILE_IMAGES_BUCKET not in existing_names:
            client.storage.create_bucket(
                PROFILE_IMAGES_BUCKET,
                options={"public": True}
            )
        
        # Create documents bucket (private)
        if DOCUMENTS_BUCKET not in existing_names:
            client.storage.create_bucket(
                DOCUMENTS_BUCKET,
                options={"public": False}
            )
    except Exception as e:
        print(f"Warning: Could not ensure buckets exist: {e}")


# ── Profile Image Functions ────────────────────────────────────

def upload_profile_image(file_data: bytes, user_id: str, filename: str) -> dict:
    """
    Upload a profile image to Supabase Storage.
    
    Args:
        file_data: Raw image bytes
        user_id: User ID for organizing images
        filename: Original filename (used for extension)
    
    Returns:
        dict with 'url' key
    """
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
    
    # Get file extension
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        ext = "jpg"
    
    # Store as: {user_id}/avatar.{ext}
    file_path = f"{user_id}/avatar.{ext}"
    
    # Delete existing avatar if any (different extension)
    try:
        existing = client.storage.from_(PROFILE_IMAGES_BUCKET).list(user_id)
        for f in existing:
            if f["name"].startswith("avatar."):
                client.storage.from_(PROFILE_IMAGES_BUCKET).remove([f"{user_id}/{f['name']}"])
    except Exception:
        pass  # Ignore errors when cleaning up
    
    # Upload new image
    content_type = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "webp": "image/webp"
    }.get(ext, "image/jpeg")
    
    result = client.storage.from_(PROFILE_IMAGES_BUCKET).upload(
        file_path,
        file_data,
        file_options={"content-type": content_type, "upsert": "true"}
    )
    
    # Get public URL
    url_response = client.storage.from_(PROFILE_IMAGES_BUCKET).get_public_url(file_path)
    
    return {"url": url_response}


def delete_profile_image(user_id: str) -> bool:
    """
    Delete a user's profile image from Supabase Storage.
    
    Args:
        user_id: User ID
    
    Returns:
        True if deleted, False if not found or error
    """
    client = get_supabase_client()
    if not client:
        return False
    
    try:
        # List and delete all avatars for this user
        existing = client.storage.from_(PROFILE_IMAGES_BUCKET).list(user_id)
        files_to_delete = [f"{user_id}/{f['name']}" for f in existing if f["name"].startswith("avatar.")]
        
        if files_to_delete:
            client.storage.from_(PROFILE_IMAGES_BUCKET).remove(files_to_delete)
            return True
        return False
    except Exception:
        return False


def get_profile_image_url(user_id: str) -> Optional[str]:
    """
    Get the URL for a user's profile image.
    
    Args:
        user_id: User ID
    
    Returns:
        URL string or None if not found
    """
    client = get_supabase_client()
    if not client:
        return None
    
    try:
        existing = client.storage.from_(PROFILE_IMAGES_BUCKET).list(user_id)
        for f in existing:
            if f["name"].startswith("avatar."):
                return client.storage.from_(PROFILE_IMAGES_BUCKET).get_public_url(f"{user_id}/{f['name']}")
        return None
    except Exception:
        return None


# ── Document (PDF) Functions ───────────────────────────────────

def upload_document(file_data: bytes, user_id: str, doc_id: str, filename: str) -> dict:
    """
    Upload a PDF document to Supabase Storage.
    
    Args:
        file_data: Raw PDF bytes
        user_id: User ID for organizing documents
        doc_id: Unique document ID
        filename: Original filename
    
    Returns:
        dict with 'path' and 'url' keys
    """
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
    
    # Store as: {user_id}/{doc_id}_{filename}
    # This matches the previous local storage pattern
    stored_filename = f"{doc_id}_{filename}"
    file_path = f"{user_id}/{stored_filename}"
    
    result = client.storage.from_(DOCUMENTS_BUCKET).upload(
        file_path,
        file_data,
        file_options={"content-type": "application/pdf", "upsert": "true"}
    )
    
    # Generate a signed URL for private access (valid for 1 hour)
    signed_url = client.storage.from_(DOCUMENTS_BUCKET).create_signed_url(
        file_path,
        expires_in=3600  # 1 hour
    )
    
    return {
        "path": file_path,
        "stored_filename": stored_filename,
        "url": signed_url.get("signedURL") if isinstance(signed_url, dict) else signed_url
    }


def get_document_url(user_id: str, stored_filename: str, expires_in: int = 3600) -> Optional[str]:
    """
    Get a signed URL for a document.
    
    Args:
        user_id: User ID
        stored_filename: Stored filename (doc_id_originalname.pdf)
        expires_in: URL expiration time in seconds (default 1 hour)
    
    Returns:
        Signed URL or None if not found
    """
    client = get_supabase_client()
    if not client:
        return None
    
    try:
        file_path = f"{user_id}/{stored_filename}"
        result = client.storage.from_(DOCUMENTS_BUCKET).create_signed_url(
            file_path,
            expires_in=expires_in
        )
        return result.get("signedURL") if isinstance(result, dict) else result
    except Exception:
        return None


def download_document(user_id: str, stored_filename: str) -> Optional[bytes]:
    """
    Download a document's contents.
    
    Args:
        user_id: User ID
        stored_filename: Stored filename
    
    Returns:
        File contents as bytes or None if not found
    """
    client = get_supabase_client()
    if not client:
        return None
    
    try:
        file_path = f"{user_id}/{stored_filename}"
        response = client.storage.from_(DOCUMENTS_BUCKET).download(file_path)
        return response
    except Exception:
        return None


def delete_document(user_id: str, stored_filename: str) -> bool:
    """
    Delete a document from storage.
    
    Args:
        user_id: User ID
        stored_filename: Stored filename
    
    Returns:
        True if deleted, False otherwise
    """
    client = get_supabase_client()
    if not client:
        return False
    
    try:
        file_path = f"{user_id}/{stored_filename}"
        client.storage.from_(DOCUMENTS_BUCKET).remove([file_path])
        return True
    except Exception:
        return False


def delete_all_user_documents(user_id: str) -> bool:
    """
    Delete all documents for a user.
    
    Args:
        user_id: User ID
    
    Returns:
        True if successful, False otherwise
    """
    client = get_supabase_client()
    if not client:
        return False
    
    try:
        # List all files in user's folder
        files = client.storage.from_(DOCUMENTS_BUCKET).list(user_id)
        if files:
            paths = [f"{user_id}/{f['name']}" for f in files]
            client.storage.from_(DOCUMENTS_BUCKET).remove(paths)
        return True
    except Exception:
        return False
