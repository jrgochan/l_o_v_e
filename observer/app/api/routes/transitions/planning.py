"""Journey Planning API.

Core engine for generating, analyzing, and explaining emotional transition paths.
Integrates the `PathPlanner`, `QuaternionBuilder`, and `WaypointExplainer` services
to create valid therapeutic trajectories through the 3D VAC space.
"""

import logging
from datetime import datetime, timezone
from typing import Annotated, Any, Dict, List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.transition import (
    EmotionState,
    PathMetrics,
    StrategyInfo,
    TransitionPathRequest,
    TransitionPathResponse,
    WaypointInfo,
)
from app.database import get_db
from app.models.emotion_definition import EmotionDefinition
from app.services.math.quaternion_builder import QuaternionBuilder
from app.services.planning import PathPlanner
from app.services.planning.types import PathFindingContext
from app.services.planning.waypoint_explainer import WaypointExplainer
from app.services.recommendation.strategies import StrategyRecommender

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/atlas/paths/all", response_model=Dict[str, Any])
async def get_all_cached_paths(
    _db: Annotated[AsyncSession, Depends(get_db)],
    _limit: int = 1000,
) -> Dict[str, Any]:
    """Retrieve pre-calculated transition paths for the Emotional Atlas visualization.

    Args:
        _db: Database session.
        _limit: Max paths to return.

    Returns:
        Dict: Collection of cached paths.
    """
    # Placeholder for future implementation where we return pre-calculated paths
    return {"paths": []}


@router.post("/transition-path", response_model=TransitionPathResponse)
async def generate_transition_path(
    request: TransitionPathRequest, db: Annotated[AsyncSession, Depends(get_db)]
) -> TransitionPathResponse:
    """Generate an optimal emotional transition path between two states.

    Orchestrates the entire pathfinding pipeline:
    1. Calculates optimal route using A* on the emotion graph.
    2. Generates quaternions for 3D rotation visualization.
    3. Explains each waypoint using psychological theory.
    4. Selects appropriate therapeutic strategies for each step.
    5. Identifies necessary "Bridge Emotions" for difficult transitions.

    Args:
        request: Source/Goal emotions and constraints.
        db: Database session.

    Returns:
        TransitionPathResponse: Full path with visualization data and strategies.
    """
    try:
        logger.info("Generating transition path for user %s", request.user_id)

        # 1. Initialize services
        planner = PathPlanner(db)
        explainer = WaypointExplainer(db)

        # 2. Find optimal path
        path = await planner.find_transition_path(
            PathFindingContext(
                current_vac=request.current_vac,
                goal_vac=request.goal_vac,
                max_waypoints=request.max_waypoints,
                user_id=str(request.user_id),
            )
        )

        # 3. Get quaternions from Versor (would be async HTTP call in production)
        # 3. Get quaternions from Versor
        quat_builder = QuaternionBuilder()
        current_quat = await quat_builder.from_vac(_to_python_list(path.current_emotion.vac_vector))
        goal_quat = await quat_builder.from_vac(_to_python_list(path.goal_emotion.vac_vector))

        # 4. Build waypoint info
        services = {
            "planner": planner,
            "explainer": explainer,
            "quat_builder": quat_builder,
        }
        waypoint_infos, waypoint_quats = await _build_waypoint_infos(
            db, services, path, str(request.user_id)
        )

        # 5. Generate visualization data
        # 5. Generate visualization data
        quaternions = {
            "current": current_quat,
            "goal": goal_quat,
            "waypoints": waypoint_quats,
        }
        visualization_data = _generate_visualization_data(path, quaternions)

        # 6. Calculate success probability
        success_prob = await _calculate_success_probability(
            db, str(request.user_id), path.current_emotion.id, path.goal_emotion.id
        )
        # 8. Build response
        return TransitionPathResponse(
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
                requires_bridge=any(
                    wp.emotion_name in ["Vulnerability", "Awe", "Compassion", "Curiosity"]
                    for wp in path.waypoints
                ),
                bridge_emotions=[
                    wp.emotion_name
                    for wp in path.waypoints
                    if wp.emotion_name in ["Vulnerability", "Awe", "Compassion", "Curiosity"]
                ],
            ),
            personalization_notes=[],
            search_metadata=path.search_metadata,
        )

    except Exception as e:
        logger.error("Failed to generate transition path: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Path generation failed: {str(e)}") from e


