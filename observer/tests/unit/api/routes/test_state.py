
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime, timezone
from fastapi import HTTPException, Request

from app.api.routes import state
from app.api.schemas.state import StateInput
from app.api.schemas.common import VACVector
from app.models.user_trajectory import UserTrajectory
from app.models.atlas_definition import AtlasDefinition

@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=MagicMock())
    # SQLAlchemy add/delete are synchronous on the session object
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.rollback = AsyncMock()
    mock_db.refresh = AsyncMock()
    return mock_db

@pytest.fixture
def test_user_id():
    return uuid4()

@pytest.fixture
def mock_input(test_user_id):
    return StateInput(
        user_id=test_user_id,
        session_id=uuid4(),
        input_text="I feel anxious",
        vac_scalars=VACVector(valence=-0.5, arousal=0.7, connection=-0.3),
        confidence=0.9,
        timestamp=datetime.now(timezone.utc)
    )

@pytest.fixture
def mock_user(test_user_id):
    user = MagicMock()
    user.id = test_user_id
    user.email = "test@example.com"
    return user

@pytest.fixture
def mock_deps():
    with patch("app.api.routes.state.get_embedding_service") as mock_get_es, \
         patch("app.api.routes.state.EmotionMapper") as MockMapper, \
         patch("app.api.routes.state.get_quaternion_builder") as mock_get_qb, \
         patch("app.api.routes.state.MetricsCalculator") as MockMetricsCalc, \
         patch("app.api.routes.state.manager") as mock_ws_manager:
        
        # 1. Embedding
        mock_es = MagicMock()
        mock_es.generate_embedding = AsyncMock(return_value=[0.1]*384)
        mock_get_es.return_value = mock_es
        
        # 2. Mapper
        mock_em = MagicMock()
        mock_em.find_nearest = AsyncMock(return_value=AtlasDefinition(
            id=uuid4(), emotion_name="Anxiety", category="Fear", vac_vector=[-0.5, 0.7, -0.3]
        ))
        MockMapper.return_value = mock_em
        
        # 3. Quaternion
        mock_qb = MagicMock()
        mock_qb.from_vac = AsyncMock(return_value=[0, 1, 0, 0])
        mock_get_qb.return_value = mock_qb
        
        # 4. Metrics
        mock_mc = MockMetricsCalc.return_value
        mock_mc.calculate_elasticity.return_value = 0.5
        mock_mc.calculate_rigidity = AsyncMock(return_value=1.5)
        # Assuming private method calls are handled or we mock public wrapper if exists.
        # Logic uses private _angular_distance directly?
        # Line 344: metrics_calculator._angular_distance(...)
        # We need to mock that if we can, or just let it run if it's simple math.
        # But MetricsCalculator is mocked, so we must mock the method.
        mock_mc._angular_distance.return_value = 0.2
        
        mock_mc.detect_flooding.return_value = False
        mock_mc.detect_stuckness.return_value = False
        
        # 5. WS
        mock_ws_manager.send_state_update = AsyncMock()
        
        yield {
            "es": mock_es,
            "em": mock_em,
            "qb": mock_qb,
            "mc": mock_mc,
            "ws": mock_ws_manager
        }

@pytest.mark.asyncio
async def test_record_state_success_no_previous(mock_db, mock_input, mock_deps, mock_user):
    """Test standard flow with no previous state."""
    # Mock DB previous state lookup -> None
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res
    
    req = MagicMock()
    resp = await state.record_state(req, mock_input, db=mock_db, current_user=mock_user)
    
    assert resp.dominant_emotion.name == "Anxiety"
    assert resp.previous_quaternion is None
    assert resp.metrics.elasticity == 0.0 # Default when no prev
    
    # Verify persistence
    mock_db.add.assert_called_once()
    mock_db.commit.assert_awaited_once()
    mock_deps["ws"].send_state_update.assert_awaited_once()

@pytest.mark.asyncio
async def test_record_state_with_previous(mock_db, mock_input, mock_deps, mock_user):
    """Test flow with previous state enabling metrics."""
    # Mock previous state
    prev = MagicMock(spec=UserTrajectory)
    prev.timestamp = mock_input.timestamp  # avoid delta issue, handled by mock calc
    # Wait, delta_time calculation: timestamp - prev.timestamp
    # If same, delta 0.
    prev.quaternion_state = [0, 0, 0, 1]
    
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = prev
    mock_db.execute.return_value = mock_res
    
    req = MagicMock()
    resp = await state.record_state(req, mock_input, db=mock_db, current_user=mock_user)
    
    assert resp.previous_quaternion is not None
    # Elasticity comes from mock_mc (0.5)
    assert resp.metrics.elasticity == 0.5
    mock_deps["mc"].calculate_elasticity.assert_called()

@pytest.mark.asyncio
async def test_record_state_alerts(mock_db, mock_input, mock_deps, mock_user):
    """Test that alerts are added to response."""
    # Setup metrics to trigger alerts
    mock_deps["mc"].detect_flooding.return_value = True
    mock_deps["mc"].detect_stuckness.return_value = True
    
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res
    
    req = MagicMock()
    resp = await state.record_state(req, mock_input, db=mock_db, current_user=mock_user)
    
    assert "flooding" in resp.metrics.alerts
    assert "stuckness" in resp.metrics.alerts

@pytest.mark.asyncio
async def test_record_state_ws_failure(mock_db, mock_input, mock_deps, mock_user):
    """Test WebSocket failure is caught and logged."""
    mock_deps["ws"].send_state_update.side_effect = Exception("WS Error")
    
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res
    
    req = MagicMock()
    # Should NOT raise exception
    resp = await state.record_state(req, mock_input, db=mock_db, current_user=mock_user)
    
    assert resp.dominant_emotion.name == "Anxiety"

@pytest.mark.asyncio
async def test_record_state_exception(mock_db, mock_input, mock_deps, mock_user):
    """Test general exception triggers 500 and rollback."""
    mock_db.commit.side_effect = Exception("DB Crash")
    
    req = MagicMock()
    with pytest.raises(HTTPException) as exc:
        await state.record_state(req, mock_input, db=mock_db, current_user=mock_user)
    
    assert exc.value.status_code == 500
    mock_db.rollback.assert_awaited_once()

@pytest.mark.asyncio
async def test_record_state_auth_failure(mock_db, mock_input, mock_deps):
    """Test 403 when recording state for another user."""
    # User ID mismatch
    wrong_user = MagicMock()
    wrong_user.id = uuid4() 
    
    req = MagicMock()
    
    with pytest.raises(HTTPException) as exc:
        await state.record_state(req, mock_input, db=mock_db, current_user=wrong_user)
    
    assert exc.value.status_code == 403
    assert "Not authorized" in exc.value.detail
