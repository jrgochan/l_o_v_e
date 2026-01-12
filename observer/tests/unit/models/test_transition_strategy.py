
import pytest
from uuid import uuid4
from app.models.transition_strategy import StrategyAttempt

def test_strategy_attempt_to_dict():
    """Test to_dict() method for StrategyAttempt."""
    sa = StrategyAttempt(id=uuid4(), journey_id=uuid4(), waypoint_index=0, strategy_id=uuid4(), strategy_name="test")
    assert isinstance(sa.to_dict(), dict)
