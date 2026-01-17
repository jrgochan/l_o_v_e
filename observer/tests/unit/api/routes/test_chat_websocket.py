
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import uuid4
from fastapi import WebSocket, WebSocketDisconnect
from jose import jwt
from app.config import settings
from app.api.routes import chat_websocket as chat_ws

# -----------------------------------------------------------------------------
# FIXTURES
# -----------------------------------------------------------------------------

@pytest.fixture
def mock_websocket():
    ws = MagicMock(spec=WebSocket)
    ws.send_text = AsyncMock()
    ws.send_json = AsyncMock()
    ws.receive_text = AsyncMock()
    ws.receive_json = AsyncMock()
    ws.close = AsyncMock()
    ws.accept = AsyncMock()
    ws.query_params = {}
    return ws

@pytest.fixture
def mock_db_session():
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.delete = MagicMock()
    mock_session.expunge = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock())
    return mock_session

@pytest.fixture
def mock_chat_service():
    service = AsyncMock()
    service.create_session = AsyncMock(return_value=MagicMock(id=uuid4()))
    service.save_user_message = AsyncMock(return_value=MagicMock(id=uuid4()))
    service.save_analysis_message = AsyncMock()
    service.save_multi_emotion_analysis = AsyncMock()
    service.save_insight_message = AsyncMock()
    service.update_tone_preference = AsyncMock()
    service.update_deep_feeling_mode = AsyncMock()
    return service

@pytest.fixture
def mock_deps(mock_db_session, mock_chat_service):
    # Setup patches for all external dependencies
    mock_db_ctx = AsyncMock()
    mock_db_ctx.__aenter__.return_value = mock_db_session
    mock_db_ctx.__aexit__.return_value = None

    with patch("app.api.routes.chat_websocket.AsyncSessionLocal", return_value=mock_db_ctx), \
         patch("app.api.routes.chat_websocket.ChatService", return_value=mock_chat_service), \
         patch("app.api.routes.chat_websocket.manager") as mock_manager, \
         patch("app.api.routes.chat_websocket.httpx.AsyncClient") as MockHttp, \
         patch("app.services.insight_generator.InsightGenerator") as MockGen:  # Patch globally since local import
        
        mock_manager.connect = AsyncMock()
        mock_manager.disconnect = MagicMock()
        mock_manager.send_message = AsyncMock()
        mock_manager.send_text = AsyncMock()
        mock_manager.get_db_session.return_value = None
        
        # Configure HTTP mock
        mock_http_client = MockHttp.return_value.__aenter__.return_value
        mock_http_client.post = AsyncMock()
        mock_http_client.get = AsyncMock()
        
        yield {
            "manager": mock_manager,
            "chat_service": mock_chat_service,
            "http_client": mock_http_client,
            "db_session": mock_db_session,
            "insight_gen_cls": MockGen
        }

@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = uuid4()
    user.email = "test@example.com"
    return user

# -----------------------------------------------------------------------------
# AUTHENTICATION TESTS
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_auth_success(mock_websocket, mock_deps, mock_user):
    """Test successful authentication flow (dependency injected)."""
    # Force disconnect loop immediately
    mock_websocket.receive_json.side_effect = WebSocketDisconnect()
    
    await chat_ws.chat_websocket(mock_websocket, "session1", current_user=mock_user)
    
    # Verify manager connected
    mock_deps["manager"].connect.assert_called_with("session1", mock_websocket)

# Removed test_auth_failure_* tests as manual token validation is removed
# and replaced by get_current_user_ws dependency.

