from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.api.routes import current
from app.models.user_trajectory import UserTrajectory


@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    return mock_db


@pytest.fixture
def mock_state_no_emotion():
    state = MagicMock(spec=UserTrajectory)
    state.id = uuid4()
    state.user_id = uuid4()
    state.timestamp = datetime.now()
    state.dominant_emotion_id = None  # Crucial for coverage
    state.vac_values = [0.1, 0.2, 0.3]
    state.quaternion_state = [1.0, 0.0, 0.0, 0.0]
    state.elasticity_metric = 0.5
    state.rigidity_score = 0.2
    return state


@pytest.mark.asyncio
async def test_get_current_state_no_dominant_emotion(mock_db, mock_state_no_emotion):
    """Test retrieval when dominant emotion ID is None."""
    # Mock current state
    mock_res_curr = MagicMock()
    mock_res_curr.scalar_one_or_none.return_value = mock_state_no_emotion

    # Mock previous state (None for simplicity)
    mock_res_prev = MagicMock()
    mock_res_prev.scalar_one_or_none.return_value = None

    # We expect 2 DB calls: current state, previous state.
    # Emotion lookup skipped because ID is None.
    mock_db.execute.side_effect = [mock_res_curr, mock_res_prev]

    response = await current.get_current_state(mock_state_no_emotion.user_id, db=mock_db)

    assert response.dominant_emotion is None
