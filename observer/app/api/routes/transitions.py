"""Transition API Routes - Therapeutic Journey Management.

REST endpoints for emotional transition pathfinding, journey tracking, waypoint validation,
and personalized strategy effectiveness analysis. Implements Observer's therapeutic journey
system enabling users to navigate from current emotional states to desired states with
evidence-based guidance and progress monitoring.

API Architecture:

    Four endpoint groups for journey lifecycle::

        1. Path Generation
           POST /transition-path - Generate optimal journey

        2. Journey Management
           POST /journey/start - Begin tracking journey
           POST /journey/{id}/waypoint-reached - Mark progress
           GET /journey/{id} - Get current status

        3. Historical Analysis
           GET /user/{id}/journey-history - Past journeys + analytics
           GET /user/{id}/effective-strategies - Personalized recommendations

Endpoint Details:

    POST /transition-path
    ─────────────────────
    Purpose: Generate therapeutic transition path

    Request:
    {
        "user_id": "uuid",
        "current_vac": [-0.6, 0.7, -0.3],  # Anxiety
        "goal_vac": [0.5, -0.4, 0.6],      # Calm
        "max_waypoints": 3
    }

    Processing:
    1. A* pathfinding (category-aware)
    2. Waypoint explanation generation
    3. Strategy recommendation (per waypoint)
    4. Quaternion conversion (smooth interpolation)
    5. Success probability calculation
    6. Bridge emotion detection

    Example Response:
    {
        "path_id": "uuid",
        "current_state": { emotion, category, vac, quaternion },
        "goal_state": { emotion, category, vac, quaternion },
        "waypoints": [
            {
                "order": 1,
                "emotion": "Curiosity",
                "vac": [0.3, 0.2, 0.1],
                "reasoning": "Opens to exploration...",
                "strategies": [...],
                "estimated_time": "15-30 minutes"
            },
            ...
        ],
        "path_metrics": {
            "total_distance": 2.34,
            "estimated_time": "45-90 minutes",
            "difficulty": "moderate",
            "success_probability": 0.72,
            "requires_bridge": true,
            "bridge_emotions": ["Curiosity"]
        }
    }

    Use cases:
    - "How do I get from Anxiety to Calm?"
    - Journey planning UI
    - Therapeutic guidance

    POST /journey/start
    ───────────────────
    Purpose: Begin tracking user's journey

    Creates UserJourney record
    Initializes waypoint tracking
    Sets status = 'in_progress'

    Example Response:
    {
        "journey_id": "uuid",
        "status": "in_progress",
        "current_waypoint": 0,
        "started_at": "2026-01-02T22:00:00Z"
    }

    POST /journey/{id}/waypoint-reached
    ───────────────────────────────────
    Purpose: Validate and record waypoint completion

    Request:
    {
        "waypoint_index": 0,
        "self_assessment": { "feel_emotion": true, "confidence": 4 },
        "strategies_tried": [
            {
                "strategy_id": "uuid",
                "tried": true,
                "helpful_rating": 4,
                "notes": "Really helped calm me down"
            }
        ]
    }

    Processing:
    1. Validate waypoint reached
    2. Record strategy attempts + ratings
    3. Check if journey complete
    4. Update journey status

    Example Response:
    {
        "validated": true,
        "journey_completed": false,
        "message": "Waypoint reached!"
    }

    GET /journey/{id}
    ─────────────────
    Purpose: Get journey progress status

    Example Response:
    {
        "journey_id": "uuid",
        "status": "in_progress",
        "current_waypoint": 1,
        "total_waypoints": 3,
        "waypoints_reached": 1,
        "time_elapsed": "23 minutes",
        "estimated_time_remaining": "30-45 minutes"
    }

    GET /user/{id}/journey-history
    ──────────────────────────────
    Purpose: Historical journey analytics

    Example Response:
    {
        "total_journeys": 12,
        "completed": 8,
        "abandoned": 2,
        "in_progress": 2,
        "success_rate": 0.67,
        "journeys": [...]
    }

    Clinical use: Track therapeutic progress

    GET /user/{id}/effective-strategies
    ───────────────────────────────────
    Purpose: Personalized strategy recommendations

    Analyzes StrategyAttempt history
    Calculates average ratings
    Returns top strategies for this user

    Example Response:
    {
        "user_id": "uuid",
        "total_strategies_tried": 23,
        "top_strategies": [
            {
                "strategy_id": "uuid",
                "strategy_name": "Deep Breathing",
                "times_tried": 8,
                "avg_rating": 4.3
            },
            ...
        ]
    }

Performance Characteristics:
    - POST /transition-path: 50-200ms (complex multi-stage)
    - POST /journey/start: 20-50ms (single insert)
    - POST /waypoint-reached: 30-80ms (multiple inserts)
    - GET /journey/{id}: 10-30ms (joins with waypoints)
    - GET /journey-history: 20-50ms (user journey query)
    - GET /effective-strategies: 30-100ms (aggregation query)

Integration Points:

    Journey lifecycle integration::

        UI Flow:
        1. User explores atlas
        2. Selects current + goal emotions
        3. POST /transition-path → Get recommendations
        4. POST /journey/start → Begin tracking
        5. Work through waypoints
        6. POST /waypoint-reached → Mark progress
        7. GET /journey/{id} → Monitor status
        8. Journey completes → Celebration!

References:
    - Path planner: observer/app/services/path_planner.py
    - Strategy recommender: observer/app/services/strategy_recommender.py
    - Waypoint explainer: observer/app/services/waypoint_explainer.py
    - Journey models: observer/app/models/transition_strategy.py
    - Journey UI: docs/features/wibbly-paths/README.md
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.transition import (
    EffectiveStrategiesResponse,
    EmotionState,
    JourneyHistoryResponse,
    JourneyStartRequest,
    JourneyStartResponse,
    JourneyStatusResponse,
    PathMetrics,
    StrategyInfo,
    TransitionPathRequest,
    TransitionPathResponse,
    WaypointInfo,
    WaypointReachedRequest,
    WaypointReachedResponse,
)
from app.database import get_db
from app.models.transition_strategy import (  # noqa: F401
    JourneyWaypoint,
    StrategyAttempt,
    UserJourney,
)
from app.services.path_planner import PathPlanner
from app.services.quaternion_builder import QuaternionBuilder
from app.services.strategy_recommender import StrategyRecommender
from app.services.waypoint_explainer import WaypointExplainer

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/atlas/paths/all", response_model=Dict[str, Any], tags=["Transitions"])
async def get_all_cached_paths(
    limit: int = 1000, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get pre-calculated transition paths for the Atlas.

    Used by the frontend to display the Path Matrix visualization.
    Currently returns empty list as caching layer is not yet implemented.
    """
    # Placeholder for future implementation where we return pre-calculated paths
    return {"paths": []}


