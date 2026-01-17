
import pytest
import asyncio
import json
import base64
from unittest.mock import AsyncMock, MagicMock, patch, ANY
from uuid import uuid4
from fastapi import WebSocket, WebSocketDisconnect
from app.api.routes.chat_websocket import chat_websocket

# -----------------------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------------------

@pytest.fixture
def mock_websocket():
    ws = AsyncMock(spec=WebSocket)
    ws.query_params = {}
    return ws

@pytest.fixture
def mock_db_session():
    mock = AsyncMock()
    return mock

@pytest.fixture
def mock_auth_session_local(mock_db_session):
    """Mock AsyncSessionLocal context manager properly."""
    mock_cls = MagicMock()
    instance = MagicMock()
    instance.__aenter__.return_value = mock_db_session
    instance.__aexit__.return_value = None
    mock_cls.return_value = instance
    return mock_cls

@pytest.fixture
def mock_chat_service():
    service = AsyncMock()
    # Ensure methods return awaitable values
    session = MagicMock()
    session.id = uuid4()
    service.create_session.return_value = session
    
    msg = MagicMock()
    msg.id = uuid4()
    service.save_user_message.return_value = msg
    service.save_analysis_message.return_value = msg
    service.save_multi_emotion_analysis.return_value = MagicMock()
    service.save_insight_message.return_value = msg
    service.update_tone_preference.return_value = None
    service.update_deep_feeling_mode.return_value = None
    
    return service

@pytest.fixture
def mock_httpx_client():
    client_mock = AsyncMock()
    client_mock.__aenter__.return_value = client_mock
    client_mock.__aexit__.return_value = None
    return client_mock

@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = uuid4()
    user.email = "test@example.com"
    return user

# -----------------------------------------------------------------------------
# Tests: Connection & Authentication
# -----------------------------------------------------------------------------

# Removed test_chat_websocket_connect_guest as guest mode is disabled

@pytest.mark.asyncio
async def test_chat_websocket_auth_success(mock_websocket, mock_auth_session_local, mock_user):
    # Pass mock_user directly to verify the flow with a valid user
    with patch("app.api.routes.chat_websocket.manager.connect", new_callable=AsyncMock) as mock_connect:
        
        mock_websocket.receive_json.side_effect = WebSocketDisconnect()
        await chat_websocket(mock_websocket, "session_auth", current_user=mock_user)
        mock_connect.assert_called_once_with("session_auth", mock_websocket)

@pytest.mark.asyncio
async def test_chat_websocket_ping_pong(mock_websocket, mock_user):
    mock_websocket.receive_json.side_effect = [{"type": "ping"}, WebSocketDisconnect()]
    with patch("app.api.routes.chat_websocket.manager.send_message", new_callable=AsyncMock) as mock_send, \
         patch("app.api.routes.chat_websocket.manager.connect", new_callable=AsyncMock):
        await chat_websocket(mock_websocket, "session_ping", current_user=mock_user)
        mock_send.assert_called_with("session_ping", {"type": "pong"})

# -----------------------------------------------------------------------------
# Tests: Message Processing (Isolated)
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_process_text_message_flow(mock_websocket, mock_auth_session_local, mock_chat_service, mock_httpx_client):
    """Test process_text_message orchestrates the flow correctly."""
    from app.api.routes.chat_websocket import process_text_message
    
    mock_httpx_client.post.return_value = MagicMock(status_code=200, json=lambda: {"emotion": "Joy"})
    
    with patch("app.api.routes.chat_websocket.AsyncSessionLocal", new=mock_auth_session_local), \
         patch("app.api.routes.chat_websocket.ChatService", return_value=mock_chat_service), \
         patch("app.api.routes.chat_websocket.httpx.AsyncClient", return_value=mock_httpx_client), \
         patch("app.api.routes.chat_websocket.manager.get_db_session", return_value=uuid4()), \
         patch("app.api.routes.chat_websocket.manager.send_message", new_callable=AsyncMock), \
         patch("app.api.routes.chat_websocket.handle_single_emotion_result", new_callable=AsyncMock) as mock_handle_single:
        
        await process_text_message(
            session_id="session_text",
            content="Hello",
            tone_preference="warm",
            deep_feeling_enabled=False,
            websocket=mock_websocket
        )
        
        # Verify it called Listener
        mock_httpx_client.post.assert_called_once()
        # Verify it delegated to handler
        mock_handle_single.assert_called_once()

