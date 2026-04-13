"""
Plan limits and enforcement for DocMind subscriptions.

This module defines plan tiers and enforces usage limits.
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

# ── Plan Configuration ─────────────────────────────────────
PLAN_LIMITS = {
    "free": {
        "max_documents": 5,
        "max_file_size_mb": 10,
        "max_questions_per_month": 100,
        "features": ["Basic AI model", "Email support"]
    },
    "basic": {
        "max_documents": 50,
        "max_file_size_mb": 50,
        "max_questions_per_month": 1000,
        "features": ["Advanced AI model", "Priority support", "Chat export"]
    },
    "pro": {
        "max_documents": float('inf'),  # Unlimited
        "max_file_size_mb": 100,
        "max_questions_per_month": float('inf'),  # Unlimited
        "features": ["Premium AI models", "24/7 support", "Team collaboration", "Custom branding"]
    },
    "enterprise": {
        "max_documents": float('inf'),
        "max_file_size_mb": 500,
        "max_questions_per_month": float('inf'),
        "features": ["Dedicated AI capacity", "Dedicated account manager", "Custom integrations", "SLA guarantee"]
    }
}


def get_plan_limits(plan: str) -> dict:
    """Get limits for a specific plan"""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])


def get_user_document_count(db: Session, user_id: str) -> int:
    """Count ALL documents for a user (for plan limits)"""
    from database import Document
    return db.query(Document).filter(
        Document.user_id == user_id
    ).count()


def get_user_uploaded_documents_count(db: Session, user_id: str) -> int:
    """Count lifetime accepted upload events for a user.

    This is intentionally not reduced by document deletion. It enforces
    plan quota as upload credits consumed, protecting business limits.
    """
    from database import UsageLog

    return db.query(UsageLog).filter(
        UsageLog.user_id == user_id,
        UsageLog.action == "upload"
    ).count()


def get_user_questions_this_month(db: Session, user_id: str) -> int:
    """Count questions asked this month by user"""
    from database import UsageLog
    
    # Get first day of current month
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    
    count = db.query(UsageLog).filter(
        UsageLog.user_id == user_id,
        UsageLog.action == "question",
        UsageLog.created_at >= month_start
    ).count()
    
    return count


def check_document_limit(db: Session, user_id: str, plan: str) -> dict:
    """Check if user can upload more documents"""
    limits = get_plan_limits(plan)
    current_count = get_user_uploaded_documents_count(db, user_id)
    max_docs = limits["max_documents"]
    
    can_upload = current_count < max_docs if max_docs != float('inf') else True
    
    return {
        "can_upload": can_upload,
        "current_count": current_count,
        "max_allowed": max_docs if max_docs != float('inf') else "Unlimited",
        "remaining": (max_docs - current_count) if max_docs != float('inf') else "Unlimited"
    }


def check_file_size_limit(plan: str, file_size_bytes: int) -> dict:
    """Check if file size is within plan limits"""
    limits = get_plan_limits(plan)
    max_size_bytes = limits["max_file_size_mb"] * 1024 * 1024
    
    return {
        "allowed": file_size_bytes <= max_size_bytes,
        "file_size_mb": round(file_size_bytes / (1024 * 1024), 2),
        "max_allowed_mb": limits["max_file_size_mb"]
    }


def check_question_limit(db: Session, user_id: str, plan: str) -> dict:
    """Check if user can ask more questions this month"""
    limits = get_plan_limits(plan)
    current_count = get_user_questions_this_month(db, user_id)
    max_questions = limits["max_questions_per_month"]
    
    can_ask = current_count < max_questions if max_questions != float('inf') else True
    
    return {
        "can_ask": can_ask,
        "current_count": current_count,
        "max_allowed": max_questions if max_questions != float('inf') else "Unlimited",
        "remaining": (max_questions - current_count) if max_questions != float('inf') else "Unlimited"
    }


def log_usage(db: Session, user_id: str, action: str, extra_data: dict = None):
    """Log a usage event (question, upload, etc.)"""
    from database import UsageLog
    
    log = UsageLog(
        user_id=user_id,
        action=action,
        extra_data=str(extra_data) if extra_data else None
    )
    db.add(log)
    db.commit()


def get_usage_summary(db: Session, user_id: str, plan: str) -> dict:
    """Get complete usage summary for a user"""
    limits = get_plan_limits(plan)
    
    doc_status = check_document_limit(db, user_id, plan)
    question_status = check_question_limit(db, user_id, plan)
    
    return {
        "plan": plan,
        "documents": {
            "used": doc_status["current_count"],
            "limit": doc_status["max_allowed"],
            "remaining": doc_status["remaining"]
        },
        "questions": {
            "used": question_status["current_count"],
            "limit": question_status["max_allowed"],
            "remaining": question_status["remaining"]
        },
        "file_size_limit_mb": limits["max_file_size_mb"],
        "features": limits["features"]
    }
