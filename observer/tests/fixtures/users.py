"""Pytest fixtures for user-related tests.

Provides seeded users (admin, clinician, standard) and authentication tokens
for integration testing.
"""

import uuid
from typing import AsyncGenerator
from uuid import UUID

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_user_ws, get_db
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.user import User, UserRole


@pytest.fixture
def test_user_id():
    """Provide consistent test user UUID."""
    return uuid.UUID("123e4567-e89b-12d3-a456-426614174000")


@pytest.fixture
def test_session_id():
    """Provide consistent test session UUID."""
    return uuid.UUID("789e0123-e89b-12d3-a456-426614174001")


@pytest_asyncio.fixture
async def seeded_user(test_db: AsyncSession, test_user_id: UUID) -> User:
    """Create a seeded user in the database."""
    user = User(
        id=test_user_id,
        email="test@example.com",
        password_hash=get_password_hash("test_password"),
        full_name="Test User",
        is_active=True,
        role=UserRole.USER,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest_asyncio.fixture
async def seeded_admin_user(test_db: AsyncSession) -> User:
    """Create a seeded admin user in the database."""
    user = User(
        email="admin@example.com",
        password_hash=get_password_hash("admin_password"),
        full_name="Admin User",
        is_active=True,
        role=UserRole.ADMIN,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest_asyncio.fixture
async def seeded_clinician_user(test_db: AsyncSession) -> User:
    """Create a seeded clinician user in the database."""
    user = User(
        email="clinician@example.com",
        password_hash=get_password_hash("clinician_password"),
        full_name="Dr. Clinician",
        is_active=True,
        role=UserRole.CLINICIAN,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest.fixture
def user_token(seeded_user: User) -> str:
    """Create a valid access token for the seeded user."""
    return create_access_token(data={"sub": seeded_user.email, "role": seeded_user.role})


@pytest.fixture
def admin_token(seeded_admin_user: User) -> str:
    """Create a valid access token for the seeded admin user."""
    return create_access_token(
        data={"sub": seeded_admin_user.email, "role": seeded_admin_user.role}
    )


@pytest.fixture
def clinician_token(seeded_clinician_user: User) -> str:
    """Create a valid access token for the seeded clinician user."""
    return create_access_token(
        data={"sub": seeded_clinician_user.email, "role": seeded_clinician_user.role}
    )


@pytest_asyncio.fixture
async def client(
    test_db: AsyncSession,
    user_token: str,
) -> AsyncGenerator[AsyncClient, None]:
    """Create an AsyncClient with overridden dependencies."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    # Use ASGITransport to test the FastAPI app directly without a server
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
async def override_auth(request):
    """Mock authentication for all tests.

    Skipped for unit tests (they should mock dependencies directly).
    Skipped if marked with 'no_auth_override'.
    """
    if "unit" in request.node.keywords:
        yield
        return

    if "no_auth_override" in request.node.keywords:
        yield
        return

    user = request.getfixturevalue("seeded_user")  # Changed from seeded_test_user to seeded_user

    # Override both HTTP and WebSocket auth
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_current_user_ws] = lambda: user

    yield