@pytest.mark.asyncio
async def test_handle_single_emotion_result_logic(mock_websocket, mock_auth_session_local, mock_chat_service):
    """Test handle_single_emotion_result saves analysis and generates insights."""
    from app.api.routes.chat_websocket import handle_single_emotion_result
    
    session_id = "session_single"
    db_session_id = uuid4()
    analysis_result = {"emotion": "Joy", "vac": {"valence": 0.8, "arousal": 0.5, "connection": 0.6}, "category": "Happiness", "confidence": 0.9}
    
    with patch("app.api.routes.chat_websocket.AsyncSessionLocal", new=mock_auth_session_local), \
         patch("app.api.routes.chat_websocket.ChatService", return_value=mock_chat_service), \
         patch("app.api.routes.chat_websocket.manager.send_message", new_callable=AsyncMock), \
         patch("app.api.routes.chat_websocket.generate_insights", new_callable=AsyncMock) as mock_insights:
        
        await handle_single_emotion_result(
            session_id, db_session_id, analysis_result, "warm", mock_websocket
        )
        
        # Verify DB save
        mock_chat_service.save_analysis_message.assert_called_once()
        # Verify insights generation
        mock_insights.assert_called_once()

@pytest.mark.asyncio
async def test_handle_tone_update(mock_websocket, mock_auth_session_local, mock_chat_service):
    from app.api.routes.chat_websocket import handle_tone_update
    
    session_id = "session_tone"
    db_session_id = uuid4()
    
    with patch("app.api.routes.chat_websocket.AsyncSessionLocal", new=mock_auth_session_local), \
         patch("app.api.routes.chat_websocket.ChatService", return_value=mock_chat_service), \
         patch("app.api.routes.chat_websocket.manager.get_db_session", return_value=db_session_id), \
         patch("app.api.routes.chat_websocket.manager.send_message", new_callable=AsyncMock) as mock_send:
        
        await handle_tone_update(session_id, {"tone_preference": "clinical"}, mock_websocket)
        
        mock_chat_service.update_tone_preference.assert_called_with(db_session_id, "clinical")
        mock_send.assert_called_with(session_id, {"type": "tone_updated", "tone_preference": "clinical"})

@pytest.mark.asyncio
async def test_handle_deep_feeling_update(mock_websocket, mock_auth_session_local, mock_chat_service):
    from app.api.routes.chat_websocket import handle_deep_feeling_update
    
    session_id = "session_deep"
    db_session_id = uuid4()
    
    with patch("app.api.routes.chat_websocket.AsyncSessionLocal", new=mock_auth_session_local), \
         patch("app.api.routes.chat_websocket.ChatService", return_value=mock_chat_service), \
         patch("app.api.routes.chat_websocket.manager.get_db_session", return_value=db_session_id), \
         patch("app.api.routes.chat_websocket.manager.send_message", new_callable=AsyncMock) as mock_send:
        
        await handle_deep_feeling_update(session_id, {"deep_feeling_enabled": True}, mock_websocket)
        
        mock_chat_service.update_deep_feeling_mode.assert_called_with(db_session_id, True)
        mock_send.assert_called_with(session_id, {"type": "deep_feeling_updated", "deep_feeling_enabled": True})

@pytest.mark.asyncio
async def test_process_audio_message_flow(mock_websocket, mock_auth_session_local, mock_chat_service, mock_httpx_client):
    from app.api.routes.chat_websocket import process_audio_message
    
    dummy_audio = base64.b64encode(b"fake").decode("utf-8")
    mock_httpx_client.post.return_value = MagicMock(
        status_code=200,
        json=lambda: {"transcription": "Hi", "emotion": "Neutral", "confidence": 0.8}
    )
    
    with patch("app.api.routes.chat_websocket.AsyncSessionLocal", new=mock_auth_session_local), \
         patch("app.api.routes.chat_websocket.ChatService", return_value=mock_chat_service), \
         patch("app.api.routes.chat_websocket.httpx.AsyncClient", return_value=mock_httpx_client), \
         patch("app.api.routes.chat_websocket.manager.get_db_session", return_value=uuid4()), \
         patch("app.api.routes.chat_websocket.manager.send_message", new_callable=AsyncMock), \
         patch("builtins.open", new_callable=MagicMock), \
         patch("os.remove"), \
         patch("app.api.routes.chat_websocket.handle_single_emotion_result", new_callable=AsyncMock) as mock_handle:
         
        await process_audio_message(
            "sess_audio", dummy_audio, None, "warm", False, mock_websocket
        )
        
        # Called twice: 1. Extract, 2. Analyze
        assert mock_httpx_client.post.call_count == 2
        mock_handle.assert_called_once()

@pytest.mark.asyncio
async def test_handle_user_message_dispatch(mock_websocket):
    """Test message dispatching to text/audio handlers."""
    from app.api.routes.chat_websocket import handle_user_message
    
    # Test Audio Dispatch
    audio_data = {"audio_data": "base64", "content": None}
    with patch("app.api.routes.chat_websocket.process_audio_message", new_callable=AsyncMock) as mock_audio, \
         patch("app.api.routes.chat_websocket.manager.send_message", new_callable=AsyncMock):  # ACK
        
        await handle_user_message("sess1", audio_data, mock_websocket)
        mock_audio.assert_called_once()
        
    # Test Text Dispatch
    text_data = {"content": "Hello", "audio_data": None}
    with patch("app.api.routes.chat_websocket.process_text_message", new_callable=AsyncMock) as mock_text, \
         patch("app.api.routes.chat_websocket.manager.send_message", new_callable=AsyncMock):
        
        await handle_user_message("sess2", text_data, mock_websocket)
        mock_text.assert_called_once()

