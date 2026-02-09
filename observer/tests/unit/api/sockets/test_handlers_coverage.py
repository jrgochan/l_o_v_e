from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import WebSocketDisconnect

from app.api.sockets.handlers import handle_user_message
from app.api.sockets.types import MessageContext


@pytest.fixture
def mock_websocket() -> MagicMock:
    ws = MagicMock()
    ws.url = "ws://test"
    return ws


@pytest.mark.asyncio
async def test_handle_user_message_disconnect(mock_websocket: MagicMock) -> None:
    """Test WebSocketDisconnect handling (Line 63)."""
    # Mock processor to raise WebSocketDisconnect
    with patch(
        "app.api.sockets.handlers.text_processor.process",
        side_effect=WebSocketDisconnect,
    ):
        # Should not raise exception, just log
        await handle_user_message(
            session_id="s1", data={"content": "test"}, websocket=mock_websocket
        )


@pytest.mark.asyncio
async def test_related_message_id_invalid_uuid(mock_websocket: MagicMock) -> None:
    """Test invalid related_message_id format (Lines 118-121)."""
    # We need to verify that _build_message_context handles the error
    # and continues with related_message_id=None

    # We can inspect the context passed to the processor
    mock_process = AsyncMock()

    with patch("app.api.sockets.handlers.text_processor.process", new=mock_process):
        await handle_user_message(
            session_id="s1",
            data={"content": "test", "related_message_id": "not-a-uuid"},
            websocket=mock_websocket,
        )

        # Verify context
        args, _ = mock_process.call_args
        context: MessageContext = args[0]
        assert context.related_message_id is None
