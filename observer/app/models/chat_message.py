"""ChatMessage Model - Multi-Modal Conversation Message with Analysis.

Stores individual messages in therapeutic chat sessions combining user input (text/audio),
emotional analysis data (VAC, prosody), and AI-generated insights. Supports bidirectional
conversation flow with rich metadata for clinical review and pattern analysis.

Message Type Architecture:

    Four message types representing conversation flow::

        user_text
        ─────────
        Text-based user input

        Source: User types message in chat UI
        Content: Raw text string
        Analysis: Semantic VAC extraction

        Example:
        "I'm feeling really anxious about my presentation tomorrow"

        Processing:
        1. Receive text from WebSocket
        2. Send to Listener for semantic analysis
        3. Get back VAC coordinates + emotion classification
        4. Store message with analysis data

        user_audio
        ──────────
        Voice-based user input

        Source: User speaks into microphone
        Content: Audio file (WAV/MP3)
        Analysis: Transcription + prosody + semantic VAC

        Example:
        45-second voice message expressing concerns

        Processing:
        1. Receive audio via WebSocket
        2. Store audio temporarily
        3. Send to Listener for multi-modal analysis
        4. Get transcription + prosody + VAC
        5. Store message with full analysis

        system_analysis
        ───────────────
        Automated emotional state analysis

        Source: Observer's emotion detection
        Content: Analysis summary
        Analysis: Pre-computed (this IS the analysis)

        Example:
        "Current emotional state: Anxiety
         VAC: [-0.6, 0.7, -0.3]
         Confidence: 87%"

        Use: Logging analysis results for review

        system_insight
        ──────────────
        AI-generated therapeutic guidance

        Source: Observer's insight generator
        Content: Therapeutic response
        Analysis: Context-aware, tone-personalized

        Example (warm tone):
        "I hear that you're feeling anxious. It's completely
         normal to feel this way before presentations. Would
         you like to explore some grounding techniques?"

        Processing:
        1. Analyze user's emotional state
        2. Generate insight via LLM
        3. Apply tone preference (warm/clinical)
        4. Return to user via WebSocket

Prosody Data Storage:

    Voice characteristics from acoustic analysis::

        Scalar metrics:
        ──────────────
        prosody_pitch_mean: Average fundamental frequency (Hz)
        - Female typical: 180-250 Hz
        - Male typical: 100-150 Hz
        - Higher pitch: Excitement, anxiety, distress
        - Lower pitch: Sadness, depression, calm

        prosody_pitch_std: Pitch variation (Hz)
        - High variation: Emotional expressiveness
        - Low variation: Flat affect, depression
        - Clinical marker for mood assessment

        prosody_energy: Voice intensity/loudness
        - High energy: Arousal, activation
        - Low energy: Fatigue, withdrawal
        - Scaled 0-1 for consistency

        prosody_rate: Speech rate (syllables/second)
        - Fast (>6 syl/sec): Anxiety, mania, pressure
        - Slow (<3 syl/sec): Depression, processing
        - Normal: 4-5 syl/sec

        JSONB features (prosody_features):
        ───────────────────────────────────
        {
            "jitter": 1.2,        # Pitch variability % (anxiety marker)
            "shimmer": 3.4,       # Amplitude variability % (distress)
            "hnr": 15.8,          # Harmonics-to-Noise ratio dB (quality)
            "pitch_range": 120.0, # Frequency range Hz (expressiveness)
            "pauses_count": 8,    # Number of pauses (hesitation)
            "mean_pause_duration": 0.6  # Avg pause length sec
        }

        Clinical applications:
        - Jitter + Shimmer: Voice instability (anxiety/distress)
        - HNR: Voice quality (crying, strain)
        - Pitch range: Flat affect detection
        - Pauses: Hesitation, processing difficulty

VAC Coordinates Storage:

    Emotional state representation::

        vac_coordinates: ARRAY(Float)
        ─────────────────────────────
        [valence, arousal, connection]

        Each dimension -1 to +1:
        - Valence: Negative ← 0 → Positive
        - Arousal: Low ← 0 → High
        - Connection: Isolated ← 0 → Connected

        Example: Anxiety = [-0.6, 0.7, -0.3]
        → Negative valence (unpleasant)
        → High arousal (activated)
        → Low connection (isolated feeling)

        confidence: Float (0-1)
        ──────────────────────
        AI model's confidence in classification

        Interpretation:
        - >0.8: High confidence (trust analysis)
        - 0.6-0.8: Moderate (generally reliable)
        - <0.6: Low (manual review recommended)

        Used for:
        - Filtering unreliable analyses
        - Triggering low-confidence alerts
        - Weighting in aggregations

Insights JSON Structure:

    AI-generated therapeutic guidance::

        {
            "primary_insight": "You're experiencing anticipatory anxiety...",
            "observations": [
                "Voice shows elevated pitch and faster speech rate",
                "Words express concern about future performance"
            ],
            "suggestions": [
                {
                    "strategy": "Deep Breathing",
                    "rationale": "Can help regulate arousal quickly",
                    "difficulty": 1
                }
            ],
            "empathy_statement": "It's natural to feel nervous before presentations",
            "question": "What specific aspect worries you most?",
            "deep_feeling_content": {
                "enabled": true,
                "level": 2,
                "somatic_focus": "Notice where anxiety lives in your body"
            }
        }

        Tone adaptation:
        ───────────────
        Same insight, different tones:

        Warm: "I hear your anxiety about tomorrow..."
        Clinical: "Analysis indicates anticipatory anxiety..."

        Applied via tone_mode field

Message Chronology:

    Temporal ordering for conversation reconstruction::

        timestamp: TIMESTAMP indexed
        ──────────────────────────────
        Precise message time
        Used for:
        - Chronological ordering
        - Session timeline visualization
        - Response latency calculation
        - Pattern temporal analysis

        Query pattern:
        SELECT * FROM chat_messages
        WHERE session_id = ?
        ORDER BY timestamp ASC

        Returns full conversation in order

        Response latency measurement:
        ────────────────────────────
        user_message.timestamp: 10:15:23.450
        system_insight.timestamp: 10:15:25.830
        latency = 2.38 seconds

        Target: <3 seconds for good UX

Database Schema Highlights:

    Key fields and relationships::

        Foreign keys:
        ─────────────
        session_id → chat_sessions.id
        - CASCADE DELETE (remove with session)
        - Indexed for fast session queries

        emotion_id → atlas_definitions.id
        - Nullable (system messages have no emotion)
        - Indexed for emotion-based queries

        Content fields:
        ──────────────
        content: TEXT (user text or system response)
        audio_url: TEXT (S3/storage URL, never raw audio)
        transcription: TEXT (PII-stripped transcription)

        Analysis arrays:
        ───────────────
        vac_coordinates: ARRAY(Float) length 3
        - Direct PostgreSQL array type
        - Efficient storage
        - Queryable with array operators

        JSONB fields:
        ────────────
        prosody_features: JSONB (flexible acoustic features)
        insights: JSONB (structured AI responses)
        - Native PostgreSQL JSON
        - Queryable with -> and ->> operators
        - GIN indexable for fast queries

Performance Optimization:

    High-volume message storage::

        Growth estimates:
        ────────────────
        - 1000 users
        - 3 sessions per day
        - 20 messages per session
        - 60,000 messages/day
        - 22M messages/year

        Storage considerations:
        ──────────────────────
        - Partition by timestamp (monthly)
        - Archive old sessions
        - Compress audio files
        - Index on (session_id, timestamp)

        Query optimization:
        ──────────────────
        Most common: Get session messages
        SELECT * FROM chat_messages
        WHERE session_id = ?
        ORDER BY timestamp

        Performance: <10ms (partition pruning + index)

        Less common: Find messages by emotion
        SELECT * FROM chat_messages
        WHERE emotion_id = ?
        LIMIT 100

        Performance: 20-50ms (indexed)

Helper Properties:

    Convenience methods for message classification::

        is_user_message: bool
        ─────────────────────
        Returns True if message_type in ['user_text', 'user_audio']
        Use: Filter to only user inputs

        is_system_message: bool
        ───────────────────────
        Returns True if message_type in ['system_analysis', 'system_insight']
        Use: Filter to only AI responses

        has_prosody_data: bool
        ──────────────────────
        Returns True if prosody_pitch_mean is not None
        Use: Check if voice analysis available

        has_emotion_data: bool
        ──────────────────────
        Returns True if emotion_id and vac_coordinates present
        Use: Check if emotional analysis completed

Example Usage:

    Store user text message::

        message = ChatMessage(
            session_id=session.id,
            message_type='user_text',
            content="I'm worried about tomorrow",
            emotion_id=anxiety_emotion.id,
            vac_coordinates=[-0.6, 0.7, -0.3],
            confidence=0.87
        )
        db.add(message)
        await db.commit()

    Store user audio message with prosody::

        message = ChatMessage(
            session_id=session.id,
            message_type='user_audio',
            audio_url="s3://bucket/audio/msg_123.wav",
            transcription="I can't handle this anymore",
            emotion_id=overwhelm_emotion.id,
            vac_coordinates=[-0.8, 0.9, -0.5],
            confidence=0.82,
            prosody_pitch_mean=245.3,
            prosody_pitch_std=45.2,
            prosody_energy=0.78,
            prosody_rate=6.2,
            prosody_features={
                "jitter": 4.1,
                "shimmer": 7.3,
                "hnr": 8.2
            }
        )
        db.add(message)
        await db.commit()

    Store system insight::

        message = ChatMessage(
            session_id=session.id,
            message_type='system_insight',
            content="I hear that you're feeling overwhelmed...",
            tone_mode='warm',
            insights={
                "primary_insight": "User expressing overwhelm",
                "suggestions": [...]
            }
        )
        db.add(message)
        await db.commit()

    Query session conversation::

        stmt = select(ChatMessage).where(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp)

        messages = await db.execute(stmt)
        conversation = messages.scalars().all()

        # Reconstruct conversation flow
        for msg in conversation:
            if msg.is_user_message:
                print(f"User: {msg.content}")
            elif msg.is_system_message:
                print(f"AI: {msg.content}")

Integration Points:

    Central to conversation system::

        Created by:
        ──────────
        - WebSocket message handler
        - Chat service after analysis
        - Batch import from history

        Queried by:
        ──────────
        - Dashboard conversation view
        - History API
        - Analytics (message patterns)
        - Export/reporting

Design Decisions:

    Why store both audio_url and transcription?::

        Dual storage benefits:
        + Audio: Original source, prosody re-analysis
        + Transcription: Fast text search, display

        Privacy: Audio deleted after retention period
        Transcription: PII-stripped, kept longer

    Why ARRAY for VAC vs separate columns?::

        PostgreSQL ARRAY advantages:
        + Atomic storage (single field)
        + Array operators for queries
        + Easy serialization

        Alternative (valence/arousal/connection columns):
        + More normalized
        - More verbose queries
        - Harder to pass as unit

        Decision: ARRAY for convenience

    Why JSONB for insights vs normalized?::

        Schema flexibility:
        + Insights structure evolves
        + Different AI models vary
        + No migration churn
        + PostgreSQL JSONB is fast

        Decision: JSONB for flexibility

References:
    - WebSocket protocol: docs/modules/observer/senior-developers/05-websocket-realtime.md
    - Chat service: observer/app/services/chat_service.py
    - Prosody analysis: listener/app/services/prosody_analyzer.py
    - Insight generation: observer/app/services/insight_generator.py
    - PostgreSQL arrays: https://www.postgresql.org/docs/current/arrays.html
    - JSONB: https://www.postgresql.org/docs/current/datatype-json.html
"""

