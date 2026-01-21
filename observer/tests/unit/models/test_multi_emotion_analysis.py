import pytest
from uuid import uuid4
from unittest.mock import MagicMock
from datetime import datetime

from app.models.multi_emotion_analysis import (
    MultiEmotionAnalysis, DetectedEmotion, EmotionRelationship, EmotionGoal
)
from app.models.emotion_definition import EmotionDefinition

# --- DetectedEmotion Tests ---

def test_detected_emotion_initialization_and_properties():
    """Test full initialization and property logic for DetectedEmotion."""
    de = DetectedEmotion(
        id=uuid4(),
        confidence=0.9,
        prominence="primary",
        vac=[0.5, 0.5, 0.5]
    )
    assert de.is_primary is True
    assert de.is_secondary is False
    assert de.is_underlying is False

    de.prominence = "secondary"
    assert de.is_primary is False
    assert de.is_secondary is True

    de.prominence = "underlying"
    assert de.is_underlying is True

    # Test repr
    assert "Unknown" in repr(de)
    de.emotion = EmotionDefinition(emotion_name="Joy")
    assert "Joy" in repr(de)

def test_detected_emotion_to_dict_full():
    """Test serialization with all optional fields present."""
    de = DetectedEmotion(
        id=uuid4(),
        analysis_id=uuid4(),
        emotion_id=uuid4(),
        confidence=0.88,
        prominence="primary",
        vac=[0.1, 0.2, 0.3],
        voice_alignment=0.95,
        voice_interpretation_vac=[0.4, 0.5, 0.6],
        created_at=datetime.utcnow()
    )
    mock_emotion = MagicMock()
    mock_emotion.id = uuid4()
    mock_emotion.emotion_name = "Joy"
    mock_emotion.category = "Positive"
    mock_emotion.definition = "Happy"
    mock_emotion.vac_vector = [0.9, 0.9, 0.9]
    de.emotion = mock_emotion

    data = de.to_dict(include_emotion_details=True)
    
    # Core fields
    assert data["id"] == str(de.id)
    assert data["confidence"] == 0.88
    assert data["vac"] == {"valence": 0.1, "arousal": 0.2, "connection": 0.3}
    
    # Optional fields
    assert data["voice_interpretation_vac"] == {"valence": 0.4, "arousal": 0.5, "connection": 0.6}
    assert data["emotion"]["name"] == "Joy"
    assert data["emotion"]["atlas_vac"] == [0.9, 0.9, 0.9]

def test_detected_emotion_to_dict_minimal():
    """Test serialization with missing optional fields (None values)."""
    de = DetectedEmotion(
        id=uuid4(),
        confidence=0.5,
        prominence="secondary",
        vac=None, # Explicit None
        voice_alignment=None,
        voice_interpretation_vac=None
    )
    # No emotion relation set
    
    data = de.to_dict(include_emotion_details=True)
    
    assert data["vac"] is None
    assert "voice_interpretation_vac" not in data
    assert "emotion" not in data

# --- EmotionRelationship Tests ---

def test_emotion_relationship_logic():
    """Test all relationship type checks."""
    er = EmotionRelationship(strength=0.5)
    
    types = [
        ("complementary", "is_complementary"),
        ("contradictory", "is_contradictory"),
        ("masking", "is_masking"),
        ("amplifying", "is_amplifying"),
        ("sequential", "is_sequential")
    ]
    
    for type_name, prop_name in types:
        er.relationship_type = type_name
        assert getattr(er, prop_name) is True
        # Verify others false
        for other_type, other_prop in types:
            if other_type != type_name:
                assert getattr(er, other_prop) is False

    # Repr
    er.relationship_type = "masking"
    assert "masking" in repr(er)

def test_emotion_relationship_to_dict():
    """Test relationship serialization."""
    er = EmotionRelationship(
        id=uuid4(),
        relationship_type="masking",
        strength=0.9,
        description="Hidden anger",
        created_at=datetime.utcnow()
    )
    
    # Link mocked emotions
    er.emotion_a = MagicMock()
    er.emotion_a.to_dict.return_value = {"id": "a"}
    er.emotion_b = MagicMock()
    er.emotion_b.to_dict.return_value = {"id": "b"}
    
    data = er.to_dict(include_emotions=True)
    assert data["type"] == "masking"
    assert data["emotion_a"] == {"id": "a"}
    assert data["emotion_b"] == {"id": "b"}
    
    # Exclude emotions
    data_shallow = er.to_dict(include_emotions=False)
    assert "emotion_a" not in data_shallow

# --- MultiEmotionAnalysis Tests ---

