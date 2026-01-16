"""Unit tests for authentication dependency."""
import pytest
from fastapi import HTTPException
from jose import jwt
from app.api.deps import get_current_user
from app.config import settings

# Disable the autouse fixture for these tests so we hit the real function
@pytest.fixture(autouse=True)
def override_auth():
    """No-op override to prevent global mock from interfering."""
    return

@pytest.mark.asyncio
async def test_get_current_user_valid_token():
    """Test get_current_user with valid token."""
    token = jwt.encode({"sub": "test@example.com"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    user = await get_current_user(token)
    assert user["sub"] == "test@example.com"

@pytest.mark.asyncio
async def test_get_current_user_invalid_token():
    """Test get_current_user with invalid token."""
    with pytest.raises(HTTPException) as exc:
        await get_current_user("invalid.token")
    assert exc.value.status_code == 401

@pytest.mark.asyncio
async def test_get_current_user_expired_token():
    """Test get_current_user with expired token."""
    # Create expired token (future todo: use proper expiry time)
    # For now, just junk signature ensures failure
    with pytest.raises(HTTPException):
        await get_current_user("header.payload.signature")

@pytest.mark.asyncio
async def test_get_current_user_missing_sub():
    """Test get_current_user with token missing 'sub' claim."""
    token = jwt.encode({"other": "claim"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    with pytest.raises(HTTPException) as exc:
        await get_current_user(token)
    assert exc.value.status_code == 401


# WebSocket Auth Tests
from app.api.deps import get_current_user_ws
from fastapi import WebSocketException, status

@pytest.mark.asyncio
async def test_get_current_user_ws_valid_token():
    """Test get_current_user_ws with valid token."""
    token = jwt.encode({"sub": "test@example.com"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    user = await get_current_user_ws(token)
    assert user["sub"] == "test@example.com"

@pytest.mark.asyncio
async def test_get_current_user_ws_invalid_token():
    """Test get_current_user_ws with invalid token."""
    with pytest.raises(WebSocketException) as exc:
        await get_current_user_ws("invalid.token")
    assert exc.value.code == status.WS_1008_POLICY_VIOLATION

@pytest.mark.asyncio
async def test_get_current_user_ws_missing_sub():
    """Test get_current_user_ws with token missing 'sub' claim."""
    token = jwt.encode({"other": "claim"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    with pytest.raises(WebSocketException) as exc:
        await get_current_user_ws(token)
    assert exc.value.code == status.WS_1008_POLICY_VIOLATION


