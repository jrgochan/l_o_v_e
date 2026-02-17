from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.routes.users import (
    change_my_password,
    delete_my_account,
    export_my_data,
    read_own_sessions,
    read_users_me,
    update_my_profile,
)
from app.schemas.user import PasswordChange, UserProfileUpdate


@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    return mock_db


@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = uuid4()
    user.email = "test@example.com"
    user.is_active = True
    return user


@pytest.mark.asyncio
async def test_read_users_me(mock_user):
    response = await read_users_me(current_user=mock_user)
    assert response == mock_user


@pytest.mark.asyncio
async def test_read_own_sessions(mock_db, mock_user):
    with patch("app.api.routes.users.ChatService") as MockService:
        service_instance = MockService.return_value
        session_mock = MagicMock()
        session_mock.to_dict.return_value = {"id": 1}
        service_instance.get_user_sessions = AsyncMock(return_value=[session_mock])

        response = await read_own_sessions(current_user=mock_user, db=mock_db, limit=10, offset=0)

        service_instance.get_user_sessions.assert_awaited_with(
            user_id=str(mock_user.id), limit=10, offset=0
        )
        assert response[0]["id"] == 1


@pytest.mark.asyncio
async def test_update_my_profile_success(mock_db, mock_user):
    with patch("app.api.routes.users.UserService") as MockService:
        service_instance = MockService.return_value
        # Mock success return
        updated_user = MagicMock()
        updated_user.email = "new@example.com"
        # FIX: AsyncMock
        service_instance.update_profile = AsyncMock(return_value=updated_user)

        data = UserProfileUpdate(full_name="New Name", email="new@example.com")
        request = MagicMock()
        request.client.host = "127.0.0.1"

        response = await update_my_profile(data, mock_user, mock_db, request)

        assert response == updated_user
        service_instance.update_profile.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_my_profile_conflict(mock_db, mock_user):
    with patch("app.api.routes.users.UserService") as MockService:
        service_instance = MockService.return_value
        # Mock failure FIX: AsyncMock
        service_instance.update_profile = AsyncMock(side_effect=ValueError("Email conflict"))

        data = UserProfileUpdate(email="taken@example.com")
        request = MagicMock()

        with pytest.raises(HTTPException) as exc:
            await update_my_profile(data, mock_user, mock_db, request)

        assert exc.value.status_code == 409
        assert "Email conflict" in str(exc.value.detail)


@pytest.mark.asyncio
async def test_change_my_password_success(mock_db, mock_user):
    with patch("app.api.routes.users.UserService") as MockService:
        service_instance = MockService.return_value
        # FIX: AsyncMock
        service_instance.change_password = AsyncMock(return_value=None)

        request = MagicMock()
        data = PasswordChange(current_password="old", new_password="NewStrong1!")

        response = await change_my_password(data, mock_user, mock_db, request)

        assert response == {"message": "Password changed successfully"}
        service_instance.change_password.assert_awaited_once()


@pytest.mark.asyncio
async def test_change_my_password_failure(mock_db, mock_user):
    with patch("app.api.routes.users.UserService") as MockService:
        service_instance = MockService.return_value
        # FIX: AsyncMock
        service_instance.change_password = AsyncMock(side_effect=ValueError("Wrong password"))

        data = PasswordChange(current_password="wrong", new_password="NewStrong1!")
        request = MagicMock()

        with pytest.raises(HTTPException) as exc:
            await change_my_password(data, mock_user, mock_db, request)

        assert exc.value.status_code == 400
        assert "Wrong password" in str(exc.value.detail)


@pytest.mark.asyncio
async def test_delete_my_account(mock_db, mock_user):
    with patch("app.api.routes.users.UserService") as MockService:
        service_instance = MockService.return_value
        # FIX: AsyncMock
        service_instance.soft_delete_account = AsyncMock(return_value=None)
        request = MagicMock()

        response = await delete_my_account(mock_user, mock_db, request)

        assert "Account has been deleted" in response["message"]
        service_instance.soft_delete_account.assert_awaited_once()


@pytest.mark.asyncio
async def test_export_my_data(mock_db, mock_user):
    with patch("app.api.routes.users.UserService") as MockService:
        service_instance = MockService.return_value
        # FIX: AsyncMock
        service_instance.export_data = AsyncMock(return_value={"export": "data"})

        response = await export_my_data(mock_user, mock_db)

        assert response == {"export": "data"}
        service_instance.export_data.assert_awaited_once_with(mock_user)
