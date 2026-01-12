import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from fastapi import WebSocket, WebSocketDisconnect
from jose import jwt
from app.config import settings
from app.api.routes import chat_websocket

@pytest.fixture
def mock_websocket():
    ws = AsyncMock(spec=WebSocket)
    ws.query_params = {}
    ws.accept = AsyncMock()
    ws.receive_json = AsyncMock()
    ws.send_json = AsyncMock()
    ws.send_text = AsyncMock()
    ws.close = AsyncMock()
    return ws

@pytest.fixture
def mock_manager():
    with patch("app.api.routes.chat_websocket.manager") as mgr:
        mgr.connect = AsyncMock()
        mgr.disconnect = MagicMock() # Not async in original code?
        # Checking file: "def disconnect(self, session_id: str) -> None:" - Sync
        # "async def connect(self, session_id: str, websocket: WebSocket) -> None:" - Async
        mgr.send_message = AsyncMock()
        mgr.send_text = AsyncMock()
        yield mgr

@pytest.fixture
def mock_db_session_local():
    with patch("app.api.routes.chat_websocket.AsyncSessionLocal") as session_local:
        mock_session = AsyncMock()
        mock_cm = AsyncMock()
        mock_cm.__aenter__.return_value = mock_session
        session_local.return_value = mock_cm
        yield mock_session

@pytest.fixture
def mock_httpx_client():
    with patch("httpx.AsyncClient") as client_cls:
        client = AsyncMock()
        client_cls.return_value.__aenter__.return_value = client
        client.post = AsyncMock() # Explicitly ensure post is async
        yield client

# === Auth Tests ===

@pytest.mark.asyncio
async def test_websocket_connect_no_auth(mock_websocket, mock_manager):
    # Raise disconnect immediately to break loop after connect
    mock_websocket.receive_json.side_effect = WebSocketDisconnect()
    
    await chat_websocket.chat_websocket(mock_websocket, "session1")
    
    # Check await count or just called
    mock_manager.connect.assert_awaited_with("session1", mock_websocket)
    # Should proceed as guest

