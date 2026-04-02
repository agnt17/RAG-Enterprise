# =============================================================================
# Backend Test Configuration (conftest.py)
# =============================================================================
# This file sets up the test environment for pytest.
# It creates an in-memory SQLite database and provides fixtures for testing.
#
# WHY CONFTEST.PY:
# - pytest automatically discovers this file
# - Fixtures defined here are available to ALL test files
# - Keeps test setup DRY (Don't Repeat Yourself)
# =============================================================================

import pytest
import sys
import os

# Add parent directory to path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set test environment variables BEFORE importing app
# WHY BEFORE: Some modules read env vars at import time
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret-key-for-testing"
os.environ["EMAIL_MODE"] = "console"  # Don't send real emails in tests
os.environ["GROQ_API_KEY"] = "test-key"
os.environ["COHERE_API_KEY"] = "test-key"
os.environ["PINECONE_API_KEY"] = "test-key"
os.environ["PINECONE_INDEX_NAME"] = "test-index"
os.environ["GOOGLE_CLIENT_ID"] = "test-client-id"

from database import Base, get_db
from main import app


# =============================================================================
# TEST DATABASE SETUP
# =============================================================================
# WHY SQLITE IN-MEMORY:
# - Fast: No disk I/O
# - Isolated: Each test run gets a fresh database
# - No cleanup needed: Memory is released when test ends
#
# WHY STATICPOOL:
# - SQLite in-memory DBs are per-connection
# - StaticPool reuses the same connection so tables persist across queries

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite + FastAPI
    poolclass=StaticPool,  # Keeps single connection alive
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Dependency override that uses our test database."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture(scope="function")
def db():
    """
    Provides a clean database for each test function.
    
    WHY FUNCTION SCOPE:
    - Each test gets isolated data
    - No state leaks between tests
    - Tests can run in any order
    """
    # Create all tables fresh
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Create a session
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Drop tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """
    Provides a FastAPI TestClient with database dependency overridden.
    
    WHY TESTCLIENT:
    - Simulates HTTP requests without starting real server
    - Fast: No network latency
    - Access to response headers, cookies, etc.
    """
    # Override the database dependency
    app.dependency_overrides[get_db] = override_get_db
    
    # Create fresh tables for this test
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Clean up override after test
    app.dependency_overrides.clear()


@pytest.fixture
def test_user_data():
    """Standard test user data for registration tests."""
    return {
        "email": "test@example.com",
        "password": "TestPass123!",  # Meets password requirements
        "name": "Test User"
    }


@pytest.fixture
def weak_passwords():
    """Collection of passwords that should fail validation."""
    return [
        ("short1!", "too short"),
        ("noletter123!", "no letters"),
        ("NoNumbers!", "no numbers"),
        ("NoSpecial123", "no special chars"),
    ]


@pytest.fixture
def registered_user(client, test_user_data, db):
    """
    Creates and returns a verified, logged-in user.
    Returns dict with user data and auth token.
    
    WHY THIS FIXTURE:
    - Many tests need an authenticated user
    - Reduces boilerplate in test functions
    """
    from database import User
    import uuid
    from auth import hash_password
    
    # Create user directly in DB (bypassing email verification)
    user = User(
        id=str(uuid.uuid4()),
        email=test_user_data["email"],
        name=test_user_data["name"],
        hashed_password=hash_password(test_user_data["password"]),
        email_verified=True,  # Skip verification for testing
    )
    
    # Get the db session from override
    db_session = TestingSessionLocal()
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    db_session.close()
    
    # Login to get token
    response = client.post("/login", json={
        "email": test_user_data["email"],
        "password": test_user_data["password"]
    })
    
    assert response.status_code == 200, f"Login failed: {response.json()}"
    data = response.json()
    
    return {
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "token": data["token"],
        "headers": {"Authorization": f"Bearer {data['token']}"}
    }


@pytest.fixture
def auth_headers(registered_user):
    """Just the auth headers for authenticated requests."""
    return registered_user["headers"]
