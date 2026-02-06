from unittest.mock import AsyncMock

import pytest
from fastapi import WebSocket

from app.websocket.connection_manager import ConnectionManager

# -----------------------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------------------


@pytest.fixture
def manager():
    return ConnectionManager()


@pytest.fixture
def mock_ws():
    ws = AsyncMock(spec=WebSocket)
    return ws


# -----------------------------------------------------------------------------
# Tests: Connection Lifecycle
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_connect_lifecycle(manager, mock_ws):
    """Test standard connection and disconnection flow."""
    user_id = "user_1"

    # Connect
    await manager.connect(mock_ws, user_id)

    # Verify accepted
    mock_ws.accept.assert_awaited_once()

    # Verify state
    assert user_id in manager.active_connections
    assert mock_ws in manager.active_connections[user_id]
    assert manager.get_connection_count() == 1
    assert manager.get_connection_count(user_id) == 1

    # Disconnect
    manager.disconnect(mock_ws, user_id)

    # Verify cleanup
    assert user_id not in manager.active_connections
    assert manager.get_connection_count() == 0


@pytest.mark.asyncio
async def test_multiple_connections_per_user(manager):
    """Test single user having multiple active connections (e.g. tabs)."""
    user_id = "user_multi"
    ws1 = AsyncMock(spec=WebSocket)
    ws2 = AsyncMock(spec=WebSocket)

    await manager.connect(ws1, user_id)
    await manager.connect(ws2, user_id)

    assert manager.get_connection_count(user_id) == 2
    assert len(manager.active_connections[user_id]) == 2

    # Disconnect one
    manager.disconnect(ws1, user_id)
    assert manager.get_connection_count(user_id) == 1
    assert user_id in manager.active_connections

    # Disconnect last
    manager.disconnect(ws2, user_id)
    assert user_id not in manager.active_connections


@pytest.mark.asyncio
async def test_disconnect_unknown_user(manager, mock_ws):
    """Test disconnecting a user/socket that isn't tracked."""
    # Should not raise error
    manager.disconnect(mock_ws, "unknown_user")


# -----------------------------------------------------------------------------
# Tests: Messaging & Broadcasting
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_send_to_user_success(manager, mock_ws):
    """Test successful message delivery to user."""
    user_id = "user_msg"
    await manager.connect(mock_ws, user_id)

    msg = {"type": "test", "data": "content"}
    await manager.send_to_user(user_id, msg)

    mock_ws.send_json.assert_awaited_with(msg)


@pytest.mark.asyncio
async def test_send_to_user_cleanup_on_failure(manager, mock_ws):
    """Test that failed connections are removed during broadcast."""
    user_id = "user_fail"
    await manager.connect(mock_ws, user_id)

    # Simulate send failure
    mock_ws.send_json.side_effect = Exception("Connection lost")

    await manager.send_to_user(user_id, {"type": "test"})

    # Should have been removed
    assert user_id not in manager.active_connections
    assert manager.get_connection_count() == 0


@pytest.mark.asyncio
async def test_broadcast_to_all(manager):
    """Test global broadcast to multiple users."""
    ws1 = AsyncMock()
    ws2 = AsyncMock()

    await manager.connect(ws1, "user_A")
    await manager.connect(ws2, "user_B")

    msg = {"type": "system", "msg": "maintenance"}
    await manager.broadcast_to_all(msg)

    ws1.send_json.assert_awaited_with(msg)
    ws2.send_json.assert_awaited_with(msg)


@pytest.mark.asyncio
async def test_broadcast_no_users(manager):
    """Test broadcast with no users connected."""
    # Should just log and return
    await manager.broadcast_to_all({"type": "test"})


# -----------------------------------------------------------------------------
# Tests: Specialized Helper Methods
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_helper_wrappers(manager, mock_ws):
    """Test send_state_update, send_journey_update, send_ping."""
    user_id = "user_helpers"
    await manager.connect(mock_ws, user_id)

    # State Update
    await manager.send_state_update(user_id, {"emotion": "joy"})
    mock_ws.send_json.assert_awaited()
    call_args = mock_ws.send_json.call_args_list[-1][0][0]
    assert call_args["type"] == "state_update"

    # Journey Update
    await manager.send_journey_update(user_id, {"status": "started"})
    call_args = mock_ws.send_json.call_args_list[-1][0][0]
    assert call_args["type"] == "journey_update"

    # Ping
    await manager.send_ping(user_id)
    call_args = mock_ws.send_json.call_args_list[-1][0][0]
    assert call_args["type"] == "ping"


# -----------------------------------------------------------------------------
# Tests: Concurrency & Edge Cases
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_connected_users(manager, mock_ws):
    await manager.connect(mock_ws, "user_1")
    await manager.connect(AsyncMock(), "user_2")

    users = manager.get_connected_users()
    assert len(users) == 2
    assert "user_1" in users
    assert "user_2" in users


@pytest.mark.asyncio
async def test_disconnect_race_condition(manager):
    """Test handling of disconnect during broadcast iteration."""
    # This simulates a tricky race where a connection might be removed
    # while we are iterating over the connection list.
    # Since active_connections[user_id] is a Set, iterating and modifying it
    # needs to be handled carefully in the implementation.

    user_id = "user_race"
    ws1 = AsyncMock()
    ws2 = AsyncMock()

    await manager.connect(ws1, user_id)
    await manager.connect(ws2, user_id)

    # Mock ws1 to disconnect ITSELF when sent to
    async def side_effect_modify(*args, **kwargs):
        # Simulate simultaneous disconnect
        manager.disconnect(ws1, user_id)
        return

    ws1.send_json.side_effect = side_effect_modify

    # This should be safe because send_to_user iterates over the set directly.
    # If the set is modified during iteration, it might raise RuntimeError.
    # The implementation needs to handle this (e.g. by iterating over a copy/snapshot).
    try:
        await manager.send_to_user(user_id, {"type": "test"})
    except RuntimeError as e:
        pytest.fail(f"Concurrency error: {e}")

    # Verify cleanup
    assert ws1 not in manager.active_connections[user_id]
