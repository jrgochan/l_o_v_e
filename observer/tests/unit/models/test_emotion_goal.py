
import pytest
import uuid
from app.models.multi_emotion_analysis import EmotionGoal

def test_emotion_goal_serialization():
    """Test EmotionGoal serialization."""
    goal = EmotionGoal(
        id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        user_id="user1",
        priority=1,
        status="active",
        created_at=None # Test None date handling
    )
    
    data = goal.to_dict(include_emotion_details=False)
    assert data["user_id"] == "user1"
    assert data["status"] == "active"
    assert data["created_at"] is None
