import json
from typing import Any
from unittest.mock import AsyncMock, Mock, patch

import pytest
from arq.jobs import JobStatus
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.main import app

client = TestClient(app, raise_server_exceptions=False)


# pylint: disable=redefined-outer-name, unused-argument, too-many-positional-arguments
# pylint: disable=too-many-arguments


@pytest.fixture
def mock_transcription_service() -> Any:
    with patch("app.api.routes.ingest.get_transcription_service") as mock_get:
        service = Mock()
        result = Mock()
        result.text = "This is a test transcription."
        service.transcribe.return_value = result
        mock_get.return_value = service
        yield service


@pytest.fixture
def mock_prosody_analyzer() -> Any:
    with patch("app.api.routes.ingest.get_prosody_analyzer") as mock_get:
        analyzer = Mock()
        analyzer.analyze.return_value = {"pitch_mean": 120.5, "energy": 0.8, "tempo": 1.1}
        mock_get.return_value = analyzer
        yield analyzer


@pytest.fixture
def mock_semantic_analyzer() -> Any:
    with patch("app.api.routes.ingest.get_semantic_analyzer") as mock_get:
        analyzer = Mock()
        emotion = AsyncMock()
        emotion.primary_emotion = "Joy"
        emotion.category = "Positive"
        emotion.confidence = 0.95
        emotion.reasoning = "Test reasoning"
        emotion.vac = Mock(valence=0.8, arousal=0.6, connection=0.7)
        analyzer.analyze = AsyncMock(return_value=emotion)
        mock_get.return_value = analyzer
        yield analyzer


@pytest.fixture
def mock_multi_emotion_analyzer() -> Any:
    with patch("app.api.routes.ingest.get_multi_emotion_analyzer") as mock_get:
        analyzer = Mock()

        # Mock analysis result
        mock_analysis = Mock()
        mock_analysis.emotions = [
            Mock(
                emotion_name="Joy",
                category="Positive",
                vac=Mock(valence=0.8, arousal=0.6, connection=0.7),
                confidence=0.9,
                prominence="primary",
            ),
            Mock(
                emotion_name="Excitement",
                category="High Energy",
                vac=Mock(valence=0.7, arousal=0.8, connection=0.6),
                confidence=0.8,
                prominence="secondary",
            ),
        ]
        mock_analysis.relationships = [
            Mock(
                emotion_a="Joy",
                emotion_b="Excitement",
                type="reinforcement",
                strength=0.8,
                description="Joy reinforces excitement",
            )
        ]
        mock_analysis.aggregate_vac = Mock(valence=0.75, arousal=0.7, connection=0.65)
        mock_analysis.complexity_score = 0.4
        mock_analysis.emotional_clarity = 0.9
        mock_analysis.temporal_pattern = "concurrent"
        mock_analysis.reasoning = "Test reasoning"

        analyzer.analyze = AsyncMock(return_value=mock_analysis)

        # Mock 3-way result
        three_way_result = {
            "content_only": mock_analysis,
            "voice_only": mock_analysis,
            "blended": mock_analysis,
            "discrepancy": {
                "content_primary": "Joy",
                "voice_primary": "Joy",
                "blended_primary": "Joy",
                "content_voice_distance": 0.1,
            },
        }
        analyzer.analyze_three_way = AsyncMock(return_value=three_way_result)

        mock_get.return_value = analyzer
        yield analyzer


@pytest.fixture
def mock_pii_scrubber() -> Any:
    with patch("app.api.routes.ingest.get_pii_scrubber") as mock_get:
        scrubber = Mock()
        scrubber.scrub.return_value = "This is a test transcription."
        mock_get.return_value = scrubber
        yield scrubber


@pytest.fixture
def mock_deps() -> Any:
    # Override dependency to return mocked user
    async def mock_get_current_user() -> dict[str, str]:
        return {"sub": "test@example.com", "user_id": "test-uuid"}

    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides = {}


