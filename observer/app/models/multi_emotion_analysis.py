"""Multi-Emotion Analysis Models - Complex Emotional State Detection.

Comprehensive model suite for Deep Feeling Mode's multi-emotion detection, capturing
emotional complexity, ambivalence, masking patterns, and voice-content discrepancies.
Enables clinical-grade analysis of nuanced emotional states that single-emotion
classification misses.

Deep Feeling Mode Architecture:

    Three-model system for emotional complexity::

        1. MultiEmotionAnalysis
           ────────────────────
           Container for complete multi-emotion state

           Stores:
           - Aggregate VAC (weighted blend)
           - Complexity score (0-1)
           - Emotional clarity (0-1)
           - Temporal pattern (concurrent/sequential)
           - 3-way analysis data (content vs voice)

        2. DetectedEmotion
           ───────────────
           Individual emotion within analysis (1-3 emotions)

           Stores:
           - Emotion classification + confidence
           - Prominence (primary/secondary/underlying)
           - Individual VAC coordinates
           - Voice alignment score

        3. EmotionRelationship
           ───────────────────
           Pairwise relationships between detected emotions

           Types:
           - Complementary (naturally co-occur)
           - Contradictory (ambivalence)
           - Masking (defense mechanism)
           - Amplifying (cascade effect)
           - Sequential (progression)

Emotional Complexity Metrics:

    Quantifying psychological richness::

        complexity_score (0-1)
        ─────────────────────
        Measures: How complex the emotional state is

        Calculation:
        - 1 emotion: complexity = 0.0 (simple)
        - 2 emotions: complexity = 0.3-0.7 (moderate)
        - 3 emotions: complexity = 0.7-1.0 (complex)

        Factors that increase complexity:
        + Contradictory relationships
        + Wide VAC separation
        + Underlying emotions present
        + Voice-content discrepancy

        Clinical interpretation:
        Low (0-0.3): Clear, simple state
        Medium (0.3-0.7): Normal complexity
        High (0.7-1.0): Ambivalence, conflict, masking

        emotional_clarity (0-1)
        ──────────────────────
        Measures: How clearly emotions are expressed

        Calculation:
        - High confidence: Higher clarity
        - Low VAC variance: Higher clarity
        - Strong relationships: Higher clarity
        - Voice-content match: Higher clarity

        Inverse relationship with complexity:
        - Simple state: High clarity
        - Complex state: May have lower clarity

        Clinical interpretation:
        High clarity: User aware of feelings
        Low clarity: User confused, conflicted

        temporal_pattern
        ───────────────
        'concurrent': Emotions happening simultaneously
        'sequential': One leading to another
        'emerging': New emotion surfacing

        Clinical use: Understanding emotion evolution

Prominence Hierarchy:

    Three levels of emotional awareness::

        'primary' (Most prominent)
        ─────────────────────────
        The emotion user is most aware of
        Typically what they name first
        Highest confidence usually

        Example: "I'm angry about this"
        Primary: Anger (confidence: 0.89)

        Clinical: Surface emotion, immediate experience

        'secondary' (Also present)
        ─────────────────────────
        Emotions clearly present but less dominant
        User acknowledges when asked
        Moderate confidence

        Example: "I'm angry, but also confused"
        Primary: Anger (0.89)
        Secondary: Confusion (0.72)

        Clinical: Conscious emotional complexity

        'underlying' (Hidden deeper)
        ───────────────────────────
        Emotions detected but not consciously acknowledged
        May be masked by primary emotion
        Lower confidence or voice-detected

        Example (analysis reveals):
        Primary: Anger (0.89, from content)
        Underlying: Hurt (0.65, from voice prosody)

        Clinical: Defense mechanisms, emotional protection

3-Way Analysis (Content vs Voice):

    Detecting emotional suppression/incongruence::

        three_way_enabled: Boolean
        ──────────────────────────
        When True, analysis includes:
        1. Content-only emotion (semantic VAC)
        2. Voice-only emotion (prosody VAC)
        3. Blended emotion (weighted fusion)

        content_only_data: JSONB
        ───────────────────────
        {
            "emotion": "Calm",
            "vac": [0.5, -0.3, 0.4],
            "confidence": 0.78,
            "source": "semantic_analysis"
        }

        What user SAYS they feel

        voice_only_data: JSONB
        ─────────────────────
        {
            "emotion": "Anxiety",
            "vac": [-0.6, 0.7, -0.3],
            "confidence": 0.82,
            "source": "prosody_analysis"
        }

        What user's VOICE reveals

        discrepancy_metrics: JSONB
        ─────────────────────────
        {
            "euclidean_distance": 0.58,
            "severity": "warning",
            "interpretation": "Significant voice-content mismatch",
            "clinical_note": "User may be suppressing anxiety",
            "recommended_action": "Gently explore true feelings"
        }

        Clinical significance:
        High discrepancy → Emotional suppression
        Example: "I'm fine" with trembling voice

Aggregate VAC Calculation:

    Weighted fusion of multiple emotion VACs::

        Formula:

        aggregate_vac = Σ(emotion_i.vac × weight_i) / Σ(weight_i)

        Where weight is based on:
        - Confidence: Higher confidence = more weight
        - Prominence: Primary > Secondary > Underlying

        Example calculation:

        Emotion 1 (Primary, Anxiety):
        VAC = [-0.6, 0.7, -0.3], confidence = 0.85
        weight = 0.85 × 1.5 (primary boost) = 1.275

        Emotion 2 (Secondary, Excitement):
        VAC = [0.7, 0.8, 0.5], confidence = 0.72
        weight = 0.72 × 1.0 = 0.72

        Aggregate:
        weighted_sum = ([-0.6, 0.7, -0.3] × 1.275) +
                       ([0.7, 0.8, 0.5] × 0.72)
        total_weight = 1.275 + 0.72 = 1.995

        aggregate_vac = weighted_sum / 1.995
        Result: [0.09, 0.73, 0.06]

        Interpretation: Mixed state leaning anxious but activated

Emotion Relationship Storage:

    Capturing interaction patterns::

        relationship_type options:
        ─────────────────────────
        - 'complementary': Naturally co-occurring
        - 'contradictory': Creating ambivalence
        - 'masking': One hiding another
        - 'amplifying': One intensifying another
        - 'sequential': Temporal progression

        strength (0-1):
        ──────────────
        Confidence in relationship classification
        High strength: Well-established pattern
        Low strength: Uncertain relationship

        description (TEXT):
        ──────────────────
        Human-readable explanation
        Example: "Anger protecting deeper hurt"

        Clinical use:
        Identifies defense mechanisms automatically
        Guides therapeutic interventions

Database Schema Highlights:

    Normalized multi-emotion structure::

        MultiEmotionAnalysis (parent):
        ──────────────────────────────
        - One row per analysis
        - FK to message (optional)
        - FK to session (optional)
        - Aggregate metrics
        - 3-way analysis data

        DetectedEmotion (children 1-3):
        ───────────────────────────────
        - FK to analysis (CASCADE delete)
        - FK to atlas emotion
        - Individual VAC + confidence
        - Prominence classification

        EmotionRelationship (pairwise):
        ──────────────────────────────
        - FK to analysis (CASCADE delete)
        - FK to emotion_a (CASCADE delete)
        - FK to emotion_b (CASCADE delete)
        - Relationship type + strength

        EmotionGoal (future feature):
        ────────────────────────────
        - Goal tracking
        - Progress monitoring
        - Achievement celebration

Example Usage:

    Create multi-emotion analysis::

        from app.models.multi_emotion_analysis import (
            MultiEmotionAnalysis, DetectedEmotion, EmotionRelationship
        )

        # Create analysis container
        analysis = MultiEmotionAnalysis(
            session_id=session.id,
            message_id=message.id,
            deep_feeling_enabled=True,
            aggregate_vac=[0.09, 0.73, 0.06],
            complexity_score=0.62,
            emotional_clarity=0.71
        )
        db.add(analysis)
        await db.flush()  # Get analysis.id

        # Add detected emotions
        anxiety = DetectedEmotion(
            analysis_id=analysis.id,
            emotion_id=anxiety_emotion.id,
            confidence=0.85,
            prominence='primary',
            vac=[-0.6, 0.7, -0.3]
        )

        excitement = DetectedEmotion(
            analysis_id=analysis.id,
            emotion_id=excitement_emotion.id,
            confidence=0.72,
            prominence='secondary',
            vac=[0.7, 0.8, 0.5]
        )

        db.add_all([anxiety, excitement])
        await db.flush()

        # Add relationship
        relationship = EmotionRelationship(
            analysis_id=analysis.id,
            emotion_a_id=anxiety.id,
            emotion_b_id=excitement.id,
            relationship_type='contradictory',
            strength=0.78,
            description="Ambivalence about opportunity"
        )

        db.add(relationship)
        await db.commit()

    Query with relationships::

        stmt = select(MultiEmotionAnalysis).options(
            selectinload(MultiEmotionAnalysis.detected_emotions),
            selectinload(MultiEmotionAnalysis.emotion_relationships)
        ).where(MultiEmotionAnalysis.id == analysis_id)

        analysis = await db.execute(stmt)
        result = analysis.scalar_one()

        # Access properties
        print(f"Primary: {result.primary_emotion.emotion.emotion_name}")
        print(f"Secondary: {[e.emotion.emotion_name for e in result.secondary_emotions]}")
        print(f"Relationships: {len(result.emotion_relationships)}")

Integration Points:

    Deep Feeling Mode ecosystem::

        Created by:
        ──────────
        - Listener multi-emotion endpoint
        - ChatService with deep_feeling flag
        - Aggregate emotion service

        Queried by:
        ──────────
        - Dashboard (complexity visualization)
        - Chat history (relationship display)
        - Analytics (pattern trends)
        - Research (ambivalence studies)

Design Decisions:

    Why three separate models?::

        Normalized structure chosen:
        + Clear separation of concerns
        + Flexible emotion count (1-3)
        + Relationship integrity
        + SQLAlchemy relationships natural

        Alternative (single denormalized):
        - JSONB with all emotions
        - No referential integrity
        - Complex queries

        Decision: Normalized for data integrity

    Why CASCADE delete?::

        Data lifecycle management:
        + Delete analysis → delete emotions
        + Delete emotions → delete relationships
        + Clean garbage collection
        + Referential integrity maintained

        Prevents orphaned data

    Why store both individual and aggregate VAC?::

        Different use cases:
        + Individual: Understand each emotion
        + Aggregate: Overall state for pathfinding

        Aggregate used for:
        - Journey starting point
        - Pattern matching
        - Trend analysis

References:
    - Deep Feeling Mode: docs/features/deep-feeling/README.md
    - Multi-emotion service: observer/app/services/aggregate_emotion_service.py
    - Emotion relationships: observer/app/services/emotion_relationship_service.py
    - 3-way analysis: listener/app/services/multi_emotion_analyzer.py
    - Ambivalence research: Larsen & McGraw (2011). Further evidence for mixed emotions
"""

