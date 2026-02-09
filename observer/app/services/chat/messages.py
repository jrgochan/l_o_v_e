"""Module documentation."""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import desc, func, literal, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.models.chat_message import ChatMessage
from app.models.message_relationship import MessageRelationship
from app.services.chat.session import SessionManager
from app.services.chat.types import MessageCreationContext

logger = logging.getLogger(__name__)


class MessageManager:
    """Manages chat messages and relationships."""

    def __init__(self, db: AsyncSession):
        """Docstring."""
        self.db = db
        # We need SessionManager to update message counts
        self.session_manager = SessionManager(db)

    async def save_user_message(
        self,
        context: "MessageCreationContext",
    ) -> ChatMessage:
        """Save a user message (text or audio)."""
        message = ChatMessage(
            session_id=context.session_id,
            message_type=context.message_type,
            content=context.content,
            audio_url=context.audio_url,
            transcription=context.transcription,
            timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
        )

        self.db.add(message)

        # Update session message count
        session = await self.session_manager.get_session(context.session_id)
        if session:
            session.message_count += 1

        await self.db.commit()
        await self.db.refresh(message)

        logger.info("Saved user message %s to session %s", message.id, context.session_id)

        # Create relationship if requested
        if context.related_message_id:
            await self.create_message_relationship(
                source_id=message.id,
                target_id=context.related_message_id,
                relationship_type=context.relationship_type or "reply",
                relationship_metadata=context.relationship_metadata,
            )

        # Trigger Semantic Auto-Linking
        try:
            from app.services.memory.association import (  # pylint: disable=import-outside-toplevel
                get_association_engine,
            )

            engine = get_association_engine()
            # We await here for simplicity in this version.
            # In a high-scale env, this should be a BackgroundTask.
            await engine.auto_link(message.id, self.db)
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Auto-linking failed for message %s: %s", message.id, e)

        return message

    async def create_message_relationship(
        self,
        source_id: UUID,
        target_id: UUID,
        relationship_type: str,
        relationship_metadata: Optional[Dict[str, Any]] = None,
    ) -> MessageRelationship:
        """Create a relationship between two messages."""
        relationship = MessageRelationship(
            source_message_id=source_id,
            target_message_id=target_id,
            relationship_type=relationship_type,
            relationship_metadata=relationship_metadata,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )

        self.db.add(relationship)
        await self.db.commit()
        await self.db.refresh(relationship)

        logger.info(
            "Created relationship %s: %s -> %s (%s)",
            relationship.id,
            source_id,
            target_id,
            relationship_type,
        )
        return relationship

    async def get_message(self, message_id: UUID) -> Optional[ChatMessage]:
        """Fetch a single message by ID."""
        stmt = select(ChatMessage).where(ChatMessage.id == message_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_message_thread(self, root_id: UUID, max_depth: int = 10) -> List[ChatMessage]:
        """Fetch full conversation thread (descendants) using recursive CTE."""
        # Anchor: Relationships where target_id == root_id
        hierarchy = (
            select(
                MessageRelationship.source_message_id,
                MessageRelationship.target_message_id,
                literal(1).label("depth"),
            )
            .where(MessageRelationship.target_message_id == root_id)
            .cte(name="hierarchy", recursive=True)
        )

        parent = aliased(hierarchy, name="parent")
        child = aliased(MessageRelationship, name="child")

        hierarchy = hierarchy.union_all(
            select(
                child.source_message_id,
                child.target_message_id,
                (parent.c.depth + 1).label("depth"),
            )
            .where(child.target_message_id == parent.c.source_message_id)
            .where(parent.c.depth < max_depth)
        )

        stmt = (
            select(ChatMessage)
            .join(hierarchy, ChatMessage.id == hierarchy.c.source_message_id)
            .order_by(hierarchy.c.depth, ChatMessage.timestamp)
        )

        result = await self.db.execute(stmt)
        descendants = result.scalars().all()

        root = await self.get_message(root_id)

        if root:
            return [root] + list(descendants)
        return list(descendants)

    async def get_message_relationships(
        self, message_id: UUID, direction: str = "outgoing"
    ) -> List[MessageRelationship]:
        """Get relationships for a message."""
        if direction == "outgoing":
            stmt = select(MessageRelationship).where(
                MessageRelationship.source_message_id == message_id
            )
        else:
            stmt = select(MessageRelationship).where(
                MessageRelationship.target_message_id == message_id
            )

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_session_messages(
        self,
        session_id: UUID,
        limit: Optional[int] = None,
        offset: int = 0,
        include_emotion: bool = True,
    ) -> List[Dict[str, Any]]:
        """Get messages for a session."""
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.timestamp)
            .options(
                selectinload(ChatMessage.outgoing_relationships),
                selectinload(ChatMessage.multi_emotion_analysis),
            )
            .offset(offset)
        )

        if limit:
            stmt = stmt.limit(limit)

        result = await self.db.execute(stmt)
        messages = result.scalars().all()

        return [msg.to_dict(include_emotion=include_emotion) for msg in messages]

    async def get_recent_messages(self, session_id: UUID, count: int = 5) -> List[ChatMessage]:
        """Get the most recent messages from a session."""
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(desc(ChatMessage.timestamp))
            .limit(count)
        )

        result = await self.db.execute(stmt)
        messages = result.scalars().all()

        return list(reversed(messages))

    async def get_session_statistics(self, session_id: UUID) -> Dict[str, Any]:
        """Get statistics for a session."""
        session = await self.session_manager.get_session(session_id)
        if not session:
            return {}

        # Count messages by type
        count_stmt = (
            select(
                ChatMessage.message_type,
                func.count(ChatMessage.id).label("count"),  # pylint: disable=not-callable
            )
            .where(ChatMessage.session_id == session_id)
            .group_by(ChatMessage.message_type)
        )

        result = await self.db.execute(count_stmt)
        message_counts = {row[0]: row[1] for row in result}

        # Get detected emotions
        stmt = (
            select(ChatMessage.emotion_id)
            .where(ChatMessage.session_id == session_id)
            .where(ChatMessage.emotion_id.isnot(None))
        )

        result = await self.db.execute(stmt)
        emotion_ids = [row[0] for row in result]

        duration = None
        if session.ended_at and session.started_at:
            duration = (session.ended_at - session.started_at).total_seconds()

        return {
            "session_id": str(session_id),
            "total_messages": session.message_count,
            "message_counts": message_counts,
            "detected_emotions_count": len(emotion_ids),
            "unique_emotions": len(set(emotion_ids)),
            "duration_seconds": duration,
            "started_at": (session.started_at.isoformat() if session.started_at else None),
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        }
