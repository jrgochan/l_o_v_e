from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.api.schemas.common import VACVector
from app.api.schemas.state import StateInput
from app.models.user_trajectory import UserTrajectory
from app.services.observer.pipeline import (
    StateProcessingPipeline,
    _calculate_metrics_state,
    _process_emotion_analysis,
)


@pytest.fixture
def mock_db():
    session = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    # Mock execute for _calculate_metrics_state previous state query
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None  # Default no previous state
    session.execute.return_value = mock_result
    return session


@pytest.fixture
def pipeline(mock_db):
    return StateProcessingPipeline(mock_db)


@pytest.fixture
def sample_input():
    return StateInput(
        user_id=uuid4(),
        input_text="I am happy",
        timestamp=datetime.now(timezone.utc),
        session_id=uuid4(),
        vac_scalars=VACVector(valence=0.8, arousal=0.5, connection=0.6),
    )


@pytest.mark.asyncio
async def test_process_state_embedding_service_none(pipeline, sample_input, mock_db):
    """Test fallback when get_embedding_service returns None (Line 194)."""
    with patch("app.services.observer.pipeline.get_embedding_service", return_value=None):
        with patch("app.services.observer.pipeline.EmotionMapper") as MockMapper:
            # Mock mapper finding an emotion
            mapper_instance = MockMapper.return_value
            mock_emotion = MagicMock()
            mock_emotion.emotion_name = "Joy"
            mock_emotion.id = uuid4()
            mapper_instance.find_nearest = AsyncMock(return_value=mock_emotion)

            # Mock quaternion builder
            with patch("app.services.observer.pipeline.get_quaternion_builder") as MockBuilder:
                builder_instance = MockBuilder.return_value
                builder_instance.from_vac = AsyncMock(return_value=[0.1, 0.2, 0.3, 0.4])

                # Mock metrics to avoid complexity
                with patch(
                    "app.services.observer.pipeline._calculate_metrics_state",
                    new_callable=AsyncMock,
                ) as mock_metrics:
                    mock_metrics.return_value = MagicMock(
                        elasticity=0.5, rigidity=0.2, angular_distance=0.1, alerts=[]
                    )

                    # Mock broadcast to avoid side effects
                    with patch(
                        "app.services.observer.pipeline.manager.send_state_update",
                        new_callable=AsyncMock,
                    ):
                        result = await pipeline.process_state(uuid4(), sample_input)

                        # Verify fallback embedding was used (all zeros)
                        assert result.text_embedding == [0.0] * 384


@pytest.mark.asyncio
async def test_broadcast_exception_handling(pipeline):
    """Test exception handling in _broadcast_state (Lines 175-176)."""
    from app.api.sockets.manager import manager

    # Setup inputs
    user_id = str(uuid4())
    new_state = MagicMock()
    # Mock result object structure expected by _broadcast_state
    result = MagicMock()
    result.nearest_emotion.emotion_name = "Joy"
    result.nearest_emotion.category = "Category"
    result.vac_list = [0.1, 0.2, 0.3]
    result.quaternion_list = [0.1, 0.2, 0.3, 0.4]
    result.metrics.elasticity = 0.5
    result.metrics.rigidity = 0.5
    result.metrics.angular_distance = 0.5
    result.metrics.alerts = []

    # Manual patch to ensure AsyncMock
    original_method = manager.send_state_update
    manager.send_state_update = AsyncMock(side_effect=Exception("WS Fail"))

    try:
        # Call private method directly
        await pipeline._broadcast_state(user_id, new_state, result)
        # Should catch exception and log warning, not raise
    finally:
        manager.send_state_update = original_method


