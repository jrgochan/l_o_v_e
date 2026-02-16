"""Tests for get_current_user_for_refresh (deps.py lines 147-186)."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
import pytest
from fastapi import HTTPException

from app.api.deps import REFRESH_GRACE_SECONDS, get_current_user_for_refresh
from app.core.settings import settings
from app.models.user import User, UserRole


@pytest.fixture
def mock_db():
    session = AsyncMock()
    session.execute = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def mock_user():
    return User(
        email="test@example.com",
        password_hash="hashed",
        is_active=True,
        role=UserRole.USER,
    )


def _make_token(email: str = "test@example.com", exp_offset: int = 300) -> str:
    """Create a JWT token with the given email and expiry offset from now."""
    exp = datetime.now(timezone.utc) + timedelta(seconds=exp_offset)
    return jwt.encode(
        {"sub": email, "exp": exp},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


@pytest.mark.asyncio
async def test_refresh_with_valid_token(mock_db, mock_user):
    """Valid, non-expired token should return the user."""
    token = _make_token(exp_offset=300)

    result = MagicMock()
    result.scalars.return_value.first.return_value = mock_user
    mock_db.execute.return_value = result

    user = await get_current_user_for_refresh(token, mock_db)
    assert user.email == "test@example.com"


@pytest.mark.asyncio
async def test_refresh_with_recently_expired_token(mock_db, mock_user):
    """Token expired within the grace period should still succeed."""
    # Expired 2 minutes ago (within 5-minute grace)
    token = _make_token(exp_offset=-120)

    result = MagicMock()
    result.scalars.return_value.first.return_value = mock_user
    mock_db.execute.return_value = result

    user = await get_current_user_for_refresh(token, mock_db)
    assert user.email == "test@example.com"


@pytest.mark.asyncio
async def test_refresh_with_token_expired_past_grace(mock_db):
    """Token expired beyond the grace period should raise 401."""
    # Expired 10 minutes ago (past the 5-minute grace)
    token = _make_token(exp_offset=-(REFRESH_GRACE_SECONDS + 60))

    with pytest.raises(HTTPException) as exc:
        await get_current_user_for_refresh(token, mock_db)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_refresh_with_missing_email(mock_db):
    """Token with no 'sub' claim should raise 401."""
    exp = datetime.now(timezone.utc) + timedelta(seconds=300)
    token = jwt.encode(
        {"exp": exp},  # no "sub"
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    with pytest.raises(HTTPException) as exc:
        await get_current_user_for_refresh(token, mock_db)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_refresh_with_invalid_token(mock_db):
    """Completely invalid token should raise 401."""
    with pytest.raises(HTTPException) as exc:
        await get_current_user_for_refresh("not-a-jwt", mock_db)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_refresh_user_not_found(mock_db):
    """Valid token but user not in DB should raise 401."""
    token = _make_token(email="ghost@example.com")

    result = MagicMock()
    result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = result

    with pytest.raises(HTTPException) as exc:
        await get_current_user_for_refresh(token, mock_db)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_refresh_dev_bypass(mock_db, mock_user):
    """dev-token-bypass should return a dev user in non-production."""
    with patch("app.api.deps.os.getenv", return_value="development"):
        with patch("app.api.deps._get_or_create_dev_user", return_value=mock_user) as mock_dev:
            user = await get_current_user_for_refresh("dev-token-bypass", mock_db)
            assert user.email == "test@example.com"
            mock_dev.assert_called_once_with(mock_db)


@pytest.mark.asyncio
async def test_refresh_token_without_exp_claim(mock_db, mock_user):
    """Token with no 'exp' claim should skip grace check and succeed."""
    token = jwt.encode(
        {"sub": "test@example.com"},  # no "exp"
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    result = MagicMock()
    result.scalars.return_value.first.return_value = mock_user
    mock_db.execute.return_value = result

    user = await get_current_user_for_refresh(token, mock_db)
    assert user.email == "test@example.com"