@pytest.mark.asyncio
async def test_handle_multi_emotion_result(mock_websocket, mock_auth_session_local, mock_chat_service):
    """Test Deep Feeling multi-emotion result handling."""
    from app.api.routes.chat_websocket import handle_multi_emotion_result
    
    session_id = "session_multi"
    db_session_id = uuid4()
    msg_id = uuid4()
    
    analysis_result = {
        "emotions": [
            {"emotion_name": "Joy", "prominence": "primary", "confidence": 0.9, "vac": [1,1,1]},
            {"emotion_name": "Sadness", "prominence": "underlying", "confidence": 0.5, "vac": [0,0,0]}
        ],
        "relationships": [{"type": "conflict", "emotion_a": "Joy", "emotion_b": "Sadness"}],
        "aggregate_vac": {"valence": 0.5, "arousal": 0.5, "connection": 0.5},
        "complexity_score": 0.8,
        "three_way_data": {"discrepancy": 0.2}
    }
    
    with patch("app.api.routes.chat_websocket.AsyncSessionLocal", new=mock_auth_session_local), \
         patch("app.api.routes.chat_websocket.ChatService", return_value=mock_chat_service), \
         patch("app.api.routes.chat_websocket.manager.send_message", new_callable=AsyncMock) as mock_send, \
         patch("app.api.routes.chat_websocket.send_progress", new_callable=AsyncMock), \
         patch("app.api.routes.chat_websocket.generate_insights", new_callable=AsyncMock) as mock_insights:
        
        await handle_multi_emotion_result(
            session_id, db_session_id, msg_id, analysis_result, "warm", mock_websocket
        )
        
        mock_chat_service.save_multi_emotion_analysis.assert_called_once()
        mock_insights.assert_called_once()

@pytest.mark.asyncio
async def test_process_text_message_new_session(mock_websocket, mock_auth_session_local, mock_chat_service, mock_httpx_client):
    """Test process_text_message handles new session creation."""
    from app.api.routes.chat_websocket import process_text_message
    
    mock_httpx_client.post.return_value = MagicMock(status_code=200, json=lambda: {"emotion": "Joy"})
    
    with patch("app.api.routes.chat_websocket.AsyncSessionLocal", new=mock_auth_session_local), \
         patch("app.api.routes.chat_websocket.ChatService", return_value=mock_chat_service), \
         patch("app.api.routes.chat_websocket.httpx.AsyncClient", return_value=mock_httpx_client), \
         patch("app.api.routes.chat_websocket.manager.get_db_session", return_value=None), \
         patch("app.api.routes.chat_websocket.manager.set_db_session") as mock_set_db, \
         patch("app.api.routes.chat_websocket.manager.send_message", new_callable=AsyncMock), \
         patch("app.api.routes.chat_websocket.handle_single_emotion_result", new_callable=AsyncMock):
        
        await process_text_message(
            session_id="session_new",
            content="Hello",
            tone_preference="warm",
            deep_feeling_enabled=False,
            websocket=mock_websocket
        )
        
        mock_chat_service.create_session.assert_called_once()
        mock_set_db.assert_called_once()

@pytest.mark.asyncio
async def test_generate_insights(mock_websocket, mock_auth_session_local, mock_chat_service):
    """Test generating and saving insights."""
    from app.api.routes.chat_websocket import generate_insights
    
    session_id = "session_insights"
    db_session_id = uuid4()
    analysis_result = {"emotion": "Joy", "confidence": 0.9}
    
    mock_generator = AsyncMock()
    mock_generator.generate_insights.return_value = {"summary": "Insight summary", "guidance": "Do this"}
    
    with patch("app.api.routes.chat_websocket.AsyncSessionLocal", new=mock_auth_session_local), \
         patch("app.services.insight_generator.InsightGenerator", return_value=mock_generator), \
         patch("app.api.routes.chat_websocket.ChatService", return_value=mock_chat_service), \
         patch("app.api.routes.chat_websocket.manager.send_message", new_callable=AsyncMock) as mock_send, \
         patch("app.api.routes.chat_websocket.send_progress", new_callable=AsyncMock):
        
        await generate_insights(
            db_session_id, session_id, analysis_result, "warm", None, mock_websocket
        )
        
        # Verify generation
        mock_generator.generate_insights.assert_called_once()
        # Verify streaming
        call_args = mock_send.call_args_list[0][0] # First call might be stream
        assert call_args[0] == session_id
        assert call_args[1]["type"] == "insight"
        # Verify saving
        mock_chat_service.save_insight_message.assert_called_once()
