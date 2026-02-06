import logging
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition
from app.models.transition_strategy import UserJourney
from app.services.emotion_mapper import EmotionMapper
from app.services.planning.astar import AStarSearcher
from app.services.planning.definitions import TransitionPath
from app.services.planning.graph import TransitionGraph
from app.services.planning.harmonics import PathHarmonizer

logger = logging.getLogger(__name__)


class PathPlanner:
    """Category-aware emotional transition path planning (Modular Version)."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.emotion_mapper = EmotionMapper(session)
        self.graph = TransitionGraph(session)
        self.searcher = AStarSearcher(self.graph)
        self.harmonizer = PathHarmonizer(session)

    async def find_transition_path(
        self,
        current_vac: List[float],
        goal_vac: List[float],
        max_waypoints: int = 3,
        user_id: Optional[str] = None,
        collection_id: Optional[str] = None,
    ) -> TransitionPath:
        """Find optimal path from current to goal emotional state."""
        if collection_id:
            logger.info("Finding path %s -> %s (col: %s)", current_vac, goal_vac, collection_id)
        else:
            logger.info("Finding path %s -> %s", current_vac, goal_vac)

        # 1. Load data
        await self.graph.load_category_transitions()

        # 2. Map emotions
        current_emotion = await self.emotion_mapper.find_nearest_by_vac_only(
            current_vac, collection_id=collection_id
        )
        goal_emotion = await self.emotion_mapper.find_nearest_by_vac_only(
            goal_vac, collection_id=collection_id
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
        user_history = await self._get_user_history(user_id) if user_id else None

        # 5. A* Search
        all_paths, metrics = await self.searcher.find_path(
            current_emotion, goal_emotion, max_waypoints, user_history, collection_id
        )

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
        return await self._build_transition_path(path_emotions, user_history, metrics)

    async def find_alternative_paths(
        self,
        current_vac: List[float],
        goal_vac: List[float],
        max_waypoints: int = 3,
        user_id: Optional[str] = None,
        max_alternatives: int = 3,
    ) -> List[TransitionPath]:
        """Find multiple alternative paths options."""
        await self.graph.load_category_transitions()

        current_emotion = await self.emotion_mapper.find_nearest_by_vac_only(current_vac)
        goal_emotion = await self.emotion_mapper.find_nearest_by_vac_only(goal_vac)

        if not current_emotion or not goal_emotion:
            raise ValueError("Invalid VAC coordinates")

        user_history = await self._get_user_history(user_id) if user_id else None

        # Check direct
        if (
            self.graph.vac_distance(list(current_emotion.vac_vector), list(goal_emotion.vac_vector))
            < 0.3
        ):
            return [await self.graph.create_direct_path(current_emotion, goal_emotion)]

        # Search
        raw_paths, metrics = await self.searcher.find_path(
            current_emotion, goal_emotion, max_waypoints, user_history
        )

        results = []
        for path_emotions in raw_paths[:max_alternatives]:
            enhanced_path = await self.harmonizer.validate_and_enhance_path(
                path_emotions, current_emotion, goal_emotion
            )
            built_path = await self._build_transition_path(enhanced_path, user_history, metrics)
            results.append(built_path)

        return results

    async def get_valid_next_steps(
        self, current_emotion_id: str, goal_emotion_id: str
    ) -> List[EmotionDefinition]:
        """Get valid next steps."""
        await self.graph.load_category_transitions()

        current = await self.session.get(EmotionDefinition, UUID(current_emotion_id))
        goal = await self.session.get(EmotionDefinition, UUID(goal_emotion_id))

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
        user_history: Optional[Dict[str, Any]],
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
        """Get user's transition history."""
        stmt = (
            select(UserJourney)
            .where(UserJourney.user_id == user_id, UserJourney.status == "completed")
            .limit(50)
        )
        result = await self.session.execute(stmt)
        journeys = result.scalars().all()

        successful_transitions: Dict[Tuple[str, str], float] = {}
        for journey in journeys:
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
        self, transition_path: TransitionPath, user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Generate detailed therapeutic explanation."""
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

        await self.graph.load_category_transitions()

        for i in range(len(full_path_emotions) - 1):
            current = full_path_emotions[i]
            next_emotion = full_path_emotions[i + 1]

            vac_dist = self.graph.vac_distance(
                list(current.vac_vector), list(next_emotion.vac_vector)
            )
            cat_difficulty = self.graph.get_category_difficulty(
                current.category, next_emotion.category
            )
            is_bridge = self.graph.is_bridge_category(next_emotion.category)

            v_delta = next_emotion.vac_vector[0] - current.vac_vector[0]
            a_delta = next_emotion.vac_vector[1] - current.vac_vector[1]
            c_delta = next_emotion.vac_vector[2] - current.vac_vector[2]

            summary = self._generate_step_summary(
                current, next_emotion, v_delta, a_delta, c_delta, is_bridge
            )

            rationale = None
            if current.vac_vector[1] > 0.6 and a_delta < -0.3:
                rationale = "High arousal requires regulation before cognitive work."
            elif is_bridge:
                rationale = f"{next_emotion.category} unlocks difficult transitions."
            elif cat_difficulty > 0.6:
                rationale = "Advanced category transition safely managed."

            explanations.append(
                {
                    "step_index": i,
                    "from_emotion": current.emotion_name,
                    "to_emotion": next_emotion.emotion_name,
                    "summary": summary,
                    "vac_change": {
                        "distance": round(vac_dist, 2),
                        "valence_delta": round(v_delta, 2),
                        "arousal_delta": round(a_delta, 2),
                        "connection_delta": round(c_delta, 2),
                    },
                    "category_transition": {
                        "from_category": current.category,
                        "to_category": next_emotion.category,
                        "difficulty": cat_difficulty,
                    },
                    "is_bridge": is_bridge,
                    "clinical_rationale": rationale,
                }
            )

        return explanations

    def _generate_step_summary(self, current, next_emotion, v, a, c, is_bridge) -> str:
        """Generate a therapeutic sentence explaining the transition."""
        parts = []

        if is_bridge:
            parts.append(
                f"We use **{next_emotion.emotion_name}** as a bridge to open up new possibilities."
            )

        if current.vac_vector[1] > 0.5 and a < -0.2:
            parts.append("This step helps **lower your intensity** to create safety.")
        elif a > 0.3:
            parts.append("This brings a bit more **energy** to help you move forward.")

        if c > 0.3:
            parts.append("It helps you feel **more connected** to yourself or others.")
        elif c < -0.3 and current.vac_vector[2] > 0.5:
            parts.append("This allows for some necessary **solitude**.")

        if v > 0.3:
            parts.append("This naturally **lifts your mood**.")

        if not parts:
            parts.append(f"Moving to **{next_emotion.emotion_name}** is a natural, steady step.")

        return " ".join(parts)
