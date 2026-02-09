"""Emotion Repository.

Manages access to EmotionDefinition and EmotionCollection.
"""

from typing import List, Literal, Optional, Sequence, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionCollection, EmotionDefinition
from app.repositories.base import BaseRepository
from app.schemas.emotions import EmotionBase, EmotionUpdate


class EmotionRepository(BaseRepository[EmotionDefinition, EmotionBase, EmotionUpdate]):
    """Repository for EmotionDefinition."""

    def __init__(self, session: AsyncSession):
        """Initialize repository."""
        super().__init__(EmotionDefinition, session)

    async def get_by_name(
        self, name: str, collection_id: Optional[UUID] = None
    ) -> Optional[EmotionDefinition]:
        """Get emotion by name, optionally filtered by collection."""
        stmt = select(self.model).where(self.model.emotion_name == name)
        if collection_id:
            stmt = stmt.where(self.model.collection_id == collection_id)

        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_collection(self, collection_name: str) -> Sequence[EmotionDefinition]:
        """Get all emotions in a collection by collection name."""
        stmt = (
            select(self.model)
            .join(EmotionCollection)
            .where(EmotionCollection.name == collection_name)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def find_nearest_neighbors(
        self,
        vector: List[float],
        vector_type: Literal["vac", "quaternion", "semantic"] = "vac",
        limit: int = 5,
        collection_id: Optional[UUID] = None,
    ) -> Sequence[Tuple[EmotionDefinition, float]]:
        """Find nearest neighbors using vector similarity.

        Args:
            vector: The query vector.
            vector_type: Which vector field to search ("vac", "quaternion", "semantic").
            limit: Maximum number of results.
            collection_id: Optional collection filter.

        Returns:
            List of (EmotionDefinition, distance) tuples.
        """
        # Select appropriate vector column and distance operator
        if vector_type == "vac":
            col = self.model.vac_vector
            # L2 distance for VAC (Euclidean)
            distance_expr = col.l2_distance(vector)
        elif vector_type == "quaternion":
            col = self.model.q_constant
            # L2 distance for Quaternions (roughly analogous to arc length for normalized quats)
            distance_expr = col.l2_distance(vector)
        elif vector_type == "semantic":
            col = self.model.semantic_embedding
            # Cosine distance for semantic embeddings
            distance_expr = col.cosine_distance(vector)
        else:
            raise ValueError(f"Invalid vector_type: {vector_type}")

        stmt = select(self.model, distance_expr.label("distance"))

        if collection_id:
            stmt = stmt.where(self.model.collection_id == collection_id)

        stmt = stmt.order_by("distance").limit(limit)

        result = await self.session.execute(stmt)
        # SQLAlchemy rows are tuple-like, but mypy might need help interpreting Row object
        return result.all()  # type: ignore
