"""Chat Service.

Manages WebSocket chat sessions, message storage, and multi-emotion analysis for
Observer's real-time emotional guidance system. Supports both standard and Deep Feeling
Mode conversations with tone preference (warm/clinical).

Session Management:

    Chat sessions represent continuous conversations::

        Session Lifecycle:
        1. Create: User connects via WebSocket
        2. Active: Messages exchanged, analysis ongoing
        3. Ended: User disconnects or explicitly ends session

        Session Properties:
        - user_id: Who owns this session
        - tone_preference: 'warm' (empathetic) or 'clinical' (professional)
        - deep_feeling_mode: False (standard) or True (extended exploration)
        - message_count: Total messages in session
        - started_at / ended_at: Timestamps

Message Types:

    Three core message types stored::

        user_text / user_audio:
        - Content from user (text or transcribed audio)
        - Triggers analysis

        system_analysis:
        - Emotion detection results
        - VAC coordinates
        - Confidence scores
        - Prosody data (if voice input)

        system_insight:
        - Natural language insights
        - Recommendations
        - Gentle invitations or clinical recommendations

Deep Feeling Mode:

    Extended emotional exploration::

        Standard Mode:
        - Quick insights
        - Surface-level analysis
        - Action-oriented
        - Single dominant emotion

        Deep Feeling Mode:
        - Multi-emotion analysis (detect 2-3 emotions simultaneously)
        - Emotion relationships (complement, conflict, sequential)
        - Layered questioning
        - Process-oriented
        - Exploration depth tracking

        Example Deep Feeling Detection:
        "I'm feeling happy but also sad"
        → Joy (primary, 60% prominence)
        → Sadness (secondary, 40% prominence)
        → Relationship: Bittersweet (concurrent opposite valence)

Three-Way Analysis:

    For voice input, analyzes three perspectives::

        Content-Only Analysis:
        - Emotion from words alone
        - VAC from semantic meaning

        Voice-Only Analysis:
        - Emotion from prosody alone
        - VAC from vocal features

        Blended Analysis (Default):
        - Weighted combination (70% content, 30% voice)
        - Most accurate overall

        Discrepancy Detection:
        - If content and voice disagree significantly
        - May indicate suppression or incongruence
        - Clinical significance: "Your words say X but your voice suggests Y"

Example Usage:

    Create and manage session::

        service = ChatService(db_session)

        # Create session
        session = await service.create_session(
            user_id="user123",
            tone_preference="warm"
        )

        # Enable Deep Feeling Mode
        await service.update_deep_feeling_mode(session.id, enabled=True)

        # Save user message
        user_msg = await service.save_user_message(
            session_id=session.id,
            content="I'm feeling happy but also sad about my promotion"
        )

        # Save multi-emotion analysis (Deep Feeling Mode)
        analysis = await service.save_multi_emotion_analysis(
            message_id=user_msg.id,
            session_id=session.id,
            emotions=[
                {
                    "emotion_name": "Joy",
                    "confidence": 0.88,
                    "prominence": 0.6,
                    "vac": {"valence": 0.7, "arousal": 0.5, "connection": 0.6}
                },
                {
                    "emotion_name": "Sadness",
                    "confidence": 0.82,
                    "prominence": 0.4,
                    "vac": {"valence": -0.4, "arousal": -0.3, "connection": 0.2}
                }
            ],
            relationships=[
                {
                    "emotion_a": "Joy",
                    "emotion_b": "Sadness",
                    "type": "bittersweet",
                    "strength": 0.75,
                    "description": "Concurrent opposing valence - growth involves loss"
                }
            ],
            aggregate_vac=[0.2, 0.15, 0.45],
            complexity_score=0.72,
            emotional_clarity=0.65,
            temporal_pattern="concurrent"
        )

Message Retrieval Patterns:

    Different use cases::

        # Get full conversation (pagination)
        messages = await service.get_session_messages(
            session_id=session.id,
            limit=50,
            offset=0
        )

        # Get recent context (last 5 messages for context window)
        recent = await service.get_recent_messages(session.id, count=5)

        # Get session statistics
        stats = await service.get_session_statistics(session.id)
        # Returns: message counts, emotion diversity, duration

Performance:
    - Session creation: ~5ms (single INSERT)
    - Message save: ~10ms (INSERT + session UPDATE)
    - Message retrieval: ~5-15ms (depends on limit, indexed by session_id)
    - Multi-emotion analysis save: ~30-50ms (multiple INSERTs with relationships)
    - Session statistics: ~20ms (aggregation queries)

Database Structure:

    Tables used::

        chat_sessions:
        - id, user_id, tone_preference, deep_feeling_mode
        - started_at, ended_at, message_count

        chat_messages:
        - id, session_id, message_type
        - content, emotion_id, vac_coordinates
        - prosody_pitch_mean, prosody_energy, etc.
        - timestamp (indexed for ordering)

        multi_emotion_analysis:
        - id, message_id, session_id
        - aggregate_vac, complexity_score, emotional_clarity
        - temporal_pattern, three_way_enabled

        detected_emotions:
        - analysis_id, emotion_id, confidence, prominence

        emotion_relationships:
        - analysis_id, emotion_a_id, emotion_b_id
        - relationship_type, strength, description

Integration Points:

    Used by::

        - WebSocket endpoint: Session management, message handling
        - Insight Generator: Message context, tone preference
        - Experience UI: Chat history display
        - Clinical Dashboard: Session monitoring

    Calls::

        - AtlasMapper: Resolve emotion names to IDs
        - MultiEmotionAnalysis model: Deep Feeling Mode storage
        - Database: All CRUD operations

References:
    - WebSocket protocol: See docs/modules/observer/senior-developers/05-websocket-realtime.md
    - Deep Feeling Mode: User research findings (2025)
    - Multi-emotion detection: Cowen & Keltner (2017) on emotional granularity
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import desc, func, literal, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from app.models.message_relationship import MessageRelationship
from app.models.multi_emotion_analysis import (
    DetectedEmotion,
    EmotionRelationship,
    MultiEmotionAnalysis,
)
from app.services.atlas_mapper import AtlasMapper, MappingResult

logger = logging.getLogger(__name__)


class ChatService:
    """Service for managing chat sessions and messages."""

    def __init__(self, db: AsyncSession):
        """Initialize ChatService."""
        self.db = db

    async def create_session(
        self,
        user_id: str,
        tone_preference: str = "warm",
        auth_user_id: Optional[UUID] = None,
    ) -> ChatSession:
        """Create a new chat session.

        Args:
            user_id: User identifier (string)
            tone_preference: 'warm' or 'clinical'
            auth_user_id: Optional authenticated user UUID

        Returns:
            New ChatSession instance
        """
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
            f"Created chat session {session.id} for user {user_id} "
            f"(auth_user_id={auth_user_id})"
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
        """Get chat sessions for a user.

        Args:
            user_id: User identifier
            limit: Maximum number of sessions to return
            offset: Pagination offset

        Returns:
            List of ChatSession instances
        """
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
            logger.info(f"Ended chat session {session_id}")
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
            logger.info(f"Updated tone preference for session {session_id} to {tone_preference}")
        return session

    async def save_user_message(
        self,
        session_id: UUID,
        content: Optional[str] = None,
        audio_url: Optional[str] = None,
        transcription: Optional[str] = None,
        message_type: str = "user_text",
        related_message_id: Optional[UUID] = None,
        relationship_type: Optional[str] = None,
        relationship_metadata: Optional[Dict[str, Any]] = None,
    ) -> ChatMessage:
        """Save a user message (text or audio).

        Args:
            session_id: Session ID
            content: Text content
            audio_url: URL to audio file
            transcription: Transcribed text from audio
            message_type: 'user_text' or 'user_audio'
            related_message_id: Optional linked message ID
            relationship_type: Optional type of link (e.g. 'reply')
            relationship_metadata: Optional link metadata

        Returns:
            New ChatMessage instance
        """
        message = ChatMessage(
            session_id=session_id,
            message_type=message_type,
            content=content,
            audio_url=audio_url,
            transcription=transcription,
            timestamp=datetime.utcnow(),
        )

        self.db.add(message)

        # Update session message count
        session = await self.get_session(session_id)
        if session:
            session.message_count += 1

        await self.db.commit()
        await self.db.refresh(message)

        logger.info(f"Saved user message {message.id} to session {session_id}")

        # Create relationship if requested
        if related_message_id:
            await self.create_message_relationship(
                source_id=message.id,
                target_id=related_message_id,
                relationship_type=relationship_type or "reply",
                relationship_metadata=relationship_metadata,
            )

        # Trigger Semantic Auto-Linking
        try:
            from app.services.association_engine import get_association_engine
            
            engine = get_association_engine()
            # We await here for simplicity in this version. 
            # In a high-scale env, this should be a BackgroundTask.
            await engine.auto_link(message.id, self.db)
        except Exception as e:
            logger.error(f"Auto-linking failed for message {message.id}: {e}")

        return message

    async def create_message_relationship(
        self,
        source_id: UUID,
        target_id: UUID,
        relationship_type: str,
        relationship_metadata: Optional[Dict[str, Any]] = None,
    ) -> MessageRelationship:
        """Create a relationship between two messages.

        Args:
            source_id: The current message ID (child/later)
            target_id: The past message ID (parent/earlier)
            relationship_type: Type of link (e.g. 'reply', 'reference')
            relationship_metadata: Optional details

        Returns:
            New MessageRelationship instance
        """
        relationship = MessageRelationship(
            source_message_id=source_id,
            target_message_id=target_id,
            relationship_type=relationship_type,
            relationship_metadata=relationship_metadata,
            created_at=datetime.utcnow(),
        )

        self.db.add(relationship)
        await self.db.commit()
        await self.db.refresh(relationship)

        logger.info(
            f"Created relationship {relationship.id}: {source_id} -> {target_id} ({relationship_type})"
        )
        return relationship

    async def get_message_thread(self, root_id: UUID, max_depth: int = 10) -> List[ChatMessage]:
        """Fetch full conversation thread (descendants) using recursive CTE.
        
        Retrieves all messages that reply to the root message (directly or indirectly).
        Direction: Finds messages that have 'target_id' pointing to the current lineage.
        (Since Reply = Source -> Target, we traverse "backwards" from Target to Source).
        
        Args:
            root_id: The starting message ID (ancestor)
            max_depth: limit recursion depth
            
        Returns:
            List of ChatMessage objects in the thread
        """
        # We need the class for the CTE
        # Avoid circular imports if any, but models are usually safe here 
        # (ChatMessage already imported)
        
        # CTE Definition
        # Anchor: Relationships where target_id == root_id
        hierarchy = (
            select(
                MessageRelationship.source_message_id, 
                MessageRelationship.target_message_id,
                literal(1).label("depth")
            )
            .where(MessageRelationship.target_message_id == root_id)
            .cte(name="hierarchy", recursive=True)
        )
        
        # Recursive Member: Relationships targeting the sources found in previous step
        # hierarchy.c.source_message_id is the ID of the child message found.
        # We want relationships where target_id == child_id
        
        parent = aliased(hierarchy, name="parent")
        child = aliased(MessageRelationship, name="child")
        
        hierarchy = hierarchy.union_all(
            select(
                child.source_message_id, 
                child.target_message_id,
                (parent.c.depth + 1).label("depth")
            )
            .where(child.target_message_id == parent.c.source_message_id)
            .where(parent.c.depth < max_depth)
        )
        
        # Final selection: Get Messages that matches the source_ids in the CTE
        # Plus the root message itself? The method implies "Thread", often includes root.
        # Let's fetch descendants + root.
        
        # Helper stub for root (depth 0)
        # We can just fetch root separately or union ID list.
        # Let's fetch root + matched IDs.
        
        stmt = (
            select(ChatMessage)
            .join(hierarchy, ChatMessage.id == hierarchy.c.source_message_id)
            .order_by(hierarchy.c.depth, ChatMessage.timestamp)
        )
        
        # Fetch descendants
        result = await self.db.execute(stmt)
        descendants = result.scalars().all()
        
        # Fetch root
        root = await self.get_message(root_id)
        
        if root:
            # Return Root + Descendants
            return [root] + list(descendants)
        return list(descendants)

    async def get_message_relationships(
        self, message_id: UUID, direction: str = "outgoing"
    ) -> List[MessageRelationship]:
        """Get relationships for a message.
        
        Args:
            message_id: The message ID
            direction: 'outgoing' (links FROM this msg) or 'incoming' (links TO this msg)
        
        Returns:
            List of relationships
        """
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

    async def save_analysis_message(
        self,
        session_id: UUID,
        emotion_name: str,
        vac_coordinates: List[float],
        confidence: float,
        content: str,
        tone_mode: str,
        prosody_data: Optional[Dict[str, Any]] = None,
    ) -> ChatMessage:
        """Save an analysis message with emotion detection results.

        Args:
            session_id: Session ID
            emotion_name: Name of detected emotion
            vac_coordinates: [valence, arousal, connection]
            confidence: Confidence score (0-1)
            content: Analysis text
            tone_mode: 'clinical' or 'warm'
            prosody_data: Optional prosody analysis data

        Returns:
            New ChatMessage instance
        """
        # Find emotion ID from emotion name
        mapping = await self._resolve_emotion(emotion_name)

        emotion_id = None
        if mapping.atlas_id:
            from uuid import UUID

            emotion_id = UUID(mapping.atlas_id)
        else:
            logger.warning(f"Emotion not found: {emotion_name}")

        message = ChatMessage(
            session_id=session_id,
            message_type="system_analysis",
            content=content,
            emotion_id=emotion_id,
            original_emotion_name=mapping.original_name,
            match_method=mapping.match_method,
            match_confidence=mapping.match_confidence,
            vac_coordinates=vac_coordinates,
            confidence=confidence,
            tone_mode=tone_mode,
            timestamp=datetime.utcnow(),
        )

        # Add prosody data if provided
        if prosody_data:
            message.prosody_pitch_mean = prosody_data.get("pitch_mean")
            message.prosody_pitch_std = prosody_data.get("pitch_std")
            message.prosody_energy = prosody_data.get("energy")
            message.prosody_rate = prosody_data.get("rate")
            message.prosody_features = prosody_data.get("features", {})

        self.db.add(message)

        # Update session message count
        session = await self.get_session(session_id)
        if session:
            session.message_count += 1

        await self.db.commit()
        await self.db.refresh(message)

        logger.info(f"Saved analysis message {message.id} to session {session_id}")
        return message

    async def get_message(self, message_id: UUID) -> Optional[ChatMessage]:
        """Fetch a single message by ID.
        
        Args:
            message_id: Message ID
            
        Returns:
            ChatMessage or None
        """
        stmt = select(ChatMessage).where(ChatMessage.id == message_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def save_insight_message(
        self, session_id: UUID, content: str, insights: Dict[str, Any], tone_mode: str
    ) -> ChatMessage:
        """Save an insight message with AI-generated insights.

        Args:
            session_id: Session ID
            content: Insight text
            insights: Structured insights data
            tone_mode: 'clinical' or 'warm'

        Returns:
            New ChatMessage instance
        """
        message = ChatMessage(
            session_id=session_id,
            message_type="system_insight",
            content=content,
            insights=insights,
            tone_mode=tone_mode,
            timestamp=datetime.utcnow(),
        )

        self.db.add(message)

        # Update session message count
        session = await self.get_session(session_id)
        if session:
            session.message_count += 1

        await self.db.commit()
        await self.db.refresh(message)

        logger.info(f"Saved insight message {message.id} to session {session_id}")
        return message

    async def get_session_messages(
        self,
        session_id: UUID,
        limit: Optional[int] = None,
        offset: int = 0,
        include_emotion: bool = True,
    ) -> List[Dict[str, Any]]:
        """Get messages for a session.

        Args:
            session_id: Session ID
            limit: Maximum number of messages
            offset: Pagination offset
            include_emotion: Include full emotion details

        Returns:
            List of message dictionaries
        """
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.timestamp)
            .options(
                selectinload(ChatMessage.outgoing_relationships),  # Eager load relationships
                selectinload(ChatMessage.multi_emotion_analysis),  # Eager load deep feeling data
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

        # Reverse to get chronological order
        return list(reversed(messages))

    async def get_session_statistics(self, session_id: UUID) -> Dict[str, Any]:
        """Get statistics for a session.

        Returns:
            Dictionary with session statistics
        """
        session = await self.get_session(session_id)
        if not session:
            return {}

        # Count messages by type
        count_stmt = (
            # pylint: disable=not-callable
            select(ChatMessage.message_type, func.count(ChatMessage.id).label("count"))
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
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        }

    async def _resolve_emotion(self, emotion_name: str) -> MappingResult:
        """Resolve emotion name to Atlas emotion using AtlasMapper.

        Returns full mapping result including method and confidence.
        """
        # Use AtlasMapper for comprehensive matching
        atlas_mapper = AtlasMapper(self.db)
        return await atlas_mapper.map_emotion(emotion_name)

    async def delete_session(self, session_id: UUID) -> bool:
        """Delete a session and all its messages (cascade).

        Returns:
            True if deleted, False if not found
        """
        session = await self.get_session(session_id)
        if session:
            await self.db.delete(session)
            await self.db.commit()
            logger.info(f"Deleted chat session {session_id}")
            return True
        return False

    # ============================================================================
    # DEEP FEELING MODE - Multi-Emotion Analysis Methods
    # ============================================================================

    async def update_deep_feeling_mode(
        self, session_id: UUID, enabled: bool
    ) -> Optional[ChatSession]:
        """Enable or disable Deep Feeling mode for a session.

        Args:
            session_id: Session ID
            enabled: True to enable, False to disable

        Returns:
            Updated ChatSession or None
        """
        session = await self.get_session(session_id)
        if session:
            session.deep_feeling_mode = enabled
            await self.db.commit()
            await self.db.refresh(session)
            logger.info(f"Updated deep_feeling_mode for session {session_id} to {enabled}")
        return session

    async def save_multi_emotion_analysis(
        self,
        message_id: UUID,
        session_id: UUID,
        emotions: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]],
        aggregate_vac: List[float],
        complexity_score: float,
        emotional_clarity: float,
        temporal_pattern: str,
        three_way_data: Optional[Dict[str, Any]] = None,
    ) -> MultiEmotionAnalysis:
        """Save a multi-emotion analysis with all detected emotions and relationships.

        Args:
            message_id: Associated chat message ID
            session_id: Session ID
            emotions: List[Any] of detected emotions with prominence, confidence, VAC
            relationships: List[Any] of emotion relationships
            aggregate_vac: Weighted aggregate [valence, arousal, connection]
            complexity_score: Emotional complexity (0-1)
            emotional_clarity: How clear vs muddied (0-1)
            temporal_pattern: 'concurrent', 'sequential', or 'emerging'
            three_way_data: Optional 3-way analysis (content/voice/blended + discrepancy)

        Returns:
            MultiEmotionAnalysis instance
        """
        # ═══════════════════════════════════════════════════════════════════════
        # STEP 1: Create parent analysis record (Deep Feeling Mode)
        # ═══════════════════════════════════════════════════════════════════════
        # This is the container for all detected emotions and their relationships
        # Example: "I'm happy about the promotion but sad to leave my team"
        #   → 2 emotions: Joy (60% prominence), Sadness (40% prominence)
        #   → 1 relationship: Bittersweet (concurrent opposite valence)
        #   → Aggregate VAC: Weighted blend of both emotions
        analysis = MultiEmotionAnalysis(
            message_id=message_id,
            session_id=session_id,
            deep_feeling_enabled=True,  # This is Deep Feeling Mode analysis
            aggregate_vac=aggregate_vac,
            complexity_score=complexity_score,
            emotional_clarity=emotional_clarity,
            temporal_pattern=temporal_pattern,
            created_at=datetime.utcnow(),
        )

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 2: Add 3-way analysis data if voice input provided
        # ═══════════════════════════════════════════════════════════════════════
        # Three-way analysis compares:
        #   1. Content-only (words alone)
        #   2. Voice-only (prosody alone)
        #   3. Blended (70% content + 30% voice)
        #
        # Clinical significance: Detect incongruence
        #   Words: "I'm fine" → Joy
        #   Voice: Flat, low energy → Sadness
        #   Discrepancy → User may be suppressing or masking emotions
        if three_way_data:
            analysis.three_way_enabled = True
            analysis.content_only_data = three_way_data.get("content_only")
            analysis.voice_only_data = three_way_data.get("voice_only")
            analysis.discrepancy_metrics = three_way_data.get("discrepancy")
            logger.info(
                "Saving 3-way analysis data: "
                f"content={three_way_data.get('discrepancy', {}).get('content_primary')}, "
                f"voice={three_way_data.get('discrepancy', {}).get('voice_primary')}, "
                f"discrepancy={three_way_data.get('discrepancy', {}).get('content_voice_distance', 0):.3f}"
            )

        # Add to session and flush to get database-generated ID
        # Don't commit yet - we need to add child records first
        self.db.add(analysis)
        await self.db.flush()  # Get analysis.id for foreign key constraints

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 3: Save detected emotions and build in-memory mapping
        # ═══════════════════════════════════════════════════════════════════════
        # CRITICAL PATTERN: Build emotion_name → DetectedEmotion mapping
        # Why? Relationships reference emotion_a_id and emotion_b_id
        #      We need to look up DetectedEmotion IDs by name
        #      Without this map, we'd hit SQLAlchemy lazy-load issues
        #
        # Pattern: Build map BEFORE flushing relationships
        detected_emotions_map = {}  # emotion_name → DetectedEmotion instance

        for emotion_data in emotions:
            # Resolve emotion name to atlas ID (handles typos, variations)
            # Example: "joyful" → Joy, "anxious" → Anxiety
            mapping = await self._resolve_emotion(emotion_data["emotion_name"])

            emotion_id = None
            if mapping.atlas_id:
                from uuid import UUID

                emotion_id = UUID(mapping.atlas_id)

            # Create detected emotion record
            # prominence: Relative strength (all emotions sum to 1.0)
            # confidence: How sure we are this emotion is present (0-1)
            detected_emotion = DetectedEmotion(
                analysis_id=analysis.id,  # Foreign key to parent analysis
                emotion_id=emotion_id,  # Foreign key to atlas_definitions
                original_name=mapping.original_name,
                match_method=mapping.match_method,
                match_confidence=mapping.match_confidence,
                confidence=emotion_data["confidence"],
                prominence=emotion_data["prominence"],
                vac=[
                    emotion_data["vac"]["valence"],
                    emotion_data["vac"]["arousal"],
                    emotion_data["vac"]["connection"],
                ],
                voice_alignment=emotion_data.get("voice_alignment"),
                created_at=datetime.utcnow(),
            )

            self.db.add(detected_emotion)

            # ─── Build mapping for relationship step ───
            # Store by emotion NAME (not ID) because relationships
            # are specified as {"emotion_a": "Joy", "emotion_b": "Sadness"}
            # This lets us look up DetectedEmotion instances by name
            detected_emotions_map[emotion_data["emotion_name"]] = detected_emotion

        # Flush to get DetectedEmotion IDs before creating relationships
        await self.db.flush()

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 4: Save emotion relationships using mapping
        # ═══════════════════════════════════════════════════════════════════════
        # Relationships describe how emotions interact:
        #   - Bittersweet: Concurrent opposite valence (Joy + Sadness)
        #   - Anxiety-Anger Compound: Sequential (Worry → Frustration)
        #   - Conflicting: Competing emotions (Excitement vs Fear)
        #
        # Use the mapping built in Step 3 to avoid lazy-load queries
        for rel_data in relationships:
            # Look up DetectedEmotion instances from our in-memory map
            # This is O(1) dictionary lookup - no database query!
            detected_a = detected_emotions_map.get(rel_data["emotion_a"])
            detected_b = detected_emotions_map.get(rel_data["emotion_b"])

            if detected_a and detected_b:
                # Create relationship record linking two DetectedEmotions
                # relationship_type: 'bittersweet', 'compound', 'conflicting', etc.
                # strength: How strong is this relationship (0-1)
                relationship = EmotionRelationship(
                    analysis_id=analysis.id,
                    emotion_a_id=detected_a.id,  # From mapping (no query!)
                    emotion_b_id=detected_b.id,  # From mapping (no query!)
                    relationship_type=rel_data["type"],
                    strength=rel_data.get("strength", 0.5),
                    description=rel_data.get("description", ""),
                    created_at=datetime.utcnow(),
                )

                self.db.add(relationship)

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 5: Commit transaction and return
        # ═══════════════════════════════════════════════════════════════════════
        # All records saved in single transaction (atomic)
        # Refresh analysis to load computed fields
        await self.db.commit()
        await self.db.refresh(analysis)

        logger.info(
            f"Saved multi-emotion analysis {analysis.id} with "
            f"{len(emotions)} emotions and {len(relationships)} relationships"
        )

        return analysis

    async def get_multi_emotion_analysis(self, message_id: UUID) -> Optional[Dict[str, Any]]:
        """Get multi-emotion analysis for a message.

        Args:
            message_id: Chat message ID

        Returns:
            Analysis dict or None
        """
        stmt = select(MultiEmotionAnalysis).where(MultiEmotionAnalysis.message_id == message_id)

        result = await self.db.execute(stmt)
        analysis = result.scalar_one_or_none()

        if analysis:
            return analysis.to_dict(include_emotions=True, include_relationships=True)

        return None

    async def get_session_multi_emotion_history(
        self, session_id: UUID, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get multi-emotion analysis history for a session.

        Args:
            session_id: Session ID
            limit: Maximum number of analyses to return

        Returns:
            List of analysis dicts
        """
        stmt = (
            select(MultiEmotionAnalysis)
            .where(MultiEmotionAnalysis.session_id == session_id)
            .order_by(desc(MultiEmotionAnalysis.created_at))
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        analyses = result.scalars().all()

        return [
            analysis.to_dict(include_emotions=True, include_relationships=True)
            for analysis in analyses
        ]
