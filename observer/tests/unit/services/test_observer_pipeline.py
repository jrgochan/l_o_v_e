from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.api.schemas.common import VACVector
from app.api.schemas.state import StateInput
from app.models.emotion_definition import EmotionDefinition
from app.services.observer.pipeline import StateProcessingPipeline, StateProcessingResult


@pytest.mark.asyncio
async def test_process_state_flow():
    """Test the complete state processing flow."""
    # Mock database session
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()

    # Mock external services using patch
    with (
        patch("app.services.observer.pipeline.get_embedding_service") as mock_get_embed,
        patch("app.services.observer.pipeline.EmotionMapper") as MockMapper,
        patch("app.services.observer.pipeline.get_quaternion_builder") as mock_get_quat,
        patch("app.services.observer.pipeline.MetricsCalculator") as MockCalc,
        patch("app.services.observer.pipeline.manager") as mock_manager,
    ):

        # Setup Mocks

        # 1. Embedding Service
        mock_embed_service = AsyncMock()
        mock_embed_service.generate_embedding.return_value = [0.1] * 384
        mock_get_embed.return_value = mock_embed_service

        # 2. Emotion Mapper
        mock_mapper_instance = AsyncMock()
        mock_emotion = MagicMock(spec=EmotionDefinition)
        mock_emotion.id = uuid4()
        mock_emotion.emotion_name = "Joy"
        mock_emotion.category = "Positive"
        mock_emotion.vac_vector = [0.8, 0.6, 0.4]
        mock_mapper_instance.find_nearest.return_value = mock_emotion
        MockMapper.return_value = mock_mapper_instance

        # 3. Quaternion Builder
        mock_quat_builder = AsyncMock()
        mock_quat_builder.from_vac.return_value = [0.1, 0.2, 0.3, 0.4]
        mock_get_quat.return_value = mock_quat_builder

        # 4. Metrics Calculator
        mock_calc_instance = MockCalc.return_value
        mock_calc_instance.calculate_elasticity.return_value = 0.5
        mock_calc_instance.angular_distance.return_value = 0.2
        mock_calc_instance.calculate_rigidity.return_value = 1.0  # coroutine
        # Fix rigidity to be awaitable if it's async in pipeline
        # In pipeline: rigidity = await metrics_calculator.calculate_rigidity(...)
        mock_calc_instance.calculate_rigidity = AsyncMock(return_value=1.0)

        mock_calc_instance.detect_flooding.return_value = False
        mock_calc_instance.detect_stuckness.return_value = False

        # 5. Database execution (fetching previous state)
        # pipeline calls: result = await db.execute(stmt) -> result.scalar_one_or_none()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None  # No previous state
        mock_db.execute.return_value = mock_result

        # 6. Manager
        mock_manager.send_state_update = AsyncMock()

        # Input Data
        user_id = uuid4()
        input_data = StateInput(
            user_id=user_id,
            session_id=uuid4(),
            vac_scalars=VACVector(valence=0.8, arousal=0.6, connection=0.4),
            input_text="I feel great",
        )

        # Execute
        pipeline = StateProcessingPipeline(mock_db)
        result = await pipeline.process_state(user_id, input_data)

        # Assertions
        assert isinstance(result, StateProcessingResult)
        assert result.nearest_emotion == mock_emotion
        assert result.quaternion_list == [0.1, 0.2, 0.3, 0.4]
        assert result.metrics.elasticity == 0.0  # First state

        # Verify persistence
        assert mock_db.add.called
        assert mock_db.commit.called
        assert mock_db.refresh.called

        # Verify broadcast
        mock_manager.send_state_update.assert_called_once()
