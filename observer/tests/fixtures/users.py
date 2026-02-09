"""User fixtures."""

import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_user_ws
from app.main import app
from app.models.user import User


@pytest.fixture
def test_user_id():
    """Provide consistent test user UUID."""
    return uuid.UUID("123e4567-e89b-12d3-a456-426614174000")


@pytest.fixture
def test_session_id():
    """Provide consistent test session UUID."""
    return uuid.UUID("789e0123-e89b-12d3-a456-426614174001")


@pytest.fixture
async def seeded_test_user(
    test_db: AsyncSession, test_user_id
) -> User:  # pylint: disable=redefined-outer-name
    """Seed test database with a user."""
    # Check if already exists
    stmt = select(User).where(User.id == test_user_id)
    result = await test_db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        return existing

    user = User(
        id=test_user_id,
        email="test@example.com",
        password_hash="dummy_hash",
        full_name="Test User",
        is_active=True,
    )
    test_db.add(user)
    await test_db.commit()
    return user


@pytest.fixture(autouse=True)
async def override_auth(request):
    """Mock authentication for all tests.

    Skipped for unit tests (they should mock dependencies directly).
    """
    if "unit" in request.node.keywords:
        yield
        return

    user = request.getfixturevalue("seeded_test_user")

    # Override both HTTP and WebSocket auth
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_current_user_ws] = lambda: user

    yield
