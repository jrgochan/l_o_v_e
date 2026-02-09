from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.api.routes.users import read_own_sessions, read_users_me


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
        service_instance.get_user_sessions = AsyncMock(return_value=[{"id": 1}])

        response = await read_own_sessions(current_user=mock_user, db=mock_db, limit=10, offset=0)

        service_instance.get_user_sessions.assert_awaited_with(
            user_id=str(mock_user.id), limit=10, offset=0
        )
        assert response[0]["id"] == 1
