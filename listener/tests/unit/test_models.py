"""Unit tests for Listener Pydantic models."""
import pytest
from pydantic import ValidationError
from app.models.multi_emotion_response import (
    DetectedEmotionResponse,
    EmotionRelationshipResponse,
    MultiEmotionAnalysisResponse,
)
from app.models.vac_response import VACVector

# Valid reusable objects
VALID_VAC = VACVector(valence=0.5, arousal=0.5, connection=0.5)
VALID_EMOTION_PRIMARY = DetectedEmotionResponse(
    emotion_name="Joy",
    category="Happiness",
    vac=VALID_VAC,
    confidence=0.9,
    prominence="primary"
)
VALID_EMOTION_SECONDARY = DetectedEmotionResponse(
    emotion_name="Sadness",
    category="Sadness",
    vac=VALID_VAC,
    confidence=0.8,
    prominence="secondary"
)

class TestDetectedEmotionResponse:
    def test_valid_prominence(self):
        """Test valid prominence values."""
        for p in ["primary", "secondary", "underlying"]:
            model = DetectedEmotionResponse(
                emotion_name="Test",
                category="Test",
                vac=VALID_VAC,
                confidence=1.0,
                prominence=p
            )
            assert model.prominence == p

    def test_invalid_prominence(self):
        """Test invalid prominence raises ValueError."""
        with pytest.raises(ValidationError) as exc:
            DetectedEmotionResponse(
                emotion_name="Test",
                category="Test",
                vac=VALID_VAC,
                confidence=1.0,
                prominence="invalid"
            )
        assert "Prominence must be one of" in str(exc.value)

class TestEmotionRelationshipResponse:
    def test_valid_type(self):
        """Test valid relationship types."""
        for t in ["complementary", "contradictory", "masking", "amplifying", "sequential"]:
            model = EmotionRelationshipResponse(
                emotion_a="A",
                emotion_b="B",
                type=t,
                strength=0.5,
                description="desc"
            )
            assert model.type == t

    def test_invalid_type(self):
        """Test invalid relationship type raises ValueError."""
        with pytest.raises(ValidationError) as exc:
            EmotionRelationshipResponse(
                emotion_a="A",
                emotion_b="B",
                type="invalid",
                strength=0.5,
                description="desc"
            )
        assert "Relationship type must be one of" in str(exc.value)

class TestMultiEmotionAnalysisResponse:
    def test_valid_temporal_pattern(self):
        """Test valid temporal patterns."""
        for p in ["concurrent", "sequential", "emerging"]:
            model = MultiEmotionAnalysisResponse(
                emotions=[VALID_EMOTION_PRIMARY],
                relationships=[],
                aggregate_vac=VALID_VAC,
                complexity_score=0.5,
                emotional_clarity=0.5,
                temporal_pattern=p,
                reasoning="test"
            )
            assert model.temporal_pattern == p

    def test_invalid_temporal_pattern(self):
        """Test invalid temporal pattern raises ValueError."""
        with pytest.raises(ValidationError) as exc:
            MultiEmotionAnalysisResponse(
                emotions=[VALID_EMOTION_PRIMARY],
                relationships=[],
                aggregate_vac=VALID_VAC,
                complexity_score=0.5,
                emotional_clarity=0.5,
                temporal_pattern="invalid",
                reasoning="test"
            )
        assert "Temporal pattern must be one of" in str(exc.value)

    def test_validate_one_primary_success(self):
        """Test valid primary count (exactly 1)."""
        model = MultiEmotionAnalysisResponse(
            emotions=[VALID_EMOTION_PRIMARY, VALID_EMOTION_SECONDARY],
            relationships=[],
            aggregate_vac=VALID_VAC,
            complexity_score=0.5,
            emotional_clarity=0.5,
            temporal_pattern="concurrent",
            reasoning="test"
        )
        assert len(model.emotions) == 2

    def test_validate_no_primary_fail(self):
        """Test 0 primary emotions raises error."""
        with pytest.raises(ValidationError) as exc:
            MultiEmotionAnalysisResponse(
                emotions=[VALID_EMOTION_SECONDARY],
                relationships=[],
                aggregate_vac=VALID_VAC,
                complexity_score=0.5,
                emotional_clarity=0.5,
                temporal_pattern="concurrent",
                reasoning="test"
            )
        assert "Must have exactly 1 primary emotion" in str(exc.value)

    def test_validate_multiple_primary_fail(self):
        """Test >1 primary emotions raises error."""
        with pytest.raises(ValidationError) as exc:
            MultiEmotionAnalysisResponse(
                emotions=[VALID_EMOTION_PRIMARY, VALID_EMOTION_PRIMARY],
                relationships=[],
                aggregate_vac=VALID_VAC,
                complexity_score=0.5,
                emotional_clarity=0.5,
                temporal_pattern="concurrent",
                reasoning="test"
            )
        assert "Must have exactly 1 primary emotion" in str(exc.value)

    def test_validate_too_many_emotions_fail(self):
        """Test >3 emotions raises error."""
        emotions = [VALID_EMOTION_PRIMARY] + [VALID_EMOTION_SECONDARY] * 3
        with pytest.raises(ValidationError) as exc:
            MultiEmotionAnalysisResponse(
                emotions=emotions,
                relationships=[],
                aggregate_vac=VALID_VAC,
                complexity_score=0.5,
                emotional_clarity=0.5,
                temporal_pattern="concurrent",
                reasoning="test"
            )
        assert "Must have 1-3 emotions" in str(exc.value)


