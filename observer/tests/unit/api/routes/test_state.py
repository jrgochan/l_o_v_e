from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.routes import state
from app.api.schemas.common import VACVector
from app.api.schemas.state import StateInput
from app.models.emotion_definition import EmotionDefinition
from app.services.observer.pipeline import StateMetricsResult


@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=MagicMock())
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
        timestamp=datetime.now(),
    )


@pytest.fixture
def mock_user(test_user_id):
    user = MagicMock()
    user.id = test_user_id
    user.email = "test@example.com"
    return user


@pytest.fixture
def mock_pipeline_result():
    # Use MagicMock to avoid class structure mismatches
    result = MagicMock()

    # Setup nested objects
    nearest_emotion = MagicMock(spec=EmotionDefinition)
    nearest_emotion.id = uuid4()
    nearest_emotion.emotion_name = "Anxiety"
    nearest_emotion.category = "Fear"
    nearest_emotion.vac_vector = [-0.5, 0.7, -0.3]
    result.nearest_emotion = nearest_emotion

    metrics = StateMetricsResult(
        elasticity=0.5,
        rigidity=1.5,
        angular_distance=0.2,
        alerts=[],
        previous_quat_list=None,
    )
    result.metrics = metrics

    result.timestamp = datetime.now()
    result.vac_list = [-0.5, 0.7, -0.3]
    result.quaternion_list = [0, 1, 0, 0]
    result.text_embedding = [0.1] * 384

    # Persisted state needs ID
    result.persisted_state = MagicMock()
    result.persisted_state.id = uuid4()

    return result


@pytest.mark.asyncio
async def test_record_state_success_no_previous(
    mock_db, mock_input, mock_user, mock_pipeline_result
):
    """Test standard flow with no previous state."""
    # Mock StateProcessingPipeline
    with patch("app.api.routes.state.StateProcessingPipeline") as MockPipeline:
        pipeline_instance = MockPipeline.return_value
        # Add persisted_state to the result as it's expected by the route
        mock_pipeline_result.persisted_state = MagicMock(id=uuid4())
        # FIX: Use AsyncMock for async method
        pipeline_instance.process_state = AsyncMock(return_value=mock_pipeline_result)

        req = MagicMock()
        resp = await state.record_state(req, mock_input, db=mock_db, current_user=mock_user)

        assert resp.dominant_emotion.name == "Anxiety"
        assert resp.previous_quaternion is None
        assert resp.metrics.elasticity == 0.5

        # Verify pipeline was called correctly
        MockPipeline.assert_called_with(mock_db)
        pipeline_instance.process_state.assert_awaited_with(mock_user.id, mock_input)


@pytest.mark.asyncio
async def test_record_state_with_previous(mock_db, mock_input, mock_user, mock_pipeline_result):
    """Test flow with previous state."""
    with patch("app.api.routes.state.StateProcessingPipeline") as MockPipeline:
        pipeline_instance = MockPipeline.return_value

        # Modify result to have previous quaternion
        mock_pipeline_result.metrics.previous_quat_list = [0, 0, 0, 1]
        mock_pipeline_result.persisted_state = MagicMock(id=uuid4())
        # FIX: Use AsyncMock
        pipeline_instance.process_state = AsyncMock(return_value=mock_pipeline_result)

        req = MagicMock()
        resp = await state.record_state(req, mock_input, db=mock_db, current_user=mock_user)

        assert resp.previous_quaternion is not None
        assert resp.previous_quaternion.w == 0
        assert resp.previous_quaternion.z == 1


@pytest.mark.asyncio
async def test_record_state_alerts(mock_db, mock_input, mock_user, mock_pipeline_result):
    """Test that alerts are added to response."""
    with patch("app.api.routes.state.StateProcessingPipeline") as MockPipeline:
        pipeline_instance = MockPipeline.return_value

        mock_pipeline_result.metrics.alerts = ["flooding", "stuckness"]
        mock_pipeline_result.persisted_state = MagicMock(id=uuid4())
        # FIX: Use AsyncMock
        pipeline_instance.process_state = AsyncMock(return_value=mock_pipeline_result)

        req = MagicMock()
        resp = await state.record_state(req, mock_input, db=mock_db, current_user=mock_user)

        assert "flooding" in resp.metrics.alerts
        assert "stuckness" in resp.metrics.alerts


@pytest.mark.asyncio
async def test_record_state_exception(mock_db, mock_input, mock_user):
    """Test general exception triggers 500 and rollback."""
    with patch("app.api.routes.state.StateProcessingPipeline") as MockPipeline:
        pipeline_instance = MockPipeline.return_value
        # FIX: AsyncMock side_effect
        pipeline_instance.process_state = AsyncMock(side_effect=Exception("Pipeline Crash"))

        req = MagicMock()
        with pytest.raises(HTTPException) as exc:
            await state.record_state(req, mock_input, db=mock_db, current_user=mock_user)

        assert exc.value.status_code == 500
        mock_db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_record_state_auth_failure(mock_db, mock_input):
    """Test 403 when recording state for another user."""
    wrong_user = MagicMock()
    wrong_user.id = uuid4()

    req = MagicMock()

    with pytest.raises(HTTPException) as exc:
        await state.record_state(req, mock_input, db=mock_db, current_user=wrong_user)

    assert exc.value.status_code == 403
    assert "Not authorized" in exc.value.detail
