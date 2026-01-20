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
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_message import ChatMessage
from app.models.message_relationship import MessageRelationship
from app.services.embedding_service import EmbeddingService, get_embedding_service

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
        # 1. Fetch the message
        stmt = select(ChatMessage).where(ChatMessage.id == message_id)
        result = await session.execute(stmt)
        message = result.scalar_one_or_none()

        if not message or not message.content:
            logger.warning(f"Message {message_id} not found or empty content")
            return []

        # 2. Generate Embedding (if not present)
        # In a real flow, this might happen earlier, but we ensure it here.
        if not message.semantic_embedding:
            try:
                embedding = await self.embedding_service.generate_embedding(message.content)
                message.semantic_embedding = embedding
                # We save this update as part of the transaction
                session.add(message)
            except Exception as e:
                logger.error(f"Failed to generate embedding for message {message_id}: {e}")
                return []
        
        # 3. Search for Similar Messages
        # We look for messages from the SAME user (via session linkage)
        # Excluding the current message
        # Ordered by similarity
        
        # Note: pgvector uses <=> for cosine distance (lower is better)
        # Similarity = 1 - Distance
        # Threshold: Distance < (1 - self.similarity_threshold)
        
        distance_threshold = 1.0 - self.similarity_threshold
        
        # We need to join with ChatSession to ensure user isolation if needed,
        # but for now we assume session_id implies user context or we link globally for the user.
        # Let's filter by the same session for simplicity first, or better, same USER.
        # But we need user_id. Let's fetch it from the message's session.
        # Ideally, we should join ChatSession.
        
        # For this implementation, we'll assume we search across ALL messages for now (or same session).
        # To be safe and "future-proof", let's assume we want to link across the USER'S history.
        # We need to join ChatSession to verify user_id.
        
        # Lazy load session if not present (Async check)
        # Actually better to just do a join in the query.
        
        from app.models.chat_session import ChatSession
        
        # Get current user_id
        session_stmt = select(ChatSession.user_id).where(ChatSession.id == message.session_id)
        session_result = await session.execute(session_stmt)
        user_id = session_result.scalar_one_or_none()
        
        if not user_id:
            logger.warning(f"Could not determine user_id for message {message_id}")
            return []

        # Find similar messages using Cosine Distance
        # We need the distance to calculate the metadata score
        
        distance_threshold = 1.0 - self.similarity_threshold

        created_relationships = []

        # Refined Query with Distance
        query = (
            select(
                ChatMessage, 
                ChatMessage.semantic_embedding.cosine_distance(message.semantic_embedding).label("distance")
            )
            .join(ChatSession)
            .where(
                ChatSession.user_id == user_id,
                ChatMessage.id != message_id,
                ChatMessage.semantic_embedding.is_not(None)
            )
            .order_by("distance")
            .limit(self.max_links)
        )
        
        results_with_dist = await session.execute(query)
        matches = results_with_dist.all() # list of (ChatMessage, distance)
        
        for candidate, distance in matches:
            if distance > distance_threshold:
                continue # strictly closer than threshold
                
            # Create Relationship
            # Type: "semantic_similarity"
            # Metadata: capture score
            similarity_score = 1.0 - distance
            
            rel = MessageRelationship(
                source_message_id=message_id,
                target_message_id=candidate.id,
                relationship_type="semantic_similarity",
                metadata={"score": float(similarity_score), "auto_generated": True}
            )
            session.add(rel)
            created_relationships.append(rel)
            
        await session.commit()
        logger.info(f"Auto-linked message {message_id} to {len(created_relationships)} past messages.")
        
        return created_relationships

# Singleton
_association_engine = None

def get_association_engine() -> AssociationEngine:
    global _association_engine
    if _association_engine is None:
        _association_engine = AssociationEngine()
    return _association_engine
