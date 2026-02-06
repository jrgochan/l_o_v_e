from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import WebSocket, WebSocketDisconnect

from app.api.sockets import handlers as chat_handlers
from app.api.sockets.router import chat_websocket


@pytest.fixture
def mock_websocket():
    ws = AsyncMock(spec=WebSocket)
    ws.query_params = {}
    ws.accept = AsyncMock()
    ws.receive_json = AsyncMock()
    ws.send_json = AsyncMock()
    ws.send_text = AsyncMock()
    ws.send_bytes = AsyncMock()
    ws.close = AsyncMock()
    return ws


@pytest.fixture
def mock_manager():
    with (
        patch("app.api.sockets.router.manager") as mgr_router,
        patch("app.api.sockets.handlers.manager") as mgr_handlers,
    ):

        # We need a shared mock for both
        mgr = AsyncMock()
        mgr.connect = AsyncMock()
        mgr.disconnect = MagicMock()
        mgr.send_message = AsyncMock()
        mgr.send_text = AsyncMock()

        # Assign to the patches
        mgr_router.connect.side_effect = mgr.connect
        mgr_router.disconnect.side_effect = mgr.disconnect
        mgr_router.send_message.side_effect = mgr.send_message
        mgr_router.send_text.side_effect = mgr.send_text

        mgr_handlers.connect.side_effect = mgr.connect
        mgr_handlers.disconnect.side_effect = mgr.disconnect
        mgr_handlers.send_message.side_effect = mgr.send_message
        mgr_handlers.send_text.side_effect = mgr.send_text

        # Also need to mock get_db_session and set_db_session which are sync
        mgr.get_db_session = MagicMock()
        mgr.set_db_session = MagicMock()

        mgr_router.get_db_session.side_effect = mgr.get_db_session
        mgr_router.set_db_session.side_effect = mgr.set_db_session
        mgr_handlers.get_db_session.side_effect = mgr.get_db_session
        mgr_handlers.set_db_session.side_effect = mgr.set_db_session

        yield mgr


@pytest.fixture
def mock_db_session_local():
    with patch("app.api.sockets.handlers.AsyncSessionLocal") as session_local:
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
        client.post = AsyncMock()
        yield client


# === Auth Tests ===


@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = uuid4()
    user.email = "test@example.com"
    return user


@pytest.mark.asyncio
async def test_websocket_connect_auth_success(mock_websocket, mock_manager, mock_user):
    mock_websocket.receive_json.side_effect = WebSocketDisconnect()

    await chat_websocket(mock_websocket, "session1", current_user=mock_user)

    mock_manager.connect.assert_awaited()


# === Message Handling Tests ===


@pytest.mark.asyncio
async def test_handle_user_message_text(
    mock_websocket, mock_manager, mock_db_session_local, mock_httpx_client
):
    session_id = "session1"
    data = {"type": "user_message", "content": "Hello", "tone_preference": "warm"}

    with patch("app.api.sockets.handlers.ChatService") as MockChatService:
        service_instance = AsyncMock()
        # Explicitly set async methods
        service_instance.create_session = AsyncMock()
        service_instance.save_user_message = AsyncMock()

        MockChatService.return_value = service_instance

        session_obj = MagicMock()
        session_obj.id = uuid4()
        service_instance.create_session.return_value = session_obj

        msg_obj = MagicMock()
        msg_obj.id = uuid4()
        service_instance.save_user_message.return_value = msg_obj

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "emotion": "Joy",
            "vac": {"valence": 0.8, "arousal": 0.5, "connection": 0.6},
            "confidence": 0.9,
            "category": "Happiness",
        }
        mock_httpx_client.post.return_value = mock_response

        with patch(
            "app.api.sockets.handlers.generate_insights", new_callable=AsyncMock
        ) as mock_gen:
            await chat_handlers.handle_user_message(session_id, data, mock_websocket)

            mock_manager.send_message.assert_called()
            mock_gen.assert_awaited()


@pytest.mark.asyncio
async def test_handle_ping(mock_websocket, mock_manager, mock_user):
    mock_websocket.receive_json.side_effect = [{"type": "ping"}, WebSocketDisconnect()]

    await chat_websocket(mock_websocket, "session1", current_user=mock_user)

    # Check if pong was sent
    # check call args for send_message
    # call('session1', {'type': 'pong'})
    # assert mock_manager.send_message.call_args == ... call objects are tricky
    mock_manager.send_message.assert_any_call("session1", {"type": "pong"})