# -----------------------------------------------------------------------------
# LOOP & ROUTING TESTS
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_chat_loop_messages(mock_websocket, mock_deps):
    """Test processing of various message types in the loop."""
    mock_websocket.receive_json.side_effect = [
        {"type": "ping"},
        {"type": "update_tone", "tone_preference": "clinical"},
        {"type": "update_deep_feeling", "deep_feeling_enabled": True},
        {"type": "user_message", "content": "hello"}, # Covers call to handle_user_message
        {"type": "unknown_type"},
        WebSocketDisconnect()
    ]
    
    # Important: Set DB session ID so update_tone executes
    mock_deps["manager"].get_db_session.return_value = uuid4()
    
    # Mock handle_user_message to avoid side effects in this loop test
    with patch("app.api.routes.chat_websocket.handle_user_message", new=AsyncMock()) as mock_handle:
        await chat_ws.chat_websocket(mock_websocket, "session1", current_user=mock_deps.get("mock_user", MagicMock(id=uuid4(), email="test@test.com")))
        mock_handle.assert_awaited()
    
    # verify ping->pong
    mock_deps["manager"].send_message.assert_any_call("session1", {"type": "pong"})
    
    # verify tone update
    mock_deps["chat_service"].update_tone_preference.assert_awaited()
    
    # verify unknown type error
    mock_deps["manager"].send_message.assert_any_call(
        "session1", {"type": "error", "message": "Unknown message type: unknown_type"}
    )

@pytest.mark.asyncio
async def test_chat_loop_exception(mock_websocket, mock_deps):
    """Test general exception handling in main loop."""
    mock_websocket.receive_json.side_effect = Exception("General loop error")
    
    await chat_ws.chat_websocket(mock_websocket, "session1", current_user=MagicMock(id=uuid4(), email="test@test.com"))
    
    # Should catch, log, send error, and disconnect
    mock_deps["manager"].send_message.assert_called_with(
        "session1", {"type": "error", "message": "General loop error"}
    )
    mock_deps["manager"].disconnect.assert_called_with("session1")

@pytest.mark.asyncio
async def test_handle_user_message_exception(mock_websocket, mock_deps):
    """Test exception handling inside handle_user_message."""
    # Patch process_text_message to raise
    with patch("app.api.routes.chat_websocket.process_text_message", side_effect=ValueError("Processing died")):
        await chat_ws.handle_user_message("s1", {"content": "hi"}, mock_websocket)
        
        mock_deps["manager"].send_message.assert_called_with(
            "s1", {"type": "error", "message": "Processing failed: Processing died"}
        )

# -----------------------------------------------------------------------------
# MESSAGE PROCESSING TESTS
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_handle_user_message_route_logic(mock_websocket, mock_deps):
    """Test routing of user message to text/audio processors."""
    with patch("app.api.routes.chat_websocket.process_text_message", new=AsyncMock()) as mock_text, \
         patch("app.api.routes.chat_websocket.process_audio_message", new=AsyncMock()) as mock_audio:
             
        # Case 1: Text
        await chat_ws.handle_user_message("s1", {"content": "text"}, mock_websocket)
        mock_text.assert_awaited()
        
        # Case 2: Audio
        await chat_ws.handle_user_message("s1", {"audio_data": "base64"}, mock_websocket)
        mock_audio.assert_awaited()

@pytest.mark.asyncio
async def test_process_text_message_flow(mock_websocket, mock_deps):
    """Test full text message processing flow (New Session)."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "emotion": "Joy", 
        "vac": {"valence": 1, "arousal": 1, "connection": 1},
        "confidence": 0.9
    }
    mock_deps["http_client"].post.return_value = mock_resp
    
    # Force new session creation logic
    mock_deps["manager"].get_db_session.return_value = None
    
    with patch("app.api.routes.chat_websocket.generate_insights", new=AsyncMock()) as mock_gen:
        await chat_ws.process_text_message("s1", "hello", "warm", False, mock_websocket)
        
        mock_deps["chat_service"].create_session.assert_awaited() # New session created
        mock_deps["manager"].set_db_session.assert_called()
        mock_deps["chat_service"].save_user_message.assert_awaited()
        mock_deps["chat_service"].save_analysis_message.assert_awaited()
        mock_gen.assert_awaited()

@pytest.mark.asyncio
async def test_process_text_message_existing_session(mock_websocket, mock_deps):
    """Test processing text with existing DB session."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"emotion": "Joy"}
    mock_deps["http_client"].post.return_value = mock_resp
    
    # Existing session
    existing_uuid = uuid4()
    mock_deps["manager"].get_db_session.return_value = existing_uuid
    
    with patch("app.api.routes.chat_websocket.generate_insights", new=AsyncMock()):
        await chat_ws.process_text_message("s1", "hello", "warm", False, mock_websocket)
        
        mock_deps["chat_service"].create_session.assert_not_called() # Should NOT create new
        mock_deps["chat_service"].save_user_message.assert_called()
        # Verify it used the existing UUID
        assert mock_deps["chat_service"].save_user_message.call_args[1]["session_id"] == existing_uuid

