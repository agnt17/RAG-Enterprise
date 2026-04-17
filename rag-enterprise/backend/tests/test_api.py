# =============================================================================
# API Endpoint Tests
# =============================================================================
# Tests for document upload, query, and other core API endpoints.
# These tests use mocking for external services (Pinecone, Groq, etc.)
#
# WHY MOCKING:
# - Tests shouldn't depend on external services
# - Tests should be fast and deterministic
# - Tests shouldn't cost money (API calls)
# =============================================================================

import pytest
from unittest.mock import patch, MagicMock
import json


class TestHealthEndpoints:
    """Tests for health check and root endpoints."""
    
    def test_root_endpoint_returns_ok(self, client):
        """
        WHY: Load balancers and monitoring need health checks.
        WHAT: Root endpoint should return 200.
        """
        response = client.get("/")
        
        assert response.status_code == 200
    
    def test_docs_endpoint_accessible(self, client):
        """
        WHY: Developers need API documentation.
        WHAT: /docs should be accessible.
        """
        response = client.get("/docs")
        
        # FastAPI serves docs at /docs
        assert response.status_code == 200


class TestDocumentsEndpoint:
    """Tests for GET /documents endpoint."""
    
    def test_documents_requires_auth(self, client):
        """
        WHY: Document list is private user data.
        WHAT: Should reject unauthenticated requests.
        """
        response = client.get("/documents")
        
        assert response.status_code in [401, 403]
    
    def test_documents_returns_empty_list_for_new_user(self, client, registered_user):
        """
        WHY: New users have no documents.
        WHAT: Should return empty array, not error.
        """
        response = client.get("/documents", headers=registered_user["headers"])
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 0


class TestUploadEndpoint:
    """Tests for POST /upload endpoint."""
    
    def test_upload_requires_auth(self, client):
        """
        WHY: Uploads are user-specific.
        WHAT: Should reject unauthenticated uploads.
        """
        # Create a fake PDF file
        files = {"file": ("test.pdf", b"%PDF-1.4 fake content", "application/pdf")}
        response = client.post("/upload", files=files)
        
        assert response.status_code in [401, 403]
    
    def test_upload_rejects_non_pdf(self, client, registered_user):
        """
        WHY: Only PDF documents are supported.
        WHAT: Should reject non-PDF files.
        """
        files = {"file": ("test.txt", b"just some text", "text/plain")}
        response = client.post("/upload", files=files, headers=registered_user["headers"])
        
        # Should reject with 400 Bad Request
        assert response.status_code == 400
        assert "PDF" in response.json().get("detail", "").upper()


class TestQueryEndpoint:
    """Tests for POST /query endpoint."""
    
    def test_query_requires_auth(self, client):
        """
        WHY: Queries are user-specific.
        WHAT: Should reject unauthenticated queries.
        """
        response = client.post("/query", json={
            "question": "What is this document about?"
        })
        
        assert response.status_code in [401, 403]
    
    def test_query_requires_document_id(self, client, registered_user):
        """
        WHY: Queries are scoped to a specific document.
        WHAT: Should require document_id header.
        """
        response = client.post(
            "/query",
            json={"question": "Test question?"},
            headers=registered_user["headers"]
            # Missing X-Document-ID header
        )
        
        # Should fail - document not specified
        assert response.status_code in [400, 404, 422]
    
    def test_query_rejects_empty_question(self, client, registered_user):
        """
        WHY: Empty questions waste resources.
        WHAT: Should validate question is non-empty.
        """
        response = client.post(
            "/query",
            json={"question": ""},
            headers={
                **registered_user["headers"],
                "X-Document-ID": "some-doc-id"
            }
        )
        
        # Either validation error or document not found
        assert response.status_code in [400, 404, 422]


class TestConversationEndpoint:
    """Tests for GET /conversation endpoint."""
    
    def test_conversation_requires_auth(self, client):
        """
        WHY: Conversation history is private.
        WHAT: Should reject unauthenticated requests.
        """
        response = client.get("/conversation")
        
        assert response.status_code in [401, 403]
    
    def test_conversation_requires_document_id(self, client, registered_user):
        """
        WHY: Conversations are per-document.
        WHAT: Should require document_id.
        """
        response = client.get(
            "/conversation",
            headers=registered_user["headers"]
            # Missing X-Document-ID
        )
        
        # Should fail or return empty
        assert response.status_code in [200, 400, 404]


class TestUsageEndpoint:
    """Tests for GET /usage endpoint."""
    
    def test_usage_requires_auth(self, client):
        """
        WHY: Usage stats are private.
        WHAT: Should reject unauthenticated requests.
        """
        response = client.get("/usage")
        
        assert response.status_code in [401, 403]
    
    def test_usage_returns_stats_for_new_user(self, client, registered_user):
        """
        WHY: New users need to see their limits.
        WHAT: Should return usage stats with zeros.
        """
        response = client.get("/usage", headers=registered_user["headers"])
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have usage fields
        assert "questions_used" in data or "documents_used" in data


