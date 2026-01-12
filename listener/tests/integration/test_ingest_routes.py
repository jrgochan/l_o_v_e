"""Integration tests for Ingest API routes."""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def mock_redis_pool():
    with patch("app.api.routes.ingest.create_pool") as mock_pool:
        pool_instance = AsyncMock()
        mock_pool.return_value = pool_instance
        yield pool_instance

@pytest.fixture
def mock_services():
    with patch("app.services.transcription.get_transcription_service") as mock_transcription, \
         patch("app.services.semantic_analyzer.get_semantic_analyzer") as mock_semantic, \
         patch("app.services.pii_scrubber.get_pii_scrubber") as mock_scrubber, \
         patch("app.services.observer_client.get_observer_client") as mock_observer:
        
        # Setup Transcription
        transcription_svc = MagicMock()
        transcription_svc.transcribe.return_value = MagicMock(text="Test transcription")
        mock_transcription.return_value = transcription_svc
        
        # Setup Semantic
        semantic_svc = AsyncMock()
        semantic_svc.analyze.return_value = MagicMock(
            primary_emotion="Joy",
            category="Happiness",
            vac=MagicMock(valence=0.8, arousal=0.5, connection=0.5),
            confidence=0.9,
            reasoning="Test reasoning"
        )
        mock_semantic.return_value = semantic_svc
        
        # Setup PII
        scrubber_svc = MagicMock()
        scrubber_svc.scrub.return_value = "Scrubbed text"
        mock_scrubber.return_value = scrubber_svc
        
        # Setup Observer
        observer_svc = AsyncMock()
        mock_observer.return_value = observer_svc
        
        yield {
            "transcription": transcription_svc,
            "semantic": semantic_svc,
            "scrubber": scrubber_svc,
            "observer": observer_svc
        }

@pytest.mark.asyncio
async def test_ingest_audio_success(mock_redis_pool):
    """Test /ingest endpoint with audio file."""
    # Mock redis enqueue
    job_mock = MagicMock()
    job_mock.job_id = "test-job-id"
    mock_redis_pool.enqueue_job.return_value = job_mock

    files = {"audio": ("test.wav", b"fake audio content", "audio/wav")}
    data = {"user_id": "test-user", "session_id": "test-session"}
    
    response = client.post("/listener/ingest", files=files, data=data)
    
    assert response.status_code == 200
    assert response.json()["status"] == "queued"
    assert response.json()["job_id"] == "test-job-id"
    
    # Verify Redis call
    mock_redis_pool.enqueue_job.assert_called_once()
    args, kwargs = mock_redis_pool.enqueue_job.call_args
    assert args[0] == "process_audio"
    assert kwargs["user_id"] == "test-user"

@pytest.mark.asyncio
async def test_ingest_text_success(mock_redis_pool):
    """Test /ingest endpoint with text."""
    job_mock = MagicMock()
    job_mock.job_id = "text-job-id"
    mock_redis_pool.enqueue_job.return_value = job_mock

    data = {
        "text": "Hello world",
        "user_id": "test-user", 
        "session_id": "test-session"
    }
    
    response = client.post("/listener/ingest", data=data)
    
    assert response.status_code == 200
    assert response.json()["job_id"] == "text-job-id"

def test_ingest_validation_error():
    """Test /ingest validation."""
    # No inputs
    response = client.post("/listener/ingest", data={"user_id": "u", "session_id": "s"})
    assert response.status_code == 400
    
    # Both inputs
    files = {"audio": ("test.wav", b"content", "audio/wav")}
    data = {"text": "text", "user_id": "u", "session_id": "s"}
    response = client.post("/listener/ingest", files=files, data=data)
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_get_status_success(mock_redis_pool):
    """Test /status/{job_id}."""
    # Mock Job class
    with patch("app.api.routes.ingest.Job") as mock_job_cls:
        job_instance = AsyncMock()
        status_mock = MagicMock()
        status_mock.value = "complete"
        job_instance.status.return_value = status_mock
        job_instance.result.return_value = {"result": "data"}
        mock_job_cls.return_value = job_instance
        
        response = client.get("/listener/status/test-id")
        
        assert response.status_code == 200
        assert response.json()["status"] == "complete"
        assert response.json()["result"] == {"result": "data"}

