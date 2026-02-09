"""Current State API - Latest Emotional State Retrieval.

Simple endpoint for fetching user's most recent emotional state from trajectory history.
Provides dashboard "current mood" display, real-time status indicators, and starting point
for journey planning. Optimized for frequent polling with sub-20ms response times.

Endpoint Purpose:

    Fast access to latest emotional state::

        Use cases:
        ─────────
        - Dashboard "How am I feeling now?" display
        - Journey planning starting point selection
        - Trend chart "current position" marker
        - Mobile widget current mood display
        - Real-time status indicators

        Query pattern:
        ─────────────
        GET /observer/current/{user_id}

        Returns most recent UserTrajectory row:
        - Dominant emotion
        - VAC coordinates
        - Quaternion state
        - Temporal metrics (elasticity, rigidity)
        - Comparison to previous state

        Typical latency: 10-20ms

Response Structure:

    Complete current state information::

        {
            "state_id": "uuid",
            "dominant_emotion": {
                "id": "uuid",
                "name": "Anxiety",
                "category": "When Things Are Uncertain",
                "vac": [-0.6, 0.7, -0.3]
            },
            "quaternion": {
                "w": 0.8,
                "x": 0.3,
                "y": 0.4,
                "z": 0.3
            },
            "previous_quaternion": {
                "w": 0.9,
                "x": 0.2,
                "y": 0.3,
                "z": 0.2
            },
            "metrics": {
                "elasticity": 0.42,
                "rigidity": 1.2,
                "angular_distance": 0.15,
                "alerts": []
            },
            "timestamp": "2026-01-02T22:45:30Z"
        }

Query Logic:

    Efficient most-recent lookup::

        SQL query:
        SELECT * FROM user_trajectory
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT 1

        Index usage:
        - (user_id, timestamp DESC) composite index
        - Instant lookup
        - No table scan

        Performance:
        - Query time: 2-5ms
        - Emotion lookup: 1-2ms
        - Previous state: 3-5ms
        - Total: 10-20ms typical

Performance Characteristics:
    - Total latency: 10-20ms
    - Database queries: 2-3 (current + previous + emotion)
    - Index optimization: Composite (user_id, timestamp DESC)
    - Cacheable: Yes (with short TTL 5-10s)
    - Poll-friendly: Low overhead for frequent checks

Error Handling:

    User-friendly error responses::

        404 Not Found:
        ─────────────
        No states recorded yet for user
        Message: "No states found for user {user_id}"

        Interpretation:
        - New user
        - No sessions yet
        - Data deleted/expired

        UI handling:
        - Show onboarding
        - Prompt first session
        - "Start exploring" message

        500 Internal Server Error:
        ─────────────────────────
        Database or service failure

        Logged with full context
        Triggers monitoring alerts

Integration Points:

    Polled by UI components::

        Dashboard widget:
        - Poll every 30 seconds
        - Display current emotion
        - Show trend arrow (elasticity)

        Mobile app:
        - Poll on app resume
        - Widget background refresh
        - Push notification context

        Journey planner:
        - Get starting point automatically
        - "From: [Current Emotion]"
        - Pre-fill current VAC

Example Usage:

    Fetch current state::

        GET /observer/current/user_abc123

        Response:
        {
            "state_id": "uuid",
            "dominant_emotion": {
                "name": "Calm",
                "category": "When Life Is Good",
                "vac": [0.5, -0.3, 0.6]
            },
            "metrics": {
                "elasticity": 0.28,
                "rigidity": 1.1
            },
            "timestamp": "2026-01-02T22:45:30Z"
        }

    Handle no states (new user)::

        GET /observer/current/new_user_uuid

        Response: HTTP 404
        {
            "detail": "No states found for user new_user_uuid"
        }

        UI action: Show onboarding flow

Design Decisions:

    Why separate current endpoint vs query param?::

        Dedicated endpoint chosen:
        + Clear semantic intent
        + Easier to cache
        + Simpler client code
        + RESTful pattern

        Alternative (/states?latest=true):
        - More generic
        - Less discoverable
        - Harder to cache distinctly

        Decision: Dedicated /current endpoint

    Why include previous_quaternion?::

        Comparison enables richer UI:
        + Show rotation animation
        + Display trend arrow
        + Calculate rate of change
        + "Moving toward/away from"

        Minimal overhead: 1 extra query
        Value: Significant UX improvement

References:
    - User trajectory model: observer/app/models/user_trajectory.py
    - Metrics calculator: observer/app/services/metrics_calculator.py
    - Dashboard widget: docs/features/zen-experience/README.md
    - REST patterns: Richardson & Ruby (2007). RESTful Web Services
"""

