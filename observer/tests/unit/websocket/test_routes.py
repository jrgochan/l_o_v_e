import asyncio
import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.websocket.routes import heartbeat_loop, websocket_endpoint

# Test file for app/websocket/routes.py
# Re-implemented to ensure clean collection


@pytest.fixture
def mock_ws():
    ws = AsyncMock(spec=WebSocket)
    return ws


@pytest.fixture
def mock_db():
    db = AsyncMock(spec=AsyncSession)
    return db


@pytest.mark.asyncio
async def test_websocket_endpoint_initial_state_neutral(mock_ws, mock_db):
    """Test connection with no history (Neutral state)."""
    # Mock manager
    with (
        patch("app.websocket.routes.manager", new_callable=AsyncMock) as mock_manager,
        patch("app.websocket.routes.asyncio.create_task") as mock_create_task,
        patch("app.websocket.routes.heartbeat_loop", new_callable=MagicMock),
    ):

        # DB returns None
        mock_res = MagicMock()
        mock_res.first.return_value = None
        mock_db.execute.return_value = mock_res

        # WebSocket loop breaks immediately
        mock_ws.receive_text.side_effect = WebSocketDisconnect()

        # FIX: disconnect is synchronous
        mock_manager.disconnect = MagicMock()

        await websocket_endpoint(mock_ws, "user_1", mock_db)

        # Verify connect
        mock_manager.connect.assert_called_with(mock_ws, "user_1")

        # Verify initial state "Neutral"
        mock_ws.send_json.assert_called()
        args = mock_ws.send_json.call_args_list[0][0][0]
        assert args["type"] == "initial_state"
        assert args["data"]["emotion"]["name"] == "Neutral"

        # Verify heartbeat started
        assert mock_create_task.called


@pytest.mark.asyncio
async def test_websocket_endpoint_initial_state_existing(mock_ws, mock_db):
    """Test connection with existing state history."""
    with (
        patch("app.websocket.routes.manager", new_callable=AsyncMock) as mock_manager,
        patch("app.websocket.routes.asyncio.create_task"),
        patch("app.websocket.routes.heartbeat_loop", new_callable=MagicMock),
    ):

        # Mock DB row
        mock_state = MagicMock()
        mock_state.id = uuid4()
        mock_state.vac_values = [0.1, 0.2, 0.3]
        mock_state.quaternion_state = [1, 0, 0, 0]
        mock_state.elasticity_metric = 0.5
        mock_state.rigidity_score = 0.2
        mock_state.timestamp = datetime.now()

        mock_emotion = MagicMock()
        mock_emotion.emotion_name = "Joy"
        mock_emotion.category = "Happiness"

        mock_res = MagicMock()
        mock_res.first.return_value = (mock_state, mock_emotion)
        mock_db.execute.return_value = mock_res

        mock_ws.receive_text.side_effect = WebSocketDisconnect()

        # FIX: disconnect is synchronous
        mock_manager.disconnect = MagicMock()

        await websocket_endpoint(mock_ws, "user_1", mock_db)

        args = mock_ws.send_json.call_args[0][0]
        assert args["type"] == "initial_state"
        assert args["data"]["emotion"]["name"] == "Joy"


@pytest.mark.asyncio
async def test_websocket_pong_and_error(mock_ws, mock_db, caplog):
    """Test pong handling and JSON error."""
    import logging

    caplog.set_level(logging.ERROR)

    with (
        patch("app.websocket.routes.manager", new_callable=AsyncMock) as mock_manager,
        patch("app.websocket.routes.asyncio.create_task"),
        patch("app.websocket.routes.heartbeat_loop", new_callable=MagicMock),
    ):

        # Create a proper mock result that returns None for .first()
        mock_result = MagicMock()
        mock_result.first.return_value = None
        mock_db.execute.return_value = mock_result

        # 1. Pong, 2. Invalid JSON, 3. Disconnect
        # Mock receive_text side effects
        mock_ws.receive_text.side_effect = [
            json.dumps({"type": "pong"}),
            "INVALID",
            WebSocketDisconnect(),
        ]

        # FIX: disconnect is synchronous
        mock_manager.disconnect = MagicMock()

        try:
            await websocket_endpoint(mock_ws, "u1", mock_db)
        except Exception as e:
            pytest.fail(f"Endpoint raised exception: {e}")

        # Verify calls
        if not mock_ws.send_json.called:
            print(f"\nCaptured Logs:\n{caplog.text}")
            pytest.fail(f"send_json was never called. Execution path blocked? Logs: {caplog.text}")

        # Filter for error message
        calls = mock_ws.send_json.call_args_list
        error_sent = False
        captured_messages = []
        for c in calls:
            # c is (args, kwargs)
            msg = None
            if c[0] and len(c[0]) > 0:
                msg = c[0][0]
            elif c[1] and "data" in c[1]:
                msg = c[1]["data"]

            if msg:
                captured_messages.append(msg)
                if isinstance(msg, dict) and msg.get("code") == "INVALID_JSON":
                    error_sent = True
                    break

        assert (
            error_sent
        ), f"Error message not sent. Captured: {captured_messages}. Raw Calls: {calls}"


