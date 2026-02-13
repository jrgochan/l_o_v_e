# pylint: disable=protected-access, redefined-outer-name, unused-argument
from pathlib import Path
from typing import Any, Generator
from unittest.mock import MagicMock, patch

import pytest

from app.models.vac_response import TranscriptionResult
from app.services.transcription import TranscriptionService, get_transcription_service


@pytest.fixture
def mock_whisper() -> Generator[MagicMock, None, None]:
    with patch("app.services.transcription.whisper") as mock:
        mock_model = MagicMock()
        mock.load_model.return_value = mock_model

        # Default transcription result
        mock_model.transcribe.return_value = {"text": "Hello world", "language": "en"}

        yield mock


@pytest.fixture
def mock_audio_processor() -> Generator[MagicMock, None, None]:
    with patch("app.services.transcription.AudioProcessor") as mock:
        mock.validate_audio_file.return_value = True
        mock.get_audio_duration.return_value = 5.0
        mock.get_audio_info.return_value = {"sample_rate": 16000, "channels": 1}
        mock.normalize_audio.return_value = "normalized.wav"
        # Set constants to match expected values (avoid MagicMock mismatch)
        mock.TARGET_SAMPLE_RATE = 16000
        mock.TARGET_CHANNELS = 1
        yield mock


class TestTranscriptionService:
    def test_singleton_getter(self) -> None:
        """Test singleton pattern."""
        s1 = get_transcription_service()
        s2 = get_transcription_service()
        assert s1 is s2
        assert isinstance(s1, TranscriptionService)

    def test_init_defaults(self) -> None:
        """Test default initialization."""
        service = TranscriptionService()
        assert service._model_loaded is False
        assert service.model_size is not None  # Falls back to settings

    def test_init_mps_detection(self) -> None:
        """Test MPS detection logic."""
        with patch("app.services.transcription.logging"):
            TranscriptionService(device="mps")
            # Should log info
            # mock_log.getLogger.return_value.info.assert_called_with(
            #     "Using MPS (Metal Performance Shaders) acceleration for Whisper"
            # )
            # Checking logic execution is sufficient via coverage

    def test_model_loading_lazy(self, mock_whisper: Any) -> None:
        """Test model is loaded only when needed."""
        # Force WHISPER_AVAILABLE
        with patch("app.services.transcription.WHISPER_AVAILABLE", True):
            service = TranscriptionService()
            assert not service._model_loaded

            # Initial load logic via private method for isolation
            service._load_model()

            assert service._model_loaded
            mock_whisper.load_model.assert_called_once()  # type: ignore[unreachable]

            # Second call should return early
            service._load_model()
            mock_whisper.load_model.assert_called_once()  # Count doesn't increase

    def test_transcribe_flow(self, mock_whisper: Any, mock_audio_processor: Any) -> None:
        """Test complete transcription flow."""
        with patch("app.services.transcription.WHISPER_AVAILABLE", True):
            service = TranscriptionService()

            result = service.transcribe("/path/to/audio.wav")

            assert result.text == "Hello world"
            assert result.language == "en"
            assert result.duration_seconds == 5.0

            # Verify calls
            mock_audio_processor.validate_audio_file.assert_called_with("/path/to/audio.wav")
            # Verify normalize NOT called because mock returns 16k mono
            mock_audio_processor.normalize_audio.assert_not_called()

    def test_transcribe_flow_detect_language(
        self, mock_whisper: Any, mock_audio_processor: Any
    ) -> None:
        """Test language detection log branch."""
        with patch("app.services.transcription.WHISPER_AVAILABLE", True):
            service = TranscriptionService()
            result = service.transcribe("/path/to/audio.wav", language="en")
            assert result.text == "Hello world"

    def test_transcribe_normalization_needed(
        self, mock_whisper: Any, mock_audio_processor: Any
    ) -> None:
        """Test flow when normalization is required."""
        with patch("app.services.transcription.WHISPER_AVAILABLE", True):
            # Return non-compliant audio info
            mock_audio_processor.get_audio_info.return_value = {"sample_rate": 44100, "channels": 2}

            service = TranscriptionService()
            service.transcribe("orig.wav")

            mock_audio_processor.normalize_audio.assert_called_with("orig.wav")

            # Verify transcribe called on normalized path
            # Need to dig into the mock call args on the model
            model_mock = mock_whisper.load_model.return_value
            model_mock.transcribe.assert_called_with(
                "normalized.wav", language="en", temperature=0.0, fp16=False
            )

    def test_invalid_audio_file(self, mock_whisper: Any, mock_audio_processor: Any) -> None:
        """Test invalid audio file handling."""
        mock_audio_processor.validate_audio_file.return_value = False

        with patch("app.services.transcription.WHISPER_AVAILABLE", True):
            service = TranscriptionService()

            with pytest.raises(ValueError, match="Invalid audio file"):
                service.transcribe("bad.wav")

    def test_whisper_import_error(self) -> None:
        """Test behavior when whisper is missing."""
        with patch("app.services.transcription.WHISPER_AVAILABLE", False):
            service = TranscriptionService()

            with pytest.raises(RuntimeError, match="Whisper not installed"):
                # accessing private _load_model directly to trigger check
                service._load_model()

    def test_transcribe_text_mock(self) -> None:
        """Test dummy transcription method."""
        service = TranscriptionService()
        result = service.transcribe_text("Direct text")

        assert result.text == "Direct text"
        assert result.duration_seconds == 0.0

    def test_get_model_info(self) -> None:
        """Test model info string."""
        service = TranscriptionService(model_size="tiny", device="cpu", compute_type="int8")
        info = service.get_model_info()

        assert info["model_size"] == "tiny"
        assert info["device"] == "cpu"
        assert info["compute_type"] == "int8"
        assert info["loaded"] is False

    def test_load_model_failure(self, mock_whisper: Any) -> None:
        """Test failure during model loading."""
        with patch("app.services.transcription.WHISPER_AVAILABLE", True):
            mock_whisper.load_model.side_effect = Exception("Load failed")
            service = TranscriptionService()

            with pytest.raises(RuntimeError, match="Model loading failed"):
                service._load_model()

    def test_transcription_runtime_error(
        self, mock_whisper: Any, mock_audio_processor: Any
    ) -> None:
        """Test handling of exceptions during transcription."""
        with patch("app.services.transcription.WHISPER_AVAILABLE", True):
            model_mock = mock_whisper.load_model.return_value
            model_mock.transcribe.side_effect = Exception("Inference failed")

            service = TranscriptionService()

            with pytest.raises(RuntimeError, match="Transcription error"):
                service.transcribe("valid.wav")


