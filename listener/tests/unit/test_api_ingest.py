from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def mock_redis_pool():
    with patch("app.api.routes.ingest.create_pool") as mock:
        pool = MagicMock()
        pool.enqueue_job = AsyncMock(return_value=MagicMock(job_id="test-job-id"))
        mock.return_value = pool
        yield mock


@pytest.fixture
def mock_job():
    with patch("app.api.routes.ingest.Job") as mock_job_cls:
        job_instance = MagicMock()
        mock_job_cls.return_value = job_instance
        yield job_instance


@pytest.fixture
def mock_aiofiles():
    with patch("app.api.routes.ingest.aiofiles.open") as mock_open:
        mock_file = MagicMock()
        mock_file.__aenter__.return_value.write = AsyncMock()
        mock_open.return_value = mock_file
        yield mock_open


@pytest.fixture
def mock_services():
    # Patch the SOURCES of the services because strict local imports pick up the source
    with (
        patch("app.services.transcription.get_transcription_service") as mock_trans,
        patch("app.services.semantic_analyzer.get_semantic_analyzer") as mock_sem,
        patch("app.services.pii_scrubber.get_pii_scrubber") as mock_pii,
        patch("app.services.observer_client.get_observer_client") as mock_obs,
        patch("app.services.multi_emotion_analyzer.get_multi_emotion_analyzer") as mock_multi,
        patch("app.services.prosody_analyzer.get_prosody_analyzer") as mock_prosody,
    ):

        # Setup specific returns
        mock_trans.return_value.transcribe.return_value = MagicMock(text="Transcribed text")

        mock_sem.return_value.analyze = AsyncMock(
            return_value=MagicMock(
                primary_emotion="Joy",
                category="Positive",
                vac=MagicMock(valence=0.8, arousal=0.5, connection=0.5),
                confidence=0.9,
                reasoning="Reason",
            )
        )

        mock_pii.return_value.scrub.return_value = "Scrubbed text"

        mock_obs.return_value.record_state = AsyncMock()

        multi_resp = MagicMock()
        multi_resp.emotions = [
            MagicMock(
                emotion_name="Joy",
                category="Pos",
                vac=MagicMock(valence=1, arousal=0, connection=0),
                confidence=0.9,
                prominence="primary",
            )
        ]
        multi_resp.relationships = []
        multi_resp.aggregate_vac = MagicMock(valence=1, arousal=0, connection=0)
        multi_resp.complexity_score = 0.1
        multi_resp.emotional_clarity = 1.0
        multi_resp.temporal_pattern = "concurrent"
        multi_resp.reasoning = "test"
        mock_multi.return_value.analyze = AsyncMock(return_value=multi_resp)
        mock_multi.return_value.analyze_three_way = AsyncMock(
            return_value={
                "content_only": multi_resp,
                "voice_only": multi_resp,
                "blended": multi_resp,
                "discrepancy": {
                    "content_voice_distance": 0.0,
                    "flags": [],
                    "interpretation": "ok",
                    "content_primary": "Joy",
                    "voice_primary": "Joy",
                    "blended_primary": "Joy",
                },
            }
        )

        mock_prosody.return_value.analyze.return_value = {"pitch_mean": 100.0, "energy": 0.5}

        yield {
            "transcription": mock_trans,
            "semantic": mock_sem,
            "pii": mock_pii,
            "observer": mock_obs,
            "multi": mock_multi,
            "prosody": mock_prosody,
        }


def test_ingest_no_input():
    response = client.post("/listener/ingest", data={"user_id": "u", "session_id": "s"})
    assert response.status_code == 400
    assert "Either audio file or text" in response.json()["detail"]


def test_ingest_both_inputs():
    response = client.post(
        "/listener/ingest",
        data={"text": "t", "user_id": "u", "session_id": "s"},
        files={"audio": ("test.wav", b"data", "audio/wav")},
    )
    assert response.status_code == 400
    assert "not both" in response.json()["detail"]


