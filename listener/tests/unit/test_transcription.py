"""
Listener Module - Transcription Service Tests

Unit tests for the TranscriptionService.
"""

# pylint: disable=protected-access

from pathlib import Path
from typing import Any

import pytest

from app.models.vac_response import TranscriptionResult
from app.services.transcription import TranscriptionService, get_transcription_service


class TestTranscriptionService:
    """Test TranscriptionService functionality"""

    def test_service_initialization(self) -> None:
        """Test service can be initialized with custom parameters"""
        service = TranscriptionService(model_size="base.en", device="cpu", compute_type="int8")

        assert service.model_size == "base.en"
        assert service.device == "cpu"
        assert service.compute_type == "int8"
        assert not service._model_loaded

    def test_get_model_info(self) -> None:
        """Test getting model information"""
        service = TranscriptionService()
        info = service.get_model_info()

        assert "model_size" in info
        assert "device" in info
        assert "compute_type" in info
        assert "loaded" in info
        assert info["loaded"] is False  # Not loaded until first use

    def test_transcribe_text(self, sample_text: Any) -> None:
        """Test direct text transcription (no audio)"""
        service = TranscriptionService()
        result = service.transcribe_text(sample_text)

        assert isinstance(result, TranscriptionResult)
        assert result.text == sample_text
        assert result.language == "en"
        assert result.duration_seconds == 0.0
        assert result.transcription_time_seconds == 0.0

    def test_singleton_pattern(self) -> None:
        """Test that get_transcription_service returns same instance"""
        service1 = get_transcription_service()
        service2 = get_transcription_service()

        assert service1 is service2  # Same object


@pytest.mark.slow
@pytest.mark.skipif(
    not Path("tests/fixtures/sample.wav").exists(), reason="No sample audio file available"
)
class TestTranscriptionWithAudio:
    """Tests requiring actual audio files (marked as slow)"""

    def test_transcribe_audio_file(self, fixtures_dir: Any) -> None:
        """Test transcribing a real audio file"""
        audio_path = fixtures_dir / "sample.wav"

        if not audio_path.exists():
            pytest.skip("No sample audio file")

        service = TranscriptionService(model_size="tiny.en")  # Use smallest model for speed
        result = service.transcribe(str(audio_path))

        assert isinstance(result, TranscriptionResult)
        assert len(result.text) > 0
        assert result.duration_seconds > 0
        assert result.transcription_time_seconds > 0
        assert result.language == "en"

    def test_transcription_latency(self, fixtures_dir: Any) -> None:
        """Test that transcription meets latency targets"""
        audio_path = fixtures_dir / "sample.wav"

        if not audio_path.exists():
            pytest.skip("No sample audio file")

        service = TranscriptionService(model_size="base.en")
        result = service.transcribe(str(audio_path))

        # For 10s audio, target is <1s (using base.en model)
        # Adjust based on actual audio duration
        max_latency = max(1.0, result.duration_seconds * 0.15)  # 15% of audio duration
        assert (
            result.transcription_time_seconds < max_latency
        ), f"Transcription too slow: {result.transcription_time_seconds}s"


class TestTranscriptionResultModel:
    """Test TranscriptionResult Pydantic model"""

    def test_model_validation(self) -> None:
        """Test that model validates correctly"""
        result = TranscriptionResult(
            text="Hello world", language="en", duration_seconds=5.0, transcription_time_seconds=0.5
        )

        assert result.text == "Hello world"
        assert result.language == "en"
        assert result.duration_seconds == 5.0
        assert result.transcription_time_seconds == 0.5

    def test_model_serialization(self) -> None:
        """Test that model can be serialized to JSON"""
        result = TranscriptionResult(
            text="Test", language="en", duration_seconds=1.0, transcription_time_seconds=0.1
        )

        json_data = result.model_dump()

        assert json_data["text"] == "Test"
        assert json_data["language"] == "en"
        assert json_data["duration_seconds"] == 1.0
        assert json_data["transcription_time_seconds"] == 0.1


# Instructions for running tests:
#
# Run all tests:
#   pytest tests/unit/test_transcription.py -v
#
# Run only fast tests (skip audio tests):
#   pytest tests/unit/test_transcription.py -v -m "not slow"
#
# Run with coverage:
#   pytest tests/unit/test_transcription.py --cov=app.services.transcription
#
# To test with audio files:
# 1. Add a sample.wav file to tests/fixtures/
# 2. Run: pytest tests/unit/test_transcription.py -v -m slow