def test_multi_emotion_analysis_properties():
    """Test primary/secondary/underlying extraction logic."""
    analysis = MultiEmotionAnalysis()
    
    # Empty
    assert analysis.primary_emotion is None
    assert analysis.secondary_emotions == []
    assert analysis.underlying_emotions == []
    
    # Populate
    e1 = DetectedEmotion(prominence="primary")
    e2 = DetectedEmotion(prominence="secondary")
    e3 = DetectedEmotion(prominence="underlying")
    e4 = DetectedEmotion(prominence="secondary") # Multiple secondary
    
    analysis.detected_emotions = [e1, e2, e3, e4]
    
    assert analysis.primary_emotion == e1
    assert len(analysis.secondary_emotions) == 2
    assert e2 in analysis.secondary_emotions
    assert e4 in analysis.secondary_emotions
    assert analysis.underlying_emotions == [e3]
    
    # Fallback Logic: No primary marked
    analysis_fallback = MultiEmotionAnalysis()
    e_only = DetectedEmotion(prominence="secondary")
    analysis_fallback.detected_emotions = [e_only]
    assert analysis_fallback.primary_emotion == e_only

def test_multi_emotion_analysis_to_dict_full():
    """Test full analysis serialization."""
    analysis = MultiEmotionAnalysis(
        id=uuid4(),
        deep_feeling_enabled=True,
        aggregate_vac=[0.5, 0.5, 0.5],
        three_way_enabled=True,
        content_only_data={"x": 1},
        voice_only_data={"y": 2},
        discrepancy_metrics={"z": 3},
        detected_emotions=[MagicMock(to_dict=lambda: {"id": "e1"})],
        emotion_relationships=[MagicMock(to_dict=lambda: {"id": "r1"})]
    )
    
    data = analysis.to_dict()
    assert data["aggregate_vac"] == {"valence": 0.5, "arousal": 0.5, "connection": 0.5}
    assert data["content_only_data"] == {"x": 1}
    assert len(data["emotions"]) == 1
    assert len(data["relationships"]) == 1

def test_multi_emotion_analysis_to_dict_empty():
    """Test analysis serialization with Nones/Empty lists."""
    analysis = MultiEmotionAnalysis(
        aggregate_vac=None,
        content_only_data=None,
        voice_only_data=None,
        discrepancy_metrics=None
    )
    # Lists are implicit empty if not set on SA model usually, but here we mock or use default
    # If using default class behavior, SA relationships are empty lists if accessed via instrumented attr, 
    # but here we are unit testing the plain object. 
    # The to_dict method checks `if self.detected_emotions`.
    
    data = analysis.to_dict()
    assert data["aggregate_vac"] is None
    assert data["content_only_data"] is None
    assert "emotions" not in data
    assert "relationships" not in data
    assert data["emotion_count"] == 0

    # Repr
    assert "MultiEmotionAnalysis" in repr(analysis)

# --- EmotionGoal Tests ---

def test_emotion_goal_model():
    """Test EmotionGoal methods."""
    goal = EmotionGoal(
        status="active",
        goal_emotion=EmotionDefinition(emotion_name="Hope")
    )
    
    assert "Hope" in repr(goal)
    
    data = goal.to_dict()
    assert data["goal_emotion"]["name"] == "Hope"
    
    # Missing emotion
    goal_empty = EmotionGoal()
    assert "Unknown" in repr(goal_empty)

def test_missing_coverage_branches():
    """Test edge cases for 100% coverage."""
    # 1. EmotionRelationship to_dict with missing emotions
    er = EmotionRelationship(
        relationship_type="masking",
        strength=0.5
    )
    # emotion_a and emotion_b are None by default here
    data = er.to_dict(include_emotions=True)
    assert "emotion_a" not in data
    assert "emotion_b" not in data

    # 2. EmotionGoal to_dict branches
    goal = EmotionGoal(user_id="u1")
    
    # Case: include_emotion_details=True but no goal_emotion
    data_no_emotion = goal.to_dict(include_emotion_details=True)
    assert "goal_emotion" not in data_no_emotion
    
    # Case: include_emotion_details=False
    # (Need a goal WITH emotion to ensure it's hidden)
    goal_with_emotion = EmotionGoal(user_id="u2")
    goal_with_emotion.goal_emotion = EmotionDefinition(emotion_name="Hope")
    

def test_emotion_goal_properties():
    """Test EmotionGoal status properties."""
    from datetime import datetime
    
    # Active
    g1 = EmotionGoal(
        session_id=uuid4(),
        user_id=uuid4(),
        status="active"
    )
    assert g1.is_active is True
    assert g1.is_achieved is False
    assert g1.is_abandoned is False
    
    # Achieved
    g2 = EmotionGoal(
        session_id=uuid4(),
        user_id=uuid4(),
        status="achieved"
    )
    assert g2.is_active is False
    assert g2.is_achieved is True
    
    # Abandoned
    g3 = EmotionGoal(
        session_id=uuid4(),
        user_id=uuid4(),
        status="abandoned"
    )
    assert g3.is_abandoned is True
