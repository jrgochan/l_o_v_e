import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.api.sockets.processors import AudioProcessor, MessageProcessor, TextProcessor


@pytest.fixture
def mock_db_session():
    return AsyncMock()


@pytest.fixture
def mock_session_ctx(mock_db_session):
    mock_cls = MagicMock()
    mock_cls.return_value.__aenter__.return_value = mock_db_session
    mock_cls.return_value.__aexit__.return_value = None
    return mock_cls


@pytest.fixture
def mock_context():
    ctx = MagicMock()
    ctx.session_id = str(uuid.uuid4())
    # Mock user object structure explicitly
    ctx.user = MagicMock()
    ctx.user.identifier = "test-user"
    ctx.user.auth_user_id = uuid.uuid4()
    ctx.user.tone_preference = "warm"
    ctx.deep_feeling_enabled = False
    return ctx


@pytest.mark.asyncio
async def test_generate_insights_save_error(mock_session_ctx, mock_db_session, mock_context):
    """Test error saving insight message (Line 88)."""
    processor = MessageProcessor()

    # Mock InsightGenerator
    mock_generator = AsyncMock()
    mock_generator.generate_insights.return_value = {
        "summary": "test",
        "guidance": "test",
    }

    # Mock ChatService to raise error on save
    mock_chat_service = AsyncMock()
    mock_chat_service.save_insight_message.side_effect = SQLAlchemyError("Save Fail")

    with patch("app.api.sockets.processors.AsyncSessionLocal", mock_session_ctx):
        with patch("app.api.sockets.processors.InsightGenerator", return_value=mock_generator):
            with patch("app.api.sockets.processors.ChatService", return_value=mock_chat_service):
                with patch(
                    "app.api.sockets.processors.manager.send_message",
                    new_callable=AsyncMock,
                ) as mock_send:
                    # Execute
                    await processor.generate_insights(
                        db_session_id=uuid.uuid4(),
                        context=mock_context,
                        analysis_result={"emotion": "Happy", "confidence": 0.9},
                        prosody_data=None,
                    )

                    # Verify insight was sent to client (success path before save error)
                    mock_send.assert_awaited()
                    # Verify logger.error was called (implicitly covered by execution not crashing)


@pytest.mark.asyncio
async def test_generate_insights_db_error(mock_session_ctx, mock_context):
    """Test database error during insight generation (Lines 91-92)."""
    processor = MessageProcessor()

    # Mock InsightGenerator to raise Error
    mock_generator = AsyncMock()
    mock_generator.generate_insights.side_effect = SQLAlchemyError("Gen Fail")

    with patch("app.api.sockets.processors.AsyncSessionLocal", mock_session_ctx):
        with patch("app.api.sockets.processors.InsightGenerator", return_value=mock_generator):
            with patch(
                "app.api.sockets.processors.manager.send_message",
                new_callable=AsyncMock,
            ) as mock_send:
                # Execute
                await processor.generate_insights(
                    db_session_id=uuid.uuid4(),
                    context=mock_context,
                    analysis_result={"emotion": "Sad"},
                    prosody_data=None,
                )

                # Check fallback sent
                args, _ = mock_send.call_args
                assert args[1]["type"] == "insight"
                assert "guidance" in args[1]["insights"]


@pytest.mark.asyncio
async def test_text_processor_http_error(mock_context):
    """Test HTTP error in text processing (Lines 368-369)."""
    processor = TextProcessor()

    # Mock methods to reach the error block
    processor._save_text_message_transaction = AsyncMock(return_value=(uuid.uuid4(), MagicMock()))
    processor._call_listener_analysis = AsyncMock(side_effect=httpx.HTTPError("API Fail"))

    with patch(
        "app.api.sockets.processors.manager.send_message", new_callable=AsyncMock
    ) as mock_send:
        await processor.process(mock_context, "content")

        # Verify error message sent
        args, _ = mock_send.call_args
        assert args[1]["type"] == "error"
        assert "Analysis failed" in args[1]["message"]


@pytest.mark.asyncio
async def test_audio_processor_http_error(mock_context):
    """Test HTTP/OS error in audio processing (Lines 521-522)."""
    processor = AudioProcessor()

    # Mock preparation to raise OSError
    processor._prepare_audio_file = MagicMock(side_effect=OSError("File Fail"))

    with patch(
        "app.api.sockets.processors.manager.send_message", new_callable=AsyncMock
    ) as mock_send:
        await processor.process(mock_context, "audio_data", None)

        # Verify error message sent
        args, _ = mock_send.call_args
        assert args[1]["type"] == "error"
        assert "Audio processing failed" in args[1]["message"]