@pytest.mark.asyncio
async def test_calculate_metrics_invalid_quaternion_state(mock_db):
    """Test metrics calculation when previous state has invalid quaternion (Line 236)."""
    user_id = uuid4()

    # Mock previous state with non-list quaternion_state
    mock_prev_state = MagicMock(spec=UserTrajectory)
    mock_prev_state.timestamp = datetime.now(timezone.utc)
    mock_prev_state.quaternion_state = None  # Not a list
    mock_prev_state.id = uuid4()

    # Mock db execution result
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_prev_state
    mock_db.execute.return_value = mock_result

    # Mock MetricsCalculator
    with patch("app.services.observer.pipeline.MetricsCalculator") as MockCalculator:
        calc_instance = MockCalculator.return_value
        calc_instance.calculate_elasticity.return_value = 0.5
        calc_instance.angular_distance.return_value = 0.5
        calc_instance.calculate_rigidity = AsyncMock(return_value=0.2)
        calc_instance.detect_flooding.return_value = False
        calc_instance.detect_stuckness.return_value = False

        # Run calculation
        result = await _calculate_metrics_state(
            mock_db, user_id, [0.1, 0.2, 0.3, 0.4], datetime.now(timezone.utc), 0.5
        )

        # Verify empty list was used for previous quaternion (implied by valid calculation not crashing)
        # and previous_quat_list in result is empty list
        assert result.previous_quat_list == []


@pytest.mark.asyncio
async def test_calculate_metrics_with_previous_state_and_alerts(mock_db):
    """Test metrics calculation with previous state and alerts (Lines 231-242, 253, 255)."""
    user_id = uuid4()
    current_quat = [0.1, 0.2, 0.3, 0.4]
    timestamp = datetime.now(timezone.utc)
    valence = 0.8

    # Mock previous state in DB
    prev_state = MagicMock(spec=UserTrajectory)
    prev_state.timestamp = datetime.now(timezone.utc)  # Close enough for small delta
    prev_state.quaternion_state = [0.0, 0.0, 0.0, 1.0]  # Valid list
    prev_state.id = uuid4()

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = prev_state
    mock_db.execute.return_value = mock_result

    # Mock MetricsCalculator methods
    with patch("app.services.observer.pipeline.MetricsCalculator") as MockCalculator:
        calc_instance = MockCalculator.return_value
        calc_instance.calculate_elasticity.return_value = 0.8
        calc_instance.calculate_rigidity = AsyncMock(return_value=0.9)  # High rigidity
        calc_instance.angular_distance.return_value = 0.5

        # Force alerts
        calc_instance.detect_flooding.return_value = True
        calc_instance.detect_stuckness.return_value = True

        result = await _calculate_metrics_state(mock_db, user_id, current_quat, timestamp, valence)

        # Verify metrics calls used previous state
        args, _ = calc_instance.calculate_elasticity.call_args
        assert args[1] == [0.0, 0.0, 0.0, 1.0]  # previous_quat_list passed

        # Verify alerts
        assert "flooding" in result.alerts
        assert "stuckness" in result.alerts


@pytest.mark.asyncio
async def test_calculate_metrics_no_previous_state(mock_db):
    """Test metrics calculation with no previous state (Lines 244-245)."""
    user_id = uuid4()

    # Mock no previous state
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    with patch("app.services.observer.pipeline.MetricsCalculator") as MockCalculator:
        calc_instance = MockCalculator.return_value
        calc_instance.calculate_rigidity = AsyncMock(return_value=0.1)
        calc_instance.detect_flooding.return_value = False
        calc_instance.detect_stuckness.return_value = False

        result = await _calculate_metrics_state(
            mock_db, user_id, [0.1, 0.2, 0.3, 0.4], datetime.now(timezone.utc), 0.5
        )

        assert result.elasticity == 0.0
        assert result.angular_distance == 0.0


@pytest.mark.asyncio
async def test_process_emotion_analysis_with_service(mock_db):
    """Test emotion analysis with valid embedding service (Line 191)."""
    with patch("app.services.observer.pipeline.get_embedding_service") as mock_get_service:
        mock_service = AsyncMock()
        mock_service.generate_embedding.return_value = [0.1] * 384
        mock_get_service.return_value = mock_service

        with patch("app.services.observer.pipeline.EmotionMapper") as MockMapper:
            mapper_instance = MockMapper.return_value
            mock_emotion = MagicMock()
            mapper_instance.find_nearest = AsyncMock(return_value=mock_emotion)

            embedding, count, _ = await _process_emotion_analysis(
                mock_db, "test text", [0.1, 0.2, 0.3]
            )

            assert embedding == [0.1] * 384
            assert count == 2