@pytest.mark.asyncio
async def test_process_audio_message(
    mock_manager, mock_db_session_local, mock_httpx_client, mock_websocket
):
    session_id = "session1"
    audio_b64 = "UklGRgAAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="

    with patch("app.api.sockets.handlers.ChatService") as MockChatService:
        service = AsyncMock()
        service.create_session = AsyncMock()
        service.save_user_message = AsyncMock()
        MockChatService.return_value = service

        service.create_session.return_value = MagicMock(id=uuid4())
        service.save_user_message.return_value = MagicMock(id=uuid4())

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "transcription": "Hello audio",
            "emotion": "Calm",
            "vac": {"valence": 0.1, "arousal": -0.2, "connection": 0.3},
            "prosody": {"pitch": 100},
        }
        mock_httpx_client.post.return_value = mock_response

        with patch("app.api.sockets.handlers.generate_insights", new_callable=AsyncMock):
            await chat_handlers.process_audio_message(
                session_id=session_id,
                audio_data=audio_b64,
                original_text=None,
                tone_preference="warm",
                deep_feeling_enabled=False,
                websocket=mock_websocket,
            )

            mock_manager.send_message.assert_any_call(
                session_id, {"type": "transcription", "text": "Hello audio"}
            )


@pytest.mark.asyncio
async def test_deep_feeling_flow(
    mock_manager, mock_db_session_local, mock_httpx_client, mock_websocket
):
    session_id = "session1"

    with patch("app.api.sockets.handlers.ChatService") as MockChatService:
        service = AsyncMock()
        service.create_session = AsyncMock()
        service.save_user_message = AsyncMock()
        MockChatService.return_value = service

        service.create_session.return_value = MagicMock(id=uuid4())
        service.save_user_message.return_value = MagicMock(id=uuid4())

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "emotion": "Mixed",
            "vac": {"valence": 0, "arousal": 0, "connection": 0},
        }
        mock_httpx_client.post.return_value = mock_response

        with patch(
            "app.api.sockets.handlers.handle_multi_emotion_result", new_callable=AsyncMock
        ) as mock_handle_multi:

            await chat_handlers.process_text_message(
                session_id=session_id,
                content="Deep stuff",
                tone_preference="warm",
                deep_feeling_enabled=True,
                websocket=mock_websocket,
            )

            args, kwargs = mock_httpx_client.post.call_args
            assert "/listener/analyze-multi-emotion" in args[0]

            mock_handle_multi.assert_awaited()


@pytest.mark.asyncio
async def test_handle_tone_update(mock_websocket, mock_manager, mock_user):
    session_id = "session1"

    with patch("app.api.sockets.router.handle_tone_update") as mock_handler:
        mock_websocket.receive_json.side_effect = [
            {"type": "update_tone", "tone_preference": "clinical"},
            WebSocketDisconnect(),
        ]

        await chat_websocket(mock_websocket, session_id, current_user=mock_user)
        mock_handler.assert_awaited()


@pytest.mark.asyncio
async def test_handle_deep_feeling_update(mock_websocket, mock_manager, mock_user):
    session_id = "session1"

    with patch("app.api.sockets.router.handle_deep_feeling_update") as mock_handler:
        mock_websocket.receive_json.side_effect = [
            {"type": "update_deep_feeling", "deep_feeling_enabled": True},
            WebSocketDisconnect(),
        ]

        await chat_websocket(mock_websocket, session_id, current_user=mock_user)
        mock_handler.assert_awaited()


@pytest.mark.asyncio
async def test_handle_user_message_error(mock_websocket, mock_manager):
    session_id = "session1"
    data = {"type": "user_message", "content": "Fail me"}

    with patch(
        "app.api.sockets.handlers.process_text_message", side_effect=Exception("Processing boom")
    ):
        await chat_handlers.handle_user_message(session_id, data, mock_websocket)

        # Verify error message sent
        # mock_manager.send_message.assert_called()
        # This might be called multiple times (ack first)
        # Check if error sent
        error_sent = False
        for call in mock_manager.send_message.call_args_list:
            if call[0][0] == session_id and call[0][1].get("type") == "error":
                if "Processing boom" in call[0][1]["message"]:
                    error_sent = True
        assert error_sent


