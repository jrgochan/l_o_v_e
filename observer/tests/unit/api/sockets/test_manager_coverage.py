from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.api.sockets.manager import ConnectionManager


@pytest.fixture
def manager():
    return ConnectionManager()


@pytest.fixture
def mock_ws():
    ws = AsyncMock()
    ws.accept = AsyncMock()
    ws.send_json = AsyncMock()
    ws.send_text = AsyncMock()
    # To simulate successful connection
    return ws


@pytest.mark.asyncio
async def test_connect_with_user_id(manager, mock_ws):
    """Test connect with user_id (Lines 48-52)."""
    user_id = uuid4()
    session_id = str(uuid4())

    await manager.connect(session_id, mock_ws, user_id=user_id)

    assert str(user_id) in manager.user_connections
    assert session_id in manager.user_connections[str(user_id)]
    assert manager.session_user_mapping[session_id] == str(user_id)


@pytest.mark.asyncio
async def test_disconnect_cleanup_user(manager, mock_ws):
    """Test disconnect cleanup for user (Lines 91-96)."""
    user_id = uuid4()
    session_id = str(uuid4())

    # Connect first
    await manager.connect(session_id, mock_ws, user_id=user_id)

    # Disconnect
    manager.disconnect(session_id)

    # Verify cleanup
    # User should be removed from session_user_mapping
    assert session_id not in manager.session_user_mapping
    # Session removed from user_connections
    if str(user_id) in manager.user_connections:
        assert session_id not in manager.user_connections[str(user_id)]
    else:
        # Or user entry removed entirely if empty
        pass

    # Verify user entry removed if empty (Line 94-95)
    assert str(user_id) not in manager.user_connections


@pytest.mark.asyncio
async def test_disconnect_multi_session_cleanup(manager, mock_ws):
    """Test disconnect cleanup when user has multiple sessions."""
    user_id = uuid4()
    s1 = "s1"
    s2 = "s2"

    await manager.connect(s1, mock_ws, user_id=user_id)
    await manager.connect(s2, mock_ws, user_id=user_id)

    manager.disconnect(s1)

    assert str(user_id) in manager.user_connections
    assert s2 in manager.user_connections[str(user_id)]
    assert s1 not in manager.user_connections[str(user_id)]


@pytest.mark.asyncio
async def test_send_message_extensions(manager, mock_ws):
    """Test send_message error handling (Lines 110-115)."""
    session_id = "s1"
    manager.active_connections[session_id] = mock_ws

    # RuntimeError
    mock_ws.send_json.side_effect = RuntimeError("Connection closed")
    await manager.send_message(session_id, {"msg": "hi"})
    # Should catch and log warning, no crash

    # Generic Exception
    mock_ws.send_json.side_effect = Exception("Generic error")
    await manager.send_message(session_id, {"msg": "hi"})
    # Should catch and log error, no crash


@pytest.mark.asyncio
async def test_send_text_extensions(manager, mock_ws):
    """Test send_text error handling (Lines 127-130)."""
    session_id = "s1"
    manager.active_connections[session_id] = mock_ws

    # RuntimeError
    mock_ws.send_text.side_effect = RuntimeError("Connection closed")
    await manager.send_text(session_id, "hello")

    # Generic Exception
    mock_ws.send_text.side_effect = Exception("Generic error")
    await manager.send_text(session_id, "hello")


@pytest.mark.asyncio
async def test_send_to_user_logic(manager, mock_ws):
    """Test send_to_user logic (Lines 139-143)."""
    user_id = uuid4()
    s1 = "s1"
    s2 = "s2"

    # 1. User not connected (Line 139-140)
    await manager.send_to_user(str(user_id), {"msg": "hi"})
    # No error, just returns

    # 2. User connected with multiple sessions
    await manager.connect(s1, mock_ws, user_id=user_id)
    await manager.connect(s2, mock_ws, user_id=user_id)

    await manager.send_to_user(str(user_id), {"msg": "broadcast"})

    assert mock_ws.send_json.call_count == 2


@pytest.mark.asyncio
async def test_db_session_mapping(manager):
    """Test set_db_session and get_db_session (Lines 56-74)."""
    session_id = "s1"
    db_session_id = uuid4()

    # Test set
    manager.set_db_session(session_id, db_session_id)
    assert manager.session_mapping[session_id] == db_session_id

    # Test get
    retrieved_id = manager.get_db_session(session_id)
    assert retrieved_id == db_session_id

    # Test get non-existent
    assert manager.get_db_session("non-existent") is None


@pytest.mark.asyncio
async def test_disconnect_branches(manager):
    """Test disconnect branches (Lines 76-98)."""
    session_id = "s1"

    # 1. Disconnect non-existent session (should not crash)
    manager.disconnect(session_id)

    # 2. Session in active_connections but not mappings
    manager.active_connections[session_id] = MagicMock()
    manager.disconnect(session_id)
    assert session_id not in manager.active_connections

    # 3. Session in session_mapping but not active
    manager.session_mapping[session_id] = uuid4()
    manager.disconnect(session_id)
    assert session_id not in manager.session_mapping

    # 4. Session in mapping but user not in user_connections (edge case)
    user_id = str(uuid4())
    manager.session_user_mapping[session_id] = user_id
    # user_connections empty
    manager.disconnect(session_id)
    assert session_id not in manager.session_user_mapping


@pytest.mark.asyncio
async def test_connect_existing_user(manager, mock_ws):
    """Test connect for user with existing connections (Line 49)."""
    user_id = uuid4()
    s1 = "s1"
    s2 = "s2"

    # First connection adds user to dict
    await manager.connect(s1, mock_ws, user_id=user_id)
    assert len(manager.user_connections[str(user_id)]) == 1

    # Second connection appends to set
    await manager.connect(s2, mock_ws, user_id=user_id)
    assert len(manager.user_connections[str(user_id)]) == 2
    assert s1 in manager.user_connections[str(user_id)]
    assert s2 in manager.user_connections[str(user_id)]


@pytest.mark.asyncio
async def test_send_state_update(manager, mock_ws):
    """Test send_state_update (Lines 152-157)."""
    user_id = uuid4()
    s1 = "s1"
    await manager.connect(s1, mock_ws, user_id=user_id)

    state_data = {"val": 1}
    await manager.send_state_update(str(user_id), state_data)

    mock_ws.send_json.assert_called_once()
    call_args = mock_ws.send_json.call_args[0][0]
    assert call_args["type"] == "state_update"
    assert call_args["data"] == state_data
    assert "timestamp" in call_args


@pytest.mark.asyncio
async def test_connect_no_user(manager, mock_ws):
    """Test connect without user_id (Line 47 false branch)."""
    session_id = str(uuid4())

    await manager.connect(session_id, mock_ws, user_id=None)

    assert session_id in manager.active_connections
    assert session_id not in manager.session_user_mapping
    # user_connections should remain empty
    assert len(manager.user_connections) == 0


@pytest.mark.asyncio
async def test_send_unknown_session(manager):
    """Test send_message/text with unknown session (Lines 107/124 false branch)."""
    session_id = "unknown"

    # Should just return without error
    await manager.send_message(session_id, {"msg": "hi"})
    await manager.send_text(session_id, "hello")
