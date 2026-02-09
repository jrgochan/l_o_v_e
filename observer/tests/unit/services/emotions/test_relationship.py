import pytest

from app.services.emotions.relationships import EmotionRelationshipService


@pytest.fixture
def service():
    return EmotionRelationshipService()


def test_analyze_relationships_too_few_emotions(service):
    """Test with less than 2 emotions."""
    emotions = [{"emotion_name": "Joy", "vac": {}, "confidence": 0.9}]
    assert service.analyze_relationships(emotions) == []
    assert service.analyze_relationships([]) == []


def test_known_relationship_complementary(service):
    """Test detection of known complementary pair."""
    emotions = [
        {"emotion_name": "Joy", "vac": {}, "confidence": 0.9, "prominence": "primary"},
        {
            "emotion_name": "Gratitude",
            "vac": {},
            "confidence": 0.8,
            "prominence": "primary",
        },
    ]
    rels = service.analyze_relationships(emotions)
    assert len(rels) == 1
    assert rels[0]["type"] == "complementary"
    assert rels[0]["strength"] == 0.9
    assert rels[0]["emotion_a"] == "Joy"
    assert rels[0]["emotion_b"] == "Gratitude"


def test_known_relationship_masking_order(service):
    """Test masking detection respects order (Anger masking Hurt)."""
    # Order 1: Anger first
    emotions = [
        {"emotion_name": "Anger", "vac": {}, "confidence": 0.9},
        {"emotion_name": "Hurt", "vac": {}, "confidence": 0.8},
    ]
    rels = service.analyze_relationships(emotions)
    assert len(rels) == 1
    assert rels[0]["type"] == "masking"

    # Order 2: Hurt first (should swap)
    emotions_rev = [
        {"emotion_name": "Hurt", "vac": {}, "confidence": 0.8},
        {"emotion_name": "Anger", "vac": {}, "confidence": 0.9},
    ]
    rels_rev = service.analyze_relationships(emotions_rev)
    assert len(rels_rev) == 1
    assert rels_rev[0]["type"] == "masking"


def test_known_relationship_reverse_non_masking(service):
    """Test known relationship in reverse order (Complementary)."""
    # Gratitude then Joy (Known is Joy + Gratitude)
    emotions = [
        {"emotion_name": "Gratitude", "vac": {}, "confidence": 0.8},
        {"emotion_name": "Joy", "vac": {}, "confidence": 0.9},
    ]
    rels = service.analyze_relationships(emotions)
    assert len(rels) == 1
    assert rels[0]["type"] == "complementary"
    assert rels[0]["emotion_a"] == "Gratitude"
    assert rels[0]["emotion_b"] == "Joy"


def test_infer_contradictory(service):
    """Infer contradictory relationship from VAC."""
    emotions = [
        {
            "emotion_name": "A",
            "vac": {"valence": 0.8, "arousal": 0.6, "connection": 0},
            "confidence": 0.9,
        },
        {
            "emotion_name": "B",
            "vac": {"valence": -0.8, "arousal": 0.5, "connection": 0},
            "confidence": 0.9,
        },
    ]
    # Valence diff 1.6 (>1.0), Arousal diff 0.1 (<0.5) -> Contradictory
    rels = service.analyze_relationships(emotions)
    assert len(rels) == 1
    assert rels[0]["type"] == "contradictory"
    assert rels[0]["strength"] > 0.7


def test_infer_masking(service):
    """Infer masking from VAC and prominence."""
    emotions = [
        {
            "emotion_name": "A",
            "vac": {"valence": -0.8, "arousal": 0.8, "connection": 0},
            "prominence": "primary",
            "confidence": 0.9,
        },
        {
            "emotion_name": "B",
            "vac": {"valence": 0.8, "arousal": 0.2, "connection": 0},
            "prominence": "underlying",
            "confidence": 0.7,
        },
    ]
    # Valence diff 1.6 (>0.8), Primary/Underlying -> Masking
    rels = service.analyze_relationships(emotions)
    assert len(rels) == 1
    assert rels[0]["type"] == "masking"
    assert rels[0]["emotion_a"] == "A"  # A masking B


def test_infer_complementary(service):
    """Infer complementary from close VAC."""
    emotions = [
        {
            "emotion_name": "A",
            "vac": {"valence": 0.5, "arousal": 0.5, "connection": 0.5},
            "confidence": 0.9,
        },
        {
            "emotion_name": "B",
            "vac": {"valence": 0.6, "arousal": 0.6, "connection": 0.6},
            "confidence": 0.9,
        },
    ]
    # Close distance -> Complementary
    rels = service.analyze_relationships(emotions)
    assert len(rels) == 1
    assert rels[0]["type"] == "complementary"


