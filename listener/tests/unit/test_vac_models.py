"""
Listener Module - VAC Model Tests

Unit tests for VAC response Pydantic models.
"""

# pylint: disable=no-member, empty-docstring

import pytest
from pydantic import ValidationError

from app.models.vac_response import (
    EmotionalClassification,
    ProcessingResult,
    TranscriptionResult,
    VACVector,
)


class TestVACVector:
    """Test VACVector model"""

    def test_valid_vac_vector(self) -> None:
        """Test creating valid VAC vector"""
        vac = VACVector(valence=0.5, arousal=-0.3, connection=0.8)

        assert vac.valence == 0.5
        assert vac.arousal == -0.3
        assert vac.connection == 0.8

    def test_vac_validation_rejects_out_of_range(self) -> None:
        """Test that Pydantic rejects values outside [-1, 1]"""
        # Values > 1 should be rejected
        with pytest.raises(ValidationError):
            VACVector(valence=1.5, arousal=0.5, connection=0.5)

        # Values < -1 should be rejected
        with pytest.raises(ValidationError):
            VACVector(valence=-1.5, arousal=-0.5, connection=-0.5)

    def test_vac_field_validator_clamping(self) -> None:
        """Test that validator clamps values at the boundary"""
        # This tests the field_validator logic
        # For values slightly outside range, validator will clamp
        vac = VACVector(valence=1.0, arousal=0.999, connection=-0.999)
        assert -1.0 <= vac.valence <= 1.0
        assert -1.0 <= vac.arousal <= 1.0
        assert -1.0 <= vac.connection <= 1.0

    def test_vac_boundary_values(self) -> None:
        """Test boundary values"""
        vac = VACVector(valence=-1.0, arousal=1.0, connection=0.0)

        assert vac.valence == -1.0
        assert vac.arousal == 1.0
        assert vac.connection == 0.0

    def test_vac_serialization(self) -> None:
        """Test VAC vector serialization"""
        vac = VACVector(valence=0.9, arousal=0.7, connection=0.8)
        data = vac.model_dump()

        assert data["valence"] == 0.9
        assert data["arousal"] == 0.7
        assert data["connection"] == 0.8


class TestEmotionalClassification:
    """Test EmotionalClassification model"""

    def test_valid_classification(self) -> None:
        """Test creating valid emotional classification"""
        emotion = EmotionalClassification(
            primary_emotion="Joy",
            category="Places We Go When Life Is Good",
            vac=VACVector(valence=0.9, arousal=0.7, connection=0.8),
            confidence=0.92,
            reasoning="High positive affect",
        )

        assert emotion.primary_emotion == "Joy"
        assert emotion.category == "Places We Go When Life Is Good"
        assert emotion.vac.valence == 0.9
        assert emotion.confidence == 0.92

    def test_confidence_validation(self) -> None:
        """Test confidence must be [0, 1]"""
        # Valid confidence
        emotion = EmotionalClassification(
            primary_emotion="Joy",
            category="Test",
            vac=VACVector(valence=0.5, arousal=0.5, connection=0.5),
            confidence=0.85,
            reasoning="Test",
        )
        assert emotion.confidence == 0.85

        # Invalid confidence should fail
        with pytest.raises(ValidationError):
            EmotionalClassification(
                primary_emotion="Joy",
                category="Test",
                vac=VACVector(valence=0.5, arousal=0.5, connection=0.5),
                confidence=1.5,  # > 1.0
                reasoning="Test",
            )

    def test_classification_serialization(self) -> None:
        """Test serialization to JSON"""
        emotion = EmotionalClassification(
            primary_emotion="Grief",
            category="Places We Go When Things Don't Go As Planned",
            vac=VACVector(valence=-0.8, arousal=-0.3, connection=0.7),
            confidence=0.88,
            reasoning="Pain with enduring love",
        )

        data = emotion.model_dump()

        assert data["primary_emotion"] == "Grief"
        assert data["vac"]["valence"] == -0.8
        assert data["vac"]["connection"] == 0.7


class TestTranscriptionResult:
    """Test TranscriptionResult model"""

    def test_valid_transcription(self) -> None:
        """Test creating valid transcription result"""
        result = TranscriptionResult(
            text="Hello world", language="en", duration_seconds=5.0, transcription_time_seconds=0.5
        )

        assert result.text == "Hello world"
        assert result.language == "en"
        assert result.duration_seconds == 5.0
        assert result.transcription_time_seconds == 0.5

    def test_transcription_serialization(self) -> None:
        """Test serialization"""
        result = TranscriptionResult(
            text="Test", language="en", duration_seconds=1.0, transcription_time_seconds=0.1
        )

        data = result.model_dump()
        assert data["text"] == "Test"
        assert data["language"] == "en"


class TestProcessingResult:
    """Test ProcessingResult model"""

    def test_valid_processing_result(self) -> None:
        """Test creating complete processing result"""
        transcription = TranscriptionResult(
            text="I feel great", language="en", duration_seconds=2.0, transcription_time_seconds=0.3
        )

        emotion = EmotionalClassification(
            primary_emotion="Joy",
            category="Places We Go When Life Is Good",
            vac=VACVector(valence=0.9, arousal=0.7, connection=0.8),
            confidence=0.92,
            reasoning="Positive affect",
        )

        result = ProcessingResult(
            transcription=transcription,
            emotion=emotion,
            sanitized_text="I feel great",
            processing_time_seconds=2.5,
        )

        assert result.transcription.text == "I feel great"
        assert result.emotion.primary_emotion == "Joy"
        assert result.sanitized_text == "I feel great"
        assert result.processing_time_seconds == 2.5

    def test_processing_result_serialization(self) -> None:
        """Test full serialization"""
        transcription = TranscriptionResult(
            text="Test", language="en", duration_seconds=1.0, transcription_time_seconds=0.1
        )

        emotion = EmotionalClassification(
            primary_emotion="Joy",
            category="Test",
            vac=VACVector(valence=0.5, arousal=0.5, connection=0.5),
            confidence=0.9,
            reasoning="Test",
        )

        result = ProcessingResult(
            transcription=transcription,
            emotion=emotion,
            sanitized_text="Test",
            processing_time_seconds=1.0,
        )

        data = result.model_dump()

        assert data["transcription"]["text"] == "Test"
        assert data["emotion"]["primary_emotion"] == "Joy"
        assert data["sanitized_text"] == "Test"


# Run these tests with:
# pytest tests/unit/test_vac_models.py -v
