"""Association Engine Service.

This service implements the "Associative Memory" layer of the Observer.
It is responsible for:
1.  Vectorizing new messages using the EmbeddingService.
2.  Finding semantically and emotionally similar past messages.
3.  Creating "Soft Links" (MessageRelationships) between relevant moments.

Architecture:
    - Triggered asynchronously after message persistence.
    - Uses pgvector for efficient cosine similarity search.
    - Applies thresholds to prevent noise.
"""

import logging
from typing import List, Optional, cast
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_message import ChatMessage
from app.models.message_relationship import MessageRelationship
from app.services.ai.embeddings import EmbeddingService, get_embedding_service

logger = logging.getLogger(__name__)


class AssociationEngine:
    """Engine for discovering and linking related messages."""

    def __init__(self, embedding_service: Optional[EmbeddingService] = None):
        """Initialize association engine."""
        self.embedding_service = embedding_service or get_embedding_service()

        # Configuration (could move to settings)
        self.similarity_threshold = 0.80  # Cosine similarity threshold
        self.max_links = 3  # Maximum number of auto-links per message

    async def auto_link(self, message_id: UUID, session: AsyncSession) -> List[MessageRelationship]:
        """Automatically discover and link related messages.

        Args:
            message_id: ID of the newly created message
            session: Database session

        Returns:
            List of created MessageRelationship objects
        """
        # 1. Fetch the message and ensure embedding
        message = await self._get_message_with_embedding(message_id, session)
        if not message:
            return []

        # 2. Get User ID for isolation
        user_id = await self._get_user_id(message.session_id, session)
        if not user_id:
            logger.warning("Could not determine user_id for message %s", message_id)
            return []

        # 3. Find and link similar messages
        return await self._create_semantic_links(message, user_id, session)

    async def _get_message_with_embedding(
        self, message_id: UUID, session: AsyncSession
    ) -> Optional[ChatMessage]:
        """Fetch message and generate embedding if missing."""
        stmt = select(ChatMessage).where(ChatMessage.id == message_id)
        result = await session.execute(stmt)
        message = result.scalar_one_or_none()

        if not message or not message.content:
            logger.warning("Message %s not found or empty content", message_id)
            return None

        if not message.semantic_embedding:
            try:
                embedding = await self.embedding_service.generate_embedding(message.content)
                message.semantic_embedding = embedding
                session.add(message)
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.error("Failed to generate embedding for message %s: %s", message_id, e)
                return None

        return message

    async def _get_user_id(self, session_id: UUID, db_session: AsyncSession) -> Optional[UUID]:
        """Get user_id from chat session."""
        from app.models.chat_session import (  # pylint: disable=import-outside-toplevel
            ChatSession,
        )

        stmt = select(ChatSession.user_id).where(ChatSession.id == session_id)
        result = await db_session.execute(stmt)
        user_id = result.scalar_one_or_none()
        if user_id:
            return cast(UUID, user_id)  # sqlalchemy should return UUID if column is UUID
        return None

    async def _create_semantic_links(
        self, message: ChatMessage, user_id: UUID, session: AsyncSession
    ) -> List[MessageRelationship]:
        """Find similar messages and create links."""
        from app.models.chat_session import (  # pylint: disable=import-outside-toplevel
            ChatSession,
        )

        distance_threshold = 1.0 - self.similarity_threshold

        # Query for similar messages
        query = (
            select(
                ChatMessage,
                ChatMessage.semantic_embedding.cosine_distance(message.semantic_embedding).label(
                    "distance"
                ),
            )
            .join(ChatSession)
            .where(
                ChatSession.user_id == user_id,
                ChatMessage.id != message.id,
                ChatMessage.semantic_embedding.is_not(None),
            )
            .order_by("distance")
            .limit(self.max_links)
        )

        results_with_dist = await session.execute(query)
        matches = results_with_dist.all()

        created_relationships = []
        for candidate, distance in matches:
            if distance > distance_threshold:
                continue

            similarity_score = 1.0 - distance
            rel = MessageRelationship(
                source_message_id=message.id,
                target_message_id=candidate.id,
                relationship_type="semantic_similarity",
                metadata={"score": float(similarity_score), "auto_generated": True},
            )
            session.add(rel)
            created_relationships.append(rel)

        await session.commit()
        logger.info(
            "Auto-linked message %s to %d past messages.",
            message.id,
            len(created_relationships),
        )
        return created_relationships


# Singleton
_ASSOCIATION_ENGINE = None  # pylint: disable=invalid-name


def get_association_engine() -> AssociationEngine:
    """Get singleton instance of AssociationEngine."""
    global _ASSOCIATION_ENGINE  # pylint: disable=global-statement
    if _ASSOCIATION_ENGINE is None:
        _ASSOCIATION_ENGINE = AssociationEngine()
    return _ASSOCIATION_ENGINE