@pytest.mark.asyncio
async def test_process_text_message_listener_failure(mock_websocket, mock_deps):
    """Test handling of Listener API failure."""
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_deps["http_client"].post.return_value = mock_resp
    
    await chat_ws.process_text_message("s1", "hello", "warm", False, mock_websocket)
    
    calls = mock_deps["manager"].send_message.call_args_list
    error_sent = any("Analysis failed" in str(c) for c in calls)
    assert error_sent

# -----------------------------------------------------------------------------
# AUDIO & DEEP FEELING TESTS
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_process_audio_message_decoding_error(mock_websocket, mock_deps):
    """Test processing of invalid audio data."""
    await chat_ws.process_audio_message("s1", "invalid!", None, "warm", False, mock_websocket)
    
    calls = mock_deps["manager"].send_message.call_args_list
    error_sent = any("Audio processing failed" in str(c) for c in calls)
    assert error_sent

@pytest.mark.asyncio
async def test_process_audio_message_success(mock_websocket, mock_deps):
    """Test full audio message processing flow."""
    with patch("base64.b64decode", return_value=b"fake"), \
         patch("builtins.open"), \
         patch("os.remove") as mock_remove:
             
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "transcription": "I feel happy",
            "emotion": "Joy",
            "prosody": {"pitch": "high"}
        }
        mock_deps["http_client"].post.return_value = mock_resp
        
        with patch("app.api.routes.chat_websocket.generate_insights", new=AsyncMock()) as mock_gen:
             await chat_ws.process_audio_message("s1", "base64", None, "warm", False, mock_websocket)
             
             mock_deps["manager"].send_message.assert_any_call(
                 "s1", {"type": "transcription", "text": "I feel happy"}
             )
             mock_gen.assert_awaited()
             mock_remove.assert_called()

@pytest.mark.asyncio
async def test_process_audio_existing_session(mock_websocket, mock_deps):
    """Test audio processing when DB session already exists."""
    # Set existing DB session ID
    existing_uuid = uuid4()
    mock_deps["manager"].get_db_session.return_value = existing_uuid
    
    with patch("base64.b64decode", return_value=b"fake"), \
         patch("builtins.open"), \
         patch("os.remove"), \
         patch("app.api.routes.chat_websocket.generate_insights", new=AsyncMock()):
             
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"transcription": "hi"}
        mock_deps["http_client"].post.return_value = mock_resp
        
        await chat_ws.process_audio_message(
             "s1", "base64", None, "warm", False, mock_websocket
         )
         
        # Verify create_session NOT called
        mock_deps["chat_service"].create_session.assert_not_called()
        # Verify execution proceeded to save message (proof no crash)
        mock_deps["chat_service"].save_user_message.assert_awaited()


@pytest.mark.asyncio
async def test_process_audio_no_transcription(mock_websocket, mock_deps):
    """Test audio processing with valid response but no transcription."""
    with patch("base64.b64decode", return_value=b"fake"), \
         patch("builtins.open"), \
         patch("os.remove"), \
         patch("app.api.routes.chat_websocket.generate_insights", new=AsyncMock()):
             
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "transcription": None, # Empty
            "emotion": "Joy"
        }
        mock_deps["http_client"].post.return_value = mock_resp
        
        await chat_ws.process_audio_message(
             "s1", "base64", None, "warm", False, mock_websocket
         )
         
        # Verify NO transcription message
        calls = mock_deps["manager"].send_message.call_args_list
        transcription_sent = any("transcription" in str(c) for c in calls)
        assert not transcription_sent

