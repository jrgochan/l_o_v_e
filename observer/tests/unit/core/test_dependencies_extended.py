
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from jose import jwt
from app.api import deps
from app.core import security
from app.models.user import User, UserRole
from app.config import settings

# --- Security Tests ---

def test_verify_password():
    """Test password verification relies on password_hash."""
    with patch("app.core.security.password_hash") as mock_pwd:
        mock_pwd.verify.return_value = True
        assert security.verify_password("plain", "hashed") is True
        # Note: We now cast return value to bool in implementation, so mock return is used directly
        mock_pwd.verify.assert_called_with("plain", "hashed")

def test_get_password_hash():
    """Test password hashing relies on password_hash."""
    with patch("app.core.security.password_hash") as mock_pwd:
        mock_pwd.hash.return_value = "new_hash"
        assert security.get_password_hash("secret") == "new_hash"
        mock_pwd.hash.assert_called_with("secret")

def test_create_access_token_default_expiry():
    """Test token creation with default expiration."""
    data = {"sub": "test@example.com"}
    token = security.create_access_token(data)
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    
    assert decoded["sub"] == "test@example.com"
    # Verify exp is roughly ACCESS_TOKEN_EXPIRE_MINUTES from now
    # We can't be exact due to execution time, but checks structure
    assert "exp" in decoded

def test_create_access_token_custom_expiry():
    """Test token creation with custom expiration."""
    data = {"sub": "test@example.com"}
    expires = timedelta(minutes=5)
    token = security.create_access_token(data, expires_delta=expires)
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    
    assert decoded["sub"] == "test@example.com"
    assert "exp" in decoded

# --- Deps Tests ---

@pytest.fixture
def mock_db():
    session = AsyncMock()
    session.execute = AsyncMock()
    session.add = MagicMock()
    session.delete = MagicMock()
    return session

@pytest.mark.asyncio
async def test_get_current_user_dev_bypass_existing(mock_db):
    """Test dev token bypass returns existing dev user."""
    mock_result = MagicMock()
    existing_user = User(email="dev@admin.com", role=UserRole.ADMIN)
    mock_result.scalars.return_value.first.return_value = existing_user
    mock_db.execute.return_value = mock_result
    
    user = await deps.get_current_user(token="dev-token-bypass", db=mock_db)
    
    assert user.email == "dev@admin.com"
    # Should check DB for existing user
    assert mock_db.execute.called

@pytest.mark.asyncio
async def test_get_current_user_dev_bypass_create(mock_db):
    """Test dev token bypass creates user if missing."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None # Not found
    mock_db.execute.return_value = mock_result
    
    # We need to ensure get_password_hash calls inside deps don't fail or are mocked
    # deps.py imports get_password_hash inside the function
    with patch("app.core.security.get_password_hash", return_value="hashed_dev"):
        user = await deps.get_current_user(token="dev-token-bypass", db=mock_db)
        
        assert user.email == "dev@admin.com"
        assert user.password_hash == "hashed_dev"
        # Should add new user
        mock_db.add.assert_called()
        mock_db.commit.assert_called()
        mock_db.refresh.assert_called()

@pytest.mark.asyncio
async def test_get_current_user_invalid_token(mock_db):
    """Test invalid JWT raises 401."""
    with pytest.raises(HTTPException) as exc:
        await deps.get_current_user(token="invalid_token", db=mock_db)
    assert exc.value.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_get_current_user_no_sub(mock_db):
    """Test valid token without 'sub' claim raises 401."""
    token = jwt.encode({"other": "claim"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    with pytest.raises(HTTPException) as exc:
        await deps.get_current_user(token=token, db=mock_db)
    assert exc.value.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_get_current_user_not_found_in_db(mock_db):
    """Test valid token but user not in DB raises 401."""
    token = security.create_access_token({"sub": "ghost@example.com"})
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_result
    
    with pytest.raises(HTTPException) as exc:
        await deps.get_current_user(token=token, db=mock_db)
    assert exc.value.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_get_current_active_user_inactive():
    """Test inactive user raises 400."""
    inactive_user = User(is_active=False)
    with pytest.raises(HTTPException) as exc:
        await deps.get_current_active_user(inactive_user)
    assert exc.value.status_code == 400
    assert "Inactive user" in exc.value.detail

@pytest.mark.asyncio
async def test_get_current_active_user_success():
    """Test active user passes."""
    active_user = User(is_active=True)
    result = await deps.get_current_active_user(active_user)
    assert result == active_user

@pytest.mark.asyncio
async def test_get_current_admin_not_admin():
    """Test non-admin user raises 403."""
    user = User(role=UserRole.USER)
    with pytest.raises(HTTPException) as exc:
        await deps.get_current_admin(user)
    assert exc.value.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_get_current_admin_success():
    """Test admin user passes."""
    admin = User(role=UserRole.ADMIN)
    result = await deps.get_current_admin(admin)
    assert result == admin