def test_ingest_audio_success(mock_redis_pool, mock_aiofiles):
    response = client.post(
        "/listener/ingest",
        data={"user_id": "u", "session_id": "s"},
        files={"audio": ("test.wav", b"data", "audio/wav")},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "queued"
    mock_redis_pool.return_value.enqueue_job.assert_called_once()
    mock_redis_pool.return_value.enqueue_job.assert_called_once()
    mock_aiofiles.return_value.__aenter__.assert_called_once()


def test_ingest_text_success(mock_redis_pool):
    response = client.post(
        "/listener/ingest", data={"text": "Hello world", "user_id": "u", "session_id": "s"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "queued"
    mock_redis_pool.return_value.enqueue_job.assert_called_once()


def test_ingest_audio_save_fail(mock_redis_pool, mock_aiofiles):
    mock_aiofiles.return_value.__aenter__.side_effect = Exception("Disk error")
    response = client.post(
        "/listener/ingest",
        data={"user_id": "u", "session_id": "s"},
        files={"audio": ("test.wav", b"data", "audio/wav")},
    )
    assert response.status_code == 500
    assert "Disk error" in response.json()["detail"]


def test_ingest_queue_fail(mock_redis_pool, mock_aiofiles):
    mock_redis_pool.return_value.enqueue_job.side_effect = Exception("Redis error")
    with patch("os.remove") as mock_remove, patch("os.path.exists", return_value=True):
        response = client.post(
            "/listener/ingest",
            data={"user_id": "u", "session_id": "s"},
            files={"audio": ("test.wav", b"data", "audio/wav")},
        )
        assert response.status_code == 500
        assert "Redis error" in response.json()["detail"]
        mock_remove.assert_called_once()  # Cleanup


@pytest.mark.asyncio
async def test_get_status_success(mock_redis_pool, mock_job):
    mock_job.status = AsyncMock(return_value=MagicMock(value="complete"))
    mock_job.result = AsyncMock(return_value={"result": "ok"})

    response = client.get("/listener/status/job-123")
    assert response.status_code == 200
    assert response.json()["status"] == "complete"
    assert response.json()["result"] == {"result": "ok"}


@pytest.mark.asyncio
async def test_get_status_fail(mock_redis_pool, mock_job):
    mock_job.status.side_effect = Exception("Redis fail")
    response = client.get("/listener/status/job-123")
    assert response.status_code == 500


def test_analyze_text_success(mock_services):
    response = client.post("/listener/analyze", data={"text": "Hello"})
    assert response.status_code == 200
    assert response.json()["emotion"] == "Joy"
    mock_services["observer"].return_value.record_state.assert_called_once()


def test_analyze_text_observer_fail(mock_services):
    mock_services["observer"].return_value.record_state.side_effect = Exception("Observer down")
    response = client.post("/listener/analyze", data={"text": "Hello"})
    assert response.status_code == 200
    assert response.json()["emotion"] == "Joy"  # Should still succeed


def test_analyze_text_fail(mock_services):
    mock_services["semantic"].return_value.analyze.side_effect = Exception("Analyzer fail")
    response = client.post("/listener/analyze", data={"text": "Hello"})
    assert response.status_code == 500


def test_analyze_multi_emotion(mock_services):
    response = client.post("/listener/analyze-multi-emotion", data={"text": "Hello"})
    assert response.status_code == 200
    assert len(response.json()["emotions"]) == 1


def test_analyze_multi_emotion_fail(mock_services):
    mock_services["multi"].return_value.analyze.side_effect = Exception("Fail")
    response = client.post("/listener/analyze-multi-emotion", data={"text": "Hello"})
    assert response.status_code == 500


def test_analyze_audio_sync(mock_services, mock_aiofiles):
    response = client.post(
        "/listener/analyze-audio", files={"audio": ("test.wav", b"data", "audio/wav")}
    )
    assert response.status_code == 200
    assert response.json()["transcription"] == "Transcribed text"
    assert "prosody" in response.json()


def test_analyze_audio_sync_fail(mock_services, mock_aiofiles):
    mock_services["transcription"].return_value.transcribe.side_effect = Exception(
        "Transcribe fail"
    )
    with patch("os.remove"):
        response = client.post(
            "/listener/analyze-audio", files={"audio": ("test.wav", b"data", "audio/wav")}
        )
        assert response.status_code == 500


def test_analyze_audio_multi_emotion(mock_services, mock_aiofiles):
    response = client.post(
        "/listener/analyze-audio-multi-emotion", files={"audio": ("test.wav", b"data", "audio/wav")}
    )
    assert response.status_code == 200
    assert "three_way_analysis" in response.json()


def test_analyze_audio_multi_emotion_fail(mock_services, mock_aiofiles):
    mock_services["multi"].return_value.analyze_three_way.side_effect = Exception("3-way fail")
    with patch("os.remove"):
        response = client.post(
            "/listener/analyze-audio-multi-emotion",
            files={"audio": ("test.wav", b"data", "audio/wav")},
        )
        assert response.status_code == 500


def test_analyze_audio_multi_emotion_empty_transcription(mock_services, mock_aiofiles):
    mock_services["transcription"].return_value.transcribe.return_value = MagicMock(text="")
    with patch("os.remove"):
        response = client.post(
            "/listener/analyze-audio-multi-emotion",
            files={"audio": ("test.wav", b"data", "audio/wav")},
        )
        assert response.status_code == 400
        assert "Input text is empty" in response.json()["detail"]