@pytest.mark.asyncio
async def test_text_message_deep_feeling(mock_websocket, mock_deps):
    """Test processing text message with Deep Feeling enabled."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"transcription": "Text", "emotions": []}
    mock_deps["http_client"].post.return_value = mock_resp

    with patch("app.api.routes.chat_websocket.handle_multi_emotion_result", new=AsyncMock()) as mock_multi:
        await chat_ws.process_text_message("s1", "Deep text", "warm", True, mock_websocket, "guest", None)
        mock_multi.assert_awaited()

@pytest.mark.asyncio
async def test_handle_deep_feeling_update(mock_websocket, mock_deps):
    """Test Deep Feeling mode toggle."""
    mock_deps["manager"].get_db_session.return_value = uuid4()
    await chat_ws.handle_deep_feeling_update("s1", {"deep_feeling_enabled": True}, mock_websocket)
    mock_deps["chat_service"].update_deep_feeling_mode.assert_awaited()

# -----------------------------------------------------------------------------
# MULTI-EMOTION & INSIGHTS TESTS
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_handle_multi_emotion_full(mock_websocket, mock_deps):
    """Test multi-emotion result handling with relationships and 3-way data."""
    session_id = "s1"
    db_session_id = uuid4()
    msg_id = uuid4()
    
    # Register connection in manager so messages are sent
    chat_ws.manager.active_connections[session_id] = mock_websocket
    
    result = {
        "emotions": [
            {"emotion_name": "Joy", "prominence": "primary", "vac": [0.8, 0.8, 0.8]},
            {"emotion_name": "Fear", "prominence": "secondary", "vac": [0.2, 0.8, 0.2]}
        ],
        "relationships": [
            {"type": "masking", "emotion_a": "Joy", "emotion_b": "Fear"}
        ],
        "three_way_analysis": {"discrepancy": {"content_voice_distance": 0.5}},
        "aggregate_vac": {"valence": 0.5, "arousal": 0.5, "connection": 0.5},
        "complexity_score": 0.7
    }

    with patch("app.api.routes.chat_websocket.generate_insights", new=AsyncMock()) as mock_insights:
        await chat_ws.handle_multi_emotion_result(
            session_id, db_session_id, msg_id, result, "warm", mock_websocket
        )
        
        # Verify call happened on manager (since manager is patched)
        assert mock_deps["manager"].send_message.called
        
        mock_deps["chat_service"].save_multi_emotion_analysis.assert_awaited()
        # Verify primary emotion insight generation called
        mock_insights.assert_awaited()

@pytest.mark.asyncio
async def test_handle_multi_emotion_no_primary(mock_websocket, mock_deps):
    """Test multi-emotion handling when no primary emotion is found."""
    session_id = "s1"
    chat_ws.manager.active_connections[session_id] = mock_websocket
    
    # Empty emotions list guarantees no primary is found
    result = {
        "emotions": []
    }
    
    with patch("app.api.routes.chat_websocket.generate_insights", new=AsyncMock()) as mock_insights:
        await chat_ws.handle_multi_emotion_result(
            session_id, uuid4(), uuid4(), result, "warm", mock_websocket
        )
        
        # Should NOT generate insights as primary is missing
        mock_insights.assert_not_awaited()

@pytest.mark.asyncio
async def test_handle_single_emotion_db_error(mock_websocket, mock_deps):
    """Test DB error handling in single emotion handler."""
    async def raise_db_fail(*args, **kwargs):
        raise Exception("DB Fail")
    mock_deps["chat_service"].save_analysis_message.side_effect = raise_db_fail
    result = {"emotion": "Joy", "vac": {}, "confidence": 1.0}
    
    with patch("app.api.routes.chat_websocket.generate_insights", new=AsyncMock()) as mock_insights:
        await chat_ws.handle_single_emotion_result(
            "s1", uuid4(), result, "warm", mock_websocket
        )
        # Should proceed to insights despite DB error
        mock_insights.assert_awaited()

@pytest.mark.asyncio
async def test_process_text_db_save_failure_catch(mock_websocket, mock_deps):
    """Test catch block for analysis save in process_text_message."""
    # This block (lines 536-558) seems redundant/legacy if handle_single matches it,
    # but we must cover it.
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"emotion": "Joy"}
    mock_deps["http_client"].post.return_value = mock_resp

    # Make save fail
    async def raise_db_fail(*args, **kwargs):
        raise Exception("DB Fail")
    mock_deps["chat_service"].save_analysis_message.side_effect = raise_db_fail
    
    with patch("app.api.routes.chat_websocket.generate_insights", new=AsyncMock()) as mock_gen, \
         patch("app.api.routes.chat_websocket.handle_single_emotion_result", new=AsyncMock()): # Mock handle_single to isolate 536 block
        
        await chat_ws.process_text_message("s1", "hi", "warm", False, mock_websocket)
        
        # Should continue to generate insights
        mock_gen.assert_awaited()


@pytest.mark.asyncio
async def test_handle_multi_emotion_db_error(mock_websocket, mock_deps):
    """Test correct handling of DB error during multi-emotion save."""
    async def raise_db_fail(*args, **kwargs):
        raise Exception("DB Fail")
    mock_deps["chat_service"].save_multi_emotion_analysis.side_effect = raise_db_fail
    result = {"emotions": [{"prominence": "primary", "emotion_name": "A"}]}
    
    with patch("app.api.routes.chat_websocket.generate_insights", new=AsyncMock()) as mock_insights:
        await chat_ws.handle_multi_emotion_result(
            "s1", uuid4(), uuid4(), result, "warm", mock_websocket
        )
        # Should catch error and proceed to insights
        mock_insights.assert_awaited()

@pytest.mark.asyncio
async def test_generate_insights_success_and_save(mock_websocket, mock_deps):
    """Test generating insights and saving them."""
    mock_gen_instance = mock_deps["insight_gen_cls"].return_value
    mock_gen_instance.generate_insights = AsyncMock(return_value={"summary": "Cool"})
    
    await chat_ws.generate_insights(uuid4(), "s1", {"emotion": "Joy"}, "warm", None, mock_websocket)
    
    mock_deps["manager"].send_message.assert_any_call(
        "s1", {"type": "insight", "insights": {"summary": "Cool"}}
    )
    mock_deps["chat_service"].save_insight_message.assert_awaited()

@pytest.mark.asyncio
async def test_generate_insights_failure_handling(mock_websocket, mock_deps):
    """Test fallback when insight generation fails."""
    mock_gen_instance = mock_deps["insight_gen_cls"].return_value
    mock_gen_instance.generate_insights.side_effect = Exception("AI Error")
    
    await chat_ws.generate_insights(uuid4(), "s1", {"emotion": "Joy"}, "warm", None, mock_websocket)
    
    calls = mock_deps["manager"].send_message.call_args_list
    fallback_sent = any("Analysis complete" in str(c) for c in calls)
    assert fallback_sent

@pytest.mark.asyncio
async def test_db_save_failure_resilience(mock_websocket, mock_deps):
    """Test that SAVE INSIGHT failure doesn't block response."""
    # This specific test targets line 761 catch block
    mock_deps["chat_service"].save_insight_message.side_effect = Exception("DB Fail")
    mock_gen_instance = mock_deps["insight_gen_cls"].return_value
    mock_gen_instance.generate_insights.return_value = {"summary": "Yes"}

    await chat_ws.generate_insights(uuid4(), "s1", {}, "warm", None, mock_websocket)
    # Should complete without raising exception
    assert True