@router.get("/transition-path/explain", response_model=Dict[str, Any])
async def explain_transition_path(
    from_emotion_id: UUID,
    to_emotion_id: UUID,
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    max_waypoints: int = 3,
) -> Dict[str, Any]:
    """Generate a human-readable explanation of a potential transition.

    Useful for "Preview" features where the user wants to understand *why*
    a certain path is recommended before committing to it.

    Args:
        from_emotion_id: Starting emotion UUID.
        to_emotion_id: Goal emotion UUID.
        user_id: User UUID.
        db: Database session.
        max_waypoints: Complexity limit.

    Returns:
        Dict: Structured explanation with steps, total time, and difficulty.
    """
    try:
        # 1. Look up emotions to get VAC vectors
        stmt = select(EmotionDefinition).where(
            EmotionDefinition.id.in_([from_emotion_id, to_emotion_id])
        )
        result = await db.execute(stmt)
        emotions = {e.id: e for e in result.scalars().all()}

        if from_emotion_id not in emotions or to_emotion_id not in emotions:
            raise HTTPException(status_code=404, detail="Emotion not found")

        start_emotion = emotions[from_emotion_id]
        goal_emotion = emotions[to_emotion_id]

        # 2. Run path planner
        # 2. Run path planner
        planner = PathPlanner(db)
        path_context = PathFindingContext(
            current_vac=_to_python_list(start_emotion.vac_vector),
            goal_vac=_to_python_list(goal_emotion.vac_vector),
            max_waypoints=max_waypoints,
            user_id=str(user_id),
        )
        path = await planner.find_transition_path(path_context)

        # 3. Generate explanation
        explanations = await planner.explain_path(path, str(user_id))

        return {
            "path_summary": (
                f"Path from {start_emotion.emotion_name} to {goal_emotion.emotion_name}"
            ),
            "steps": explanations,
            "total_steps": len(explanations),
            "estimated_time": path.estimated_time,
            "difficulty": path.difficulty,
            "path_metrics": {
                "requires_bridge": any(s.get("is_bridge", False) for s in explanations),
                "bridge_emotions": [
                    s["to_emotion"] for s in explanations if s.get("is_bridge", False)
                ],
                "total_distance": float(path.total_distance),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to explain path: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Path explanation failed: {str(e)}") from e


@router.post("/transition-path/alternatives", response_model=Dict[str, Any])
async def find_alternative_paths(
    request: TransitionPathRequest, db: Annotated[AsyncSession, Depends(get_db)]
) -> Dict[str, Any]:
    """Generate multiple potential transition paths (Primary + Alternatives).

    Allows the user to choose between different routes based on difficulty,
    duration, or bridge emotions.

    Args:
        request: Path constraints.
        db: Database session.

    Returns:
        Dict: A collection of categorized paths.
    """
    try:
        logger.info("Finding alternative paths for user %s", request.user_id)
        planner = PathPlanner(db)

        # 2. Find all candidate paths
        # 2. Find all candidate paths
        path_context = PathFindingContext(
            current_vac=request.current_vac,
            goal_vac=request.goal_vac,
            max_waypoints=request.max_waypoints or 5,
            user_id=str(request.user_id),
        )
        paths = await planner.find_alternative_paths(path_context)

        # 3. Format paths for response
        formatted_paths = []

        for _, path in enumerate(paths):
            # Basic metrics
            explanation = await planner.explain_path(path, str(request.user_id))

            # Identify primary characteristics
            is_bridge = any(step.get("is_bridge") for step in explanation)
            bridge_emotions = [step["to_emotion"] for step in explanation if step.get("is_bridge")]

            formatted_path = {
                "path_id": str(uuid4()),  # ephemeral ID for selection
                "current_state": {
                    "emotion_id": str(path.current_emotion.id),
                    "emotion": path.current_emotion.emotion_name,
                    "category": path.current_emotion.category,
                    "vac": _to_python_list(path.current_emotion.vac_vector),
                },
                "goal_state": {
                    "emotion_id": str(path.goal_emotion.id),
                    "emotion": path.goal_emotion.emotion_name,
                    "category": path.goal_emotion.category,
                    "vac": _to_python_list(path.goal_emotion.vac_vector),
                },
                "waypoints": [
                    {
                        "order": i + 1,
                        "emotion_id": str(wp.id),
                        "emotion": wp.emotion_name,
                        "category": wp.category,
                        "vac": _to_python_list(wp.vac_vector),
                        # Simple reasoning for list view
                        "reasoning": next(
                            (
                                s["summary"]
                                for s in explanation
                                if s["to_emotion"] == wp.emotion_name
                            ),
                            "Transition step",
                        ),
                        "difficulty": (
                            _estimate_difficulty(explanation[i]["vac_change"]["distance"])
                            if i < len(explanation)
                            else "moderate"
                        ),
                        "estimated_time": (
                            _estimate_waypoint_time(explanation[i]["vac_change"]["distance"])
                            if i < len(explanation)
                            else "15 mins"
                        ),
                    }
                    for i, wp in enumerate(path.waypoints)
                ],
                "path_metrics": {
                    "total_distance": float(path.total_distance),
                    "estimated_time": path.estimated_time,
                    "difficulty": path.difficulty,
                    "requires_bridge": is_bridge,
                    "bridge_emotions": bridge_emotions,
                    "step_count": len(path.waypoints),
                },
                "steps": explanation,
                "search_metadata": path.search_metadata,
            }
            formatted_paths.append(formatted_path)

        return {"count": len(formatted_paths), "paths": formatted_paths}

    except Exception as e:
        logger.error("Failed to find alternative paths: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Alternative path search failed: {str(e)}"
        ) from e


@router.get("/transition-path/alternatives/{current_emotion_id}", response_model=Dict[str, Any])
async def get_step_alternatives(
    current_emotion_id: str,
    goal_emotion_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 5,
) -> Dict[str, Any]:
    """Get valid alternative next steps from a specific emotion context.

    Used when a user wants to diverge from the recommended path at a specific
    waypoint.

    Args:
        current_emotion_id: Current emotional state UUID.
        goal_emotion_id: Ultimate goal UUID.
        db: Database session.
        limit: Max alternatives.

    Returns:
        Dict: List of valid next-hop emotions.
    """
    try:
        planner = PathPlanner(db)

        candidates = await planner.get_valid_next_steps(current_emotion_id, goal_emotion_id)

        # Format response
        formatted = []
        for emotion in candidates[:limit]:
            formatted.append(
                {
                    "id": str(emotion.id),
                    "name": emotion.emotion_name,
                    "category": emotion.category,
                    "vac": _to_python_list(emotion.vac_vector),
                    "description": emotion.definition,
                    # Simple heuristic reasoning
                    "reasoning": "Valid therapeutic transition",
                }
            )

        return {
            "current_id": current_emotion_id,
            "goal_id": goal_emotion_id,
            "alternatives": formatted,
        }

    except Exception as e:
        logger.error("Failed to get step alternatives: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def _to_python_list(vac_vector: Any) -> List[float]:
    """Convert numpy array or list with numpy floats to Python floats."""
    return [float(x) for x in vac_vector]


async def _create_waypoint_info(
    waypoint_emotion: EmotionDefinition,
    order: int,
    metrics: Dict[str, Any],
    quat: List[float],
    context: Dict[str, Any],
) -> WaypointInfo:
    """Create a WaypointInfo object."""
    return WaypointInfo(
        order=order,
        emotion=waypoint_emotion.emotion_name,
        category=waypoint_emotion.category,
        vac=_to_python_list(waypoint_emotion.vac_vector),
        quaternion=quat,
        distance_from_previous=float(metrics["distance"]),
        estimated_time=_estimate_waypoint_time(metrics["distance"]),
        difficulty=_estimate_difficulty(metrics["distance"]),
        reasoning=context.get("explanation", {}).get("psychological_purpose", ""),
        strategies=context.get("strategies", []),
    )


async def _get_strategies_for_waypoint(
    db: AsyncSession, from_emotion: Any, to_emotion: Any, user_id: str
) -> List[StrategyInfo]:
    """Get strategies for a specific transition using StrategyRecommender.

    Fetches strategies tailored to moving from 'from_emotion' to 'to_emotion',
    ranking them by past effectiveness for the user.
    """
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
    if distance < 1.0:
        return "30-60 minutes"
    return "60-90 minutes"


def _estimate_difficulty(distance: float) -> str:
    """Estimate difficulty based on VAC distance."""
    if distance < 0.5:
        return "easy"
    if distance < 1.0:
        return "moderate"
    return "difficult"


async def _calculate_success_probability(
    _db: AsyncSession,
    _user_id: str,
    _start_emotion_id: UUID,  # pylint: disable=unused-argument
    _goal_emotion_id: UUID,  # pylint: disable=unused-argument
) -> float:
    # Simplified: return moderate probability
    return 0.7


def _generate_waypoint_reasoning(waypoint: Any) -> str:
    """Generate reasoning for a waypoint based on VAC properties.

    Helper for generating explanations when full WaypointExplainer isn't used.
    """
    vac = waypoint.vac_vector
    # Clean VAC if it's a list or similar
    if not isinstance(vac, list):
        try:
            vac = list(vac)
        except (ValueError, TypeError):
            return "natural intermediate step"

    if len(vac) < 3:
        return "natural intermediate step"

    # 3. Default
    return "natural intermediate step"


async def _build_waypoint_infos(
    db: AsyncSession,
    services: Dict[str, Any],
    path: Any,
    user_id: str,
) -> Any:
    """Build detailed waypoint information.

    Args:
        db: Database session
        services: Dict containing 'planner', 'explainer', 'quat_builder'
        path: The transition path object
        user_id: The user ID string
    """
    waypoint_infos = []
    waypoint_quats = []

    for i, _ in enumerate(path.waypoints):
        info, quat = await _process_single_waypoint(db, services, path, i, user_id)
        waypoint_infos.append(info)
        waypoint_quats.append(quat)

    return waypoint_infos, waypoint_quats


async def _process_single_waypoint(
    db: AsyncSession,
    services: Dict[str, Any],
    path: Any,
    index: int,
    user_id: str,
) -> Any:
    """Process a single waypoint to generate info and quaternion."""
    waypoint = path.waypoints[index]
    previous = path.current_emotion if index == 0 else path.waypoints[index - 1]
    next_em = path.waypoints[index + 1] if index < len(path.waypoints) - 1 else path.goal_emotion

    # 1. Quaternion
    quat = await services["quat_builder"].from_vac(_to_python_list(waypoint.vac_vector))

    # 2. Metrics
    prev_vac = list(previous.vac_vector)
    distance = services["planner"].graph.vac_distance(prev_vac, list(waypoint.vac_vector))

    # 3. Strategy & Explanation
    strategies = await _get_strategies_for_waypoint(db, previous, waypoint, user_id)
    explanation = await services["explainer"].explain_waypoint(
        waypoint_emotion=waypoint,
        previous_emotion=previous,
        next_emotion=next_em,
    )

    # 4. Assemble
    info = await _create_waypoint_info(
        waypoint,
        index + 1,
        {"distance": distance},
        quat,
        {"explanation": explanation, "strategies": strategies},
    )

    return info, quat


def _generate_visualization_data(
    path: Any,
    quaternions: Dict[str, Any],
) -> Dict[str, Any]:
    """Generate visualization data dictionary."""
    current_vac = _to_python_list(path.current_emotion.vac_vector)
    goal_vac = _to_python_list(path.goal_emotion.vac_vector)

    return {
        "path_curve_points": [
            {
                "x": float(current_vac[0]),
                "y": float(current_vac[1]),
                "z": float(current_vac[2]),
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
                "x": float(goal_vac[0]),
                "y": float(goal_vac[1]),
                "z": float(goal_vac[2]),
            }
        ],
        "quaternion_path": [quaternions["current"]]
        + quaternions["waypoints"]
        + [quaternions["goal"]],
    }