@pytest.mark.asyncio
async def test_unknown_message_type(mock_websocket, mock_manager, mock_user):
    mock_websocket.receive_json.side_effect = [{"type": "unknown_type"}, WebSocketDisconnect()]

    await chat_websocket(mock_websocket, "session1", current_user=mock_user)

    mock_manager.send_message.assert_called_with(
        "session1", {"type": "error", "message": "Unknown message type: unknown_type"}
    )


@pytest.mark.asyncio
async def test_generate_insights_integration(mock_websocket, mock_manager, mock_db_session_local):
    session_id = "session1"
    db_session_id = uuid4()
    analysis_result = {
        "emotion": "Joy",
        "category": "Happiness",
        "vac": {"valence": 0.8},
        "confidence": 0.9,
        "reasoning": "Smiling voice",
    }

    with (
        patch("app.api.sockets.handlers.ChatService") as MockChatService,
        patch("app.api.sockets.handlers.InsightGenerator") as MockInsightGen,
    ):

        chat_service = AsyncMock()
        chat_service.save_insight_message = AsyncMock()
        MockChatService.return_value = chat_service

        generator = AsyncMock()
        MockInsightGen.return_value = generator
        generator.generate_insights = AsyncMock(
            return_value={"summary": "You sound happy", "mode": "warm", "guidance": "Enjoy it"}
        )

        await chat_handlers.generate_insights(
            db_session_id, session_id, analysis_result, "warm", None, mock_websocket
        )

        generator.generate_insights.assert_awaited()
        chat_service.save_insight_message.assert_awaited()


@pytest.mark.asyncio
async def test_connection_manager():
    from app.api.sockets.connection import ConnectionManager

    cm = ConnectionManager()
    ws = AsyncMock(spec=WebSocket)
    session_id = "sess1"

    await cm.connect(session_id, ws)
    assert session_id in cm.active_connections
    ws.accept.assert_awaited()

    db_sess = uuid4()
    cm.set_db_session(session_id, db_sess)
    assert cm.get_db_session(session_id) == db_sess

    msg = {"type": "test"}
    await cm.send_message(session_id, msg)
    ws.send_json.assert_awaited_with(msg)

    await cm.send_text(session_id, "hello")
    ws.send_text.assert_awaited_with("hello")

    cm.disconnect(session_id)
    assert session_id not in cm.active_connections


@pytest.mark.asyncio
async def test_handle_single_emotion_result_integration(
    mock_websocket, mock_manager, mock_db_session_local
):
    session_id = "session1"
    db_session_id = uuid4()
    analysis_result = {
        "emotion": "Joy",
        "category": "Happiness",
        "vac": {"valence": 0.8},
        "confidence": 0.9,
        "reasoning": "Reason",
    }

    with (
        patch("app.api.sockets.handlers.ChatService") as MockChatService,
        patch("app.api.sockets.handlers.generate_insights", new_callable=AsyncMock) as mock_gen,
    ):

        cs = AsyncMock()
        cs.save_analysis_message = AsyncMock()
        MockChatService.return_value = cs

        await chat_handlers.handle_single_emotion_result(
            session_id, db_session_id, analysis_result, "warm", mock_websocket
        )

        cs.save_analysis_message.assert_awaited()
        mock_gen.assert_awaited()


@pytest.mark.asyncio
async def test_connection_manager_edge_cases():
    from app.api.sockets.connection import ConnectionManager

    cm = ConnectionManager()

    cm.disconnect("non-existent")
    await cm.send_message("non-existent", {"type": "test"})
    await cm.send_text("non-existent", "test")


@pytest.mark.asyncio
async def test_process_text_message_db_error(mock_websocket, mock_manager, mock_db_session_local):
    session_id = "session1"
    content = "Hello"

    with (
        patch("app.api.sockets.handlers.ChatService") as MockChatService,
        patch("app.api.sockets.handlers.httpx.AsyncClient") as MockClient,
    ):

        cs = AsyncMock()
        cs.create_session = AsyncMock()
        cs.save_user_message = AsyncMock()
        cs.save_analysis_message = AsyncMock()
        MockChatService.return_value = cs

        cs.create_session.return_value = MagicMock(id=uuid4())
        cs.save_user_message.return_value = MagicMock(id=uuid4())

        client = AsyncMock()
        MockClient.return_value.__aenter__.return_value = client
        client.post.return_value = MagicMock(
            status_code=200, json=lambda: {"emotion": "Joy", "vac": {}, "confidence": 0.9}
        )

        cs.save_analysis_message.side_effect = Exception("DB Fail")

        # Fix: handlers uses InsightGenerator directly, patch that
        with patch("app.api.sockets.handlers.InsightGenerator") as MockIG_local:
            MockIG_local.return_value.generate_insights = AsyncMock(return_value={})

            await chat_handlers.process_text_message(
                session_id, content, "warm", False, mock_websocket
            )

            MockIG_local.return_value.generate_insights.assert_awaited()


