"""Module documentation."""

import logging
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition
from app.repositories.emotions import EmotionRepository
from app.repositories.journeys import JourneyRepository
from app.services.emotions.mapper import EmotionMapper
from app.services.planning.astar import AStarSearcher
from app.services.planning.definitions import TransitionPath
from app.services.planning.graph import TransitionGraph
from app.services.planning.harmonics import PathHarmonizer
from app.services.planning.types import PathFindingContext
from app.services.planning.waypoint_explainer import WaypointExplainer

logger = logging.getLogger(__name__)


class PathPlanner:  # pylint: disable=too-many-instance-attributes
    """Category-aware emotional transition path planning (Modular Version)."""

    def __init__(self, session: AsyncSession):
        """Initialize PathPlanner with required services and repositories."""
        self.session = session
        self.emotion_repo = EmotionRepository(session)
        self.journey_repo = JourneyRepository(session)
        self.explainer = WaypointExplainer(session)

        # Legacy services (to be refactored later if needed)
        self.emotion_mapper = EmotionMapper(session)
        self.graph = TransitionGraph(session)
        self.searcher = AStarSearcher(self.graph)
        self.harmonizer = PathHarmonizer(session)

    async def find_transition_path(
        self,
        context: PathFindingContext,
    ) -> TransitionPath:
        """Find optimal path from current to goal emotional state."""
        if context.collection_id:
            logger.info(
                "Finding path %s -> %s (col: %s)",
                context.current_vac,
                context.goal_vac,
                context.collection_id,
            )
        else:
            logger.info("Finding path %s -> %s", context.current_vac, context.goal_vac)

        # 1. Load data
        await self.graph.load_category_transitions()

        # 2. Map emotions
        current_emotion = await self.emotion_mapper.find_nearest_by_vac_only(
            context.current_vac, collection_id=context.collection_id
        )
        goal_emotion = await self.emotion_mapper.find_nearest_by_vac_only(
            context.goal_vac, collection_id=context.collection_id
        )

        logger.info(
            "Mapped to: %s -> %s",
            current_emotion.emotion_name,
            goal_emotion.emotion_name,
        )

        # 3. Direct transition check
        if self.graph.is_direct_transition_valid(current_emotion, goal_emotion):
            logger.info("Direct transition valid")
            return await self.graph.create_direct_path(current_emotion, goal_emotion)

        # 4. User history
        if context.user_id and not context.user_history:
            context.user_history = await self._get_user_history(context.user_id)

        # 5. A* Search
        all_paths, metrics = await self.searcher.find_path(current_emotion, goal_emotion, context)

        # Select best path (shortest)
        if all_paths:
            path_emotions = min(all_paths, key=len)
        else:
            logger.warning("No path found, using fallback")
            path_emotions = await self._fallback_path(current_emotion, goal_emotion)

        # 6. Validate and Enhance
        path_emotions = await self.harmonizer.validate_and_enhance_path(
            path_emotions, current_emotion, goal_emotion
        )

        # 7. Build result
        return await self._build_transition_path(path_emotions, context.user_history, metrics)

    async def find_alternative_paths(
        self,
        context: PathFindingContext,
        max_alternatives: int = 3,
    ) -> List[TransitionPath]:
        """Find multiple alternative paths options."""
        await self.graph.load_category_transitions()

        current_emotion = await self.emotion_mapper.find_nearest_by_vac_only(
            context.current_vac, collection_id=context.collection_id
        )
        goal_emotion = await self.emotion_mapper.find_nearest_by_vac_only(
            context.goal_vac, collection_id=context.collection_id
        )

        if not current_emotion or not goal_emotion:
            raise ValueError("Invalid VAC coordinates")

        if context.user_id and not context.user_history:
            context.user_history = await self._get_user_history(context.user_id)

        # Check direct
        if (
            self.graph.vac_distance(list(current_emotion.vac_vector), list(goal_emotion.vac_vector))
            < 0.3
        ):
            return [await self.graph.create_direct_path(current_emotion, goal_emotion)]

        # Search
        raw_paths, metrics = await self.searcher.find_path(current_emotion, goal_emotion, context)

        results = []
        for path_emotions in raw_paths[:max_alternatives]:
            enhanced_path = await self.harmonizer.validate_and_enhance_path(
                path_emotions, current_emotion, goal_emotion
            )
            built_path = await self._build_transition_path(
                enhanced_path, context.user_history, metrics
            )
            results.append(built_path)

        return results

    async def get_valid_next_steps(
        self, current_emotion_id: str, goal_emotion_id: str
    ) -> List[EmotionDefinition]:
        """Get valid next steps."""
        await self.graph.load_category_transitions()

        current = await self.emotion_repo.get(UUID(current_emotion_id))
        goal = await self.emotion_repo.get(UUID(goal_emotion_id))

        if not current or not goal:
            return []

        return await self.graph.get_valid_neighbors(current, goal)

    async def _fallback_path(
        self, start: EmotionDefinition, goal: EmotionDefinition
    ) -> List[EmotionDefinition]:
        """Fallback greedy path."""
        logger.warning("Using fallback greedy path")
        path = [start]
        current = start

        for _ in range(3):
            neighbors = await self.graph.get_valid_neighbors(current, goal)
            if not neighbors:
                break

            best_neighbor = min(
                neighbors,
                key=lambda e: self.graph.vac_distance(list(e.vac_vector), list(goal.vac_vector)),
            )

            path.append(best_neighbor)
            current = best_neighbor

            if current.category == goal.category:
                if current.id != goal.id:
                    path.append(goal)
                break

        return path

    async def _build_transition_path(
        self,
        path_emotions: List[EmotionDefinition],
        _user_history: Optional[Dict[str, Any]],
        metrics: Optional[Dict[str, Any]] = None,
    ) -> TransitionPath:
        """Build complete TransitionPath object."""
        total_distance = 0.0
        for i in range(len(path_emotions) - 1):
            dist = self.graph.vac_distance(
                list(path_emotions[i].vac_vector), list(path_emotions[i + 1].vac_vector)
            )
            total_distance += dist

        waypoint_count = len(path_emotions) - 2
        if waypoint_count <= 0:
            estimated_time = "15-30 minutes"
        elif waypoint_count == 1:
            estimated_time = "30-60 minutes"
        elif waypoint_count == 2:
            estimated_time = "45-90 minutes"
        else:
            estimated_time = "60-120 minutes"

        if total_distance < 1.0:
            difficulty = "easy"
        elif total_distance < 2.0:
            difficulty = "moderate"
        else:
            difficulty = "difficult"

        waypoints = path_emotions[1:-1] if len(path_emotions) > 2 else []

        return TransitionPath(
            current_emotion=path_emotions[0],
            goal_emotion=path_emotions[-1],
            waypoints=waypoints,
            total_distance=total_distance,
            estimated_time=estimated_time,
            difficulty=difficulty,
            search_metadata=metrics,
        )

    async def _get_user_history(self, user_id: str) -> Dict[str, Any]:
        """Get user's transition history using JourneyRepository."""
        journeys = await self.journey_repo.get_journey_history(UUID(user_id), limit=50)

        successful_transitions: Dict[Tuple[str, str], float] = {}
        for journey in journeys:
            # Check for completed status
            if journey.status != "completed":
                continue

            waypoints = journey.waypoints
            if isinstance(waypoints, dict) and "waypoints" in waypoints:
                waypoint_emotions = waypoints["waypoints"]
                for i in range(len(waypoint_emotions) - 1):
                    from_e = waypoint_emotions[i].get("emotion")
                    to_e = waypoint_emotions[i + 1].get("emotion")
                    if from_e and to_e:
                        key = (from_e, to_e)
                        successful_transitions[key] = successful_transitions.get(key, 0) + 1

        if successful_transitions:
            max_count = max(successful_transitions.values())
            successful_transitions = {k: v / max_count for k, v in successful_transitions.items()}

        return {
            "successful_transitions": successful_transitions,
            "total_journeys": len(journeys),
        }

    async def explain_path(
        self, transition_path: TransitionPath, _user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Generate detailed therapeutic explanation using WaypointExplainer."""
        explanations = []

        if not transition_path.waypoints:
            full_path_emotions = [
                transition_path.current_emotion,
                transition_path.goal_emotion,
            ]
        else:
            full_path_emotions = (
                [transition_path.current_emotion]
                + transition_path.waypoints
                + [transition_path.goal_emotion]
            )

        # Load graph data for context if needed
        await self.graph.load_category_transitions()

        for i in range(len(full_path_emotions) - 1):
            current = full_path_emotions[i]
            next_emotion = full_path_emotions[i + 1]

            # Note: WaypointExplainer typically explains the 'waypoint' in the
            # context of previous -> next
            # Here we are explaining the STEP from current to next.
            # If i > 0, 'current' is a waypoint.

            # Use WaypointExplainer to generate explanation
            # We map the inputs:
            # waypoint_emotion -> The target of the step (next_emotion) or the current one?
            # WaypointExplainer signature: explain_waypoint(waypoint, previous, next)
            # This loop structure iterates pairs.

            # Let's adjust logic:
            # We want to explain each TRANSITION STEP.
            # Or we want to explain each WAYPOINT.

            # The original code generated an explanation for 'next_emotion' effectively,
            # or the transition itself.

            # Let's use WaypointExplainer to explain 'next_emotion' as a step from 'current'.
            # If next_emotion is the Goal, we explain reaching the goal.

            # However, the explainer needs (prev, waypoint, next).
            # For a path A -> B -> C -> D
            # We want to explain B (from A->B->C) and C (from B->C->D).

            # Current loop gives: (A, B), (B, C), (C, D).
            # Iteration 0: current=A, next=B. Analysis of A->B.

            # If we simply use the WaypointExplainer's logic, it expects a triplet.
            # But we can also just use it to analyze the "shift" (A->B).

            # Let's use the explicit logic from the explainer if possible, or build a context.
            # Actually, WaypointExplainer has _analyze_vac_shifts(prev, current).
            # We can use that if public, or use explain_waypoint if we have a triplet.

            # If we don't have a triplet (e.g. A->B), we can fake it or just
            # explain B relative to A.
            # Let's treat 'next_emotion' as the 'waypoint' and 'current' as 'previous'.
            # 'next_next' would be the one after.

            next_next = (
                full_path_emotions[i + 2] if i + 2 < len(full_path_emotions) else next_emotion
            )

            explanation_data = await self.explainer.explain_waypoint(
                waypoint_emotion=next_emotion,
                previous_emotion=current,
                next_emotion=next_next,
            )

            # Transform to match expected output format of explain_path
            # The expected output schema in planning.py suggests:
            # summary, vac_change, category_transition, is_bridge, clinical_rationale

            vac_analysis = explanation_data["vac_analysis"]

            # Extract category transition info using graph
            cat_difficulty = self.graph.get_category_difficulty(
                current.category, next_emotion.category
            )
            is_bridge = self.graph.is_bridge_category(next_emotion.category)

            # Construct summary from explanation_data
            # WaypointExplainer provides "psychological_purpose"
            summary = explanation_data.get("psychological_purpose", "Therapeutic progression")

            explanations.append(
                {
                    "step_index": i,
                    "from_emotion": current.emotion_name,
                    "to_emotion": next_emotion.emotion_name,
                    "summary": summary,
                    "vac_change": {
                        "distance": self.explainer.get_vac_distance(
                            list(current.vac_vector), list(next_emotion.vac_vector)
                        ),
                        "valence_delta": vac_analysis["valence_shift"]["delta"],
                        "arousal_delta": vac_analysis["arousal_shift"]["delta"],
                        "connection_delta": vac_analysis["connection_shift"]["delta"],
                    },
                    "category_transition": {
                        "from_category": current.category,
                        "to_category": next_emotion.category,
                        "difficulty": cat_difficulty,
                    },
                    "is_bridge": is_bridge,
                    "clinical_rationale": explanation_data.get("previous_context", {}).get(
                        "why_necessary"
                    ),
                    # Add rich data from explainer for frontend if needed
                    "readiness_signs": explanation_data.get("readiness_signs", []),
                    "warning_signs": explanation_data.get("warning_signs", []),
                }
            )

        return explanations