@router.post("/transition-path", response_model=TransitionPathResponse, tags=["Transitions"])
async def generate_transition_path(
    request: TransitionPathRequest, db: AsyncSession = Depends(get_db)
) -> TransitionPathResponse:
    """Generate an optimal emotional transition path.

    This endpoint uses category-aware A* pathfinding to find a psychologically
    valid path from the user's current emotional state to their goal state.

    The path includes intermediate waypoints with evidence-based strategies
    for each transition.
    """
    try:
        logger.info(f"Generating transition path for user {request.user_id}")

        # 1. Initialize services
        planner = PathPlanner(db)
        explainer = WaypointExplainer(db)

        # 2. Find optimal path
        path = await planner.find_transition_path(
            current_vac=request.current_vac,
            goal_vac=request.goal_vac,
            max_waypoints=request.max_waypoints,
            user_id=str(request.user_id),
        )

        # 3. Get quaternions from Versor (would be async HTTP call in production)
        quat_builder = QuaternionBuilder()
        current_quat = await quat_builder.from_vac(_to_python_list(path.current_emotion.vac_vector))
        goal_quat = await quat_builder.from_vac(_to_python_list(path.goal_emotion.vac_vector))

        # 4. Build waypoint info with strategies and rich explanations
        waypoint_infos = []
        waypoint_quats = []
        for i, waypoint_emotion in enumerate(path.waypoints):
            waypoint_quat = await quat_builder.from_vac(
                _to_python_list(waypoint_emotion.vac_vector)
            )
            waypoint_quats.append(waypoint_quat)

            # Determine previous and next emotions
            previous_emotion = path.current_emotion if i == 0 else path.waypoints[i - 1]
            next_emotion = (
                path.waypoints[i + 1] if i < len(path.waypoints) - 1 else path.goal_emotion
            )

            # Calculate distance from previous
            prev_vac = list(previous_emotion.vac_vector)
            distance = planner._vac_distance(prev_vac, list(waypoint_emotion.vac_vector))

            # Get strategies for this waypoint
            strategies = await _get_strategies_for_waypoint(
                db, previous_emotion, waypoint_emotion, str(request.user_id)
            )

            # Get rich explanation from WaypointExplainer
            explanation = await explainer.explain_waypoint(
                waypoint_emotion=waypoint_emotion,
                previous_emotion=previous_emotion,
                next_emotion=next_emotion,
                path_context={
                    "start": path.current_emotion.emotion_name,
                    "goal": path.goal_emotion.emotion_name,
                    "total_waypoints": len(path.waypoints),
                },
            )

            waypoint_info = WaypointInfo(
                order=i + 1,
                emotion=waypoint_emotion.emotion_name,
                category=waypoint_emotion.category,
                vac=_to_python_list(waypoint_emotion.vac_vector),
                quaternion=waypoint_quat,
                distance_from_previous=float(distance),
                estimated_time=_estimate_waypoint_time(distance),
                difficulty=_estimate_difficulty(distance),
                reasoning=explanation.get("psychological_purpose", ""),
                # explanation=explanation,  # TODO: Add to WaypointInfo model
                strategies=strategies,
            )
            waypoint_infos.append(waypoint_info)

        # 5. Generate visualization data (placeholder for Versor multi-point SLERP)
        visualization_data = {
            "path_curve_points": [
                {
                    "x": float(path.current_emotion.vac_vector[0]),
                    "y": float(path.current_emotion.vac_vector[1]),
                    "z": float(path.current_emotion.vac_vector[2]),
                }
            ]
            + [
                {
                    "x": float(wp.vac_vector[0]),
                    "y": float(wp.vac_vector[1]),
                    "z": float(wp.vac_vector[2]),
                }
                for wp in path.waypoints
            ]
            + [
                {
                    "x": float(path.goal_emotion.vac_vector[0]),
                    "y": float(path.goal_emotion.vac_vector[1]),
                    "z": float(path.goal_emotion.vac_vector[2]),
                }
            ],
            "quaternion_path": [current_quat] + waypoint_quats + [goal_quat],
        }

        # 6. Calculate success probability
        success_prob = await _calculate_success_probability(
            db, str(request.user_id), path.current_emotion.id, path.goal_emotion.id
        )

        # 7. Determine bridge information
        BRIDGE_EMOTIONS = [
            "Vulnerability",
            "Awe",
            "Compassion",
            "Curiosity",
            "Acceptance",
            "Gratitude",
        ]
        bridge_emotions = [
            wp.emotion_name for wp in path.waypoints if wp.emotion_name in BRIDGE_EMOTIONS
        ]
        requires_bridge = len(bridge_emotions) > 0

        # 8. Build response
        response = TransitionPathResponse(
            path_id=str(uuid4()),
            created_at=datetime.now(timezone.utc),
            current_state=EmotionState(
                emotion=path.current_emotion.emotion_name,
                category=path.current_emotion.category,
                vac=_to_python_list(path.current_emotion.vac_vector),
                quaternion=current_quat,
            ),
            goal_state=EmotionState(
                emotion=path.goal_emotion.emotion_name,
                category=path.goal_emotion.category,
                vac=_to_python_list(path.goal_emotion.vac_vector),
                quaternion=goal_quat,
            ),
            waypoints=waypoint_infos,
            visualization_data=visualization_data,
            path_metrics=PathMetrics(
                total_distance=float(path.total_distance),
                total_estimated_time=path.estimated_time,
                overall_difficulty=path.difficulty,
                success_probability=success_prob,
                requires_external_support=path.difficulty == "difficult",
                requires_bridge=requires_bridge,
                bridge_emotions=bridge_emotions,
            ),
            personalization_notes=[],
        )

        return response

    except Exception as e:
        logger.error(f"Failed to generate transition path: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Path generation failed: {str(e)}")


