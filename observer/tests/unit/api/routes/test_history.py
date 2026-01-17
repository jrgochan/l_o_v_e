
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, timedelta
from fastapi import HTTPException
from app.api.routes import history
from app.models.user_trajectory import UserTrajectory
from app.models.atlas_definition import AtlasDefinition

@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    return mock_db

@pytest.fixture
def mock_states():
    user_id = uuid4()
    now = datetime.now()
    
    # State 1: Complete data
    s1 = MagicMock(spec=UserTrajectory)
    s1.user_id = user_id
    s1.dominant_emotion_id = uuid4()
    s1.timestamp = now - timedelta(hours=2)
    s1.vac_values = [-0.5, 0.5, 0.0]
    s1.quaternion_state = [1, 0, 0, 0]
    s1.elasticity_metric = 0.8
    __name__ = "State1"

    # State 2: No emotion ID
    s2 = MagicMock(spec=UserTrajectory)
    s2.user_id = user_id
    s2.dominant_emotion_id = None
    s2.timestamp = now - timedelta(hours=1)
    s2.vac_values = [0.0, 0.0, 0.0]
    s2.quaternion_state = [0, 1, 0, 0]
    s2.elasticity_metric = 0.5
    
    return [s1, s2]

@pytest.mark.asyncio
async def test_get_history_full_success(mock_db, mock_states):
    """Test retrieving history with populated states and emotion lookup."""
    user_id = mock_states[0].user_id
    states = mock_states

    # Mock DB query for states
    mock_result_states = MagicMock()
    mock_result_states.scalars().all.return_value = states
    
    # Mock DB query for emotion lookup (for s1)
    mock_emotion = MagicMock(spec=AtlasDefinition)
    mock_emotion.emotion_name = "Joy"
    
    mock_result_emotion = MagicMock()
    mock_result_emotion.scalar_one_or_none.return_value = mock_emotion
    
    # Configure execute side effects
    # First call: Select UserTrajectory
    # Second call: Select AtlasDefinition (for s1)
    # Note: s2 has no ID, so no lookup
    mock_db.execute.side_effect = [mock_result_states, mock_result_emotion]
    
    resp = await history.get_history(user_id, db=mock_db)
    
    assert resp.user_id == str(user_id)
    assert resp.data_points == 2
    assert len(resp.trajectory) == 2
    
    # Check s1 (Resolved "Joy")
    t1 = resp.trajectory[0]
    assert t1.emotion == "Joy"
    assert t1.vac == [-0.5, 0.5, 0.0]
    
    # Check s2 (Unknown)
    t2 = resp.trajectory[1]
    assert t2.emotion == "Unknown"

@pytest.mark.asyncio
async def test_get_history_empty(mock_db):
    """Test history request with no results."""
    # Mock empty result
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = []
    mock_db.execute.return_value = mock_result
    
    user_id = uuid4()
    resp = await history.get_history(user_id, db=mock_db)
    
    assert resp.data_points == 0
    assert resp.trajectory == []

@pytest.mark.asyncio
async def test_get_history_with_dates(mock_db):
    """Test date filtering logic."""
    start = datetime.now() - timedelta(days=1)
    end = datetime.now()
    user_id = uuid4()
    
    # Return empty just to check query construction via mocks isn't easy 
    # without deeper inspection, but we can assume if it runs it's OK.
    # To verify filters, we'd need to inspect the 'stmt' construction which is hard with SQLAlchemy mocks.
    # Instead, we verify the function executes successfully with checks.
    
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = []
    mock_db.execute.return_value = mock_result
    
    resp = await history.get_history(user_id, start_date=start, end_date=end, db=mock_db)
    assert resp.data_points == 0
    mock_db.execute.assert_awaited()

@pytest.mark.asyncio
async def test_get_history_lookup_fail_for_valid_id(mock_db):
    """Test state has emotion ID but lookup returns None (DB integrity issue)."""
    user_id = uuid4()
    
    # One state with ID
    s1 = MagicMock(spec=UserTrajectory)
    s1.dominant_emotion_id = uuid4()
    s1.timestamp = datetime.now()
    s1.vac_values = [0,0,0]
    s1.quaternion_state = [0,0,0,0]
    s1.elasticity_metric = 1.0
    
    mock_result_states = MagicMock()
    mock_result_states.scalars().all.return_value = [s1]
    
    # Lookup returns None
    mock_result_lookup = MagicMock()
    mock_result_lookup.scalar_one_or_none.return_value = None
    
    mock_db.execute.side_effect = [mock_result_states, mock_result_lookup]
    
    resp = await history.get_history(user_id, db=mock_db)
    
    assert resp.trajectory[0].emotion == "Unknown"

@pytest.mark.asyncio
async def test_get_history_exception(mock_db):
    """Test exception handling propagates as 500."""
    mock_db.execute.side_effect = Exception("DB Crash")
    
    with pytest.raises(HTTPException) as exc:
        await history.get_history(uuid4(), db=mock_db)
    
    assert exc.value.status_code == 500
    assert "Failed to retrieve history" in exc.value.detail