class TestIngestRoutes:

    def test_extract_audio_features_success(
        self, mock_transcription_service: Any, mock_prosody_analyzer: Any, mock_deps: Any
    ) -> None:
        """Test happy path for audio feature extraction."""
        # Mock aiofiles.open
        mock_file_obj = AsyncMock()
        mock_file_obj.write = AsyncMock()

        mock_opener = AsyncMock()
        mock_opener.__aenter__.return_value = mock_file_obj
        mock_opener.__aexit__.return_value = None

        with patch("aiofiles.open", return_value=mock_opener):
            # We also need to mock os.path.splitext/join/exists/remove if used

            files = {"audio": ("test.wav", b"test audio content", "audio/wav")}
            data = {"user_id": "test-user", "session_id": "test-session"}

            with (
                patch("os.remove"),
                patch("builtins.open", new_callable=Mock),
                patch("app.api.routes.ingest.uuid.uuid4", return_value="test-uuid"),
                patch("os.path.exists", return_value=True),
            ):

                response = client.post("/listener/extract-audio-features", files=files, data=data)

            assert response.status_code == 200
            result = response.json()
            assert result["status"] == "success"
            assert result["transcription"] == "This is a test transcription."
            assert "prosody" in result
            assert result["prosody"]["pitch_mean"] == 120.5

    def test_analyze_multi_emotion_success_no_prosody(
        self, mock_multi_emotion_analyzer: Any, mock_pii_scrubber: Any, mock_deps: Any
    ) -> None:
        """Test multi-emotion analysis without prosody data."""
        data = {
            "text": "I am feeling happy and excited.",
            "user_id": "test-user",
            "session_id": "test-session",
        }
        response = client.post("/listener/analyze-multi-emotion", data=data)

        assert response.status_code == 200
        result = response.json()
        assert "emotions" in result
        assert len(result["emotions"]) == 2
        assert result["emotions"][0]["emotion_name"] == "Joy"
        assert "three_way_analysis" not in result

    def test_analyze_multi_emotion_with_invalid_prosody_json(
        self, mock_multi_emotion_analyzer: Any, mock_pii_scrubber: Any, mock_deps: Any
    ) -> None:
        """Test that invalid prosody JSON is handled gracefully."""
        data = {
            "text": "I am feeling happy.",
            "prosody_data_json": "{invalid_json",
            "user_id": "test-user",
            "session_id": "test-session",
        }
        response = client.post("/listener/analyze-multi-emotion", data=data)

        # Should proceed without prosody (warning logged)
        assert response.status_code == 200
        result = response.json()
        assert "emotions" in result
        assert "three_way_analysis" not in result

    def test_analyze_multi_emotion_with_prosody_3way(
        self, mock_multi_emotion_analyzer: Any, mock_pii_scrubber: Any, mock_deps: Any
    ) -> None:
        """Test multi-emotion analysis with valid prosody data (triggering 3-way)."""
        prosody_data = {"pitch_mean": 120.0, "energy": 0.8}
        data = {
            "text": "I am feeling happy.",
            "prosody_data_json": json.dumps(prosody_data),
            "user_id": "test-user",
            "session_id": "test-session",
        }
        response = client.post("/listener/analyze-multi-emotion", data=data)

        assert response.status_code == 200
        result = response.json()
        assert "three_way_analysis" in result
        assert result["three_way_analysis"]["discrepancy"]["content_voice_distance"] == 0.1
        assert result["prosody"]["pitch_mean"] == 120.0

    def test_extract_audio_features_error(self, mock_deps: Any) -> None:
        """Test error handling in audio feature extraction."""
        # Mock aiofiles.open to raise exception
        mock_opener = AsyncMock()
        mock_opener.__aenter__.side_effect = Exception("Storage failed")

        with (
            patch("aiofiles.open", return_value=mock_opener),
            patch("app.api.routes.ingest.uuid.uuid4", return_value="test-uuid"),
            patch("os.path.exists", return_value=True),
            patch("os.remove") as mock_remove,
        ):

            files = {"audio": ("test.wav", b"content", "audio/wav")}
            data = {"user_id": "u", "session_id": "s"}

            response = client.post("/listener/extract-audio-features", files=files, data=data)

            assert response.status_code == 500
            assert "Storage failed" in response.json()["detail"]
            mock_remove.assert_not_called()

    def test_ingest_audio_upload_success(self, mock_deps: Any) -> None:
        """Test ingest endpoint with audio."""

        # Mock aiofiles.open
        mock_file_obj = AsyncMock()
        mock_file_obj.write = AsyncMock()

        mock_opener = AsyncMock()
        mock_opener.__aenter__.return_value = mock_file_obj
        mock_opener.__aexit__.return_value = None

        with (
            patch("app.api.routes.ingest.create_pool", new_callable=AsyncMock) as mock_pool_factory,
            patch("aiofiles.open", return_value=mock_opener),
        ):

            mock_redis = AsyncMock()
            mock_pool_factory.return_value = mock_redis
            mock_job = Mock()
            mock_job.job_id = "job-123"
            mock_redis.enqueue_job.return_value = mock_job

            files = {"audio": ("test.wav", b"audio data", "audio/wav")}
            data = {"user_id": "test-user", "session_id": "test-session"}

            with patch("os.remove"), patch("os.path.exists", return_value=True):
                response = client.post("/listener/ingest", files=files, data=data)

            assert response.status_code == 200
            assert response.json()["job_id"] == "job-123"

    def test_get_status_complete(self, mock_deps: Any) -> None:
        """Test status endpoint for completed job."""
        with (
            patch("app.api.routes.ingest.create_pool", new_callable=AsyncMock) as mock_pool_factory,
            patch("app.api.routes.ingest.Job") as mock_job_cls,
        ):

            mock_redis = AsyncMock()
            mock_pool_factory.return_value = mock_redis

            mock_job_instance = AsyncMock()
            mock_job_cls.return_value = mock_job_instance

            # Setup status return
            mock_job_instance.status.return_value = JobStatus.complete
            mock_job_instance.result.return_value = {"processed": True}

            response = client.get("/listener/status/job-123")

            assert response.status_code == 200
            result = response.json()
            assert result["status"] == "complete"
            assert result["result"]["processed"] is True

    def test_analyze_audio_sync_success(
        self,
        mock_transcription_service: Any,
        mock_prosody_analyzer: Any,
        mock_semantic_analyzer: Any,
        mock_pii_scrubber: Any,
        mock_deps: Any,
    ) -> None:
        """Test synchronous audio analysis happy path."""
        # Mock file operations
        mock_file_obj = AsyncMock()
        mock_file_obj.write = AsyncMock()
        mock_opener = AsyncMock()
        mock_opener.__aenter__.return_value = mock_file_obj
        mock_opener.__aexit__.return_value = None

        with (
            patch("aiofiles.open", return_value=mock_opener),
            patch("os.remove"),
            patch("os.path.exists", return_value=True),
            patch("app.api.routes.ingest.uuid.uuid4", return_value="test-uuid"),
        ):
            files = {"audio": ("test.wav", b"audio data", "audio/wav")}
            data = {"user_id": "test-user", "session_id": "test-session"}

            response = client.post("/listener/analyze-audio", files=files, data=data)

            assert response.status_code == 200
            result = response.json()
            assert result["status"] == "success"
            assert result["transcription"] == "This is a test transcription."
            assert result["emotion"] == "Joy"
            assert result["prosody"]["pitch_mean"] == 120.5

    def test_analyze_multi_emotion_empty_transcription(
        self, mock_transcription_service: Any, mock_deps: Any
    ) -> None:
        """Test multi-emotion analysis with empty transcription."""
        # Mock transcription to return empty text
        mock_transcription_service.transcribe.return_value.text = ""

        # Mock file operations
        mock_opener = AsyncMock()
        mock_opener.__aenter__.return_value = AsyncMock()
        mock_opener.__aexit__.return_value = None

        with (
            patch("aiofiles.open", return_value=mock_opener),
            patch("os.remove"),
            patch("os.path.exists", return_value=True),
            patch("app.api.routes.ingest.uuid.uuid4", return_value="test-uuid"),
        ):
            files = {"audio": ("test.wav", b"audio data", "audio/wav")}
            response = client.post("/listener/analyze-audio-multi-emotion", files=files)

            assert response.status_code == 400
            assert "Input text is empty" in response.json()["detail"]

    def test_analyze_multi_emotion_http_exception(
        self, mock_transcription_service: Any, mock_deps: Any
    ) -> None:
        """Test HTTPException propagation in multi-emotion analysis."""
        # Mock transcription to raise HTTPException

        mock_transcription_service.transcribe.side_effect = HTTPException(
            status_code=403, detail="Forbidden"
        )

        mock_opener = AsyncMock()
        mock_opener.__aenter__.return_value = AsyncMock()
        mock_opener.__aexit__.return_value = None

        with (
            patch("aiofiles.open", return_value=mock_opener),
            patch("os.remove"),
            patch("os.path.exists", return_value=True),
            patch("app.api.routes.ingest.uuid.uuid4", return_value="test-uuid"),
        ):
            files = {"audio": ("test.wav", b"audio data", "audio/wav")}
            response = client.post("/listener/analyze-audio-multi-emotion", files=files)

            assert response.status_code == 403
            assert "Forbidden" in response.json()["detail"]
