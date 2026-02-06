import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_session import ChatSession

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages chat session lifecycle."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session(
        self,
        user_id: str,
        tone_preference: str = "warm",
        auth_user_id: Optional[UUID] = None,
    ) -> ChatSession:
        """Create a new chat session."""
        session = ChatSession(
            user_id=user_id,
            tone_preference=tone_preference,
            auth_user_id=auth_user_id,
            started_at=datetime.utcnow(),
            deep_feeling_mode=False,
        )

        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)

        logger.info(
            "Created chat session %s for user %s (auth_user_id=%s)",
            session.id,
            user_id,
            auth_user_id,
        )
        return session

    async def get_session(self, session_id: UUID) -> Optional[ChatSession]:
        """Get a chat session by ID."""
        stmt = select(ChatSession).where(ChatSession.id == session_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_sessions(
        self, user_id: str, limit: int = 10, offset: int = 0
    ) -> List[ChatSession]:
        """Get chat sessions for a user."""
        stmt = (
            select(ChatSession)
            .where(ChatSession.user_id == user_id)
            .order_by(desc(ChatSession.started_at))
            .limit(limit)
            .offset(offset)
        )

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def end_session(self, session_id: UUID) -> Optional[ChatSession]:
        """End a chat session by setting ended_at timestamp."""
        session = await self.get_session(session_id)
        if session:
            session.ended_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(session)
            logger.info("Ended chat session %s", session_id)
        return session

    async def update_tone_preference(
        self, session_id: UUID, tone_preference: str
    ) -> Optional[ChatSession]:
        """Update the tone preference for a session."""
        session = await self.get_session(session_id)
        if session:
            session.tone_preference = tone_preference
            await self.db.commit()
            await self.db.refresh(session)
            logger.info(
                "Updated tone preference for session %s to %s",
                session_id,
                tone_preference,
            )
        return session

    async def update_deep_feeling_mode(
        self, session_id: UUID, enabled: bool
    ) -> Optional[ChatSession]:
        """Enable or disable Deep Feeling mode for a session."""
        session = await self.get_session(session_id)
        if session:
            session.deep_feeling_mode = enabled
            await self.db.commit()
            await self.db.refresh(session)
            logger.info("Updated deep_feeling_mode for session %s to %s", session_id, enabled)
        return session

    async def delete_session(self, session_id: UUID) -> bool:
        """Delete a session and all its messages (cascade)."""
        session = await self.get_session(session_id)
        if session:
            self.db.delete(session)
            await self.db.commit()
            logger.info("Deleted chat session %s", session_id)
            return True
        return False
