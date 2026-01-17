
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime
from app.api.routes import current
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
def mock_state():
    state = MagicMock(spec=UserTrajectory)
    state.id = uuid4()
    state.user_id = uuid4()
    state.timestamp = datetime.now()
    state.dominant_emotion_id = uuid4()
    state.vac_values = [0.1, 0.2, 0.3]
    state.quaternion_state = [1.0, 0.0, 0.0, 0.0]
    state.elasticity_metric = 0.5
    state.rigidity_score = 0.2
    return state

@pytest.fixture
def mock_emotion():
    em = MagicMock(spec=AtlasDefinition)
    em.id = uuid4()
    em.emotion_name = "Joy"
    em.category = "Happiness"
    em.vac_vector = [0.1, 0.2, 0.3]
    return em

@pytest.mark.asyncio
async def test_get_current_state_success_with_history(mock_db, mock_state, mock_emotion):
    """Test successful retrieval with previous state history."""
    # Mock current state
    mock_res_curr = MagicMock()
    mock_res_curr.scalar_one_or_none.return_value = mock_state
    
    # Mock previous state
    prev_state = MagicMock(spec=UserTrajectory)
    prev_state.quaternion_state = [0.9, 0.1, 0.0, 0.0]
    mock_res_prev = MagicMock()
    mock_res_prev.scalar_one_or_none.return_value = prev_state

    # Mock emotion
    mock_res_em = MagicMock()
    mock_res_em.scalar_one_or_none.return_value = mock_emotion

    # Set side effects for sequential DB calls
    # 1. Current state query
    # 2. Previous state query
    # 3. Emotion lookup
    mock_db.execute.side_effect = [mock_res_curr, mock_res_prev, mock_res_em]

    response = await current.get_current_state(mock_state.user_id, db=mock_db)

    assert response.state_id == str(mock_state.id)
    assert response.dominant_emotion.name == "Joy"
    assert response.previous_quaternion is not None
    assert response.metrics.angular_distance > 0

@pytest.mark.asyncio
async def test_get_current_state_no_history(mock_db, mock_state, mock_emotion):
    """Test successful retrieval without previous state (first entry)."""
    mock_res_curr = MagicMock()
    mock_res_curr.scalar_one_or_none.return_value = mock_state
    
    mock_res_prev = MagicMock()
    mock_res_prev.scalar_one_or_none.return_value = None # No previous

    mock_res_em = MagicMock()
    mock_res_em.scalar_one_or_none.return_value = mock_emotion

    mock_db.execute.side_effect = [mock_res_curr, mock_res_prev, mock_res_em]

    response = await current.get_current_state(mock_state.user_id, db=mock_db)

    assert response.previous_quaternion is None
    assert response.metrics.angular_distance == 0.0

@pytest.mark.asyncio
async def test_get_current_state_unknown_emotion(mock_db, mock_state):
    """Test retrieval when dominant emotion ID is not found in Atlas."""
    mock_res_curr = MagicMock()
    mock_res_curr.scalar_one_or_none.return_value = mock_state
    
    mock_res_prev = MagicMock()
    mock_res_prev.scalar_one_or_none.return_value = None

    mock_res_em = MagicMock()
    mock_res_em.scalar_one_or_none.return_value = None # Emotion not found

    mock_db.execute.side_effect = [mock_res_curr, mock_res_prev, mock_res_em]

    response = await current.get_current_state(mock_state.user_id, db=mock_db)

    assert response.dominant_emotion.name == "Unknown"
    assert response.dominant_emotion.category == "Unknown"

@pytest.mark.asyncio
async def test_get_current_state_not_found(mock_db):
    """Test 404 when no states exist for user."""
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        await current.get_current_state(uuid4(), db=mock_db)
    
    assert exc.value.status_code == 404
    assert "No states found" in exc.value.detail

@pytest.mark.asyncio
async def test_get_current_state_db_error(mock_db):
    """Test 500 handling on DB crash."""
    mock_db.execute.side_effect = Exception("DB Crash")

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        await current.get_current_state(uuid4(), db=mock_db)
    
    assert exc.value.status_code == 500
    assert "Failed to get current state" in exc.value.detail