# pylint: disable=not-callable

from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.atlas_definition import AtlasDefinition
    from app.models.chat_message import ChatMessage
    from app.models.chat_session import ChatSession


class MultiEmotionAnalysis(Base):
    """Stores comprehensive multi-emotion analysis with aggregate emotional state.

    Each analysis can have 1-3 detected emotions with relationships between them.
    """

    __tablename__ = "multi_emotion_analyses"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    message_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("chat_messages.id", ondelete="CASCADE"),
        index=True,
    )
    session_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        index=True,
    )
    deep_feeling_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # Aggregate emotional state
    aggregate_vac: Mapped[Optional[List[float]]] = mapped_column(
        ARRAY(Float)
    )  # [valence, arousal, connection]
    complexity_score: Mapped[Optional[float]] = mapped_column(Float)  # 0-1, higher = more complex
    emotional_clarity: Mapped[Optional[float]] = mapped_column(Float)  # 0-1, higher = clearer

    # Temporal pattern
    temporal_pattern: Mapped[Optional[str]] = mapped_column(
        String(50)
    )  # 'concurrent', 'sequential', 'emerging'

    # 3-Way Analysis (content-only, voice-only, blended)
    three_way_enabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    content_only_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB
    )  # Content-only emotion analysis
    voice_only_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB
    )  # Voice-only emotion analysis
    discrepancy_metrics: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB
    )  # Discrepancy calculations and clinical flags

    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)

    # Relationships
    detected_emotions: Mapped[List["DetectedEmotion"]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan", lazy="selectin"
    )
    emotion_relationships: Mapped[List["EmotionRelationship"]] = relationship(
        back_populates="analysis",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    message: Mapped[Optional["ChatMessage"]] = relationship(
        foreign_keys=[message_id], back_populates="multi_emotion_analysis"
    )
    session: Mapped[Optional["ChatSession"]] = relationship(foreign_keys=[session_id])

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return f"<MultiEmotionAnalysis {self.id} emotions={len(self.detected_emotions)}>"

    def to_dict(
        self, include_emotions: bool = True, include_relationships: bool = True
    ) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization.

        Args:
            include_emotions: Include full emotion details
            include_relationships: Include relationship details
        """
        data = {
            "id": str(self.id),
            "message_id": str(self.message_id) if self.message_id else None,
            "session_id": str(self.session_id) if self.session_id else None,
            "deep_feeling_enabled": self.deep_feeling_enabled,
            "aggregate_vac": (
                {
                    "valence": self.aggregate_vac[0] if self.aggregate_vac else 0.0,
                    "arousal": self.aggregate_vac[1] if self.aggregate_vac else 0.0,
                    "connection": self.aggregate_vac[2] if self.aggregate_vac else 0.0,
                }
                if self.aggregate_vac
                else None
            ),
            "complexity_score": self.complexity_score,
            "emotional_clarity": self.emotional_clarity,
            "temporal_pattern": self.temporal_pattern,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "emotion_count": len(self.detected_emotions) if self.detected_emotions else 0,
            # 3-way analysis data
            "three_way_enabled": self.three_way_enabled,
            "content_only_data": self.content_only_data,
            "voice_only_data": self.voice_only_data,
            "discrepancy_metrics": self.discrepancy_metrics,
        }

        if include_emotions and self.detected_emotions:
            emotions_list: List[Dict[str, Any]] = [
                emotion.to_dict() for emotion in self.detected_emotions
            ]
            data["emotions"] = emotions_list  # type: ignore[assignment]

        if include_relationships and self.emotion_relationships:
            relationships_list: List[Dict[str, Any]] = [
                rel.to_dict() for rel in self.emotion_relationships
            ]
            data["relationships"] = relationships_list  # type: ignore[assignment]

        return data

    @property
    def primary_emotion(self) -> Optional["DetectedEmotion"]:
        """Get the primary emotion (highest prominence)."""
        if not self.detected_emotions:
            return None
        for emotion in self.detected_emotions:
            if emotion.prominence == "primary":
                return emotion
        # Fallback: return first emotion
        return self.detected_emotions[0]

    @property
    def secondary_emotions(self) -> List["DetectedEmotion"]:
        """Get all secondary emotions."""
        if not self.detected_emotions:
            return []
        return [e for e in self.detected_emotions if e.prominence == "secondary"]

    @property
    def underlying_emotions(self) -> List["DetectedEmotion"]:
        """Get all underlying emotions."""
        if not self.detected_emotions:
            return []
        return [e for e in self.detected_emotions if e.prominence == "underlying"]


class DetectedEmotion(Base):
    """Individual emotion detected in a multi-emotion analysis.

    Each analysis can have 1-3 emotions with varying prominence levels.
    """

    __tablename__ = "detected_emotions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    analysis_id: Mapped[UUID] = mapped_column(
        ForeignKey("multi_emotion_analyses.id", ondelete="CASCADE"),
        index=True,
    )
    emotion_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("atlas_definitions.id"), index=True
    )

    # Detection data
    confidence: Mapped[float] = mapped_column(Float)  # 0-1
    prominence: Mapped[str] = mapped_column(
        String(20), index=True
    )  # 'primary', 'secondary', 'underlying'
    vac: Mapped[List[float]] = mapped_column(ARRAY(Float))  # [valence, arousal, connection]

    # Mapping Details
    original_name: Mapped[Optional[str]] = mapped_column(String(100))
    match_method: Mapped[Optional[str]] = mapped_column(String(50))
    match_confidence: Mapped[Optional[float]] = mapped_column(Float)

    # Voice-content alignment
    voice_alignment: Mapped[Optional[float]] = mapped_column(Float)  # 0-1, how well voice matches
    voice_interpretation_vac: Mapped[Optional[List[float]]] = mapped_column(
        ARRAY(Float)
    )  # VAC from voice-only

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # Relationships
    analysis: Mapped["MultiEmotionAnalysis"] = relationship(back_populates="detected_emotions")
    emotion: Mapped[Optional["AtlasDefinition"]] = relationship(foreign_keys=[emotion_id])

    # Relationships where this emotion is emotion_a or emotion_b
    relationships_as_a: Mapped[List["EmotionRelationship"]] = relationship(
        foreign_keys="EmotionRelationship.emotion_a_id",
        back_populates="emotion_a",
        cascade="all, delete-orphan",
    )
    relationships_as_b: Mapped[List["EmotionRelationship"]] = relationship(
        foreign_keys="EmotionRelationship.emotion_b_id",
        back_populates="emotion_b",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        """Represent the object as a string."""
        emotion_name = self.emotion.emotion_name if self.emotion else "Unknown"
        return f"<DetectedEmotion {emotion_name} {self.prominence} {self.confidence:.2f}>"

    def to_dict(self, include_emotion_details: bool = True) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        data = {
            "id": str(self.id),
            "analysis_id": str(self.analysis_id),
            "emotion_id": str(self.emotion_id) if self.emotion_id else None,
            "confidence": self.confidence,
            "prominence": self.prominence,
            "vac": (
                {
                    "valence": self.vac[0] if self.vac else 0.0,
                    "arousal": self.vac[1] if self.vac else 0.0,
                    "connection": self.vac[2] if self.vac else 0.0,
                }
                if self.vac
                else None
            ),
            "original_name": self.original_name,
            "match_method": self.match_method,
            "match_confidence": self.match_confidence,
            "voice_alignment": self.voice_alignment,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

        # Add voice interpretation VAC if available
        if self.voice_interpretation_vac:
            voice_vac_dict: Dict[str, Any] = {
                "valence": self.voice_interpretation_vac[0],
                "arousal": self.voice_interpretation_vac[1],
                "connection": self.voice_interpretation_vac[2],
            }
            data["voice_interpretation_vac"] = voice_vac_dict

        # Include emotion details if requested
        if include_emotion_details and self.emotion:
            emotion_detail_dict: Dict[str, Any] = {
                "id": str(self.emotion.id),
                "name": self.emotion.emotion_name,
                "category": self.emotion.category,
                "definition": self.emotion.definition,
                "atlas_vac": (
                    [
                        float(self.emotion.vac_vector[0]),
                        float(self.emotion.vac_vector[1]),
                        float(self.emotion.vac_vector[2]),
                    ]
                    if self.emotion.vac_vector
                    else None
                ),
            }
            data["emotion"] = emotion_detail_dict

        return data

    @property
    def is_primary(self) -> bool:
        """Check if this is the primary emotion."""
        return bool(self.prominence == "primary")

    @property
    def is_secondary(self) -> bool:
        """Check if this is a secondary emotion."""
        return bool(self.prominence == "secondary")

    @property
    def is_underlying(self) -> bool:
        """Check if this is an underlying emotion."""
        return bool(self.prominence == "underlying")


class EmotionRelationship(Base):
    """Relationship between two detected emotions.

    Describes how emotions interact: complementary, contradictory, masking, etc.
    """

    __tablename__ = "emotion_relationships"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    analysis_id: Mapped[UUID] = mapped_column(
        ForeignKey("multi_emotion_analyses.id", ondelete="CASCADE"),
        index=True,
    )
    emotion_a_id: Mapped[UUID] = mapped_column(
        ForeignKey("detected_emotions.id", ondelete="CASCADE")
    )
    emotion_b_id: Mapped[UUID] = mapped_column(
        ForeignKey("detected_emotions.id", ondelete="CASCADE")
    )

    # Relationship data
    relationship_type: Mapped[str] = mapped_column(String(50), index=True)
    # Types: 'complementary', 'contradictory', 'masking', 'amplifying', 'sequential'
    strength: Mapped[Optional[float]] = mapped_column(Float)  # 0-1
    description: Mapped[Optional[str]] = mapped_column(Text)  # Human-readable explanation

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # Relationships
    analysis: Mapped["MultiEmotionAnalysis"] = relationship(back_populates="emotion_relationships")
    emotion_a: Mapped["DetectedEmotion"] = relationship(
        foreign_keys=[emotion_a_id], back_populates="relationships_as_a"
    )
    emotion_b: Mapped["DetectedEmotion"] = relationship(
        foreign_keys=[emotion_b_id], back_populates="relationships_as_b"
    )

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return f"<EmotionRelationship {self.relationship_type} strength={self.strength:.2f}>"

    def to_dict(self, include_emotions: bool = True) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        data = {
            "id": str(self.id),
            "analysis_id": str(self.analysis_id),
            "emotion_a_id": str(self.emotion_a_id),
            "emotion_b_id": str(self.emotion_b_id),
            "type": self.relationship_type,
            "strength": self.strength,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

        if include_emotions:
            if self.emotion_a:
                data["emotion_a"] = self.emotion_a.to_dict(include_emotion_details=True)  # type: ignore[assignment]
            if self.emotion_b:
                data["emotion_b"] = self.emotion_b.to_dict(include_emotion_details=True)  # type: ignore[assignment]

        return data

    @property
    def is_complementary(self) -> bool:
        """Check if emotions complement each other."""
        return bool(self.relationship_type == "complementary")

    @property
    def is_contradictory(self) -> bool:
        """Check if emotions contradict each other."""
        return bool(self.relationship_type == "contradictory")

    @property
    def is_masking(self) -> bool:
        """Check if one emotion is masking another."""
        return bool(self.relationship_type == "masking")

    @property
    def is_amplifying(self) -> bool:
        """Check if one emotion amplifies another."""
        return bool(self.relationship_type == "amplifying")

    @property
    def is_sequential(self) -> bool:
        """Check if emotions occur in sequence."""
        return bool(self.relationship_type == "sequential")


class EmotionGoal(Base):
    """User-defined goal emotion for pathfinding.

    Allows users to set target emotions and track progress toward them.
    (Future feature - Phase 5)
    """

    __tablename__ = "emotion_goals"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[str] = mapped_column(String(255), index=True)

    # Goal definition
    goal_emotion_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("atlas_definitions.id"))
    priority: Mapped[int] = mapped_column(Integer, default=1)  # For multiple goals
    target_date: Mapped[Optional[datetime]] = mapped_column()

    # Status
    status: Mapped[str] = mapped_column(
        String(50), default="active", index=True
    )  # 'active', 'achieved', 'abandoned'

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    # Relationships
    session: Mapped[Optional["ChatSession"]] = relationship(foreign_keys=[session_id])
    goal_emotion: Mapped[Optional["AtlasDefinition"]] = relationship(foreign_keys=[goal_emotion_id])

    def __repr__(self) -> str:
        """Represent the object as a string."""
        emotion_name = self.goal_emotion.emotion_name if self.goal_emotion else "Unknown"
        return f"<EmotionGoal {emotion_name} {self.status}>"

    def to_dict(self, include_emotion_details: bool = True) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        data = {
            "id": str(self.id),
            "session_id": str(self.session_id),
            "user_id": self.user_id,
            "goal_emotion_id": str(self.goal_emotion_id) if self.goal_emotion_id else None,
            "priority": self.priority,
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_emotion_details and self.goal_emotion:
            goal_emotion_dict: Dict[str, Any] = {
                "id": str(self.goal_emotion.id),
                "name": self.goal_emotion.emotion_name,
                "category": self.goal_emotion.category,
                "definition": self.goal_emotion.definition,
                "vac": (
                    [
                        float(self.goal_emotion.vac_vector[0]),
                        float(self.goal_emotion.vac_vector[1]),
                        float(self.goal_emotion.vac_vector[2]),
                    ]
                    if self.goal_emotion.vac_vector
                    else None
                ),
            }
            data["goal_emotion"] = goal_emotion_dict  # type: ignore[assignment]

        return data

    @property
    def is_active(self) -> bool:
        """Check if goal is currently active."""
        return bool(self.status == "active")

    @property
    def is_achieved(self) -> bool:
        """Check if goal has been achieved."""
        return bool(self.status == "achieved")

    @property
    def is_abandoned(self) -> bool:
        """Check if goal has been abandoned."""
        return bool(self.status == "abandoned")