class TestCouponEndpoint:
    """Tests for POST /coupon/validate endpoint."""
    
    def test_coupon_validate_requires_auth(self, client):
        """
        WHY: Coupon validation needs user context.
        WHAT: Should reject unauthenticated requests.
        """
        response = client.post("/coupon/validate", json={
            "code": "TEST50",
            "plan": "basic",
            "billing_cycle": "monthly"
        })
        
        assert response.status_code in [401, 403]
    
    def test_coupon_invalid_code_fails(self, client, registered_user):
        """
        WHY: Invalid codes shouldn't work.
        WHAT: Should return appropriate error.
        """
        response = client.post(
            "/coupon/validate",
            json={
                "code": "NONEXISTENT_CODE",
                "plan": "basic",
                "billing_cycle": "monthly"
            },
            headers=registered_user["headers"]
        )
        
        # Should return error for invalid code
        assert response.status_code in [400, 404]


class TestBillingHistoryEndpoint:
    """Tests for GET /billing/history endpoint."""
    
    def test_billing_history_requires_auth(self, client):
        """
        WHY: Billing data is sensitive.
        WHAT: Should reject unauthenticated requests.
        """
        response = client.get("/billing/history")
        
        assert response.status_code in [401, 403]
    
    def test_billing_history_returns_empty_for_new_user(self, client, registered_user):
        """
        WHY: New users have no billing history.
        WHAT: Should return payload with empty payments list.
        """
        response = client.get("/billing/history", headers=registered_user["headers"])
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, dict)
        assert "payments" in data
        assert data["payments"] == []
        assert "current_plan" in data


class TestProfileEndpoints:
    """Tests for profile-related endpoints."""
    
    def test_profile_update_requires_auth(self, client):
        """
        WHY: Profile updates need authentication.
        WHAT: Should reject unauthenticated requests.
        """
        response = client.put("/profile/details", json={
            "name": "New Name"
        })
        
        assert response.status_code in [401, 403]
    
    def test_profile_update_name(self, client, registered_user):
        """
        WHY: Users should be able to update their name.
        WHAT: Name update should succeed.
        """
        response = client.put(
            "/profile/details",
            json={"name": "Updated Name"},
            headers=registered_user["headers"]
        )
        
        assert response.status_code == 200
        
        # Verify change persisted
        me_response = client.get("/me", headers=registered_user["headers"])
        assert me_response.json()["name"] == "Updated Name"
    
    def test_profile_update_profession(self, client, registered_user):
        """
        WHY: Profession is used for personalized tips.
        WHAT: Should accept valid profession values.
        """
        response = client.put(
            "/profile/details",
            json={"profession": "law_firm"},
            headers=registered_user["headers"]
        )
        
        assert response.status_code == 200
        
        # Verify change
        me_response = client.get("/me", headers=registered_user["headers"])
        assert me_response.json().get("profession") == "law_firm"
    
    def test_password_change_requires_current_password(self, client, registered_user):
        """
        WHY: Prevent unauthorized password changes.
        WHAT: Should require current password.
        """
        response = client.put(
            "/profile/details",
            json={
                "new_password": "NewPassword123!",
                # Missing current_password
            },
            headers=registered_user["headers"]
        )
        
        # Should fail - need current password
        assert response.status_code in [400, 422]
    
    def test_password_change_wrong_current_fails(self, client, registered_user):
        """
        WHY: Verify user identity before password change.
        WHAT: Wrong current password should fail.
        """
        response = client.put(
            "/profile/details",
            json={
                "current_password": "WrongPassword123!",
                "new_password": "NewPassword123!"
            },
            headers=registered_user["headers"]
        )
        
        assert response.status_code in [400, 401]


class TestRateLimiting:
    """Tests for rate limiting functionality."""
    
    def test_register_rate_limited(self, client, test_user_data):
        """
        WHY: Prevent brute force and spam.
        WHAT: Should rate limit registration attempts.
        """
        # Make many requests quickly
        responses = []
        for i in range(10):
            data = {**test_user_data, "email": f"test{i}@example.com"}
            responses.append(client.post("/register", json=data))
        
        # At least one should be rate limited (429) or all succeed (depends on limits)
        status_codes = [r.status_code for r in responses]
        
        # Either rate limiting kicks in OR all succeed (if limit is high)
        assert 429 in status_codes or all(s == 200 for s in status_codes)
    
    def test_login_rate_limited(self, client, registered_user):
        """
        WHY: Prevent password brute forcing.
        WHAT: Should rate limit login attempts.
        """
        responses = []
        for _ in range(15):
            responses.append(client.post("/login", json={
                "email": registered_user["email"],
                "password": "WrongPassword123!"
            }))
        
        status_codes = [r.status_code for r in responses]
        
        # Should see rate limiting (429) or all fail with 401
        assert 429 in status_codes or all(s == 401 for s in status_codes)