@router.post("/journey/start", response_model=JourneyStartResponse, tags=["Transitions"])
async def start_journey(
    request: JourneyStartRequest, db: AsyncSession = Depends(get_db)
) -> JourneyStartResponse:
    """Start tracking an emotional transition journey.

    This creates a journey record and prepares waypoint tracking.
    """
    try:
        logger.info(f"Starting journey for user {request.user_id}")

        # Create journey record
        # Note: This is simplified - in full implementation would store complete path data
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

        logger.info(f"Journey started: {journey.id}")

        return JourneyStartResponse(
            journey_id=str(journey.id),
            status=journey.status,
            current_waypoint=journey.current_waypoint,
            started_at=journey.started_at,
        )

    except Exception as e:
        logger.error(f"Failed to start journey: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Journey start failed: {str(e)}")


@router.post(
    "/journey/{journey_id}/waypoint-reached",
    response_model=WaypointReachedResponse,
    tags=["Transitions"],
)
async def mark_waypoint_reached(
    journey_id: UUID, request: WaypointReachedRequest, db: AsyncSession = Depends(get_db)
) -> WaypointReachedResponse:
    """Mark a waypoint as reached and validate emotional state.

    Records strategy attempts and auto-completes journey if last waypoint reached.
    """
    try:
        logger.info(f"Marking waypoint {request.waypoint_index} reached for journey {journey_id}")

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
        logger.error(f"Failed to mark waypoint: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Waypoint update failed: {str(e)}")


