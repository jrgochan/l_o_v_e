
import pytest
import uuid
from datetime import datetime
from app.models.emotion_definition import EmotionDefinition

def test_atlas_definition_to_dict():
    """Test AtlasDefinition serialization."""
    emotion = EmotionDefinition(
        id=uuid.uuid4(),
        emotion_name="Test Joy",
        category="Happiness",
        definition="A feeling of great pleasure",
        vac_vector=[0.8, 0.5, 0.6],
        q_constant=[1.0, 0.0, 0.0, 0.0],
        haptic_pattern_id="soft_pulse",
        color_hint="#FF0000",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    data = emotion.to_dict()
    assert data["emotion_name"] == "Test Joy"