# -----------------------------------------------------------------------------
# MANAGER TESTS
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_connection_manager_logic():
    """Test ConnectionManager class storage and retrieval."""
    manager = chat_ws.ConnectionManager()
    ws = AsyncMock(spec=WebSocket)
    
    # 1. Connect
    await manager.connect("s1", ws)
    assert "s1" in manager.active_connections
    
    # 2. Set/Get Session
    db_uuid = uuid4()
    manager.set_db_session("s1", db_uuid)
    assert manager.get_db_session("s1") == db_uuid
    
    # 3. Send Message
    await manager.send_message("s1", {"type": "hello"})
    ws.send_json.assert_awaited_with({"type": "hello"})
    
    # 4. Send Text
    await manager.send_text("s1", "text")
    ws.send_text.assert_awaited_with("text")
    
    # 5. Disconnect
    manager.disconnect("s1")
    assert "s1" not in manager.active_connections

@pytest.mark.asyncio
async def test_manager_send_message_disconnected():
    """Test calling send_message on a non-existent session."""
    manager = chat_ws.ConnectionManager()
    # Should verify that it does NOT crash and returns None
    await manager.send_message("ghost_session", {"type": "test"})
    await manager.send_text("ghost_session", "text")
    # No assertions needed, just checking for no exception raised

