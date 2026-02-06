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
from app.services.path_planner import PathPlanner
from app.services.quaternion_builder import QuaternionBuilder
from app.services.strategy_recommender import StrategyRecommender
from app.services.waypoint_explainer import WaypointExplainer

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/atlas/paths/all", response_model=Dict[str, Any])
async def get_all_cached_paths(
    db: Annotated[AsyncSession, Depends(get_db)], limit: int = 1000
) -> Dict[str, Any]:
    """Get pre-calculated transition paths for the Atlas."""
    # Placeholder for future implementation where we return pre-calculated paths
    return {"paths": []}


@router.post("/transition-path", response_model=TransitionPathResponse)
async def generate_transition_path(
    request: TransitionPathRequest, db: Annotated[AsyncSession, Depends(get_db)]
) -> TransitionPathResponse:
    """Generate an optimal emotional transition path."""
    try:
        logger.info("Generating transition path for user %s", request.user_id)

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
                strategies=strategies,
            )
            waypoint_infos.append(waypoint_info)

        # 5. Generate visualization data
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
            search_metadata=path.search_metadata,
        )

        return response

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
        planner = PathPlanner(db)
        path = await planner.find_transition_path(
            current_vac=_to_python_list(start_emotion.vac_vector),
            goal_vac=_to_python_list(goal_emotion.vac_vector),
            max_waypoints=max_waypoints,
            user_id=str(user_id),
        )

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
    """Generate multiple potential transition paths (Primary + Alternatives)."""
    try:
        logger.info("Finding alternative paths for user %s", request.user_id)
        planner = PathPlanner(db)

        # 2. Find all candidate paths
        paths = await planner.find_alternative_paths(
            start_vac=request.current_vac,
            goal_vac=request.goal_vac,
            max_waypoints=request.max_waypoints or 5,
            user_id=str(request.user_id),
        )

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
                        "difficulty": "moderate",  # TODO: calculate per step
                        "estimated_time": "15 mins",  # Placeholder
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
    """Get valid alternative next steps from a specific emotion context."""
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


async def _calculate_success_probability(
    db: AsyncSession, user_id: str, start_emotion_id: UUID, goal_emotion_id: UUID
) -> float:
    # Simplified: return moderate probability
    return 0.7


def _generate_waypoint_reasoning(waypoint: Any, path: Any) -> str:
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

    # 1. Arousal regulation (VAC[1])
    if abs(vac[1]) < 0.3:
        return f"regulating arousal for {path.goal_emotion.emotion_name}"

    # 2. Connection building (VAC[2])
    if vac[2] > 0.5:
        return "building positive connection"

    # 3. Default
    return "natural intermediate step"