@pytest.mark.asyncio
async def test_handle_tone_update_integration(mock_websocket, mock_manager, mock_db_session_local):
    session_id = "session1"
    db_session_id = uuid4()

    # We need to setup get_db_session return on the manager mock
    mock_manager.get_db_session.return_value = db_session_id

    with patch("app.api.sockets.handlers.ChatService") as MockChatService:
        cs = AsyncMock()
        cs.update_tone_preference = AsyncMock()
        MockChatService.return_value = cs

        data = {"type": "update_tone", "tone_preference": "clinical"}

        await chat_handlers.handle_tone_update(session_id, data, mock_websocket)

        cs.update_tone_preference.assert_awaited_with(db_session_id, "clinical")


@pytest.mark.asyncio
async def test_handle_deep_feeling_update_integration(
    mock_websocket, mock_manager, mock_db_session_local
):
    session_id = "session1"
    db_session_id = uuid4()

    mock_manager.get_db_session.return_value = db_session_id

    with patch("app.api.sockets.handlers.ChatService") as MockChatService:
        cs = AsyncMock()
        cs.update_deep_feeling_mode = AsyncMock()
        MockChatService.return_value = cs

        data = {"type": "update_deep_feeling", "deep_feeling_enabled": True}

        await chat_handlers.handle_deep_feeling_update(session_id, data, mock_websocket)

        cs.update_deep_feeling_mode.assert_awaited_with(db_session_id, True)


@pytest.mark.asyncio
async def test_handle_multi_emotion_result_integration(
    mock_websocket, mock_manager, mock_db_session_local
):
    session_id = "session1"
    db_session_id = uuid4()
    user_msg_id = uuid4()

    analysis_result = {
        "emotions": [
            {
                "emotion_name": "Joy",
                "category": "Happ",
                "vac": {},
                "prominence": "primary",
                "confidence": 0.9,
            },
            {
                "emotion_name": "Anxiety",
                "category": "Fear",
                "vac": {},
                "prominence": "secondary",
                "confidence": 0.5,
            },
        ],
        "relationships": [
            {"emotion_a": "Joy", "emotion_b": "Anxiety", "type": "masking", "strength": 0.8}
        ],
        "aggregate_vac": {"valence": 0.5},
        "three_way_analysis": {"data": "test"},
    }

    with (
        patch("app.api.sockets.handlers.ChatService") as MockChatService,
        patch(
            "app.api.sockets.handlers.generate_insights", new_callable=AsyncMock
        ) as mock_recursive_gen,
    ):

        cs = AsyncMock()
        cs.save_multi_emotion_analysis = AsyncMock()
        MockChatService.return_value = cs

        await chat_handlers.handle_multi_emotion_result(
            session_id, db_session_id, user_msg_id, analysis_result, "warm", mock_websocket
        )

        mock_recursive_gen.assert_awaited()


@pytest.mark.asyncio
async def test_handle_user_message_invalid_relationship_id(
    mock_websocket, mock_manager, mock_db_session_local, mock_httpx_client
):
    session_id = "session1"
    data = {"type": "user_message", "content": "Hello", "related_message_id": "invalid-uuid-string"}

    with patch("app.api.sockets.handlers.ChatService") as MockChatService:
        service_instance = AsyncMock()
        service_instance.create_session = AsyncMock()
        service_instance.save_user_message = AsyncMock()
        MockChatService.return_value = service_instance

        service_instance.create_session.return_value = MagicMock(id=uuid4())
        service_instance.save_user_message.return_value = MagicMock(id=uuid4())

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"emotion": "Joy", "vac": {}, "confidence": 0.9}
        mock_httpx_client.post.return_value = mock_response

        with patch("app.api.sockets.handlers.generate_insights", new_callable=AsyncMock):
            await chat_handlers.handle_user_message(session_id, data, mock_websocket)

            call_args = service_instance.save_user_message.call_args
            assert call_args.kwargs.get("related_message_id") is None
