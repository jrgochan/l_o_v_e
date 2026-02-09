"""Module documentation."""

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from app.models.message_relationship import MessageRelationship
from app.models.multi_emotion_analysis import MultiEmotionAnalysis
from app.services.chat.analysis import AnalysisManager
from app.services.chat.messages import MessageManager
from app.services.chat.session import SessionManager
from app.services.chat.types import (
    AnalysisMessageContext,
    MessageCreationContext,
    MultiEmotionAnalysisContext,
)

logger = logging.getLogger(__name__)


class ChatService:
    """Service for managing chat sessions and messages.

    Orchestrates:
    - SessionManager: Lifecycle (create, end, update tone)
    - MessageManager: CRUD, threading, history
    - AnalysisManager: Deep Feeling Mode, analysis storage
    """

    def __init__(self, db: AsyncSession):
        """Initialize ChatService."""
        self.db = db
        self.session_manager = SessionManager(db)
        self.message_manager = MessageManager(db)
        self.analysis_manager = AnalysisManager(db)

    # --------------------------------------------------------------------------
    # Session Management
    # --------------------------------------------------------------------------
    async def create_session(
        self,
        user_id: str,
        tone_preference: str = "warm",
        auth_user_id: Optional[UUID] = None,
    ) -> ChatSession:
        """Create a new chat session."""
        return await self.session_manager.create_session(user_id, tone_preference, auth_user_id)

    async def get_session(self, session_id: UUID) -> Optional[ChatSession]:
        """Retrieve a chat session by ID."""
        return await self.session_manager.get_session(session_id)

    async def get_user_sessions(
        self, user_id: str, limit: int = 10, offset: int = 0
    ) -> List[ChatSession]:
        """Retrieve all sessions for a user."""
        return await self.session_manager.get_user_sessions(user_id, limit, offset)

    async def end_session(self, session_id: UUID) -> Optional[ChatSession]:
        """End a chat session."""
        return await self.session_manager.end_session(session_id)

    async def update_tone_preference(
        self, session_id: UUID, tone_preference: str
    ) -> Optional[ChatSession]:
        """Update tone preference for a session."""
        return await self.session_manager.update_tone_preference(session_id, tone_preference)

    async def update_deep_feeling_mode(
        self, session_id: UUID, enabled: bool
    ) -> Optional[ChatSession]:
        """Enable or disable Deep Feeling mode."""
        return await self.session_manager.update_deep_feeling_mode(session_id, enabled)

    async def delete_session(self, session_id: UUID) -> bool:
        """Delete a chat session."""
        return await self.session_manager.delete_session(session_id)

    # --------------------------------------------------------------------------
    # Message Management
    # --------------------------------------------------------------------------
    async def save_user_message(
        self,
        context: MessageCreationContext,
    ) -> ChatMessage:
        """Save a user message."""
        return await self.message_manager.save_user_message(context)

    async def create_message_relationship(
        self,
        source_id: UUID,
        target_id: UUID,
        relationship_type: str,
        relationship_metadata: Optional[Dict[str, Any]] = None,
    ) -> MessageRelationship:
        """Create a relationship between messages."""
        return await self.message_manager.create_message_relationship(
            source_id, target_id, relationship_type, relationship_metadata
        )

    async def get_message(self, message_id: UUID) -> Optional[ChatMessage]:
        """Retrieve a message by ID."""
        return await self.message_manager.get_message(message_id)

    async def get_message_thread(self, root_id: UUID, max_depth: int = 10) -> List[ChatMessage]:
        """Retrieve a message thread."""
        return await self.message_manager.get_message_thread(root_id, max_depth)

    async def get_message_relationships(
        self, message_id: UUID, direction: str = "outgoing"
    ) -> List[MessageRelationship]:
        """Retrieve relationships for a message."""
        return await self.message_manager.get_message_relationships(message_id, direction)

    async def get_session_messages(
        self,
        session_id: UUID,
        limit: Optional[int] = None,
        offset: int = 0,
        include_emotion: bool = True,
    ) -> List[Dict[str, Any]]:
        """Retrieve messages for a session."""
        return await self.message_manager.get_session_messages(
            session_id, limit, offset, include_emotion
        )

    async def get_recent_messages(self, session_id: UUID, count: int = 5) -> List[ChatMessage]:
        """Retrieve recent messages for a session."""
        return await self.message_manager.get_recent_messages(session_id, count)

    async def get_session_statistics(self, session_id: UUID) -> Dict[str, Any]:
        """Retrieve statistics for a session."""
        return await self.message_manager.get_session_statistics(session_id)

    # --------------------------------------------------------------------------
    # Analysis Management
    # --------------------------------------------------------------------------
    async def save_analysis_message(
        self,
        context: AnalysisMessageContext,
    ) -> ChatMessage:
        """Save an analysis message."""
        return await self.analysis_manager.save_analysis_message(context)

    async def save_insight_message(
        self, session_id: UUID, content: str, insights: Dict[str, Any], tone_mode: str
    ) -> ChatMessage:
        """Save an insight message."""
        return await self.analysis_manager.save_insight_message(
            session_id, content, insights, tone_mode
        )

    async def save_multi_emotion_analysis(
        self,
        context: MultiEmotionAnalysisContext,
    ) -> MultiEmotionAnalysis:
        """Save a multi-emotion analysis."""
        return await self.analysis_manager.save_multi_emotion_analysis(context)

    async def get_multi_emotion_analysis(self, message_id: UUID) -> Optional[Dict[str, Any]]:
        """Retrieve multi-emotion analysis for a message."""
        return await self.analysis_manager.get_multi_emotion_analysis(message_id)

    async def get_session_multi_emotion_history(
        self, session_id: UUID, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Retrieve multi-emotion history for a session."""
        return await self.analysis_manager.get_session_multi_emotion_history(session_id, limit)