@pytest.mark.asyncio
async def test_disconnect_idempotent():
    """Test disconnecting permutations for full branch coverage."""
    manager = chat_ws.ConnectionManager()
    
    # 1. Both exist
    manager.active_connections["s1"] = AsyncMock()
    manager.session_mapping["s1"] = uuid4()
    manager.disconnect("s1")
    assert "s1" not in manager.active_connections
    assert "s1" not in manager.session_mapping
    
    # 2. Only active exists
    manager.active_connections["s2"] = AsyncMock()
    manager.disconnect("s2")
    assert "s2" not in manager.active_connections
    
    # 3. Only mapping exists
    manager.session_mapping["s3"] = uuid4()
    manager.disconnect("s3")
    assert "s3" not in manager.session_mapping
    
    # 4. Neither exists
    manager.disconnect("s4")

@pytest.mark.asyncio
async def test_handle_tone_update_logic(mock_websocket, mock_deps):
    """Test tone update with and without DB session."""
    manager = chat_ws.manager
    
    # Case 1: No DB session
    manager.get_db_session.return_value = None
    await chat_ws.handle_tone_update("s1", {"tone_preference": "warm"}, mock_websocket)
    mock_deps["chat_service"].update_tone_preference.assert_not_called()
    
    # Case 2: With DB session
    manager.get_db_session.return_value = uuid4()
    await chat_ws.handle_tone_update("s1", {"tone_preference": "cool"}, mock_websocket)
    mock_deps["chat_service"].update_tone_preference.assert_called()



@pytest.mark.asyncio
async def test_process_audio_deep_feeling_mode(mock_deps, mock_websocket, mock_chat_service):
    """Test audio processing in Deep Feeling mode (multi-emotion)."""
    # Setup
    session_id = str(uuid4())
    manager = mock_deps["manager"]
    mock_http_client = mock_deps["http_client"]
    
    # Mock audio file and httpx response
    mock_http_client.post.return_value = MagicMock(
        status_code=200,
        json=lambda: {
            "transcription": "I feel happy and sad",
            "prosody": {"pitch": 100},
            "emotions": [{"emotion_name": "Joy", "confidence": 0.9}],
            "vac": {"valence": 0.5}
        }
    )

    # Patch modules directly because they are locally imported
    with patch("builtins.open", MagicMock()), \
         patch("base64.b64decode", return_value=b"audio"), \
         patch("tempfile.NamedTemporaryFile") as mock_temp:
        
        mock_temp.return_value.__enter__.return_value.name = "/tmp/test.wav"
        
        # Act
        await chat_ws.process_audio_message(
            session_id, 
            "base64audio",
            None, # original_text
            "warm", # tone_preference
            True, # deep_feeling_enabled
            mock_websocket,
            user_identifier="user1"
        )

        # Assert listener called twice: 1. Extract, 2. Analyze
        assert mock_http_client.post.call_count == 2
        
        # Verify second call is analyze-audio-multi-emotion
        call_args_list = mock_http_client.post.call_args_list
        second_call = call_args_list[1]
        args, _ = second_call
        assert "analyze-multi-emotion" in args[0]
        
        # Assert multi-emotion handler called
        mock_chat_service.save_multi_emotion_analysis.assert_called()


