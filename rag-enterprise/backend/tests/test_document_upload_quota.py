import uuid

from plan_limits import check_document_limit, log_usage
from database import User, Document
from auth import hash_password


def _create_user(db, email: str) -> User:
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        name="Quota User",
        hashed_password=hash_password("TestPass123!"),
        email_verified=True,
        plan="free",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_document_quota_counts_lifetime_uploads_not_active_docs(db):
    user = _create_user(db, "quota-lifetime@example.com")

    # Consume all 5 free-plan upload credits.
    for i in range(5):
        log_usage(db, user.id, "upload", {"document_id": f"doc-{i}"})

    # User deletes all physical docs (or has none) -> quota must still be exhausted.
    status = check_document_limit(db, user.id, "free")

    assert status["current_count"] == 5
    assert status["can_upload"] is False
    assert status["remaining"] == 0


def test_document_deletion_does_not_refund_upload_credit(db):
    user = _create_user(db, "quota-delete@example.com")

    # One accepted upload consumes one credit.
    log_usage(db, user.id, "upload", {"document_id": "doc-1"})

    # Simulate document existing then deleted.
    doc = Document(
        id=str(uuid.uuid4()),
        user_id=user.id,
        filename="sample.pdf",
        file_path="sample.pdf",
        file_size="100",
        chunk_count=1,
        is_active=True,
        status="ready",
    )
    db.add(doc)
    db.commit()

    db.delete(doc)
    db.commit()

    status = check_document_limit(db, user.id, "free")

    assert status["current_count"] == 1
    assert status["can_upload"] is True
    assert status["remaining"] == 4
