from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
import pytest
from fastapi import HTTPException, WebSocketException, status

from app.api.deps import (
    get_current_active_user,
    get_current_admin,
    get_current_user,
    get_current_user_ws,
)
from app.models.user import User, UserRole


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.execute = AsyncMock()
    db.delete = MagicMock()
    db.add = MagicMock()
    return db


@pytest.fixture
def mock_settings():
    with patch("app.api.deps.settings") as mock_s:
        mock_s.SECRET_KEY = "secret"
        mock_s.ALGORITHM = "HS256"
        mock_s.APP_ENV = "development"
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

    # Patch os.getenv specifically for this test
    with patch("os.getenv", return_value="development"):
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
    result.scalars.return_value.first.return_value = None  # No user found
    mock_db.execute.return_value = result

    # Refresh mockup
    async def side_effect_refresh(obj):
        obj.id = "uuid"

    mock_db.refresh.side_effect = side_effect_refresh

    with patch("app.api.deps.get_password_hash") as mock_hash:
        mock_hash.return_value = "hashed"

        with patch("os.getenv", return_value="development"):
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
async def test_get_current_user_ws_bypass_success(mock_db, mock_settings):
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
async def test_get_current_user_ws_bypass_create(mock_db, mock_settings):
    """Test dev bypass for WebSocket creates user if missing."""
    token = "dev-token-bypass"

    result = MagicMock()
    result.scalars.return_value.first.return_value = None  # No user found
    mock_db.execute.return_value = result

    # Refresh mockup
    async def side_effect_refresh(obj):
        obj.id = "uuid"

    mock_db.refresh.side_effect = side_effect_refresh

    with patch("app.api.deps.get_password_hash") as mock_hash:
        mock_hash.return_value = "hashed"

        res = await get_current_user_ws(token, mock_db)

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        assert res.email == "dev@admin.com"


@pytest.mark.asyncio
async def test_get_current_user_ws_missing_sub(mock_db, mock_settings):
    """Test valid JWT but missing sub for WebSocket."""
    token = jwt.encode({}, "secret", algorithm="HS256")
    with pytest.raises(WebSocketException) as exc:
        await get_current_user_ws(token, mock_db)
    assert exc.value.code == status.WS_1008_POLICY_VIOLATION


@pytest.mark.asyncio
async def test_get_current_active_user_deleted():
    """Test soft-deleted user raises 400 (line 87)."""
    user = User(is_active=True, deleted_at=datetime.utcnow())
    with pytest.raises(HTTPException) as exc:
        await get_current_active_user(user)
    assert exc.value.status_code == 400
    assert "deleted" in exc.value.detail


@pytest.mark.asyncio
async def test_get_current_clinician_failure():
    """Test non-clinician raises 403 (line 111)."""
    from app.api.deps import get_current_clinician

    user = User(role=UserRole.USER, is_active=True)
    with pytest.raises(HTTPException) as exc:
        await get_current_clinician(user)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_get_current_clinician_success():
    """Test clinician success."""
    from app.api.deps import get_current_clinician

    user = User(role=UserRole.CLINICIAN, is_active=True)
    res = await get_current_clinician(user)
    assert res == user


@pytest.mark.asyncio
async def test_get_current_admin_failure():
    """Test non-admin raises 403 (line 96)."""
    user = User(role=UserRole.USER, is_active=True)
    with pytest.raises(HTTPException) as exc:
        await get_current_admin(user)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_get_current_user_for_refresh_valid(mock_db, mock_settings):
    """Test valid refresh token."""
    from app.api.deps import get_current_user_for_refresh

    token = jwt.encode({"sub": "refresh@example.com"}, "secret", algorithm="HS256")
    user = User(email="refresh@example.com", role=UserRole.USER)

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = user
    mock_db.execute.return_value = mock_res

    res = await get_current_user_for_refresh(token, mock_db)
    assert res.email == "refresh@example.com"


@pytest.mark.asyncio
async def test_get_current_user_for_refresh_expired_within_grace(mock_db, mock_settings):
    """Test expired token within grace period."""
    from app.api.deps import get_current_user_for_refresh

    # Expired 1 minute ago (within 5 min grace)
    exp = datetime.now(timezone.utc).timestamp() - 60
    token = jwt.encode({"sub": "grace@example.com", "exp": exp}, "secret", algorithm="HS256")
    user = User(email="grace@example.com")

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = user
    mock_db.execute.return_value = mock_res

    res = await get_current_user_for_refresh(token, mock_db)
    assert res.email == "grace@example.com"


@pytest.mark.asyncio
async def test_get_current_user_for_refresh_expired_too_long(mock_db, mock_settings):
    """Test expired token beyond grace period."""
    from app.api.deps import get_current_user_for_refresh

    # Expired 10 minutes ago
    exp = datetime.now(timezone.utc).timestamp() - 600
    token = jwt.encode({"sub": "late@example.com", "exp": exp}, "secret", algorithm="HS256")

    with pytest.raises(HTTPException) as exc:
        await get_current_user_for_refresh(token, mock_db)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_for_refresh_bypass(mock_db):
    """Test bypass in refresh."""
    from app.api.deps import get_current_user_for_refresh

    token = "dev-token-bypass"
    user = User(email="dev@admin.com")

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = user
    mock_db.execute.return_value = mock_res

    with patch("os.getenv", return_value="development"):
        res = await get_current_user_for_refresh(token, mock_db)
        assert res.email == "dev@admin.com"


@pytest.mark.asyncio
async def test_get_current_user_for_refresh_missing_sub(mock_db, mock_settings):
    """Test token without subject."""
    from app.api.deps import get_current_user_for_refresh

    token = jwt.encode({}, "secret", algorithm="HS256")
    with pytest.raises(HTTPException) as exc:
        await get_current_user_for_refresh(token, mock_db)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_for_refresh_invalid_token(mock_db, mock_settings):
    """Test invalid token raises 401."""
    from app.api.deps import get_current_user_for_refresh

    with pytest.raises(HTTPException) as exc:
        await get_current_user_for_refresh("invalid-token", mock_db)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_for_refresh_not_found(mock_db, mock_settings):
    """Test user not in DB."""
    from app.api.deps import get_current_user_for_refresh

    token = jwt.encode({"sub": "ghost@example.com"}, "secret", algorithm="HS256")

    result = MagicMock()
    result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = result

    with pytest.raises(HTTPException) as exc:
        await get_current_user_for_refresh(token, mock_db)
    assert exc.value.status_code == 401