# pylint: disable=not-callable

from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.atlas_definition import AtlasDefinition
    from app.models.chat_session import ChatSession


class ChatMessage(Base):
    """Individual message within a chat session."""

    __tablename__ = "chat_messages"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        index=True,
    )
    timestamp: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)
    message_type: Mapped[str] = mapped_column(
        String(50)
    )  # 'user_text', 'user_audio', 'system_analysis', 'system_insight'

    # Content
    content: Mapped[Optional[str]] = mapped_column(Text)  # User message or system response text
    audio_url: Mapped[Optional[str]] = mapped_column(Text)  # URL to audio file (if applicable)
    transcription: Mapped[Optional[str]] = mapped_column(Text)  # Transcribed text from audio

    # Analysis data
    emotion_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("atlas_definitions.id"), index=True
    )
    vac_coordinates: Mapped[Optional[List[float]]] = mapped_column(
        ARRAY(Float)
    )  # [valence, arousal, connection]
    confidence: Mapped[Optional[float]] = mapped_column(Float)

    # Prosody data (voice characteristics)
    prosody_pitch_mean: Mapped[Optional[float]] = mapped_column(Float)
    prosody_pitch_std: Mapped[Optional[float]] = mapped_column(Float)
    prosody_energy: Mapped[Optional[float]] = mapped_column(Float)
    prosody_rate: Mapped[Optional[float]] = mapped_column(Float)  # Speech rate (syllables/sec)
    prosody_features: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB
    )  # Additional features: jitter, shimmer, HNR, etc.

    # Insights and reasoning
    insights: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)  # AI-generated insights
    tone_mode: Mapped[Optional[str]] = mapped_column(String(20))  # 'clinical' or 'warm'

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # Relationships
    session: Mapped["ChatSession"] = relationship(back_populates="messages")
    emotion: Mapped[Optional["AtlasDefinition"]] = relationship(foreign_keys=[emotion_id])

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return f"<ChatMessage {self.id} type={self.message_type} session={self.session_id}>"

    def to_dict(self, include_emotion: bool = False) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization.

        Args:
            include_emotion: Whether to include full emotion details
        """
        data = {
            "id": str(self.id),
            "session_id": str(self.session_id),
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "message_type": self.message_type,
            "content": self.content,
            "audio_url": self.audio_url,
            "transcription": self.transcription,
            "emotion_id": str(self.emotion_id) if self.emotion_id else None,
            "vac_coordinates": self.vac_coordinates,
            "confidence": self.confidence,
            "tone_mode": self.tone_mode,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

        # Add prosody data if available
        if self.prosody_pitch_mean is not None:
            prosody_dict: Dict[str, Any] = {
                "pitch_mean": self.prosody_pitch_mean,
                "pitch_std": self.prosody_pitch_std,
                "energy": self.prosody_energy,
                "rate": self.prosody_rate,
                "features": self.prosody_features,
            }
            data["prosody"] = prosody_dict  # type: ignore[assignment]

        # Add insights if available
        if self.insights:
            data["insights"] = self.insights  # type: ignore[assignment]

        # Include full emotion details if requested
        if include_emotion and self.emotion:
            emotion_dict: Dict[str, Any] = {
                "id": str(self.emotion.id),
                "name": self.emotion.emotion_name,
                "category": self.emotion.category,
                "definition": self.emotion.definition,
                "vac": (
                    [
                        float(self.emotion.vac_vector[0]),
                        float(self.emotion.vac_vector[1]),
                        float(self.emotion.vac_vector[2]),
                    ]
                    if self.emotion.vac_vector
                    else None
                ),
            }
            data["emotion"] = emotion_dict  # type: ignore[assignment]

        return data

    @property
    def is_user_message(self) -> bool:
        """Check if this is a user message (text or audio)."""
        return self.message_type in ["user_text", "user_audio"]

    @property
    def is_system_message(self) -> bool:
        """Check if this is a system-generated message."""
        return self.message_type in ["system_analysis", "system_insight"]

    @property
    def has_prosody_data(self) -> bool:
        """Check if prosody analysis data is available."""
        return self.prosody_pitch_mean is not None

    @property
    def has_emotion_data(self) -> bool:
        """Check if emotion analysis data is available."""
        return self.emotion_id is not None and self.vac_coordinates is not None