@pytest.mark.asyncio
async def test_websocket_connect_auth_success(mock_websocket, mock_manager, mock_db_session_local):
    token = jwt.encode({"sub": "test@example.com"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    mock_websocket.query_params = {"token": token}
    
    # Mock DB user lookup
    mock_res = MagicMock()
    user = MagicMock()
    user.id = uuid4()
    user.email = "test@example.com"
    mock_res.scalars.return_value.first.return_value = user
    mock_db_session_local.execute.return_value = mock_res
    
    # We need to interrupt the infinite loop by raising WebSocketDisconnect on receive_json
    mock_websocket.receive_json.side_effect = WebSocketDisconnect()
    
    await chat_websocket.chat_websocket(mock_websocket, "session1")
    
    mock_db_session_local.execute.assert_called()

# === Message Handling Tests ===

@pytest.mark.asyncio
async def test_handle_user_message_text(mock_websocket, mock_manager, mock_db_session_local, mock_httpx_client):
    # This calls handle_user_message directly, so no loop to break if specific func is tested
    # But checking usage: handle_user_message uses websocket?
    # Yes, passed in.
    
    session_id = "session1"
    data = {"type": "user_message", "content": "Hello", "tone_preference": "warm"}
    
    # Mock ChatService
    with patch("app.api.routes.chat_websocket.ChatService") as MockChatService:
        service_instance = AsyncMock()
        MockChatService.return_value = service_instance
        
        # Mock create_session
        session_obj = MagicMock()
        session_obj.id = uuid4()
        service_instance.create_session.return_value = session_obj
        
        # Mock save_user_message
        msg_obj = MagicMock()
        msg_obj.id = uuid4()
        service_instance.save_user_message.return_value = msg_obj
        
        # Mock Listener response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "emotion": "Joy",
            "vac": {"valence": 0.8, "arousal": 0.5, "connection": 0.6},
            "confidence": 0.9,
            "category": "Happiness"
        }
        mock_httpx_client.post.return_value = mock_response
        
        # Mock generate_insights
        with patch("app.api.routes.chat_websocket.generate_insights", new_callable=AsyncMock) as mock_gen:
            await chat_websocket.handle_user_message(session_id, data, mock_websocket)
            
            # Verify flow
            mock_manager.send_message.assert_any_call(session_id, {"type": "message_received", "timestamp": "now"})
            service_instance.save_user_message.assert_awaited()
            mock_httpx_client.post.assert_awaited()
            mock_gen.assert_awaited()

@pytest.mark.asyncio
async def test_handle_ping(mock_websocket, mock_manager):
    # Setup loop to process one ping then disconnect
    mock_websocket.receive_json.side_effect = [{"type": "ping"}, WebSocketDisconnect()]
    
    await chat_websocket.chat_websocket(mock_websocket, "session1")
    
    mock_manager.send_message.assert_called_with("session1", {"type": "pong"})

@pytest.mark.asyncio
async def test_process_audio_message(mock_manager, mock_db_session_local, mock_httpx_client, mock_websocket):
    session_id = "session1"
    audio_b64 = "UklGRgAAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=" # Minimal WAV header
    
    # Mock file operations to avoid real temp files if possible, but tempfile is used.
    # We let it create a real temp file or mock open.
    # Real temp file is safer for 'process_audio_message' as it opens it.
    
    # Mock ChatService
    with patch("app.api.routes.chat_websocket.ChatService") as MockChatService:
        service = AsyncMock()
        MockChatService.return_value = service
        # Mock session creation
        service.create_session.return_value = MagicMock(id=uuid4())
        service.save_user_message.return_value = MagicMock(id=uuid4())
        
        # Mock Listener response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "transcription": "Hello audio",
            "emotion": "Calm",
            "vac": {"valence": 0.1, "arousal": -0.2, "connection": 0.3},
            "prosody": {"pitch": 100}
        }
        mock_httpx_client.post.return_value = mock_response
        
        with patch("app.api.routes.chat_websocket.generate_insights", new_callable=AsyncMock) as mock_gen:
            await chat_websocket.process_audio_message(
                session_id=session_id,
                audio_data=audio_b64,
                original_text=None,
                tone_preference="warm",
                deep_feeling_enabled=False,
                websocket=mock_websocket
            )
            
            # Verify transcription sent
            mock_manager.send_message.assert_any_call(session_id, {"type": "transcription", "text": "Hello audio"})
            # Verify prosody sent
            mock_manager.send_message.assert_any_call(session_id, {"type": "prosody", "data": {"pitch": 100}})
            # Verify analysis sent
            # Check last call or iterate
            calls = mock_manager.send_message.call_args_list
            analysis_sent = False
            for c in calls:
                if c[0][0] == session_id and c[0][1].get("type") == "analysis":
                    analysis_sent = True
                    break
            assert analysis_sent

@pytest.mark.asyncio
async def test_deep_feeling_flow(mock_manager, mock_db_session_local, mock_httpx_client, mock_websocket):
    # Test text message with deep_feeling_enabled=True
    session_id = "session1"
    
    with patch("app.api.routes.chat_websocket.ChatService") as MockChatService:
        service = AsyncMock()
        MockChatService.return_value = service
        service.create_session.return_value = MagicMock(id=uuid4())
        service.save_user_message.return_value = MagicMock(id=uuid4())
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "emotion": "Mixed",
            "vac": {"valence": 0, "arousal": 0, "connection": 0},
            # Multi-emotion specific fields would be here
        }
        mock_httpx_client.post.return_value = mock_response
        
        # Mock handle_multi_emotion_result
        with patch("app.api.routes.chat_websocket.handle_multi_emotion_result", new_callable=AsyncMock) as mock_handle_multi:
            
            await chat_websocket.process_text_message(
                session_id=session_id,
                content="Deep stuff",
                tone_preference="warm",
                deep_feeling_enabled=True,
                websocket=mock_websocket
            )
            
            # Verify listener URL was targeting multi-emotion
            args, kwargs = mock_httpx_client.post.call_args
            assert "/listener/analyze-multi-emotion" in args[0]
            
            # Verify handle_multi_emotion_result called
            mock_handle_multi.assert_awaited()

