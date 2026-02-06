import logging
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition

logger = logging.getLogger(__name__)


class PathHarmonizer:
    """Ensures paths meet psychological safety and validation requirements."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def validate_and_enhance_path(
        self,
        path: List[EmotionDefinition],
        start: EmotionDefinition,
        goal: EmotionDefinition,
    ) -> List[EmotionDefinition]:
        """Validate path meets psychological requirements."""
        # Check if path needs vulnerability bridge
        if self._needs_vulnerability_bridge(start, goal, path):
            logger.info("Adding Vulnerability bridge to path")
            path = await self._add_vulnerability_waypoint(path)

        # Check arousal regulation
        path = await self._ensure_arousal_regulation(path)

        return path

    def _needs_vulnerability_bridge(
        self,
        start: EmotionDefinition,
        goal: EmotionDefinition,
        path: List[EmotionDefinition],
    ) -> bool:
        """Check if path requires Vulnerability as bridge."""
        start_connection = start.vac_vector[2]
        goal_connection = goal.vac_vector[2]

        # Needs bridge if going from negative to positive connection
        if start_connection < -0.3 and goal_connection > 0.5:
            # Check if vulnerability already in path
            for emotion in path:
                # v, a, c = emotion.vac_vector (Not used directly, expanding for clarity)
                # Vulnerability signature: neutral valence, medium arousal, positive connection
                v = emotion.vac_vector[0]
                a = emotion.vac_vector[1]
                c = emotion.vac_vector[2]

                if abs(v) < 0.2 and 0.2 < a < 0.5 and c > 0.5:
                    return False  # Already have it
            return True

        return False

    async def _add_vulnerability_waypoint(
        self, path: List[EmotionDefinition]
    ) -> List[EmotionDefinition]:
        """Add Vulnerability emotion as waypoint in path."""
        stmt = select(EmotionDefinition).where(EmotionDefinition.emotion_name == "Vulnerability")
        result = await self.session.execute(stmt)
        vulnerability = result.scalar_one_or_none()

        if vulnerability:
            # Insert after first emotion (between start and next waypoint)
            return [path[0], vulnerability] + path[1:]

        return path

    async def _ensure_arousal_regulation(
        self, path: List[EmotionDefinition]
    ) -> List[EmotionDefinition]:
        """Ensure high arousal is reduced before complex cognitive work."""
        if not path:
            return path

        refined_path = [path[0]]

        for i in range(1, len(path)):
            prev = refined_path[-1]
            curr = path[i]

            prev_arousal = prev.vac_vector[1]
            curr_arousal = curr.vac_vector[1]

            # Check for unsafe arousal drop (e.g. Panic > 0.8 to Calm < 0.2)
            if prev_arousal > 0.6 and (prev_arousal - curr_arousal) > 0.5:
                logger.info(
                    f"Detected unsafe arousal drop: {prev.emotion_name} -> {curr.emotion_name}"
                )

                target_arousal = (prev_arousal + curr_arousal) / 2
                intermediate = await self._find_arousal_bridge(prev, target_arousal)

                if intermediate:
                    logger.info(f"Inserting regulation bridge: {intermediate.emotion_name}")
                    refined_path.append(intermediate)

            refined_path.append(curr)

        return refined_path

    async def _find_arousal_bridge(
        self, current: EmotionDefinition, target_arousal: float
    ) -> Optional[EmotionDefinition]:
        """Find an emotion to bridge a high-arousal gap."""
        stmt = select(EmotionDefinition)
        result = await self.session.execute(stmt)
        candidates = result.scalars().all()

        best_bridge = None
        min_dist = float("inf")

        current_v = current.vac_vector[0]

        for cand in candidates:
            if cand.id == current.id:
                continue

            v, a, c = cand.vac_vector

            # Check arousal range
            if not target_arousal - 0.15 <= a <= target_arousal + 0.15:
                continue

            # Check valence (should not drop significantly below current)
            if v < current_v - 0.2:
                continue

            # Check connection (should not be highly disconnecting)
            if c < -0.3:
                continue

            dist = abs(a - target_arousal)

            if dist < min_dist:
                min_dist = dist
                best_bridge = cand

        return best_bridge
