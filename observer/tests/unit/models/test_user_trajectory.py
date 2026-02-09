from datetime import datetime
from uuid import uuid4

from app.models.user_trajectory import UserTrajectory


def test_user_trajectory_to_dict():
    """Test to_dict() method for UserTrajectory."""
    ut = UserTrajectory(
        id=uuid4(),
        user_id=uuid4(),
        session_id=uuid4(),
        timestamp=datetime.now(),
        input_transcription="test",
        vac_values=[0, 0, 0],
        quaternion_state=[1, 0, 0, 0],
        elasticity_metric=0.1,
        rigidity_score=0.1,
    )
    assert isinstance(ut.to_dict(), dict)
