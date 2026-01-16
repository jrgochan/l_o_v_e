import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException, status
from jose import JWTError, jwt

from fastapi import HTTPException, status, WebSocketException

from app.api.deps import get_current_user, get_current_active_user, get_current_admin, get_current_user_ws
from app.models.user import User, UserRole

@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.execute = AsyncMock()
    return db

@pytest.fixture
def mock_settings():
    with patch("app.api.deps.settings") as mock_s:
        mock_s.SECRET_KEY = "secret"
        mock_s.ALGORITHM = "HS256"
        yield mock_s

@pytest.mark.asyncio
async def test_get_current_user_valid(mock_db, mock_settings):
    """Test valid JWT."""
    token = jwt.encode({"sub": "test@example.com"}, "secret", algorithm="HS256")
    
    # Mock user query
    user = User(email="test@example.com", is_active=True)
    result = MagicMock()
    result.scalars.return_value.first.return_value = user
    mock_db.execute.return_value = result

    res = await get_current_user(token, mock_db)
    assert res.email == "test@example.com"

@pytest.mark.asyncio
async def test_get_current_user_invalid_token(mock_db, mock_settings):
    """Test invalid token raises 401."""
    with pytest.raises(HTTPException) as exc:
        await get_current_user("invalid-token", mock_db)
    assert exc.value.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_get_current_user_bypass_existing(mock_db):
    """Test dev bypass with existing user."""
    token = "dev-token-bypass"
    user = User(email="dev@admin.com", role=UserRole.ADMIN)
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = user
    mock_db.execute.return_value = result
    
    res = await get_current_user(token, mock_db)
    assert res.email == "dev@admin.com"

@pytest.mark.asyncio
async def test_get_current_user_bypass_create(mock_db):
    """Test dev bypass creates user if missing."""
    token = "dev-token-bypass"
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = None # No user found
    mock_db.execute.return_value = result
    
    # Refresh mockup
    async def side_effect_refresh(obj):
        obj.id = "uuid"
    mock_db.refresh.side_effect = side_effect_refresh
    
    with patch("app.core.security.get_password_hash") as mock_hash:
        mock_hash.return_value = "hashed"
        
        res = await get_current_user(token, mock_db)
        
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        assert res.email == "dev@admin.com"

@pytest.mark.asyncio
async def test_get_current_user_missing_sub(mock_db, mock_settings):
    """Test token without subject."""
    token = jwt.encode({}, "secret", algorithm="HS256")
    with pytest.raises(HTTPException):
        await get_current_user(token, mock_db)

@pytest.mark.asyncio
async def test_get_current_user_not_found(mock_db, mock_settings):
    """Test user not in DB."""
    token = jwt.encode({"sub": "ghost@example.com"}, "secret", algorithm="HS256")
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = result
    
    with pytest.raises(HTTPException):
        await get_current_user(token, mock_db)

@pytest.mark.asyncio
async def test_get_current_active_user_inactive():
    """Test inactive user check."""
    user = User(is_active=False)
    with pytest.raises(HTTPException) as exc:
        await get_current_active_user(user)
    assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_get_current_active_user_active():
    """Test active user success."""
    user = User(is_active=True)
    res = await get_current_active_user(user)
    assert res == user

@pytest.mark.asyncio
async def test_get_current_admin_success():
    """Test admin check success."""
    user = User(role=UserRole.ADMIN, is_active=True)
    # The dep calls active check implicitly in FastAPI, but here we call function directly
    # Input type is User
    res = await get_current_admin(user)
    assert res == user

@pytest.mark.asyncio
async def test_get_current_user_ws_valid(mock_db, mock_settings):
    """Test valid JWT for WebSocket."""
    token = jwt.encode({"sub": "ws@example.com"}, "secret", algorithm="HS256")
    user = User(email="ws@example.com")
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = user
    mock_db.execute.return_value = result
    
    res = await get_current_user_ws(token, mock_db)
    assert res.email == "ws@example.com"

@pytest.mark.asyncio
async def test_get_current_user_ws_invalid_token(mock_db, mock_settings):
    """Test invalid token raises WebSocketException."""
    with pytest.raises(WebSocketException) as exc:
        await get_current_user_ws("invalid", mock_db)
    assert exc.value.code == status.WS_1008_POLICY_VIOLATION

@pytest.mark.asyncio
async def test_get_current_user_ws_bypass_success(mock_db):
    """Test dev bypass for WebSocket."""
    token = "dev-token-bypass"
    user = User(email="dev@admin.com")
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = user
    mock_db.execute.return_value = result
    
    res = await get_current_user_ws(token, mock_db)
    assert res.email == "dev@admin.com"

@pytest.mark.asyncio
async def test_get_current_user_ws_not_found(mock_db, mock_settings):
    """Test user not found raises WebSocketException."""
    token = jwt.encode({"sub": "missing@example.com"}, "secret", algorithm="HS256")
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = result
    
    with pytest.raises(WebSocketException) as exc:
        await get_current_user_ws(token, mock_db)
    assert exc.value.code == status.WS_1008_POLICY_VIOLATION

@pytest.mark.asyncio
async def test_get_current_user_ws_bypass_fail(mock_db):
    """Test dev bypass falls through if user missing, then fails JWT decode."""
    token = "dev-token-bypass"
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = result
    
    # It falls through to jwt.decode("dev-token-bypass") -> raises JWTError -> raises WebSocketException
    with pytest.raises(WebSocketException) as exc:
        await get_current_user_ws(token, mock_db)
    assert exc.value.code == status.WS_1008_POLICY_VIOLATION

@pytest.mark.asyncio
async def test_get_current_user_ws_missing_sub(mock_db, mock_settings):
    """Test valid JWT but missing sub for WebSocket."""
    token = jwt.encode({}, "secret", algorithm="HS256")
    with pytest.raises(WebSocketException) as exc:
        await get_current_user_ws(token, mock_db)
    assert exc.value.code == status.WS_1008_POLICY_VIOLATION
