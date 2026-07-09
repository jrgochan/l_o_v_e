"""Module documentation."""

import hashlib
import json
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages access to the path_matrix_cache."""

    def __init__(self, session: AsyncSession):
        """Docstring."""
        self.session = session

    def calculate_vac_hash(self, from_vac: List[float], to_vac: List[float]) -> str:
        """Calculate hash of VAC coordinates for cache invalidation."""
        vac_string = (
            f"{from_vac[0]},{from_vac[1]},{from_vac[2]}|"
            f"{to_vac[0]},{to_vac[1]},{to_vac[2]}"
        )
        return hashlib.sha256(vac_string.encode()).hexdigest()

    async def is_cached(self, from_id: UUID, to_id: UUID) -> bool:
        """Check if path is already in cache."""
        stmt = text("""
            SELECT EXISTS(
                SELECT 1 FROM path_matrix_cache
                WHERE from_emotion_id = :from_id AND to_emotion_id = :to_id
            )
        """)

        result = await self.session.execute(stmt, {"from_id": from_id, "to_id": to_id})
        return bool(result.scalar())

    async def cache_path(
        self,
        from_emotion: EmotionDefinition,
        to_emotion: EmotionDefinition,
        path_data: Dict[str, Any],
    ) -> None:
        """Store computed path in cache table."""
        vac_hash = self.calculate_vac_hash(
            list(from_emotion.vac_vector), list(to_emotion.vac_vector)
        )

        stmt = text("""
            INSERT INTO path_matrix_cache (
                from_emotion_id,
                to_emotion_id,
                path_data,
                distance,
                difficulty,
                waypoint_count,
                requires_bridge,
                estimated_time,
                vac_hash
            ) VALUES (
                :from_id,
                :to_id,
                :path_data,
                :distance,
                :difficulty,
                :waypoint_count,
                :requires_bridge,
                :estimated_time,
                :vac_hash
            )
            ON CONFLICT (from_emotion_id, to_emotion_id)
            DO UPDATE SET
                path_data = EXCLUDED.path_data,
                distance = EXCLUDED.distance,
                difficulty = EXCLUDED.difficulty,
                waypoint_count = EXCLUDED.waypoint_count,
                requires_bridge = EXCLUDED.requires_bridge,
                estimated_time = EXCLUDED.estimated_time,
                computed_at = NOW(),
                vac_hash = EXCLUDED.vac_hash
        """)

        await self.session.execute(
            stmt,
            {
                "from_id": from_emotion.id,
                "to_id": to_emotion.id,
                "path_data": json.dumps(path_data),
                "distance": path_data["distance"],
                "difficulty": path_data["difficulty"],
                "waypoint_count": path_data["waypoint_count"],
                "requires_bridge": path_data["requires_bridge"],
                "estimated_time": path_data["estimated_time"],
                "vac_hash": vac_hash,
            },
        )

    async def get_all_cached_paths(
        self,
        difficulty_filter: Optional[str] = None,
        requires_bridge_filter: Optional[bool] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Query cached paths with filtering."""
        query = """
            SELECT
                from_emotion_id,
                to_emotion_id,
                path_data,
                distance,
                difficulty,
                waypoint_count,
                requires_bridge,
                estimated_time
            FROM path_matrix_cache
            WHERE 1=1
        """

        params: Dict[str, Any] = {}

        if difficulty_filter:
            query += " AND difficulty = :difficulty"
            params["difficulty"] = difficulty_filter

        if requires_bridge_filter is not None:
            query += " AND requires_bridge = :bridge"
            params["bridge"] = requires_bridge_filter

        query += " ORDER BY computed_at DESC"

        if limit:
            query += " LIMIT :limit"
            params["limit"] = limit

        if offset:
            query += " OFFSET :offset"
            params["offset"] = offset

        result = await self.session.execute(text(query), params)
        rows = result.fetchall()

        paths = []
        for row in rows:
            # path_data is the full path dict stored by BatchProcessor
            # (contains from_emotion, to_emotion, waypoints, distance, etc.)
            path_data = row[2] if isinstance(row[2], dict) else json.loads(row[2])
            paths.append(path_data)

        return paths

    async def get_cache_statistics(self) -> Dict[str, Any]:
        """Get statistics about the path matrix cache."""
        # Total cached paths
        count_stmt = text("SELECT COUNT(*) FROM path_matrix_cache")
        total = (await self.session.execute(count_stmt)).scalar() or 0

        # Difficulty distribution
        diff_stmt = text("""
            SELECT difficulty, COUNT(*)
            FROM path_matrix_cache
            GROUP BY difficulty
        """)
        diff_rows = (await self.session.execute(diff_stmt)).fetchall()
        difficulty_dist = {row[0]: row[1] for row in diff_rows}

        # Bridge stats
        bridge_stmt = text("""
            SELECT COUNT(*) FROM path_matrix_cache
            WHERE requires_bridge = true
        """)
        bridges = (await self.session.execute(bridge_stmt)).scalar() or 0

        return {
            "total_cached": total,
            "difficulty_distribution": difficulty_dist,
            "bridge_paths": bridges,
            "completion_percentage": 0,  # context dependent (total possible unknown here)
        }

    async def clear_cache(self) -> int:
        """Clear all cached paths."""
        stmt = text("DELETE FROM path_matrix_cache")
        result = await self.session.execute(stmt)
        await self.session.commit()
        return int(result.rowcount)  # type: ignore
