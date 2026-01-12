
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.workers.audio_processor import process_audio
from app.models.vac_response import EmotionalClassification, VACVector

@pytest.fixture
def mock_transcription_service():
    with patch('app.workers.audio_processor.get_transcription_service') as mock:
        service = MagicMock()
        mock.return_value = service
        yield service

@pytest.fixture
def mock_prosody_analyzer():
    with patch('app.workers.audio_processor.get_prosody_analyzer') as mock:
        analyzer = MagicMock()
        mock.return_value = analyzer
        yield analyzer

@pytest.fixture
def mock_semantic_analyzer():
    with patch('app.workers.audio_processor.get_semantic_analyzer') as mock:
        analyzer = MagicMock()
        analyzer.analyze = AsyncMock()  # Async method
        mock.return_value = analyzer
        yield analyzer

@pytest.fixture
def mock_pii_scrubber():
    with patch('app.workers.audio_processor.get_pii_scrubber') as mock:
        scrubber = MagicMock()
        text = "scrubbed text"
        scrubber.scrub.return_value = text
        scrubber.has_pii.return_value = True
        mock.return_value = scrubber
        yield scrubber

@pytest.fixture
def mock_observer_client():
    with patch('app.workers.audio_processor.get_observer_client') as mock:
        client = MagicMock()
        client.record_state = AsyncMock()
        client.record_state.return_value = {'state_id': 'state-123'}
        mock.return_value = client
        yield client

@pytest.mark.asyncio
async def test_process_audio_full_pipeline(
    mock_transcription_service, mock_prosody_analyzer, mock_semantic_analyzer,
    mock_pii_scrubber, mock_observer_client
):
    """Test processing with audio input (full pipeline)."""
    
    # Setup Mocks
    mock_transcription_service.transcribe.return_value = MagicMock(
        text="Hello world",
        language="en",
        duration_seconds=5.0,
        transcription_time_seconds=0.5
    )
    
    mock_prosody_analyzer.analyze.return_value = {'pitch_mean': 150.0}
    
    mock_semantic_analyzer.analyze.return_value = EmotionalClassification(
        primary_emotion="Joy",
        category="Positive",
        vac=VACVector(valence=0.8, arousal=0.6, connection=0.7),
        confidence=0.9,
        reasoning="Test reasoning"
    )
    
    # Run Function
    result = await process_audio(
        _ctx={},
        audio_path="/path/to/audio.wav",
        user_id="user-1",
        session_id="session-1",
        timestamp="2024-01-01T12:00:00"
    )
    
    # Assertions
    assert result['status'] == "success"
    assert result['transcription']['text'] == "Hello world"
    assert result['prosody']['pitch_mean'] == 150.0
    assert result['emotion']['primary_emotion'] == "Joy"
    assert result['sanitized_text'] == "scrubbed text"
    assert result['observer_state_id'] == "state-123"
    
    # Verify Calls
    mock_transcription_service.transcribe.assert_called_with("/path/to/audio.wav")
    mock_prosody_analyzer.analyze.assert_called_with("/path/to/audio.wav")
    mock_pii_scrubber.scrub.assert_called_with("Hello world")
    mock_observer_client.record_state.assert_called_once()

@pytest.mark.asyncio
async def test_process_text_only(
    mock_transcription_service, mock_prosody_analyzer, mock_semantic_analyzer,
    mock_pii_scrubber, mock_observer_client
):
    """Test processing with text input (skips audio/prosody steps)."""
    
    mock_transcription_service.transcribe_text.return_value = MagicMock(
        text="Hello text",
        language="en",
        duration_seconds=0.0,
        transcription_time_seconds=0.0
    )
    
    mock_semantic_analyzer.analyze.return_value = EmotionalClassification(
        primary_emotion="Neutral",
        category="Neutral",
        vac=VACVector(valence=0.5, arousal=0.5, connection=0.5),
        confidence=0.8,
        reasoning="Neutral text"
    )
    
    result = await process_audio(_ctx={}, text="Hello text")
    
    assert result['status'] == "success"
    assert result['prosody'] is None
    mock_prosody_analyzer.analyze.assert_not_called()
    mock_transcription_service.transcribe_text.assert_called_with("Hello text")
    mock_observer_client.record_state.assert_not_called() # No user/session id

@pytest.mark.asyncio
async def test_missing_input_error(mock_transcription_service):
    """Test error when no audio or text provided."""
    result = await process_audio(_ctx={})
    
    assert result['status'] == "error"
    assert "Either audio_path or text must be provided" in result['error']

@pytest.mark.asyncio
async def test_processing_exception(mock_transcription_service):
    """Test handling of unexpected exceptions."""
    mock_transcription_service.transcribe_text.side_effect = Exception("Fatal error")
    
    result = await process_audio(_ctx={}, text="Boom")
    
    assert result['status'] == "error"
    assert "Fatal error" in result['error']

@pytest.mark.asyncio
async def test_pii_scrubbing_branch(mock_pii_scrubber, mock_semantic_analyzer, mock_transcription_service):
    """Test logic when PII is detected."""
    mock_transcription_service.transcribe_text.return_value.text = "PII here"
    mock_semantic_analyzer.analyze.return_value = EmotionalClassification(
        primary_emotion="e", category="c", vac=VACVector(valence=0, arousal=0, connection=0),
        confidence=0, reasoning="r"
    )
    
    mock_pii_scrubber.has_pii.return_value = False
    
    await process_audio(_ctx={}, text="PII here")
    # Coverage check primarily (ensure branch is visited)
    mock_pii_scrubber.has_pii.assert_called()

@pytest.mark.asyncio
async def test_observer_storage_without_user_id(
    mock_transcription_service, mock_semantic_analyzer, mock_observer_client
):
    """Test that observer storage is skipped without user_id."""
    mock_transcription_service.transcribe_text.return_value.text = "text"
    mock_semantic_analyzer.analyze.return_value = EmotionalClassification(
        primary_emotion="e", category="c", vac=VACVector(valence=0, arousal=0, connection=0),
        confidence=0, reasoning="r"
    )
    
    await process_audio(_ctx={}, text="text", user_id=None, session_id="s1")
    mock_observer_client.record_state.assert_not_called()

    await process_audio(_ctx={}, text="text", user_id="u1", session_id=None)
    mock_observer_client.record_state.assert_not_called()

def test_worker_settings():
    """Test worker configuration."""
    from app.workers.audio_processor import WorkerSettings, process_audio
    assert process_audio in WorkerSettings.functions
    assert WorkerSettings.max_jobs == 5
    assert WorkerSettings.retry_jobs is True
