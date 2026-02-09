from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import WebSocket

from app.api.sockets.processors import AudioProcessor, TextProcessor
from app.api.sockets.types import MessageContext, UserContext


@pytest.fixture
def mock_manager():
    with patch("app.api.sockets.processors.manager") as mock:
        mock.send_message = AsyncMock()
        mock.get_db_session = MagicMock()
        mock.set_db_session = MagicMock()
        yield mock


@pytest.fixture
def mock_db_session_local():
    with patch("app.api.sockets.processors.AsyncSessionLocal") as mock:
        session = AsyncMock()
        mock.return_value.__aenter__.return_value = session
        yield session


@pytest.fixture
def mock_chat_service():
    with patch("app.api.sockets.processors.ChatService") as mock:
        service = AsyncMock()
        mock.return_value = service
        yield service


@pytest.fixture
def mock_httpx_client():
    with patch("httpx.AsyncClient") as mock:
        client = AsyncMock()
        mock.return_value.__aenter__.return_value = client
        yield client


@pytest.fixture
def message_context():
    return MessageContext(
        session_id="test_session",
        websocket=AsyncMock(spec=WebSocket),
        user=UserContext(
            identifier="test_user",
            auth_user_id=uuid4(),
            tone_preference="warm",
        ),
        deep_feeling_enabled=False,
    )


@pytest.mark.asyncio
class TestTextProcessor:
    async def test_process_text_message_success(
        self,
        mock_manager,
        mock_db_session_local,
        mock_chat_service,
        mock_httpx_client,
        message_context,
    ):
        """Test successful processing of a text message."""
        processor = TextProcessor()
        content = "Hello world"

        # Setup mocks
        mock_manager.get_db_session.return_value = uuid4()

        # User message save
        mock_chat_service.save_user_message.return_value = MagicMock(id=uuid4())

        # Listener API response
        mock_httpx_client.post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "emotion": "Joy",
                "vac": {"valence": 0.8, "arousal": 0.5, "connection": 0.6},
                "confidence": 0.9,
                "reasoning": "Positive text",
            },
        )

        with patch("app.api.sockets.processors.InsightGenerator") as MockGen:
            MockGen.return_value.generate_insights = AsyncMock(return_value={"summary": "metrics"})

            await processor.process(message_context, content)

        # Verify flow
        mock_chat_service.save_user_message.assert_awaited()
        mock_manager.send_message.assert_called()  # user_message_saved, analysis, insights
        mock_chat_service.save_analysis_message.assert_awaited()

    async def test_process_text_message_api_error(
        self,
        mock_manager,
        mock_db_session_local,
        mock_chat_service,
        mock_httpx_client,
        message_context,
    ):
        """Test handling of Listener API error."""
        processor = TextProcessor()
        content = "Hello world"

        mock_manager.get_db_session.return_value = uuid4()
        mock_chat_service.save_user_message.return_value = MagicMock(id=uuid4())

        # API Error
        mock_httpx_client.post.return_value = MagicMock(status_code=500)

        await processor.process(message_context, content)

        # Verify error message sent
        error_sent = False
        for call in mock_manager.send_message.call_args_list:
            if call[0][1].get("type") == "error":
                error_sent = True
        assert error_sent


@pytest.mark.asyncio
class TestAudioProcessor:
    async def test_process_audio_message_success(
        self,
        mock_manager,
        mock_db_session_local,
        mock_chat_service,
        mock_httpx_client,
        message_context,
    ):
        """Test successful processing of audio message."""
        processor = AudioProcessor()
        audio_data = "UklGRgAAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="  # Mock data

        mock_manager.get_db_session.return_value = uuid4()
        mock_chat_service.save_user_message.return_value = MagicMock(id=uuid4())

        # Mock file writing
        with patch("app.api.sockets.processors.tempfile.NamedTemporaryFile") as mock_temp:
            mock_temp.return_value.__enter__.return_value.name = "test.webm"

            with patch("os.remove"):
                with patch("builtins.open", MagicMock()):

                    # API 1: Extract Features
                    resp1 = MagicMock(status_code=200)
                    resp1.json.return_value = {
                        "transcription": "Hello audio",
                        "prosody": {"pitch": 100},
                    }

                    # API 2: Analyze
                    resp2 = MagicMock(status_code=200)
                    resp2.json.return_value = {
                        "emotion": "Joy",
                        "vac": {},
                        "confidence": 0.9,
                    }

                    mock_httpx_client.post.side_effect = [resp1, resp2]

                    with patch("app.api.sockets.processors.InsightGenerator") as MockGen:
                        MockGen.return_value.generate_insights = AsyncMock(return_value={})

                        await processor.process(message_context, audio_data, None)

        # Verify calls
        assert mock_httpx_client.post.call_count == 2
        mock_manager.send_message.assert_any_call(
            message_context.session_id, {"type": "transcription", "text": "Hello audio"}
        )

    async def test_process_audio_message_extract_fail(
        self,
        mock_manager,
        mock_db_session_local,
        mock_chat_service,
        mock_httpx_client,
        message_context,
    ):
        """Test handling of extraction failure."""
        processor = AudioProcessor()
        audio_data = "UklGRgAAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="

        mock_manager.get_db_session.return_value = uuid4()
        mock_chat_service.save_user_message.return_value = MagicMock(id=uuid4())

        with patch("app.api.sockets.processors.tempfile.NamedTemporaryFile") as mock_temp:
            mock_temp.return_value.__enter__.return_value.name = "test.webm"

            with patch("os.remove"), patch("builtins.open", MagicMock()):
                # API Fail
                mock_httpx_client.post.return_value = MagicMock(status_code=500, text="Fail")

                await processor.process(message_context, audio_data, None)

        # Verify error
        error_sent = False
        for call in mock_manager.send_message.call_args_list:
            if call[0][1].get("type") == "error":
                error_sent = True
        assert error_sent
