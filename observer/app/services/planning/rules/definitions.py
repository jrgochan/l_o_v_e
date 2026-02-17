"""Concrete Harmonic Rules.

Implementations of specific logic for path validation and enhancement.
"""

import logging
from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition
from app.services.planning.rules.base import HarmonicRule

logger = logging.getLogger(__name__)


class VulnerabilityBridgeRule(HarmonicRule):
    """Ensures a vulnerability bridge exists when moving from isolation to connection."""

    def __init__(self, session: AsyncSession):
        """Initialize with database session."""
        self.session = session

    async def check_and_fix(
        self,
        path: List[EmotionDefinition],
        start: EmotionDefinition,
        goal: EmotionDefinition,
    ) -> Tuple[List[EmotionDefinition], bool]:
        """Add Vulnerability if crossing from negative to positive connection."""
        start_connection = start.vac_vector[2]
        goal_connection = goal.vac_vector[2]

        # Needs bridge if going from negative to positive connection
        if start_connection < -0.3 and goal_connection > 0.5:
            # Check if vulnerability already in path
            for emotion in path:
                v = emotion.vac_vector[0]
                a = emotion.vac_vector[1]
                c = emotion.vac_vector[2]

                # Vulnerability signature: neutral valence, medium arousal, positive connection
                if abs(v) < 0.2 < a < 0.5 and c > 0.5:  # pylint: disable=chained-comparison
                    return path, False  # Already have it

            # Add it
            logger.info("Adding Vulnerability bridge to path")

            stmt = select(EmotionDefinition).where(
                EmotionDefinition.emotion_name == "Vulnerability"
            )
            result = await self.session.execute(stmt)
            vulnerability = result.scalar_one_or_none()

            if vulnerability:
                # Insert after first emotion
                new_path = [path[0], vulnerability] + path[1:]
                return new_path, True

        return path, False


class ArousalRegulationRule(HarmonicRule):
    """Ensures arousal doesn't drop too precipitously without a bridge."""

    def __init__(self, session: AsyncSession):
        """Initialize with database session."""
        self.session = session

    async def check_and_fix(
        self,
        path: List[EmotionDefinition],
        start: EmotionDefinition,
        goal: EmotionDefinition,
    ) -> Tuple[List[EmotionDefinition], bool]:
        """Insert bridge emotions if arousal drops too sharply."""
        if not path:
            return path, False

        refined_path = [path[0]]
        modified = False

        for i in range(1, len(path)):
            prev = refined_path[-1]
            curr = path[i]

            prev_arousal = prev.vac_vector[1]
            curr_arousal = curr.vac_vector[1]

            # Check for unsafe arousal drop (e.g. Panic > 0.8 to Calm < 0.2)
            if prev_arousal > 0.6 and (prev_arousal - curr_arousal) > 0.5:
                logger.info(
                    "Detected unsafe arousal drop: %s -> %s",
                    prev.emotion_name,
                    curr.emotion_name,
                )

                target_arousal = (prev_arousal + curr_arousal) / 2
                intermediate = await self._find_arousal_bridge(prev, target_arousal)

                if intermediate:
                    logger.info("Inserting regulation bridge: %s", intermediate.emotion_name)
                    refined_path.append(intermediate)
                    modified = True

            refined_path.append(curr)

        return refined_path, modified

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
            if abs(a - target_arousal) > 0.15:
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