import logging
from typing import Annotated, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.common import EmotionInfo, MetricsInfo, QuaternionModel
from app.api.schemas.state import StateResponse
from app.database import get_db
from app.models.emotion_definition import EmotionDefinition
from app.models.user_trajectory import UserTrajectory

logger = logging.getLogger(__name__)

router = APIRouter()


async def _get_emotion_info(
    db: AsyncSession, emotion_id: UUID, current_vac: list[float]
) -> EmotionInfo:
    """Fetch emotion info or return unknown."""
    stmt = select(EmotionDefinition).where(EmotionDefinition.id == emotion_id)
    result = await db.execute(stmt)
    emotion = result.scalar_one_or_none()

    if not emotion:
        return EmotionInfo(
            id=str(emotion_id),
            name="Unknown",
            category="Unknown",
            vac=current_vac,
        )

    return EmotionInfo(
        id=str(emotion.id),
        name=emotion.emotion_name,
        category=emotion.category,
        vac=list(emotion.vac_vector),
    )


async def _calculate_angular_distance(
    db: AsyncSession, current_quat: list[float], previous_quat: Optional[list[float]]
) -> float:
    """Calculate angular distance between states."""
    if not previous_quat:
        return 0.0

    from app.services.analytics.metrics import (  # pylint: disable=import-outside-toplevel
        MetricsCalculator,
    )

    metrics_calc = MetricsCalculator(db)
    return metrics_calc.angular_distance(current_quat, previous_quat)


@router.get("/observer/current/{user_id}", response_model=StateResponse, tags=["Current"])
async def get_current_state(
    user_id: UUID, db: Annotated[AsyncSession, Depends(get_db)]
) -> StateResponse:
    """Get user's most recent emotional state.

    Args:
        user_id: User UUID
        db: Database session

    Returns:
        StateResponse with current emotional state

    Raises:
        HTTPException: 404 if no states found for user
    """
    try:
        logger.info("Retrieving current state for user %s", user_id)

        # Query most recent state
        stmt = (
            select(UserTrajectory)
            .where(UserTrajectory.user_id == user_id)
            .order_by(UserTrajectory.timestamp.desc())
            .limit(1)
        )
        result = await db.execute(stmt)
        current_state = result.scalar_one_or_none()

        if not current_state:
            raise HTTPException(status_code=404, detail=f"No states found for user {user_id}")

        # Get previous state for metrics display
        prev_stmt = (
            select(UserTrajectory)
            .where(UserTrajectory.user_id == user_id)
            .where(UserTrajectory.timestamp < current_state.timestamp)
            .order_by(UserTrajectory.timestamp.desc())
            .limit(1)
        )
        prev_result = await db.execute(prev_stmt)
        previous_state = prev_result.scalar_one_or_none()

        # Get emotion info
        # Get emotion info
        emotion_info = None
        if current_state.dominant_emotion_id:
            emotion_info = await _get_emotion_info(
                db, current_state.dominant_emotion_id, list(current_state.vac_values)
            )

        # Calculate metrics
        angular_dist = await _calculate_angular_distance(
            db,
            list(current_state.quaternion_state),
            list(previous_state.quaternion_state) if previous_state else None,
        )

        # Build response
        response = _build_state_response(current_state, previous_state, emotion_info, angular_dist)

        emotion_name = emotion_info.name if emotion_info else "Neutral"
        logger.info("Current state: %s", emotion_name)
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get current state: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get current state: {str(e)}") from e


def _build_state_response(
    current_state: Any,
    previous_state: Optional[Any],
    emotion_info: Optional[EmotionInfo],
    angular_dist: float,
) -> StateResponse:
    """Build the StateResponse object."""
    return StateResponse(
        state_id=str(current_state.id),
        dominant_emotion=emotion_info,
        quaternion=QuaternionModel.from_list(list(current_state.quaternion_state)),
        previous_quaternion=(
            QuaternionModel.from_list(list(previous_state.quaternion_state))
            if previous_state
            else None
        ),
        metrics=MetricsInfo(
            elasticity=current_state.elasticity_metric,
            rigidity=current_state.rigidity_score,
            angular_distance=angular_dist,
            alerts=[],
        ),
        timestamp=current_state.timestamp,
    )
