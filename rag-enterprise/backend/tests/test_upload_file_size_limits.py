from unittest.mock import patch

from database import User


def test_pro_plan_accepts_pdf_larger_than_25mb(client, registered_user, db):
    user = db.query(User).filter(User.id == registered_user["user_id"]).first()
    user.plan = "pro"
    db.commit()

    large_pdf = b"%PDF-1.4\n" + (b"0" * (26 * 1024 * 1024))
    files = {"file": ("large.pdf", large_pdf, "application/pdf")}

    with patch("main.is_supabase_configured", return_value=True), patch(
        "main.upload_document",
        return_value={"stored_filename": "large.pdf"},
    ), patch("main._run_ingest", return_value=None):
        response = client.post("/upload", files=files, headers=registered_user["headers"])

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "pending"
    assert payload["filename"] == "large.pdf"


def test_basic_plan_rejects_pdf_larger_than_50mb(client, registered_user, db):
    user = db.query(User).filter(User.id == registered_user["user_id"]).first()
    user.plan = "basic"
    db.commit()

    too_large_pdf = b"%PDF-1.4\n" + (b"0" * (51 * 1024 * 1024))
    files = {"file": ("too-large.pdf", too_large_pdf, "application/pdf")}

    with patch("main.is_supabase_configured", return_value=True):
        response = client.post("/upload", files=files, headers=registered_user["headers"])

    assert response.status_code == 403
    detail = response.json().get("detail", {})
    assert detail.get("error") == "File size limit exceeded"
    assert "50MB" in detail.get("message", "")


def test_free_plan_rejects_pdf_larger_than_10mb(client, registered_user, db):
    user = db.query(User).filter(User.id == registered_user["user_id"]).first()
    user.plan = "free"
    db.commit()

    too_large_pdf = b"%PDF-1.4\n" + (b"0" * (11 * 1024 * 1024))
    files = {"file": ("too-large-free.pdf", too_large_pdf, "application/pdf")}

    with patch("main.is_supabase_configured", return_value=True):
        response = client.post("/upload", files=files, headers=registered_user["headers"])

    assert response.status_code == 403
    detail = response.json().get("detail", {})
    assert detail.get("error") == "File size limit exceeded"
    assert "10MB" in detail.get("message", "")