# === New Tests for Phase 6 Coverage ===

@pytest.mark.asyncio
async def test_websocket_connect_auth_failure(mock_websocket, mock_manager):
    # Test invalid token
    mock_websocket.query_params = {"token": "invalid_token"}
    
    # We expect it to log a warning but proceed as guest or fail?
    # Code says: logger.warning(...); user_identifier = "guest"
    # So it connects as guest
    
    mock_websocket.receive_json.side_effect = WebSocketDisconnect()
    
    with patch("app.api.routes.chat_websocket.jwt.decode", side_effect=Exception("Invalid sig")):
        await chat_websocket.chat_websocket(mock_websocket, "session1")
    
    # Should still connect (as guest)
    mock_manager.connect.assert_awaited()

@pytest.mark.asyncio
async def test_handle_tone_update(mock_websocket, mock_manager):
    session_id = "session1"
    
    with patch("app.api.routes.chat_websocket.handle_tone_update") as mock_handler:
        mock_websocket.receive_json.side_effect = [
            {"type": "update_tone", "tone_preference": "clinical"},
            WebSocketDisconnect()
        ]
        
        await chat_websocket.chat_websocket(mock_websocket, session_id)
        mock_handler.assert_awaited()

@pytest.mark.asyncio
async def test_handle_deep_feeling_update(mock_websocket, mock_manager):
    session_id = "session1"
    
    with patch("app.api.routes.chat_websocket.handle_deep_feeling_update") as mock_handler:
        mock_websocket.receive_json.side_effect = [
            {"type": "update_deep_feeling", "deep_feeling_enabled": True},
            WebSocketDisconnect()
        ]
        
        await chat_websocket.chat_websocket(mock_websocket, session_id)
        mock_handler.assert_awaited()



@pytest.mark.asyncio
async def test_handle_user_message_error(mock_websocket, mock_manager):
    session_id = "session1"
    data = {"type": "user_message", "content": "Fail me"}
    
    # Mock process_text_message to raise exception
    with patch("app.api.routes.chat_websocket.process_text_message", side_effect=Exception("Processing boom")):
        await chat_websocket.handle_user_message(session_id, data, mock_websocket)
        
        # Verify error message sent
        args = mock_manager.send_message.call_args
        assert args[0][0] == session_id
        assert args[0][1]["type"] == "error"
        assert "Processing boom" in args[0][1]["message"]

@pytest.mark.asyncio
async def test_unknown_message_type(mock_websocket, mock_manager):
    mock_websocket.receive_json.side_effect = [
        {"type": "unknown_type"},
        WebSocketDisconnect()
    ]
    
    await chat_websocket.chat_websocket(mock_websocket, "session1")
    
    mock_manager.send_message.assert_called_with(
        "session1", 
        {"type": "error", "message": "Unknown message type: unknown_type"}
    )

@pytest.mark.asyncio
async def test_generate_insights_integration(mock_websocket, mock_manager, mock_db_session_local):
    # Test the standalone generate_insights function in chat_websocket
    
    session_id = "session1"
    db_session_id = uuid4()
    analysis_result = {
        "emotion": "Joy",
        "category": "Happiness",
        "vac": {"valence": 0.8},
        "confidence": 0.9,
        "reasoning": "Smiling voice"
    }
    
    with patch("app.api.routes.chat_websocket.ChatService") as MockChatService, \
         patch("app.services.insight_generator.InsightGenerator") as MockInsightGen:
        
        # Mock ChatService
        chat_service = AsyncMock()
        MockChatService.return_value = chat_service
        
        # Mock InsightGenerator
        generator = AsyncMock()
        MockInsightGen.return_value = generator
        generator.generate_insights.return_value = {
            "summary": "You sound happy",
            "mode": "warm",
            "guidance": "Enjoy it"
        }
        
        await chat_websocket.generate_insights(
            db_session_id, session_id, analysis_result, "warm", None, mock_websocket
        )
        
        # Verify streams
        # 1. Insight Generation
        generator.generate_insights.assert_awaited()
        
        # 2. Insight Stream
        mock_manager.send_message.assert_any_call(
            session_id,
            {"type": "insight", "insights": generator.generate_insights.return_value}
        )
        
        # 3. DB Save Insight
        chat_service.save_insight_message.assert_awaited()