@pytest.mark.asyncio
async def test_process_audio_listener_error(mock_deps, mock_websocket):
    """Test handling of Listener API errors."""
    session_id = str(uuid4())
    manager = mock_deps["manager"]
    mock_http_client = mock_deps["http_client"]
    
    # Mock error response
    mock_http_client.post.return_value = MagicMock(
        status_code=500,
        text="Internal Server Error"
    )

    with patch("builtins.open", MagicMock()), \
         patch("base64.b64decode", return_value=b"audio"), \
         patch("tempfile.NamedTemporaryFile") as mock_temp:
        
        mock_temp.return_value.__enter__.return_value.name = "/tmp/test.wav"
        
        # Act & Assert
        # process_audio_message catches exceptions and sends error message
        await chat_ws.process_audio_message(
            session_id, 
            "base64audio", 
            None, # original_text
            "warm", # tone_preference
            False, # deep_feeling_enabled
            mock_websocket,
            user_identifier="user1"
        )
        
        # Verify error message sent to client
        args, _ = manager.send_message.call_args
        assert args[0] == session_id
        assert args[1]["type"] == "error"
        assert "Audio processing failed" in args[1]["message"]


@pytest.mark.asyncio
async def test_process_audio_analysis_phase_error(mock_deps, mock_websocket):
    """Test handling of Listener API errors during the analysis phase (2nd call)."""
    session_id = str(uuid4())
    manager = mock_deps["manager"]
    mock_http_client = mock_deps["http_client"]
    
    # Mock sequence: 
    # 1. Extraction: Success
    # 2. Analysis: Failure (500)
    mock_http_client.post.side_effect = [
        MagicMock(status_code=200, json=lambda: {"transcription": "hi"}),
        MagicMock(status_code=500, text="Internal Analysis Error")
    ]

    with patch("builtins.open", MagicMock()), \
         patch("base64.b64decode", return_value=b"audio"), \
         patch("tempfile.NamedTemporaryFile") as mock_temp:
        
        mock_temp.return_value.__enter__.return_value.name = "/tmp/test.wav"
        
        # Act & Assert
        await chat_ws.process_audio_message(
            session_id, 
            "base64audio", 
            None, 
            "warm", 
            False, 
            mock_websocket,
            user_identifier="user1"
        )
        
        # Verify error message sent to client
        args, _ = manager.send_message.call_args
        assert args[0] == session_id
        assert "Audio processing failed" in args[1]["message"]
        assert "500" in args[1]["message"]

@pytest.mark.asyncio
async def test_handle_deep_feeling_update_no_db_session(mock_deps):
    """Test deep feeling update when DB session not found."""
    session_id = str(uuid4())
    manager = mock_deps["manager"]
    
    # Mock manager to return None for DB session
    manager.get_db_session.return_value = None
    
    # Act
    await chat_ws.handle_deep_feeling_update(
        session_id, {"deep_feeling_enabled": True}, MagicMock()
    )
    
    # Assert no crash, just message sent
    manager.send_message.assert_called()


@pytest.mark.asyncio
async def test_generate_insights_save_error(mock_deps, mock_chat_service):
    """Test graceful handling of DB save error during insight generation."""
    session_id = str(uuid4())
    db_session_id = uuid4()
    manager = mock_deps["manager"]
    mock_gen_cls = mock_deps["insight_gen_cls"]
    
    # Mock generator success
    mock_gen_instance = AsyncMock()
    mock_gen_instance.generate_insights.return_value = {"summary": "Test insight"}
    mock_gen_cls.return_value = mock_gen_instance
    
    # Mock save failure
    mock_chat_service.save_insight_message.side_effect = Exception("DB Error")
    
    # Act
    await chat_ws.generate_insights(
        db_session_id,
        session_id,
        {"emotion": "Joy", "confidence": 0.9},
        "warm",
        None,
        MagicMock()
    )
    
    # Assert insights still sent to client despite save failure
    # We loop through calls because progress updates are also sent
    insight_msg = None
    for call in manager.send_message.call_args_list:
        msg = call.args[1]
        if msg.get("type") == "insight":
            insight_msg = msg
            break
            
    assert insight_msg is not None
    assert insight_msg["insights"]["summary"] == "Test insight"
