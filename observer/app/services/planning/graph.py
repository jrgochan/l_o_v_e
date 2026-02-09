"""Module documentation."""

import logging
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition
from app.models.transition_strategy import CategoryTransition
from app.services.planning.definitions import TransitionPath

logger = logging.getLogger(__name__)


class TransitionGraph:
    """Manages the graph topology and valid transitions."""

    # Axis importance weights
    VALENCE_WEIGHT = 1.0
    AROUSAL_WEIGHT = 1.2
    CONNECTION_WEIGHT = 1.5

    # Path constraints
    MAX_NEIGHBOR_DISTANCE = 1.5
    PROHIBITED_DIFFICULTY = 0.9

    def __init__(self, session: AsyncSession):
        """Docstring."""
        self.session = session
        self._category_transitions: Dict[Tuple[str, str], float] = {}

    async def load_category_transitions(self) -> None:
        """Load category transition difficulty matrix from database."""
        if self._category_transitions:
            return

        stmt = select(CategoryTransition)
        result = await self.session.execute(stmt)
        transitions = result.scalars().all()

        for trans in transitions:
            key = (trans.from_category, trans.to_category)
            self._category_transitions[key] = trans.difficulty_score

        logger.info("Loaded %d category transitions", len(self._category_transitions))

    def get_category_difficulty(self, from_cat: str, to_cat: str) -> float:
        """Get difficulty score for category transition."""
        if from_cat == to_cat:
            return 0.0
        return self._category_transitions.get((from_cat, to_cat), 0.5)

    def is_category_transition_valid(self, from_cat: str, to_cat: str) -> bool:
        """Check if direct category transition is allowed."""
        if from_cat == to_cat:
            return True

        difficulty = self.get_category_difficulty(from_cat, to_cat)
        return difficulty < self.PROHIBITED_DIFFICULTY

    def is_bridge_category(self, category: str) -> bool:
        """Check if this is a bridge category."""
        bridge_categories = [
            "Places We Go When It's Beyond Us",
            "Places We Go With Others",
            "Places We Go When We Search for Connection",
        ]
        return category in bridge_categories

    def vac_distance(self, vac1: List[float], vac2: List[float]) -> float:
        """Weighted VAC distance (Manhattan/L1 with axis weights)."""
        v1, a1, c1 = vac1
        v2, a2, c2 = vac2

        return (
            self.VALENCE_WEIGHT * abs(v1 - v2)
            + self.AROUSAL_WEIGHT * abs(a1 - a2)
            + self.CONNECTION_WEIGHT * abs(c1 - c2)
        )

    def is_direct_transition_valid(
        self, current: EmotionDefinition, goal: EmotionDefinition
    ) -> bool:
        """Check if we can go directly from current to goal."""
        if current.id == goal.id:
            return True

        if current.category == goal.category:
            distance = self.vac_distance(list(current.vac_vector), list(goal.vac_vector))
            return distance < 0.5

        difficulty = self.get_category_difficulty(current.category, goal.category)
        return difficulty < 0.3

    async def create_direct_path(
        self, current: EmotionDefinition, goal: EmotionDefinition
    ) -> TransitionPath:
        """Create a simple direct path."""
        distance = self.vac_distance(list(current.vac_vector), list(goal.vac_vector))

        return TransitionPath(
            current_emotion=current,
            goal_emotion=goal,
            waypoints=[],
            total_distance=distance,
            estimated_time="15-30 minutes",
            difficulty="easy",
        )

    async def get_valid_neighbors(
        self,
        current: EmotionDefinition,
        goal: EmotionDefinition,
        collection_id: Optional[str] = None,
    ) -> List[EmotionDefinition]:
        """Get valid next steps."""
        stmt = select(EmotionDefinition)
        if collection_id:
            stmt = stmt.where(EmotionDefinition.collection_id == UUID(collection_id))

        result = await self.session.execute(stmt)
        all_emotions = result.scalars().all()

        valid_neighbors = []
        current_to_goal = self.vac_distance(list(current.vac_vector), list(goal.vac_vector))

        for emotion in all_emotions:
            if emotion.id == current.id:
                continue

            if not self.is_category_transition_valid(current.category, emotion.category):
                continue

            distance = self.vac_distance(list(current.vac_vector), list(emotion.vac_vector))
            if distance > self.MAX_NEIGHBOR_DISTANCE:
                continue

            neighbor_to_goal = self.vac_distance(list(emotion.vac_vector), list(goal.vac_vector))

            if neighbor_to_goal < current_to_goal or self.is_bridge_category(emotion.category):
                valid_neighbors.append(emotion)

        return valid_neighbors