@pytest.mark.asyncio
async def test_connection_manager():
    # Test ConnectionManager methods directly
    cm = chat_websocket.ConnectionManager()
    ws = AsyncMock(spec=WebSocket)
    session_id = "sess1"
    
    # Connect
    await cm.connect(session_id, ws)
    assert session_id in cm.active_connections
    ws.accept.assert_awaited()
    
    # Set DB Session
    db_sess = uuid4()
    cm.set_db_session(session_id, db_sess)
    assert cm.get_db_session(session_id) == db_sess
    
    # Send Message
    msg = {"type": "test"}
    await cm.send_message(session_id, msg)
    ws.send_json.assert_awaited_with(msg)
    
    # Send Text
    await cm.send_text(session_id, "hello")
    ws.send_text.assert_awaited_with("hello")
    
    # Disconnect
    cm.disconnect(session_id)
    assert session_id not in cm.active_connections
    assert session_id not in cm.session_mapping

@pytest.mark.asyncio
async def test_handle_single_emotion_result_integration(mock_websocket, mock_manager, mock_db_session_local):
    # Test handle_single_emotion_result
    session_id = "session1"
    db_session_id = uuid4()
    analysis_result = {
        "emotion": "Joy",
        "category": "Happiness",
        "vac": {"valence": 0.8}, 
        "confidence": 0.9,
        "reasoning": "Reason"
    }
    
    with patch("app.api.routes.chat_websocket.ChatService") as MockChatService, \
         patch("app.api.routes.chat_websocket.generate_insights", new_callable=AsyncMock) as mock_gen:
         
        cs = AsyncMock()
        MockChatService.return_value = cs
        
        await chat_websocket.handle_single_emotion_result(
            session_id, db_session_id, analysis_result, "warm", mock_websocket
        )
        
        # Check stream
        mock_manager.send_message.assert_any_call(
            session_id,
            {
                "type": "analysis",
                "emotion": "Joy",
                "category": "Happiness",
                "vac": {"valence": 0.8},
                "confidence": 0.9,
                "reasoning": "Reason"
            }
        )
        
        # Check DB save
        cs.save_analysis_message.assert_awaited()
        
        # Check insight gen
        mock_gen.assert_awaited()

@pytest.mark.asyncio
async def test_connection_manager_edge_cases():
    cm = chat_websocket.ConnectionManager()
    
    # Disconnect non-existent
    cm.disconnect("non-existent") # Should not raise error
    
    # Send message to non-existent
    await cm.send_message("non-existent", {"type": "test"}) # Should no-op
    
    # Send text to non-existent
    await cm.send_text("non-existent", "test") # Should no-op

@pytest.mark.asyncio
async def test_process_text_message_db_error(mock_websocket, mock_manager, mock_db_session_local):
    # Test DB error during analysis save in process_text_message
    session_id = "session1"
    content = "Hello"
    
    with patch("app.api.routes.chat_websocket.ChatService") as MockChatService, \
         patch("app.api.routes.chat_websocket.httpx.AsyncClient") as MockClient:
         
        cs = AsyncMock()
        MockChatService.return_value = cs
        
        # Mock successful create/save user msg
        cs.create_session.return_value = MagicMock(id=uuid4())
        cs.save_user_message.return_value = MagicMock(id=uuid4())
        
        # Mock listener success
        client = AsyncMock()
        MockClient.return_value.__aenter__.return_value = client
        client.post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"emotion": "Joy", "vac": {}, "confidence": 0.9}
        )
        
        # Mock save_analysis_message failure
        cs.save_analysis_message.side_effect = Exception("DB Fail")
        
        # It should log error but continue to generate insights
        with patch("app.services.insight_generator.InsightGenerator") as MockIG:
            # Ensure generate_insights is async
            MockIG.return_value.generate_insights = AsyncMock(return_value={})
            
            await chat_websocket.process_text_message(
                session_id, content, "warm", False, mock_websocket
            )
            
            # Should have called generate_insights despite DB error
            MockIG.return_value.generate_insights.assert_awaited()