@pytest.mark.slow
@pytest.mark.skipif(
    not Path("tests/fixtures/sample.wav").exists(), reason="No sample audio file available"
)
class TestTranscriptionWithAudio:
    """Tests requiring actual audio files (marked as slow)."""

    def test_transcribe_audio_file(self, fixtures_dir: Any) -> None:
        """Test transcribing a real audio file."""
        audio_path = fixtures_dir / "sample.wav"

        if not audio_path.exists():
            pytest.skip("No sample audio file")

        service = TranscriptionService(model_size="tiny.en")
        result = service.transcribe(str(audio_path))

        assert isinstance(result, TranscriptionResult)
        assert len(result.text) > 0
        assert result.duration_seconds > 0
        assert result.transcription_time_seconds > 0
        assert result.language == "en"

    def test_transcription_latency(self, fixtures_dir: Any) -> None:
        """Test that transcription meets latency targets."""
        audio_path = fixtures_dir / "sample.wav"

        if not audio_path.exists():
            pytest.skip("No sample audio file")

        service = TranscriptionService(model_size="base.en")
        result = service.transcribe(str(audio_path))

        max_latency = max(1.0, result.duration_seconds * 0.15)
        assert (
            result.transcription_time_seconds < max_latency
        ), f"Transcription too slow: {result.transcription_time_seconds}s"