def test_infer_amplifying(service):
    """Infer amplifying from arousal diff."""
    emotions = [
        {
            "emotion_name": "High",
            "vac": {"valence": -0.8, "arousal": 0.95, "connection": 0},
            "confidence": 0.9,
        },
        {
            "emotion_name": "Low",
            "vac": {"valence": -0.9, "arousal": 0.1, "connection": 0},
            "confidence": 0.9,
        },
    ]
    # Similar valence, big arousal diff (0.85 > 0.8) -> Amplifying
    # Note: 0.95 - 0.1 = 0.85
    rels = service.analyze_relationships(emotions)
    assert len(rels) == 1
    assert rels[0]["type"] == "amplifying"
    assert "high intensifying low" in rels[0]["description"].lower()


def test_infer_sequential(service):
    """Infer sequential from moderate distance."""
    emotions = [
        {
            "emotion_name": "First",
            "vac": {"valence": 0.0, "arousal": 0.2, "connection": 0},
            "confidence": 0.9,
        },
        {
            "emotion_name": "Second",
            "vac": {"valence": 0.5, "arousal": 0.8, "connection": 0},
            "confidence": 0.9,
        },
    ]
    # Dist ~0.78, Arousal diff 0.6 -> Sequential
    rels = service.analyze_relationships(emotions)
    assert len(rels) == 1
    assert rels[0]["type"] == "sequential"
    # Lower arousal (First) should be A
    assert rels[0]["emotion_a"] == "First"


def test_infer_default_complementary(service):
    """Fallback to weak complementary."""
    emotions = [
        {
            "emotion_name": "A",
            "vac": {"valence": 0, "arousal": 0, "connection": 0},
            "confidence": 0.9,
        },
        {
            "emotion_name": "B",
            "vac": {"valence": 0.6, "arousal": 0, "connection": 0},
            "confidence": 0.9,
        },
    ]
    # Distance 0.6 (too far for strong comp, too close/aligned for others)
    rels = service.analyze_relationships(emotions)
    assert len(rels) == 1
    assert rels[0]["type"] == "complementary"
    assert rels[0]["strength"] == 0.3


def test_no_clear_relationship(service):
    """Test far apart emotions with no pattern."""
    emotions = [
        {
            "emotion_name": "A",
            "vac": {"valence": 1.0, "arousal": 1.0, "connection": 1.0},
            "confidence": 0.9,
        },
        {
            "emotion_name": "B",
            "vac": {"valence": -1.0, "arousal": -1.0, "connection": -1.0},
            "confidence": 0.9,
        },
    ]
    # Huge distance (>1.2), not contradictory rule match (arousal diff > 0.5)
    rels = service.analyze_relationships(emotions)
    assert len(rels) == 0


def test_reverse_masking_inference(service):
    """Test inference of masking when B is primary."""
    emotions = [
        {
            "emotion_name": "Under",
            "vac": {"valence": 0.8, "arousal": 0.2, "connection": 0},
            "prominence": "underlying",
            "confidence": 0.7,
        },
        {
            "emotion_name": "Top",
            "vac": {"valence": -0.8, "arousal": 0.8, "connection": 0},
            "prominence": "primary",
            "confidence": 0.9,
        },
    ]
    rels = service.analyze_relationships(emotions)
    assert len(rels) == 1
    assert rels[0]["type"] == "masking"
    assert rels[0]["emotion_a"] == "Top"  # Top masking Under


def test_reverse_amplifying(service):
    """Test inference of amplifying when B is higher arousal."""
    emotions = [
        {
            "emotion_name": "Low",
            "vac": {"valence": -0.9, "arousal": 0.1, "connection": 0},
            "confidence": 0.9,
        },
        {
            "emotion_name": "High",
            "vac": {"valence": -0.8, "arousal": 0.95, "connection": 0},
            "confidence": 0.9,
        },
    ]
    rels = service.analyze_relationships(emotions)
    assert len(rels) == 1
    assert rels[0]["type"] == "amplifying"
    assert "high intensifying low" in rels[0]["description"].lower()


def test_reverse_sequential(service):
    """Test inference of sequential when B is lower arousal."""
    emotions = [
        {
            "emotion_name": "Second",
            "vac": {"valence": 0.5, "arousal": 0.8, "connection": 0},
            "confidence": 0.9,
        },
        {
            "emotion_name": "First",
            "vac": {"valence": 0.0, "arousal": 0.2, "connection": 0},
            "confidence": 0.9,
        },
    ]
    rels = service.analyze_relationships(emotions)
    assert len(rels) == 1
    assert rels[0]["type"] == "sequential"
    assert rels[0]["emotion_a"] == "First"