@pytest.mark.asyncio
async def test_handle_tone_update_integration(mock_websocket, mock_manager, mock_db_session_local):
    session_id = "session1"
    db_session_id = uuid4()
    
    # Mock DB session retrieval
    mock_manager.get_db_session.return_value = db_session_id
    
    with patch("app.api.routes.chat_websocket.ChatService") as MockChatService:
        cs = AsyncMock()
        MockChatService.return_value = cs
        
        data = {"type": "update_tone", "tone_preference": "clinical"}
        
        await chat_websocket.handle_tone_update(session_id, data, mock_websocket)
        
        # Verify DB update
        cs.update_tone_preference.assert_awaited_with(db_session_id, "clinical")
        
        # Verify confirmation message
        mock_manager.send_message.assert_any_call(
            session_id, {"type": "tone_updated", "tone_preference": "clinical"}
        )

@pytest.mark.asyncio
async def test_handle_deep_feeling_update_integration(mock_websocket, mock_manager, mock_db_session_local):
    session_id = "session1"
    db_session_id = uuid4()
    
    mock_manager.get_db_session.return_value = db_session_id
    
    with patch("app.api.routes.chat_websocket.ChatService") as MockChatService:
        cs = AsyncMock()
        MockChatService.return_value = cs
        
        data = {"type": "update_deep_feeling", "deep_feeling_enabled": True}
        
        await chat_websocket.handle_deep_feeling_update(session_id, data, mock_websocket)
        
        # Verify DB update
        cs.update_deep_feeling_mode.assert_awaited_with(db_session_id, True)
        
        # Verify confirmation message
        mock_manager.send_message.assert_any_call(
            session_id, {"type": "deep_feeling_updated", "deep_feeling_enabled": True}
        )

@pytest.mark.asyncio
async def test_handle_multi_emotion_result_integration(mock_websocket, mock_manager, mock_db_session_local):
    session_id = "session1"
    db_session_id = uuid4()
    user_msg_id = uuid4()
    
    analysis_result = {
        "emotions": [
            {"emotion_name": "Joy", "category": "Happ", "vac": {}, "prominence": "primary", "confidence": 0.9},
            {"emotion_name": "Anxiety", "category": "Fear", "vac": {}, "prominence": "secondary", "confidence": 0.5}
        ],
        "relationships": [
            {"emotion_a": "Joy", "emotion_b": "Anxiety", "type": "masking", "strength": 0.8}
        ],
        "aggregate_vac": {"valence": 0.5},
        "three_way_analysis": {"data": "test"}
    }
    
    # Needs to patch ChatService AND generate_insights
    with patch("app.api.routes.chat_websocket.ChatService") as MockChatService, \
         patch("app.api.routes.chat_websocket.generate_insights", new_callable=AsyncMock) as mock_recursive_gen:
         
        cs = AsyncMock()
        MockChatService.return_value = cs
        
        await chat_websocket.handle_multi_emotion_result(
            session_id, db_session_id, user_msg_id, analysis_result, "warm", mock_websocket
        )
        
        # Check primary stream
        # Check secondary stream
        # Check 3-way stream
        mock_manager.send_message.assert_any_call(
            session_id, {"type": "three_way_analysis", "data": {"data": "test"}}
        )
        
        # Check recursive generation
        mock_recursive_gen.assert_awaited()


