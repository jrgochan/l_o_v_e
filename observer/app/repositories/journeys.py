"""Journey Repository.

Manages access to UserJourney and related models.
"""

from typing import Any, Dict, Optional, Sequence
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.transition import JourneyStartRequest
from app.models.transition_strategy import UserJourney
from app.repositories.base import BaseRepository


class JourneyRepository(BaseRepository[UserJourney, JourneyStartRequest, Dict[str, Any]]):
    """Repository for UserJourney."""

    def __init__(self, session: AsyncSession):
        """Initialize repository."""
        super().__init__(UserJourney, session)

    async def get_active_journey(self, user_id: UUID) -> Optional[UserJourney]:
        """Get the user's current active journey."""
        stmt = (
            select(self.model)
            .where(self.model.user_id == user_id)
            .where(self.model.status == "in_progress")
            .order_by(desc(self.model.created_at))
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_journey_history(
        self, user_id: UUID, limit: int = 10, offset: int = 0
    ) -> Sequence[UserJourney]:
        """Get user's journey history."""
        stmt = (
            select(self.model)
            .where(self.model.user_id == user_id)
            .order_by(desc(self.model.created_at))
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
