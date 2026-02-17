"""Module documentation."""

import logging
from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class DiscoveryEngine:
    """Handles problematic transitions and complementary path discovery."""

    def __init__(self, session: AsyncSession):
        """Docstring."""
        self.session = session

    async def get_problematic_transitions(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get hardest transitions from cache.

        Useful for research and identifying challenging patterns.
        """
        stmt = text(
            """
            SELECT
                pmc.from_emotion_id,
                pmc.to_emotion_id,
                pmc.distance,
                pmc.difficulty,
                pmc.waypoint_count,
                pmc.requires_bridge,
                from_e.emotion_name as from_name,
                from_e.category as from_category,
                to_e.emotion_name as to_name,
                to_e.category as to_category
            FROM path_matrix_cache pmc
            JOIN emotion_definitions from_e ON pmc.from_emotion_id = from_e.id
            JOIN emotion_definitions to_e ON pmc.to_emotion_id = to_e.id
            WHERE pmc.difficulty = 'difficult'
            ORDER BY pmc.distance DESC
            LIMIT :limit
        """
        )

        result = await self.session.execute(stmt, {"limit": limit})
        rows = result.fetchall()

        return [
            {
                "from_id": str(row[0]),
                "to_id": str(row[1]),
                "from_name": row[6],
                "to_name": row[8],
                "from_category": row[7],
                "to_category": row[9],
                "distance": round(float(row[2]), 3),
                "difficulty": row[3],
                "waypoint_count": row[4],
                "requires_bridge": row[5],
                "reason": f"One of the hardest transitions (distance: {round(float(row[2]), 2)})",
            }
            for row in rows
        ]

    async def get_complementary_paths(
        self, selected_emotions: List[UUID], limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Find complementary paths based on current selection.

        Looks for:
        - Bridge emotions that unlock many transitions
        - Emotions that form triangles with selected
        - Opposite emotions for contrast exploration
        """
        if len(selected_emotions) == 0:
            return []

        suggestions: List[Dict[str, Any]] = []

        # Suggest bridge emotions if not already selected
        bridge_suggestions = await self._suggest_bridges(selected_emotions)
        suggestions.extend(bridge_suggestions[:2])  # Top 2 bridges

        # Suggest triangle completions
        if len(selected_emotions) == 2:
            triangle_suggestions = await self._suggest_triangle_completion(selected_emotions)
            suggestions.extend(triangle_suggestions[:2])

        # Suggest opposite emotions
        opposite_suggestions = await self._suggest_opposites(selected_emotions)
        suggestions.extend(opposite_suggestions[:1])

        return suggestions[:limit]

    async def _suggest_bridges(self, selected_emotions: List[UUID]) -> List[Dict[str, Any]]:
        """Suggest bridge emotions that aren't selected."""
        bridge_names = [
            "Vulnerability",
            "Awe",
            "Compassion",
            "Curiosity",
            "Acceptance",
            "Gratitude",
        ]

        if not selected_emotions:
            selected_ids = []
        else:
            selected_ids = [str(eid) for eid in selected_emotions]

        # Note: Using emotion_definitions table, correct per model definition
        stmt = text(
            """
            SELECT id, emotion_name, category
            FROM emotion_definitions
            WHERE emotion_name = ANY(:bridge_names)
            """
        )
        params: Dict[str, Any] = {"bridge_names": bridge_names}

        if selected_ids:
            stmt = text(
                """
                SELECT id, emotion_name, category
                FROM emotion_definitions
                WHERE emotion_name = ANY(:bridge_names)
                  AND id != ALL(:selected_ids)
                """
            )
            params["selected_ids"] = selected_ids

        result = await self.session.execute(stmt, params)
        rows = result.fetchall()

        return [
            {
                "id": str(row[0]),
                "name": row[1],
                "category": row[2],
                "reason": "Bridge emotion - unlocks difficult transitions",
                "type": "bridge",
            }
            for row in rows
        ]

    async def _suggest_triangle_completion(self, _selected_two: List[UUID]) -> List[Dict[str, Any]]:
        """Suggest third emotion to form an interesting triangle."""
        # Simplified - just return empty for now to avoid errors
        return []

    async def _suggest_opposites(self, _selected_emotions: List[UUID]) -> List[Dict[str, Any]]:
        """Suggest emotions that are opposite in VAC space."""
        # Simplified - just return empty for now
        return []
