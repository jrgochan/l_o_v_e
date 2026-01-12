import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from fastapi import WebSocket

from app.websocket.connection_manager import ConnectionManager, manager

@pytest.fixture
def connection_manager():
    return ConnectionManager()

@pytest.fixture
def mock_websocket():
    ws = AsyncMock(spec=WebSocket)
    ws.send_json = AsyncMock()
    ws.accept = AsyncMock()
    return ws

@pytest.mark.asyncio
async def test_connect_single_user(connection_manager, mock_websocket):
    await connection_manager.connect(mock_websocket, "user1")
    assert connection_manager.get_connection_count("user1") == 1
    assert connection_manager._connection_count == 1
    assert "user1" in connection_manager.get_connected_users()
    mock_websocket.accept.assert_awaited_once()

@pytest.mark.asyncio
async def test_connect_multiple_devices(connection_manager):
    ws1 = AsyncMock(spec=WebSocket)
    ws2 = AsyncMock(spec=WebSocket)
    
    await connection_manager.connect(ws1, "user1")
    await connection_manager.connect(ws2, "user1")
    
    assert connection_manager.get_connection_count("user1") == 2
    assert connection_manager._connection_count == 2

@pytest.mark.asyncio
async def test_disconnect(connection_manager, mock_websocket):
    await connection_manager.connect(mock_websocket, "user1")
    connection_manager.disconnect(mock_websocket, "user1")
    
    assert connection_manager.get_connection_count("user1") == 0
    assert connection_manager._connection_count == 0
    assert "user1" not in connection_manager.active_connections

@pytest.mark.asyncio
async def test_send_to_user_success(connection_manager, mock_websocket):
    await connection_manager.connect(mock_websocket, "user1")
    message = {"type": "test"}
    await connection_manager.send_to_user("user1", message)
    
    mock_websocket.send_json.assert_awaited_with(message)

@pytest.mark.asyncio
async def test_send_to_user_cleanup_on_failure(connection_manager, mock_websocket):
    """Test that failed connections are removed."""
    await connection_manager.connect(mock_websocket, "user1")
    
    # Simulate send failure
    mock_websocket.send_json.side_effect = Exception("Connection dead")
    
    await connection_manager.send_to_user("user1", {"type": "test"})
    
    # Verify cleanup
    assert connection_manager.get_connection_count("user1") == 0
    assert "user1" not in connection_manager.active_connections

@pytest.mark.asyncio
async def test_send_to_offline_user(connection_manager):
    # Should not raise error
    await connection_manager.send_to_user("offline", {"type": "test"})

@pytest.mark.asyncio
async def test_broadcast_to_all(connection_manager):
    ws1 = AsyncMock(spec=WebSocket)
    ws2 = AsyncMock(spec=WebSocket)
    
    await connection_manager.connect(ws1, "user1")
    await connection_manager.connect(ws2, "user2")
    
    message = {"type": "broadcast"}
    await connection_manager.broadcast_to_all(message)
    
    ws1.send_json.assert_awaited_with(message)
    ws2.send_json.assert_awaited_with(message)

@pytest.mark.asyncio
async def test_broadcast_to_empty(connection_manager):
    # Should not raise error
    await connection_manager.broadcast_to_all({"type": "test"})

@pytest.mark.asyncio
async def test_send_specialized_updates(connection_manager, mock_websocket):
    await connection_manager.connect(mock_websocket, "user1")
    
    await connection_manager.send_state_update("user1", {"state": "joy"})
    args = mock_websocket.send_json.call_args_list[-1][0][0]
    assert args["type"] == "state_update"
    assert args["data"]["state"] == "joy"
    
    await connection_manager.send_journey_update("user1", {"status": "started"})
    args = mock_websocket.send_json.call_args_list[-1][0][0]
    assert args["type"] == "journey_update"
    
    await connection_manager.send_ping("user1")
    args = mock_websocket.send_json.call_args_list[-1][0][0]
    assert args["type"] == "ping"

def test_singleton_instance():
    assert isinstance(manager, ConnectionManager)