@pytest.mark.asyncio
async def test_analyze_text_sync(mock_services):
    """Test /analyze endpoint."""
    data = {"text": "I am happy"}
    response = client.post("/listener/analyze", data=data)
    
    assert response.status_code == 200
    json_resp = response.json()
    assert json_resp["transcription"] == "I am happy"
    assert json_resp["emotion"] == "Joy"
    
    # Verify observer call
    mock_services["observer"].record_state.assert_called_once()

@pytest.mark.asyncio
async def test_analyze_audio_multi_emotion(mock_services):
    """Test /analyze-audio-multi-emotion endpoint."""
    # Need to mock MultiEmotionAnalyzer and ProsodyAnalyzer too
    with patch("app.services.multi_emotion_analyzer.get_multi_emotion_analyzer") as mock_multi, \
         patch("app.services.prosody_analyzer.get_prosody_analyzer") as mock_prosody:
        
        # Setup Prosody
        prosody_svc = MagicMock()
        prosody_svc.analyze.return_value = {"pitch_mean": 150.0}
        mock_prosody.return_value = prosody_svc
        
        # Setup Multi-Emotion
        multi_svc = AsyncMock()
        
        # Mock Response Object Structure
        mock_resp = MagicMock()
        mock_resp.emotions = [MagicMock(emotion_name="Joy", category="Happiness", vac=MagicMock(valence=0.8, arousal=0.5, connection=0.5), confidence=0.9, prominence="primary")]
        mock_resp.relationships = []
        mock_resp.aggregate_vac = MagicMock(valence=0.8, arousal=0.5, connection=0.5)
        mock_resp.complexity_score = 0.5
        mock_resp.emotional_clarity = 0.8
        mock_resp.temporal_pattern = "concurrent"
        mock_resp.reasoning = "Test"
        
        # Mock 3-way response dict
        three_way_resp = {
            "content_only": mock_resp,
            "voice_only": mock_resp,
            "blended": mock_resp,
            "discrepancy": {"content_voice_distance": 0.0, "content_primary": "Joy", "voice_primary": "Joy", "blended_primary": "Joy"}
        }
        multi_svc.analyze_three_way.return_value = three_way_resp
        mock_multi.return_value = multi_svc
        
        files = {"audio": ("test.wav", b"audio", "audio/wav")}
        response = client.post("/listener/analyze-audio-multi-emotion", files=files)
        
        assert response.status_code == 200
        json_resp = response.json()
        assert json_resp["status"] == "success"
        assert json_resp["transcription"] == "Test transcription"
        assert "three_way_analysis" in json_resp
        assert json_resp["three_way_analysis"]["discrepancy"]["content_voice_distance"] == 0.0

@pytest.mark.asyncio
async def test_ingest_errors(mock_redis_pool):
    """Test ingest error handling."""
    # 1. Test audio save error
    with patch("app.api.routes.ingest.aiofiles.open", side_effect=Exception("Save failed")):
        files = {"audio": ("test.wav", b"data", "audio/wav")}
        data = {"user_id": "u", "session_id": "s"}
        response = client.post("/listener/ingest", files=files, data=data) 
        assert response.status_code == 500
        assert "Failed to save audio" in response.json()["detail"]

    # 2. Test enqueue error
    # Reset mocks
    mock_redis_pool.enqueue_job.side_effect = Exception("Queue failed")
    # Need to verify file cleanup happens?
    with patch("os.path.exists", return_value=True), patch("os.remove") as mock_remove:
         # Need valid audio save first
        with patch("app.api.routes.ingest.aiofiles.open", MagicMock()):
             files = {"audio": ("test.wav", b"data", "audio/wav")}
             data = {"user_id": "u", "session_id": "s"}
             response = client.post("/listener/ingest", files=files, data=data)
             assert response.status_code == 500
             assert "Failed to queue job" in response.json()["detail"]
             mock_remove.assert_called_once()

    # 3. Test job=None (enqueue failed silently)
    mock_redis_pool.enqueue_job.side_effect = None
    mock_redis_pool.enqueue_job.return_value = None
    data = {"text": "t", "user_id": "u", "session_id": "s"}
    response = client.post("/listener/ingest", data=data)
    assert response.status_code == 500

