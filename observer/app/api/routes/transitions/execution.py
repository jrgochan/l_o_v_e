import logging
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.transition import (
    JourneyStartRequest,
    JourneyStartResponse,
    JourneyStatusResponse,
    WaypointReachedRequest,
    WaypointReachedResponse,
)
from app.database import get_db
from app.models.transition_strategy import JourneyWaypoint, StrategyAttempt, UserJourney

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/journey/start", response_model=JourneyStartResponse)
async def start_journey(
    request: JourneyStartRequest, db: Annotated[AsyncSession, Depends(get_db)]
) -> JourneyStartResponse:
    """Start tracking an emotional transition journey."""
    try:
        logger.info("Starting journey for user %s", request.user_id)

        # Create journey record
        journey = UserJourney(
            user_id=request.user_id,
            path_id=request.path_id,
            start_vac=[0, 0, 0],  # Would come from path data
            goal_vac=[0, 0, 0],  # Would come from path data
            waypoints={},  # Would store full path
            status="in_progress",
            started_at=(request.start_time or datetime.now(timezone.utc)).replace(tzinfo=None),
            context_metadata=request.context,
        )

        db.add(journey)
        await db.commit()
        await db.refresh(journey)

        logger.info("Journey started: %s", journey.id)

        return JourneyStartResponse(
            journey_id=str(journey.id),
            status=journey.status,
            current_waypoint=journey.current_waypoint,
            started_at=journey.started_at,
        )

    except Exception as e:
        logger.error("Failed to start journey: %s", e, exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Journey start failed: {str(e)}") from e


@router.post("/journey/{journey_id}/waypoint-reached", response_model=WaypointReachedResponse)
async def mark_waypoint_reached(
    journey_id: UUID,
    request: WaypointReachedRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WaypointReachedResponse:
    """Mark a waypoint as reached and validate emotional state."""
    try:
        logger.info(
            "Marking waypoint %s reached for journey %s",
            request.waypoint_index,
            journey_id,
        )

        # 1. Get journey
        stmt = select(UserJourney).where(UserJourney.id == journey_id)
        result = await db.execute(stmt)
        journey = result.scalar_one_or_none()

        if not journey:
            raise HTTPException(status_code=404, detail="Journey not found")

        # 2. Get waypoint
        waypoint_query_stmt = select(JourneyWaypoint).where(
            JourneyWaypoint.journey_id == journey_id,
            JourneyWaypoint.waypoint_index == request.waypoint_index,
        )
        waypoint_result = await db.execute(waypoint_query_stmt)
        waypoint = waypoint_result.scalar_one_or_none()

        if not waypoint:
            raise HTTPException(status_code=404, detail="Waypoint not found")

        # 3. Mark as reached
        waypoint.reached = True
        waypoint.reached_at = (request.reached_at or datetime.now(timezone.utc)).replace(
            tzinfo=None
        )
        waypoint.self_assessment = request.self_assessment

        # 4. Record strategy attempts
        for strategy_attempt in request.strategies_tried:
            attempt = StrategyAttempt(
                journey_id=journey_id,
                waypoint_index=request.waypoint_index,
                strategy_id=UUID(strategy_attempt["strategy_id"]),
                strategy_name=strategy_attempt.get("name", "Unknown"),
                tried=1 if strategy_attempt.get("tried", True) else 0,
                helpful_rating=strategy_attempt.get("helpful_rating"),
                time_spent=strategy_attempt.get("time_spent"),
                user_notes=strategy_attempt.get("notes"),
                completed=1 if strategy_attempt.get("completed", False) else 0,
            )
            db.add(attempt)

        await db.commit()

        # 5. Check if journey is complete
        all_waypoints_stmt = select(JourneyWaypoint).where(JourneyWaypoint.journey_id == journey_id)
        check_result = await db.execute(all_waypoints_stmt)
        all_waypoints = check_result.scalars().all()

        all_reached = all(bool(wp.reached) for wp in all_waypoints)

        if all_reached:
            journey.status = "completed"
            journey.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
            await db.commit()

        # 6. Build response
        return WaypointReachedResponse(
            validated=True,
            current_vac=[0, 0, 0],  # Would validate against actual VAC
            distance_to_waypoint=0.0,  # Would calculate
            journey_completed=all_reached,
            message="Waypoint reached!" if not all_reached else "Journey complete! 🎉",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to mark waypoint: %s", e, exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Waypoint update failed: {str(e)}") from e


@router.get("/journey/{journey_id}", response_model=JourneyStatusResponse)
async def get_journey_status(
    journey_id: UUID, db: Annotated[AsyncSession, Depends(get_db)]
) -> JourneyStatusResponse:
    """Get current status of a journey."""
    try:
        stmt = select(UserJourney).where(UserJourney.id == journey_id)
        result = await db.execute(stmt)
        journey = result.scalar_one_or_none()

        if not journey:
            raise HTTPException(status_code=404, detail="Journey not found")

        # Get waypoints
        waypoint_stmt = select(JourneyWaypoint).where(JourneyWaypoint.journey_id == journey_id)
        waypoint_result = await db.execute(waypoint_stmt)
        waypoints = waypoint_result.scalars().all()

        waypoints_reached = sum(1 for wp in waypoints if wp.reached)

        # Calculate time elapsed
        if journey.started_at:
            elapsed = datetime.now(timezone.utc) - journey.started_at
            time_elapsed = f"{int(elapsed.total_seconds() // 60)} minutes"
        else:
            time_elapsed = "0 minutes"

        return JourneyStatusResponse(
            journey_id=str(journey.id),
            user_id=str(journey.user_id),
            status=journey.status,
            current_waypoint=journey.current_waypoint,
            total_waypoints=len(waypoints),
            waypoints_reached=waypoints_reached,
            started_at=journey.started_at,
            time_elapsed=time_elapsed,
            estimated_time_remaining=journey.estimated_time or "Unknown",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get journey status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
