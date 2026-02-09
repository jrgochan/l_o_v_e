import pytest

from app.services.emotions.service import AggregateEmotionService


@pytest.fixture
def service():
    return AggregateEmotionService()


def test_calculate_aggregate_state_empty(service):
    """Test aggregation with no emotions."""
    result = service.calculate_aggregate_state([])
    assert result["complexity_score"] == 0.0
    assert result["emotional_clarity"] == 1.0
    assert result["temporal_pattern"] == "concurrent"
    assert result["aggregate_vac"]["valence"] == 0.0


def test_calculate_aggregate_state_single(service):
    """Test with single emotion."""
    emotions = [
        {
            "emotion_name": "Joy",
            "vac": {"valence": 0.8, "arousal": 0.6, "connection": 0.7},
            "confidence": 0.9,
            "prominence": "primary",
        }
    ]
    result = service.calculate_aggregate_state(emotions)
    assert result["complexity_score"] == 0.0
    # Single emotion -> dominance factor 1.0 -> clarity high
    # clarity = 0.9*0.4 + 1.0*0.3 + 1.0*0.3 = 0.36 + 0.3 + 0.3 = 0.96
    assert result["emotional_clarity"] > 0.9
    assert result["aggregate_vac"]["valence"] == 0.8


def test_calculate_aggregate_state_blended(service):
    """Test with mixed emotions (Happy + Sad)."""
    emotions = [
        {
            "emotion_name": "Joy",
            "vac": {"valence": 0.9, "arousal": 0.5, "connection": 0.8},
            "confidence": 0.8,
            "prominence": "primary",
        },
        {
            "emotion_name": "Sadness",
            "vac": {"valence": -0.5, "arousal": -0.2, "connection": 0.1},
            "confidence": 0.4,
            "prominence": "secondary",
        },
    ]
    # Total conf: 1.2
    # Joy weight: 0.8/1.2 = 0.66
    # Sad weight: 0.4/1.2 = 0.33
    # Valence: 0.9*0.66 + -0.5*0.33 = 0.6 - 0.165 = ~0.435

    result = service.calculate_aggregate_state(emotions)

    # Check aggregation
    agg_vac = result["aggregate_vac"]
    assert 0.4 <= agg_vac["valence"] <= 0.5

    # Check complexity: 2 emotions, high diff -> non-zero
    assert result["complexity_score"] > 0.3
    assert result["complexity_score"] < 1.0

    # Check temporal pattern: emerging (due to large conf diff + valence contrast)
    assert result["temporal_pattern"] == "emerging"


def test_determine_temporal_pattern_sequential(service):
    """Test sequential pattern detection."""
    emotions = [
        {"emotion_name": "surprise", "confidence": 0.8, "vac": {}},
        {"emotion_name": "confusion", "confidence": 0.7, "vac": {}},
    ]
    pattern = service._determine_temporal_pattern(emotions)
    assert pattern == "sequential"


def test_determine_temporal_pattern_emerging(service):
    """Test emerging pattern detection."""
    emotions = [
        # Strong primary
        {
            "emotion_name": "Joy",
            "confidence": 0.9,
            "vac": {"valence": 0.8},
            "prominence": "primary",
        },
        # Weak secondary, very different
        {
            "emotion_name": "Sadness",
            "confidence": 0.5,
            "vac": {"valence": -0.5},
            "prominence": "secondary",
        },
    ]
    # diff conf: 0.4 (>0.3), valence diff: 1.3 (>0.5) -> Emerging
    pattern = service._determine_temporal_pattern(emotions)
    assert pattern == "emerging"


def test_calculate_distance_to_goal(service):
    """Test distance calculation."""
    current = {"valence": 0.0, "arousal": 0.0, "connection": 0.0}
    goal = {"valence": 1.0, "arousal": 0.0, "connection": 0.0}
    dist = service.calculate_distance_to_goal(current, goal)
    assert dist == 1.0


def test_calculate_weighted_vac_zero_confidence(service):
    """Edge case: Emotions with zero confidence."""
    emotions = [
        {
            "emotion_name": "A",
            "vac": {"valence": 1.0, "arousal": 0.0, "connection": 0.0},
            "confidence": 0,
        },
        {
            "emotion_name": "B",
            "vac": {"valence": -1.0, "arousal": 0.0, "connection": 0.0},
            "confidence": 0,
        },
    ]
    # Should fall back to equal weights
    # (1 + -1)/2 = 0
    vac = service._calculate_weighted_vac(emotions)
    assert vac["valence"] == 0.0


def test_calculate_complexity_valence_conflict(service):
    """Test complexity with valence conflict."""
    emotions = [
        {"vac": {"valence": 0.8, "arousal": 0, "connection": 0}},
        {"vac": {"valence": -0.8, "arousal": 0, "connection": 0}},
    ]
    # should trigger valence conflict (+0.3)
    comp = service._calculate_complexity(emotions, {})
    # 2 emotions (0.67*0.3 = 0.2) + conflict (0.3*0.3 = 0.09) + variance
    assert comp > 0.29


def test_private_methods_empty_input(service):
    """Test private methods with empty input (unreachable from public API)."""
    assert service._calculate_weighted_vac([]) == {
        "valence": 0.0,
        "arousal": 0.0,
        "connection": 0.0,
    }
    assert service._calculate_clarity([], 0.0) == 0.5


def test_calculate_clarity_no_primary(service):
    """Test clarity when no emotion is marked as primary."""
    emotions = [
        {"emotion_name": "A", "confidence": 0.8, "prominence": "secondary"},
        {"emotion_name": "B", "confidence": 0.7, "prominence": "secondary"},
    ]
    # Should fall to dominance_factor = 0.5
    clarity = service._calculate_clarity(emotions, 0.5)
    # 0.75*0.4 (avg conf) + 0.5*0.3 (dominance) + 0.5*0.3 (simplicity)
    # 0.3 + 0.15 + 0.15 = 0.6
    assert clarity == 0.6


def test_determine_temporal_pattern_concurrent_explicit(service):
    """Test explicit concurrent pattern (no sequential/emerging indicators)."""
    emotions = [
        {
            "emotion_name": "Peace",
            "confidence": 0.8,
            "vac": {"valence": 0.1, "arousal": 0, "connection": 0},
        },
        {
            "emotion_name": "Joy",
            "confidence": 0.75,
            "vac": {"valence": 0.2, "arousal": 0, "connection": 0},
        },
    ]
    # Similar confidence (diff 0.05 < 0.3), similar valence -> Concurrent
    pattern = service._determine_temporal_pattern(emotions)
    assert pattern == "concurrent"