@pytest.mark.asyncio
async def test_status_error(mock_redis_pool):
    """Test status error."""
    mock_redis_pool.enqueue_job.side_effect = Exception("Redis fail")
    with patch("app.api.routes.ingest.create_pool", side_effect=Exception("Connection fail")):
        response = client.get("/listener/status/123")
        assert response.status_code == 500

@pytest.mark.asyncio
async def test_analysis_errors(mock_services):
    """Test analysis error handling."""
    # 1. Analyze text error
    mock_services["semantic"].analyze.side_effect = Exception("Analysis fail")
    response = client.post("/listener/analyze", data={"text": "t"})
    assert response.status_code == 500
    
    # 2. Analyze multi error
    with patch("app.services.multi_emotion_analyzer.get_multi_emotion_analyzer") as mock_multi:
        mock_multi.return_value.analyze.side_effect = Exception("Multi fail")
        response = client.post("/listener/analyze-multi-emotion", data={"text": "t"})
        assert response.status_code == 500

    # 3. Audio analysis error
    # Must unpatch first or simple mock
    # Just force exception in one of the steps
    mock_services["transcription"].transcribe.side_effect = Exception("Transcribe fail")
    files = {"audio": ("test.wav", b"data", "audio/wav")}
    response = client.post("/listener/analyze-audio", files=files)
    assert response.status_code == 500
    
    # 4. Audio multi analysis error
    mock_services["transcription"].transcribe.side_effect = Exception("Transcribe fail")
    response = client.post("/listener/analyze-audio-multi-emotion", files=files)
    assert response.status_code == 500
    
    # 5. Observer error (should not fail request)
    mock_services["semantic"].analyze.side_effect = None # passed
    mock_services["observer"].record_state.side_effect = Exception("Observer fail")
    response = client.post("/listener/analyze", data={"text": "t"})
    assert response.status_code == 200 # Should succeed despite observer error

def test_status_completed_result_error(mock_services):
    job_mock = MagicMock()
    # "complete" status
    job_mock.status = AsyncMock(return_value=MagicMock(value="complete"))
    # job.result raises Exception
    job_mock.result = AsyncMock(side_effect=Exception("Result fetch failed"))
    
    with patch("app.api.routes.ingest.Job", return_value=job_mock):
        # We need Redis pool patch too if not covered by mock_redis_pool fixture
        with patch("app.api.routes.ingest.create_pool", new=AsyncMock()):
             # Use /listener/status/... as test_status_error uses it and works
             response = client.get("/listener/status/test-job")
             assert response.status_code == 200
             data = response.json()
             assert data["status"] == "complete"
             # Result should be missing
             assert "result" not in data

def test_status_http_exception(mock_redis_pool):
    """Test HTTPException propagation."""
    from fastapi import HTTPException
    
    # Mock status to raise HTTPException
    job_mock = MagicMock()
    job_mock.status = AsyncMock(side_effect=HTTPException(status_code=403, detail="Forbidden"))
    
    with patch("app.api.routes.ingest.Job", return_value=job_mock):
        with patch("app.api.routes.ingest.create_pool", new=AsyncMock()):
            response = client.get("/listener/status/forbidden")
            assert response.status_code == 403
            assert "Forbidden" in response.json()["detail"]

def test_status_queued(mock_redis_pool):
    """Test getting status for queued/in-progress job (not complete)."""
    # from app.services.job_manager import JobStatus # Not needed and module might not exist
    
    # Mock return value to have .value "queued"
    mock_status_enum = MagicMock()
    mock_status_enum.value = "queued"
    
    job_mock = MagicMock()
    job_mock.status = AsyncMock(return_value=mock_status_enum)
    
    with patch("app.api.routes.ingest.Job", return_value=job_mock):
         with patch("app.api.routes.ingest.create_pool", new=AsyncMock()):
            response = client.get("/listener/status/job-queued")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "queued"
            assert "result" not in data

def test_status_not_found(mock_redis_pool):
    """Test getting status for non-existent job."""
    
    mock_status_enum = MagicMock()
    mock_status_enum.value = "not_found"
    
    job_mock = MagicMock()
    job_mock.status = AsyncMock(return_value=mock_status_enum)

    with patch("app.api.routes.ingest.Job", return_value=job_mock):
         with patch("app.api.routes.ingest.create_pool", new=AsyncMock()):
            response = client.get("/listener/status/job-missing")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "not_found"
            assert "result" not in data


