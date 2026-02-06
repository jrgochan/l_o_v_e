from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.chat_message import ChatMessage

# -----------------------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------------------


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_user_uuid():
    return uuid4()


@pytest.fixture
def mock_user(mock_user_uuid):
    user = MagicMock()
    user.id = mock_user_uuid
    user.email = "test@example.com"
    user.is_active = True
    return user


@pytest.fixture
def mock_chat_service():
    service = AsyncMock()
    return service


# -----------------------------------------------------------------------------
# Tests
# -----------------------------------------------------------------------------


def test_get_message_thread_success(client, mock_user, mock_chat_service):
    """Test retrieving a message thread successfully."""
    message_id = uuid4()

    # Mock dependencies
    from app.api.deps import get_current_user

    app.dependency_overrides[get_current_user] = lambda: mock_user

    # Create sample messages
    msg1 = ChatMessage(
        id=uuid4(),
        session_id=uuid4(),
        content="Root message",
        message_type="user_text",
        timestamp=datetime.utcnow(),
    )
    # Mock type property for Pydantic model_validate alias if needed, or rely on mapper
    # Actually, if DisplayMessage expects 'type', and ChatMessage has 'message_type',
    # validation might fail.
    # Let's see if we need to mock 'type'.
    # For the purpose of this test, we are passing ChatMessage objects.
    # If the application code is buggy, we'll see.
    # BUT, to make the test PASS if the code works, we should provide what ChatService returns.

    msg2 = ChatMessage(
        id=message_id,
        session_id=uuid4(),
        content="Reply message",
        message_type="system_insight",
        timestamp=datetime.utcnow(),
    )

    # Mock service return
    mock_chat_service.get_message_thread.return_value = [msg1, msg2]

    # Patch ChatService in the router module
    with patch(
        "app.api.sockets.router.ChatService", return_value=mock_chat_service
    ) as mock_service_cls:
        # We need to ensure authentication works? verify_token dependency?
        # The endpoint depends on get_current_user. We overrode it.

        response = client.get(f"/observer/chat/messages/{message_id}/thread?limit=5")

        # If schema validation fails due to type vs message_type, status code will be 500
        assert response.status_code == 200
        data = response.json()

        assert len(data) == 2
        assert data[0]["content"] == "Root message"
        assert data[1]["content"] == "Reply message"

        # Verify mocked calls
        mock_service_cls.assert_called_once()
        mock_chat_service.get_message_thread.assert_awaited_once_with(message_id, max_depth=5)


def test_get_message_thread_empty(client, mock_user, mock_chat_service):
    """Test retrieving an empty message thread."""
    message_id = uuid4()
    from app.api.deps import get_current_user

    app.dependency_overrides[get_current_user] = lambda: mock_user

    mock_chat_service.get_message_thread.return_value = []

    with patch("app.api.sockets.router.ChatService", return_value=mock_chat_service):
        response = client.get(f"/observer/chat/messages/{message_id}/thread")
        assert response.status_code == 200
        assert response.json() == []


# Clean up overrides
@pytest.fixture(autouse=True)
def cleanup_overrides():
    yield
    app.dependency_overrides = {}
