
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import status, HTTPException
from app.api.routes.auth import login_for_access_token, register_user
from app.schemas.user import UserCreate

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.fixture
def mock_user():
    user = MagicMock()
    user.email = "test@example.com"
    user.password_hash = "hashed_secret"
    user.is_active = True
    user.role.value = "user"
    return user

@pytest.mark.asyncio
async def test_login_success(mock_db, mock_user):
    form_data = MagicMock()
    form_data.username = "test@example.com"
    form_data.password = "secret"
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_user
    mock_db.execute.return_value = mock_result
    
    with patch("app.api.routes.auth.verify_password", return_value=True), \
         patch("app.api.routes.auth.create_access_token", return_value="token"):
        
        response = await login_for_access_token(form_data, mock_db)
        assert response["access_token"] == "token"

@pytest.mark.asyncio
async def test_login_failures(mock_db, mock_user):
    form_data = MagicMock()
    form_data.username = "test@example.com"
    form_data.password = "secret"
    
    # 1. User not found
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_result
    
    with pytest.raises(HTTPException) as exc:
        await login_for_access_token(form_data, mock_db)
    assert exc.value.status_code == 401
    
    # 2. Wrong password
    mock_result.scalars.return_value.first.return_value = mock_user
    with patch("app.api.routes.auth.verify_password", return_value=False):
        with pytest.raises(HTTPException) as exc:
            await login_for_access_token(form_data, mock_db)
        assert exc.value.status_code == 401

    # 3. Inactive user
    mock_user.is_active = False
    with patch("app.api.routes.auth.verify_password", return_value=True):
        with pytest.raises(HTTPException) as exc:
            await login_for_access_token(form_data, mock_db)
        assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_register_success(mock_db):
    user_in = UserCreate(
        email="new@example.com", 
        password="password123", 
        full_name="New User"
    )
    
    # User does not exist
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_result
    
    with patch("app.api.routes.auth.get_password_hash", return_value="hashed"):
        response = await register_user(user_in, mock_db)
        
        # Should call db.add and commit
        mock_db.add.assert_called_once()
        mock_db.commit.assert_awaited_once()
        assert response.email == "new@example.com"

@pytest.mark.asyncio
async def test_register_duplicate(mock_db, mock_user):
    user_in = UserCreate(
        email="test@example.com", 
        password="password123", 
        full_name="Test"
    )
    
    # User exists
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_user
    mock_db.execute.return_value = mock_result
    
    with pytest.raises(HTTPException) as exc:
        await register_user(user_in, mock_db)
    assert exc.value.status_code == 400

