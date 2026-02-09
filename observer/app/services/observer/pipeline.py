"""State Processing Pipeline.

Orchestrates the enrichment, analysis, and persistence of emotional state data.
Encapsulates the 8-stage process originally in the state route handler.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.state import StateInput
from app.api.sockets.manager import manager
from app.models.user_trajectory import UserTrajectory
from app.services import EmotionMapper, MetricsCalculator, get_embedding_service
from app.services.emotions.mapper import MapperQuery
from app.services.math.quaternion_builder import get_quaternion_builder

logger = logging.getLogger(__name__)


@dataclass
class StateMetricsResult:
    """Encapsulates calculated state metrics."""

    elasticity: float
    rigidity: float
    angular_distance: float
    alerts: List[str]
    previous_quat_list: Optional[List[float]] = None
    previous_state_id: Optional[UUID] = None


@dataclass
class StateProcessingResult:
    """Encapsulates the results of the state processing pipeline."""

    timestamp: datetime
    vac_list: List[float]
    quaternion_list: List[float]
    text_embedding: List[float]
    nearest_emotion: Any  # EmotionDefinition
    metrics: StateMetricsResult
    persisted_state: UserTrajectory


class StateProcessingPipeline:
    """Orchestrates the processing of emotional state data."""

    def __init__(self, db: AsyncSession):
        """Initialize pipeline with database session."""
        self.db = db

    async def process_state(self, user_id: UUID, input_data: StateInput) -> StateProcessingResult:
        """Execute the full state processing pipeline.

        Args:
            user_id: The ID of the user recording usage.
            input_data: The raw input data.

        Returns:
            StateProcessingResult containing all derived data and the persisted record.
        """
        logger.info("Starting state processing for user %s", user_id)

        # 0. timestamp setup
        timestamp = input_data.timestamp or datetime.now(timezone.utc)
        vac_list = [
            input_data.vac_scalars.valence,
            input_data.vac_scalars.arousal,
            input_data.vac_scalars.connection,
        ]

        # 1. & 2. Process embedding and emotion
        text_embedding, _, nearest_emotion = await _process_emotion_analysis(
            self.db, input_data.input_text, vac_list
        )

        logger.info("Nearest emotion: %s", nearest_emotion.emotion_name)

        # 3. Convert VAC to quaternion
        quaternion_builder = get_quaternion_builder()
        quaternion_list = await quaternion_builder.from_vac(vac_list)

        # 4. & 5. Calculate metrics
        metrics_result = await _calculate_metrics_state(
            self.db,
            user_id,
            quaternion_list,
            timestamp,
            vac_list[0],
        )

        logger.info(
            "Metrics: E=%.2f, R=%.2f, alerts=%s",
            metrics_result.elasticity,
            metrics_result.rigidity,
            metrics_result.alerts,
        )

        # 6. Persist new state
        # Create result object WITHOUT persisted state first (circular dependency resolution)
        # Actually we can just create the object directly

        # Prepare persistence
        new_state = UserTrajectory(
            user_id=user_id,
            session_id=input_data.session_id,
            timestamp=timestamp,
            input_transcription=input_data.input_text,
            input_embedding=text_embedding,
            vac_values=vac_list,
            quaternion_state=quaternion_list,
            dominant_emotion_id=nearest_emotion.id,
            elasticity_metric=metrics_result.elasticity,
            rigidity_score=metrics_result.rigidity,
            context_metadata={},
        )

        self.db.add(new_state)
        await self.db.commit()
        await self.db.refresh(new_state)

        logger.info("State persisted: %s", new_state.id)

        result = StateProcessingResult(
            timestamp=timestamp,
            vac_list=vac_list,
            quaternion_list=quaternion_list,
            text_embedding=text_embedding,
            nearest_emotion=nearest_emotion,
            metrics=metrics_result,
            persisted_state=new_state,
        )

        # 8. Broadcast to WebSocket clients (non-blocking)
        await self._broadcast_state(str(user_id), new_state, result)

        return result

    async def _broadcast_state(
        self,
        user_id: str,
        new_state: UserTrajectory,
        result: StateProcessingResult,
    ) -> None:
        """Broadcast state update via WebSocket."""
        try:
            await manager.send_state_update(
                user_id=user_id,
                state_data={
                    "state_id": str(new_state.id),
                    "emotion": {
                        "name": result.nearest_emotion.emotion_name,
                        "category": result.nearest_emotion.category,
                        "vac": result.vac_list,
                    },
                    "quaternion": result.quaternion_list,
                    "metrics": {
                        "elasticity": result.metrics.elasticity,
                        "rigidity": result.metrics.rigidity,
                        "angular_distance": result.metrics.angular_distance,
                        "alerts": result.metrics.alerts,
                    },
                },
            )
            logger.info("Broadcast state update via WebSocket for user %s", user_id)
        except Exception as ws_error:  # pylint: disable=broad-exception-caught
            logger.warning("Failed to broadcast WebSocket update: %s", ws_error)


# --------------------------------------------------------------------------
# Helper Functions (Extracted from route)
# --------------------------------------------------------------------------


async def _process_emotion_analysis(
    db: AsyncSession, input_text: str, vac_list: List[float]
) -> tuple[List[float], int, Any]:
    """Generate embedding and find nearest emotion."""
    # 1. Generate semantic embedding
    embedding_service = get_embedding_service()
    if embedding_service:
        text_embedding = await embedding_service.generate_embedding(input_text)
    else:
        # Fallback if service not available (e.g. tests)
        text_embedding = [0.0] * 384

    word_count = len(input_text.split())

    # 2. Find nearest emotion
    emotion_mapper = EmotionMapper(db)
    query = MapperQuery(vac_values=vac_list, text_embedding=text_embedding, word_count=word_count)
    nearest_emotion = await emotion_mapper.find_nearest(query)

    return text_embedding, word_count, nearest_emotion


async def _calculate_metrics_state(  # pylint: disable=too-many-locals
    db: AsyncSession,
    user_id: UUID,
    quaternion_list: List[float],
    timestamp: datetime,
    vac_valence: float,
) -> StateMetricsResult:
    """Calculate temporal metrics and detect alerts."""
    # 4. Get previous state for metrics
    stmt = (
        select(UserTrajectory)
        .where(UserTrajectory.user_id == user_id)
        .order_by(UserTrajectory.timestamp.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    previous_state = result.scalar_one_or_none()

    # 5. Calculate metrics
    metrics_calculator = MetricsCalculator(db)

    previous_quat_list = None
    if previous_state:
        delta_time = (timestamp - previous_state.timestamp).total_seconds()
        # Ensure float list
        if isinstance(previous_state.quaternion_state, list):
            previous_quat_list = [float(x) for x in previous_state.quaternion_state]
        else:
            previous_quat_list = []  # Should handle this better in real app

        elasticity = metrics_calculator.calculate_elasticity(
            quaternion_list, previous_quat_list, delta_time
        )

        angular_distance = metrics_calculator.angular_distance(quaternion_list, previous_quat_list)
    else:
        elasticity = 0.0
        angular_distance = 0.0

    # Calculate rigidity (rolling window)
    rigidity = await metrics_calculator.calculate_rigidity(str(user_id), window_size=10)

    # Detect alerts
    alerts = []
    if metrics_calculator.detect_flooding(elasticity):
        alerts.append("flooding")
    if metrics_calculator.detect_stuckness(rigidity, vac_valence):
        alerts.append("stuckness")

    return StateMetricsResult(
        elasticity=elasticity,
        rigidity=rigidity,
        angular_distance=angular_distance,
        alerts=alerts,
        previous_quat_list=previous_quat_list,
        previous_state_id=previous_state.id if previous_state else None,
    )
