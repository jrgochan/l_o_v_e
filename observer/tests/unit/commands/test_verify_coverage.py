from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.commands.verify import mapping, verify_mapping_logic


@pytest.fixture
def mock_db():
    session = AsyncMock()
    return session


@pytest.fixture
def mock_service():
    service = AsyncMock()
    # Mock return values for methods called
    session = MagicMock()
    session.id = "test-session-id"
    service.create_session.return_value = session

    msg = MagicMock()
    msg.id = "msg-id"
    msg.original_emotion_name = "Super Duper Happy"
    service.save_analysis_message.return_value = msg

    user_msg = MagicMock()
    user_msg.id = "user-msg-id"
    service.save_user_message.return_value = user_msg

    return service


@pytest.mark.asyncio
async def test_verify_mapping_logic(mock_db, mock_service):
    """Test verify_mapping_logic execution flow."""
    # Mock AsyncSessionLocal to return our mock_db
    # Mock ChatService to return our mock_service

    # We need to mock the context manager for AsyncSessionLocal
    mock_session_cls = MagicMock()
    mock_session_cls.return_value.__aenter__.return_value = mock_db
    mock_session_cls.return_value.__aexit__.return_value = None

    with patch("app.commands.verify.AsyncSessionLocal", mock_session_cls):
        with patch("app.commands.verify.ChatService", return_value=mock_service):
            await verify_mapping_logic()

    # Verification
    mock_service.create_session.assert_awaited_once()
    mock_service.save_analysis_message.assert_awaited_once()
    mock_db.refresh.assert_awaited_once()
    mock_service.save_user_message.assert_awaited_once()
    mock_service.save_multi_emotion_analysis.assert_awaited_once()
    mock_service.delete_session.assert_awaited_once()


def test_mapping_command():
    """Test the mapping command wrapper."""

    def mock_run_side_effect(coro):
        coro.close()

    with patch("app.commands.verify.asyncio.run", side_effect=mock_run_side_effect) as mock_run:
        mapping()
        mock_run.assert_called_once()
