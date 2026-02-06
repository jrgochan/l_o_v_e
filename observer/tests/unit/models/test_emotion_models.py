from datetime import datetime
from uuid import uuid4

from app.models.emotion_definition import EmotionCollection, EmotionDefinition
from app.models.model_assignment import ModelAssignment
from app.models.prompt_template import PromptTemplate
from app.models.user import User, UserRole
from app.models.user_trajectory import UserTrajectory


def test_user_trajectory_repr():
    """Test string representation of UserTrajectory."""
    uid = uuid4()
    ts = datetime(2025, 1, 1, 12, 0, 0)

    trajectory = UserTrajectory(
        user_id=uid, timestamp=ts, dominant_emotion_id=uid  # Reusing for simplicity
    )
    # The datetime formatting depends on how sqlalchemy handles it in memory vs db
    # but the __repr__ just calls str(self.timestamp)
    repr_str = repr(trajectory)
    assert str(uid) in repr_str
    assert "2025-01-01" in repr_str


def test_user_trajectory_to_dict():
    """Test to_dict method of UserTrajectory."""
    uid = uuid4()
    session_id = uuid4()
    ts = datetime(2025, 1, 1, 12, 0, 0)

    trajectory = UserTrajectory(
        id=uid,
        user_id=uid,
        session_id=session_id,
        timestamp=ts,
        vac_values=[0.1, 0.2, 0.3],
        quaternion_state=[0, 0, 0, 1],
    )

    data = trajectory.to_dict()
    assert data["id"] == str(uid)
    assert data["vac_values"] == [0.1, 0.2, 0.3]
    assert data["timestamp"] == ts.isoformat()


def test_user_repr():
    """Test string representation of User."""
    user = User(email="test@example.com", role=UserRole.ADMIN)
    assert repr(user) == "<User test@example.com role=UserRole.ADMIN>"


def test_prompt_template_repr():
    """Test string representation of PromptTemplate."""
    template = PromptTemplate(function_name="analysis", version="1.0", is_active=True)
    assert repr(template) == "<PromptTemplate(function='analysis', version='1.0', active=True)>"


def test_model_assignment_repr():
    """Test string representation of ModelAssignment."""
    assignment = ModelAssignment(function="test_function", ai_model_name="test_model")
    assert repr(assignment) == "<ModelAssignment(function='test_function', model='test_model')>"


def test_emotion_collection_repr():
    """Test string representation of EmotionCollection."""
    collection = EmotionCollection(name="Test Collection", is_default=True)
    assert repr(collection) == "<EmotionCollection(name='Test Collection', default=True)>"


def test_emotion_definition_repr():
    """Test string representation of EmotionDefinition."""
    emotion = EmotionDefinition(emotion_name="Joy", category="Positive")
    assert repr(emotion) == "<EmotionDefinition(name='Joy', category='Positive')>"


def test_emotion_definition_to_dict():
    """Test dictionary conversion of EmotionDefinition."""
    # This covers to_dict which was already covered but good to keep safe
    uid = uuid4()
    col_id = uuid4()
    emotion = EmotionDefinition(
        id=uid,
        collection_id=col_id,
        emotion_name="Joy",
        category="Positive",
        definition="A feeling of great pleasure",
        vac_vector=[0.8, 0.6, 0.7],
        q_constant=[1, 0, 0, 0],
    )

    data = emotion.to_dict()
    assert data["id"] == str(uid)
    assert data["emotion_name"] == "Joy"
    assert data["vac_vector"] == [0.8, 0.6, 0.7]
