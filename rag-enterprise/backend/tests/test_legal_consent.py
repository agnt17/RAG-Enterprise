from unittest.mock import patch

from database import User
import main


def test_register_requires_terms_and_privacy_acceptance(client, test_user_data):
    payload = {**test_user_data, "accept_terms": False, "accept_privacy": False}

    response = client.post("/register", json=payload)

    assert response.status_code == 400
    assert "Terms of Service" in response.json().get("detail", "")


def test_register_persists_legal_acceptance_timestamps_and_versions(client, test_user_data, db):
    response = client.post("/register", json=test_user_data)

    assert response.status_code == 200

    user = db.query(User).filter(User.email == test_user_data["email"]).first()
    assert user is not None
    assert user.terms_accepted_at is not None
    assert user.privacy_accepted_at is not None
    assert user.terms_version == main.LEGAL_TERMS_VERSION
    assert user.privacy_version == main.LEGAL_PRIVACY_VERSION


def test_google_signup_requires_legal_acceptance_for_new_user(client):
    google_info = {
        "email": "google-new@example.com",
        "name": "Google User",
        "sub": "google-sub-123",
        "picture": "https://example.com/pic.jpg",
    }

    with patch("main.verify_google_token", return_value=google_info):
        response = client.post(
            "/auth/google",
            json={
                "token": "fake-token",
                "accept_terms": False,
                "accept_privacy": False,
            },
        )

    assert response.status_code == 400
    assert "Terms of Service" in response.json().get("detail", "")


def test_google_signup_persists_legal_acceptance_when_provided(client, db):
    google_info = {
        "email": "google-consent@example.com",
        "name": "Google Consent User",
        "sub": "google-sub-456",
        "picture": None,
    }

    with patch("main.verify_google_token", return_value=google_info):
        response = client.post(
            "/auth/google",
            json={
                "token": "fake-token",
                "accept_terms": True,
                "accept_privacy": True,
            },
        )

    assert response.status_code == 200

    user = db.query(User).filter(User.email == "google-consent@example.com").first()
    assert user is not None
    assert user.terms_accepted_at is not None
    assert user.privacy_accepted_at is not None
    assert user.terms_version == main.LEGAL_TERMS_VERSION
    assert user.privacy_version == main.LEGAL_PRIVACY_VERSION
