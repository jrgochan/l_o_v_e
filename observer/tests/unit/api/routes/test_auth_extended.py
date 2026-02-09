from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.routes import auth
from app.models.user import User
from app.schemas.user import UserCreate


@pytest.fixture
def mock_db():
    session = AsyncMock()
    session.execute = AsyncMock()
    session.delete = MagicMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def mock_user():
    return User(
        email="test@example.com",
        password_hash="hashed_secret",
        is_active=True,
        role="user",
    )


@pytest.mark.asyncio
async def test_login_user_not_found(mock_db):
    """Test 401 when user email is not found."""
    # Mock empty result
    result = MagicMock()
    result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = result

    form_data = MagicMock()
    form_data.username = "unknown@example.com"
    form_data.password = "secret"

    with pytest.raises(HTTPException) as exc:
        await auth.login_for_access_token(form_data, mock_db)

    assert exc.value.status_code == 401
    assert "Incorrect email or password" in exc.value.detail


@pytest.mark.asyncio
async def test_login_incorrect_password(mock_db, mock_user):
    """Test 401 when password does not match hash."""
    result = MagicMock()
    result.scalars.return_value.first.return_value = mock_user
    mock_db.execute.return_value = result

    form_data = MagicMock()
    form_data.username = "test@example.com"
    form_data.password = "wrong_password"

    # Patch verify_password to return False
    with patch("app.api.routes.auth.verify_password") as mock_verify:
        mock_verify.return_value = False

        with pytest.raises(HTTPException) as exc:
            await auth.login_for_access_token(form_data, mock_db)

        assert exc.value.status_code == 401
        assert "Incorrect email or password" in exc.value.detail


@pytest.mark.asyncio
async def test_login_inactive_user(mock_db, mock_user):
    """Test 400 when user is inactive."""
    mock_user.is_active = False

    result = MagicMock()
    result.scalars.return_value.first.return_value = mock_user
    mock_db.execute.return_value = result

    form_data = MagicMock()
    form_data.username = "test@example.com"
    form_data.password = "secret"

    with patch("app.api.routes.auth.verify_password") as mock_verify:
        mock_verify.return_value = True

        with pytest.raises(HTTPException) as exc:
            await auth.login_for_access_token(form_data, mock_db)

        assert exc.value.status_code == 400
        assert "Inactive user" in exc.value.detail


@pytest.mark.asyncio
async def test_register_existing_user(mock_db, mock_user):
    """Test 400 when registering email that already exists."""
    result = MagicMock()
    result.scalars.return_value.first.return_value = mock_user
    mock_db.execute.return_value = result

    user_in = UserCreate(email="test@example.com", password="secret123", full_name="Test User")

    with pytest.raises(HTTPException) as exc:
        await auth.register_user(user_in, mock_db)

    assert exc.value.status_code == 400
    assert "User with this email already exists" in exc.value.detail