@pytest.mark.asyncio
async def test_websocket_inner_loop_exception(mock_ws, mock_db, caplog):
    """Test generic exception in inner loop and task cancellation."""
    import logging

    caplog.set_level(logging.ERROR)

    with (
        patch("app.websocket.routes.manager", new_callable=AsyncMock) as mock_manager,
        patch("app.websocket.routes.asyncio.create_task") as mock_create_task,
        patch("app.websocket.routes.heartbeat_loop", new_callable=MagicMock),
    ):

        # Mock heartbeat task via asyncio.Future
        # Future is awaitable. done() returns False initially.
        mock_task = asyncio.Future()
        mock_create_task.return_value = mock_task

        # Mock DB for initial state (None)
        mock_result = MagicMock()
        mock_result.first.return_value = None
        mock_db.execute.return_value = mock_result

        # Side effect: 1. Generic Exception, 2. WebSocketDisconnect (to exit)
        mock_ws.receive_text.side_effect = [
            Exception("Unexpected Error"),
            # Note: The exception breaks the loop,
            # so WebSocketDisconnect is not actually reached/needed
            # but kept for safety in case logic changes.
            WebSocketDisconnect(),
        ]

        # FIX: disconnect is synchronous
        mock_manager.disconnect = MagicMock()

        await websocket_endpoint(mock_ws, "user_inner_error", mock_db)

        # Verify Generic Exception caught and logged
        assert "Error in WebSocket loop: Unexpected Error" in caplog.text

        # Verify Heartbeat Task Cancelled (lines 298-302 coverage)
        # Future should be cancelled
        assert mock_task.cancelled()


@pytest.mark.asyncio
async def test_websocket_outer_exception(mock_ws, mock_db, caplog):
    """Test exception caught by outer handler (lines 292-293)."""
    import logging

    caplog.set_level(logging.ERROR)

    with (
        patch("app.websocket.routes.manager", new_callable=AsyncMock) as mock_manager,
        patch("app.websocket.routes.asyncio.create_task"),
        patch("app.websocket.routes.heartbeat_loop", new_callable=MagicMock),
    ):

        # Simulate DB error (before loop)
        mock_db.execute.side_effect = Exception("Critical DB Failure")

        # FIX: disconnect is synchronous
        mock_manager.disconnect = MagicMock()

        await websocket_endpoint(mock_ws, "user_outer_error", mock_db)

        assert "WebSocket error for user user_outer_error: Critical DB Failure" in caplog.text


@pytest.mark.asyncio
async def test_websocket_unknown_message(mock_ws, mock_db, caplog):
    """Test unknown message type warning (line 278)."""
    import logging

    caplog.set_level(logging.WARNING)

    with (
        patch("app.websocket.routes.manager", new_callable=AsyncMock) as mock_manager,
        patch("app.websocket.routes.asyncio.create_task"),
        patch("app.websocket.routes.heartbeat_loop", new_callable=MagicMock),
    ):

        # DB successful (none) - Use explicit mock to avoid chaining issues
        mock_result = MagicMock()
        mock_result.first.return_value = None
        mock_db.execute.return_value = mock_result

        # Side effect: 1. Unknown, 2. WebSocketDisconnect
        mock_ws.receive_text.side_effect = [
            json.dumps({"type": "unknown_type"}),
            WebSocketDisconnect(),
        ]

        # FIX: disconnect is synchronous
        mock_manager.disconnect = MagicMock()

        await websocket_endpoint(mock_ws, "user_unknown", mock_db)

        if "Unknown message type from client: unknown_type" not in caplog.text:
            pytest.fail(f"Warning log not found. Logs: {caplog.text}")
        assert "Unknown message type from client: unknown_type" in caplog.text


@pytest.mark.asyncio
async def test_heartbeat_loop_execution():
    """Test heartbeat loop logic (ping)."""
    mock_ws = AsyncMock()
    with (
        patch("asyncio.sleep", side_effect=[None, asyncio.CancelledError]),
        patch("app.websocket.routes.manager.send_ping", new_callable=AsyncMock) as mock_ping,
    ):

        await heartbeat_loop(mock_ws, "u1")
        mock_ping.assert_called_with("u1")


@pytest.mark.asyncio
async def test_heartbeat_loop_error(caplog):
    """Test heartbeat loop exception handling."""
    mock_ws = AsyncMock()
    with (
        patch("asyncio.sleep"),
        patch(
            "app.websocket.routes.manager.send_ping",
            side_effect=[Exception("PingFail"), asyncio.CancelledError],
        ),
    ):

        await heartbeat_loop(mock_ws, "u1")
        # Should catch exception and continue (until cancelled)