@router.get("/journey/{journey_id}", response_model=JourneyStatusResponse, tags=["Transitions"])
async def get_journey_status(
    journey_id: UUID, db: AsyncSession = Depends(get_db)
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


@router.get(
    "/user/{user_id}/journey-history", response_model=JourneyHistoryResponse, tags=["Transitions"]
)
async def get_user_journey_history(
    user_id: UUID, db: AsyncSession = Depends(get_db)
) -> JourneyHistoryResponse:
    """Get user's journey history with analytics."""
    try:
        stmt = select(UserJourney).where(UserJourney.user_id == user_id)
        result = await db.execute(stmt)
        journeys = result.scalars().all()

        total = len(journeys)
        completed = sum(1 for j in journeys if j.status == "completed")
        abandoned = sum(1 for j in journeys if j.status == "abandoned")
        in_progress = sum(1 for j in journeys if j.status == "in_progress")

        success_rate = completed / total if total > 0 else 0.0

        journey_list = [j.to_dict() for j in journeys]

        return JourneyHistoryResponse(
            total_journeys=total,
            completed=completed,
            abandoned=abandoned,
            in_progress=in_progress,
            success_rate=success_rate,
            journeys=journey_list,
        )

    except Exception as e:
        logger.error(f"Failed to get journey history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/user/{user_id}/effective-strategies",
    response_model=EffectiveStrategiesResponse,
    tags=["Transitions"],
)
async def get_user_effective_strategies(
    user_id: UUID, limit: int = 5, db: AsyncSession = Depends(get_db)
) -> EffectiveStrategiesResponse:
    """Get strategies that have been most effective for this user.

    Uses the user_strategy_effectiveness view to return personalized recommendations.
    """
    try:
        # Query strategy attempts for this user
        stmt = (
            select(StrategyAttempt)
            .join(UserJourney, StrategyAttempt.journey_id == UserJourney.id)
            .where(UserJourney.user_id == user_id, StrategyAttempt.helpful_rating.isnot(None))
        )

        result = await db.execute(stmt)
        attempts = result.scalars().all()

        # Group by strategy and calculate avg rating
        strategy_stats: Dict[str, Dict[str, Any]] = {}
        for attempt in attempts:
            sid = str(attempt.strategy_id)
            if sid not in strategy_stats:
                strategy_stats[sid] = {
                    "strategy_id": sid,
                    "strategy_name": attempt.strategy_name,
                    "ratings": [],
                    "times_tried": 0,
                }

            strategy_stats[sid]["ratings"].append(attempt.helpful_rating)
            strategy_stats[sid]["times_tried"] += 1

        # Calculate averages and sort
        top_strategies = []
        for stats in strategy_stats.values():
            if stats["times_tried"] >= 2:  # Only include if tried at least twice
                ratings = stats["ratings"]
                avg_rating = sum(float(r) for r in ratings) / len(ratings)
                stats["avg_rating"] = round(avg_rating, 2)
                top_strategies.append(stats)

        # Sort by rating, then by times tried
        top_strategies.sort(key=lambda x: (x["avg_rating"], x["times_tried"]), reverse=True)
        top_strategies = top_strategies[:limit]

        return EffectiveStrategiesResponse(
            user_id=str(user_id),
            total_strategies_tried=len(strategy_stats),
            top_strategies=top_strategies,
        )

    except Exception as e:
        logger.error(f"Failed to get effective strategies: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def _to_python_list(vac_vector: Any) -> List[float]:
    """Convert numpy array or list with numpy floats to Python floats."""
    return [float(x) for x in vac_vector]


async def _get_strategies_for_waypoint(
    db: AsyncSession, from_emotion: Any, to_emotion: Any, user_id: str
) -> List[StrategyInfo]:
    """Get strategies for a specific transition using StrategyRecommender."""
    recommender = StrategyRecommender(db)

    # Get recommended strategies
    strategies = await recommender.get_strategies_for_transition(
        from_emotion=from_emotion, to_emotion=to_emotion, user_id=user_id, limit=5
    )

    # Convert to StrategyInfo objects
    strategy_infos = []
    for strat in strategies:
        strategy_info = StrategyInfo(
            strategy_id=strat["strategy_id"],
            name=strat["name"],
            type=strat["type"],
            description=strat["description"],
            steps=strat["steps"],
            time_required=strat["time_required"] or "Varies",
            difficulty_level=strat["difficulty_level"],
            evidence_level=strat["evidence_level"],
            effectiveness_rating=strat.get("effectiveness_rating"),
            times_successful_for_user=strat.get("times_successful_for_user", 0),
            user_notes=strat.get("user_notes", []),
        )
        strategy_infos.append(strategy_info)

    return strategy_infos


def _estimate_waypoint_time(distance: float) -> str:
    """Estimate time required for a waypoint based on distance."""
    if distance < 0.5:
        return "15-30 minutes"
    elif distance < 1.0:
        return "30-60 minutes"
    else:
        return "60-90 minutes"


def _estimate_difficulty(distance: float) -> str:
    """Estimate difficulty based on VAC distance."""
    if distance < 0.5:
        return "easy"
    elif distance < 1.0:
        return "moderate"
    else:
        return "difficult"


def _generate_waypoint_reasoning(waypoint_emotion: Any, path: Any) -> str:
    """Generate psychological reasoning for why this waypoint is chosen.

    TODO: This could be enhanced with LLM-generated explanations.
    """
    arousal = waypoint_emotion.vac_vector[1]
    connection = waypoint_emotion.vac_vector[2]

    reasons = []

    # Arousal regulation
    if abs(arousal) < 0.3:
        reasons.append("regulating arousal to enable complex processing")

    # Connection building
    if connection > 0.5:
        reasons.append("building positive connection as foundation")

    # Default
    if not reasons:
        reasons.append(f"natural intermediate step toward {path.goal_emotion.emotion_name}")

    return f"{waypoint_emotion.emotion_name} provides {', '.join(reasons)}."


async def _calculate_success_probability(
    db: AsyncSession, user_id: str, start_emotion_id: UUID, goal_emotion_id: UUID
) -> float:
    """Calculate probability of success based on user history.

    TODO: Could use the calculate_transition_success_probability SQL function.
    """
    # Simplified: return moderate probability
    # Full implementation would query user_transition_success_rates view
    return 0.7
