"""Module documentation."""

import logging
from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class SpatialAnalyzer:
    """Handles VAC spatial analysis."""

    def __init__(self, session: AsyncSession):
        """Docstring."""
        self.session = session

    async def get_similar_emotions(
        self, emotion_id: UUID, limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Find emotions similar in VAC space."""
        stmt = text("""
            SELECT
                e.id,
                e.emotion_name as name,
                e.category,
                e.vac_vector as vac,
                e.vac_vector <-> (
                    SELECT vac_vector FROM emotion_definitions WHERE id = :emotion_id
                ) as distance
            FROM emotion_definitions e
            WHERE e.id != :emotion_id
            ORDER BY distance ASC
            LIMIT :limit
        """)

        result = await self.session.execute(
            stmt, {"emotion_id": emotion_id, "limit": limit}
        )

        rows = result.fetchall()

        results = []
        for row in rows:
            # Parse VAC vector
            vac_vector = row[3]
            if isinstance(vac_vector, str):
                import json  # pylint: disable=import-outside-toplevel

                vac_list = json.loads(vac_vector)
            else:
                vac_list = list(vac_vector)

            results.append(
                {
                    "id": str(row[0]),
                    "name": row[1],
                    "category": row[2],
                    "vac": [float(vac_list[0]), float(vac_list[1]), float(vac_list[2])],
                    "distance": round(float(row[4]), 3),
                    "reason": (
                        f"Very close in VAC space (distance: {round(float(row[4]), 2)})"
                    ),
                }
            )

        return results
