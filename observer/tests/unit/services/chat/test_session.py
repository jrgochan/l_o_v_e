from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.chat_session import ChatSession
from app.services.chat.session import SessionManager


@pytest.fixture
def mock_db():
    db = AsyncMock()
    # add and delete are synchronous methods in AsyncSession
    db.add = MagicMock()
    db.delete = AsyncMock()  # Wait, delete is also sync? delete is usually sync on session?
    # Actually session.delete(obj) is sync. session.execute(delete(..)) is async.
    # checking SA docs: session.delete is sync.
    db.delete = MagicMock()
    return db


@pytest.fixture
def session_manager(mock_db):
    return SessionManager(mock_db)


@pytest.mark.asyncio
async def test_create_session(session_manager, mock_db):
    user_id = "user123"
    auth_user_id = uuid4()

    session = await session_manager.create_session(
        user_id=user_id, tone_preference="clinical", auth_user_id=auth_user_id
    )

    assert session.user_id == user_id
    assert session.tone_preference == "clinical"
    assert session.auth_user_id == auth_user_id

    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once()


@pytest.mark.asyncio
async def test_get_session(session_manager, mock_db):
    session_id = uuid4()
    mock_session = ChatSession(id=session_id)

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_session
    mock_db.execute.return_value = mock_result

    result = await session_manager.get_session(session_id)
    assert result == mock_session
    mock_db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_get_user_sessions(session_manager, mock_db):
    user_id = "user123"
    mock_sessions = [ChatSession(id=uuid4()), ChatSession(id=uuid4())]

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = mock_sessions
    mock_db.execute.return_value = mock_result

    result = await session_manager.get_user_sessions(user_id)
    assert len(result) == 2
    mock_db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_end_session(session_manager, mock_db):
    session_id = uuid4()
    mock_session = ChatSession(id=session_id)

    # Mock get_session behavior
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_session
    mock_db.execute.return_value = mock_result

    result = await session_manager.end_session(session_id)

    assert result.ended_at is not None
    mock_db.commit.assert_called()
    mock_db.refresh.assert_called()


@pytest.mark.asyncio
async def test_update_tone_preference(session_manager, mock_db):
    session_id = uuid4()
    mock_session = ChatSession(id=session_id, tone_preference="warm")

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_session
    mock_db.execute.return_value = mock_result

    result = await session_manager.update_tone_preference(session_id, "clinical")

    assert result.tone_preference == "clinical"
    mock_db.commit.assert_called()


@pytest.mark.asyncio
async def test_update_deep_feeling_mode(session_manager, mock_db):
    session_id = uuid4()
    mock_session = ChatSession(id=session_id, deep_feeling_mode=False)

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_session
    mock_db.execute.return_value = mock_result

    result = await session_manager.update_deep_feeling_mode(session_id, True)

    assert result.deep_feeling_mode is True
    mock_db.commit.assert_called()


@pytest.mark.asyncio
async def test_delete_session_success(session_manager, mock_db):
    session_id = uuid4()
    mock_session = ChatSession(id=session_id)

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_session
    mock_db.execute.return_value = mock_result

    result = await session_manager.delete_session(session_id)

    assert result is True
    mock_db.delete.assert_called_with(mock_session)
    mock_db.commit.assert_called()


@pytest.mark.asyncio
async def test_delete_session_not_found(session_manager, mock_db):
    session_id = uuid4()

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    result = await session_manager.delete_session(session_id)

    assert result is False
    mock_db.delete.assert_not_called()


@pytest.mark.asyncio
async def test_end_session_not_found(session_manager, mock_db):
    session_id = uuid4()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    result = await session_manager.end_session(session_id)
    assert result is None


@pytest.mark.asyncio
async def test_update_tone_preference_not_found(session_manager, mock_db):
    session_id = uuid4()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    result = await session_manager.update_tone_preference(session_id, "warm")
    assert result is None


@pytest.mark.asyncio
async def test_update_deep_feeling_mode_not_found(session_manager, mock_db):
    session_id = uuid4()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    result = await session_manager.update_deep_feeling_mode(session_id, True)
    assert result is None
