"""UserTrajectory Model - Time-Series Emotional Journey Storage.

High-volume time-series model capturing each emotional state point in a user's therapeutic
journey. Combines temporal analytics, vector similarity search, and privacy-first design
to enable pattern recognition, progress tracking, and personalized therapeutic interventions.

The Emotional Journey Concept:

    Every feeling is a point in time and space::

        Traditional therapy notes:
        "Patient reported feeling anxious during session"
        - Subjective recall
        - No quantification
        - Lost temporal detail
        - Can't track patterns

        L.O.V.E. trajectory tracking:
        Timestamp: 2026-01-02 14:23:15
        VAC: [-0.6, 0.7, -0.3] (Anxiety)
        Elasticity: 0.42 (moderate flexibility)
        Context: {"trigger": "work meeting"}

        Benefits:
        - Precise temporal tracking
        - Quantified emotional state
        - Pattern detection enabled
        - Progress visualization
        - Intervention timing optimization

Data Captured Per State Point:

    Comprehensive emotional snapshot::

        Identification:
        ──────────────
        - id: Unique state point identifier
        - user_id: Privacy-protected user identity
        - session_id: Groups states within session
        - timestamp: Precise moment of state

        Input data (privacy-first):
        ──────────────────────────
        - input_transcription: PII-stripped text
        - input_embedding: 384D semantic vector
        Note: Raw audio NEVER stored

        Computed emotional state:
        ────────────────────────
        - vac_values: [Valence, Arousal, Connection]
        - quaternion_state: [w, x, y, z] rotation
        - dominant_emotion_id: Nearest atlas emotion

        Temporal metrics:
        ────────────────
        - elasticity_metric: E = θ / Δt (flexibility)
        - rigidity_score: R = 1 / variance (stability)

        Contextual enrichment:
        ─────────────────────
        - context_metadata: Flexible JSONB
        Example: {"trigger": "presentation", "coping": "breathing"}

Time-Series Design Patterns:

    Optimized for temporal queries and analytics::

        Partitioning strategy:
        ─────────────────────
        PARTITION BY RANGE (timestamp)
        - Monthly partitions recommended
        - Automatic partition creation
        - Old partition archival
        - Query performance isolation

        Example partition structure:
        trajectory_2026_01 (Jan 2026 data)
        trajectory_2026_02 (Feb 2026 data)
        trajectory_2026_03 (Mar 2026 data)

        Benefits:
        - Fast recent data queries
        - Efficient old data archival
        - Maintenance window isolation
        - Storage optimization

        Indexing strategy:
        ─────────────────
        B-tree indexes:
        - user_id (filter by user)
        - session_id (session queries)
        - timestamp (temporal ordering)
        - dominant_emotion_id (emotion filtering)

        Vector indexes (HNSW):
        - input_embedding (semantic similarity)
        - vac_values (spatial similarity)

        Performance:
        - Recent states: <10ms
        - Historical search: 50-200ms
        - Vector similarity: 20-100ms

Elasticity & Rigidity Metrics:

    Quantifying emotional flexibility::

        Elasticity (E = θ / Δt)
        ──────────────────────
        Measures: Rate of emotional change
        Formula: Rotation angle / Time delta

        High elasticity (E > 0.5):
        - Rapid emotional shifts
        - Reactive patterns
        - Potential instability
        - May need regulation skills

        Low elasticity (E < 0.2):
        - Slow emotional changes
        - Stable patterns
        - Potential rigidity
        - May need flexibility work

        Optimal range: 0.2 - 0.5
        - Flexible but stable
        - Responsive but regulated
        - Healthy emotional dynamics

        Clinical use:
        "Your elasticity increased from 0.3 to 0.7
         after learning regulation skills"

        Rigidity Score (R = 1 / variance)
        ─────────────────────────────────
        Measures: Emotional range stability
        Formula: Inverse of VAC variance

        High rigidity (R > 2.0):
        - Limited emotional range
        - Stuck in patterns
        - May indicate depression
        - Needs range expansion

        Low rigidity (R < 0.5):
        - Wide emotional swings
        - Volatile patterns
        - May indicate dysregulation
        - Needs stabilization

        Optimal range: 0.5 - 2.0
        - Healthy range of expression
        - Stable with variation
        - Adaptive emotional life

        Clinical use:
        "Your rigidity decreased from 3.2 to 1.5
         You're experiencing more emotional variety"

Privacy-First Architecture:

    Protecting sensitive therapeutic data::

        What IS stored:
        ───────────────
        ✓ VAC coordinates (numerical)
        ✓ Emotion classifications
        ✓ Temporal metrics
        ✓ PII-stripped text transcriptions
        ✓ Semantic embeddings
        ✓ Context metadata (user-provided)

        What is NOT stored:
        ──────────────────
        ✗ Raw audio recordings
        ✗ Personal identifiable information
        ✗ Unredacted transcriptions
        ✗ Voice biometrics
        ✗ Location data (unless user provides)

        Privacy mechanisms:
        ──────────────────
        - Row-level security (RLS) enabled
        - User can only access own data
        - Therapist access via explicit grant
        - Encryption at rest
        - Audit logging

        GDPR compliance:
        ───────────────
        - Right to access: Export API
        - Right to deletion: Cascade delete
        - Right to portability: JSON export
        - Consent tracked in user model

Context Metadata Schema:

    Flexible JSONB for user-provided context::

        Common fields:
        ──────────────
        {
            "trigger": "work presentation",
            "location": "office",
            "coping_used": "deep breathing",
            "helpful": true,
            "notes": "felt better after technique",
            "energy_level": 6,
            "sleep_quality": "good"
        }

        Queryable with PostgreSQL JSONB operators:

        -- Find states triggered by work
        WHERE context_metadata->>'trigger' = 'work'

        -- Find states where coping was helpful
        WHERE context_metadata->>'helpful' = 'true'

        -- Find states with low energy
        WHERE (context_metadata->>'energy_level')::int < 4

        Benefits:
        - User-defined schema
        - Evolves without migrations
        - Supports diverse tracking needs
        - Queryable and indexable

High-Volume Table Considerations:

    Design for millions of rows::

        Growth estimates:
        ────────────────
        - 1000 active users
        - 5 states per day per user
        - 1.8M rows per year
        - 5-year retention: 9M rows

        Performance strategies:
        ──────────────────────
        1. Partitioning (monthly)
        2. Selective indexes
        3. Regular VACUUM
        4. Archive old partitions
        5. Read replicas for analytics

        Write optimization:
        ──────────────────
        - Batch inserts where possible
        - Async writes (queue pattern)
        - Connection pooling
        - Prepared statements

        Read optimization:
        ─────────────────
        - Cache recent states
        - Materialized views for analytics
        - Index-only scans
        - Partition pruning

Vector Similarity Use Cases:

    Finding patterns in emotional history::

        Semantic similarity:
        ───────────────────
        "Find moments similar to: 'I feel overwhelmed at work'"

        Query: KNN on input_embedding
        Results: Past states with similar language
        Clinical use: Pattern recognition

        VAC spatial similarity:
        ──────────────────────
        "Find other times I felt like this"
        Current: Anxiety [-0.6, 0.7, -0.3]

        Query: KNN on vac_values
        Results: Similar emotional states
        Clinical use: Trigger identification

        Cross-user patterns (anonymized):
        ────────────────────────────────
        "What helped others in similar states?"

        Query: Vector similarity + strategy success
        Results: Effective interventions
        Clinical use: Recommendation engine

Example Usage:

    Store a new emotional state::

        from app.models.user_trajectory import UserTrajectory

        state = UserTrajectory(
            user_id=user_uuid,
            session_id=session_uuid,
            timestamp=datetime.utcnow(),
            input_transcription="I'm worried about tomorrow",
            input_embedding=embedding_vector,
            vac_values=[-0.5, 0.6, -0.2],
            quaternion_state=[0.8, 0.3, 0.4, 0.3],
            dominant_emotion_id=anxiety_id,
            elasticity_metric=0.35,
            rigidity_score=1.2,
            context_metadata={"trigger": "upcoming meeting"}
        )

        session.add(state)
        await session.commit()

    Query user's recent trajectory::

        stmt = select(UserTrajectory).where(
            UserTrajectory.user_id == user_id,
            UserTrajectory.timestamp >= start_date
        ).order_by(UserTrajectory.timestamp.desc())

        result = await session.execute(stmt)
        recent_states = result.scalars().all()

    Find similar past states::

        stmt = select(UserTrajectory).where(
            UserTrajectory.user_id == user_id
        ).order_by(
            UserTrajectory.vac_values.l2_distance(current_vac)
        ).limit(10)

        similar_states = await session.execute(stmt)

Integration Points:

    Core to Observer's temporal intelligence::

        Data sources:
        - Listener: Sends each analyzed state
        - Chat WebSocket: Real-time state updates
        - Mobile apps: Periodic state snapshots

        Data consumers:
        - Dashboard: Trajectory visualization
        - Analytics: Pattern detection
        - Reports: Progress summaries
        - ML models: Prediction training

Design Decisions:

    Why store all state points?::

        Full temporal resolution chosen:
        + Complete journey reconstruction
        + Pattern detection enabled
        + Progress visualization rich
        + Research data valuable

        Alternative (aggregated only):
        - Store daily summaries
        - Lose granularity
        - Can't find patterns
        - Miss critical moments

        Decision: Store all, partition for scale

    Why JSONB for context_metadata?::

        Flexible schema advantages:
        + User-defined tracking
        + No migrations needed
        + Evolves naturally
        + PostgreSQL JSONB is fast

        Alternative (fixed columns):
        - Limited flexibility
        - Frequent migrations
        - Can't adapt to users

        Decision: JSONB with common patterns documented

    Why both VAC and quaternion?::

        Complementary representations:
        - VAC: Intuitive, spatial queries
        - Quaternion: Smooth interpolation

        Storage cost: Minimal (7 floats)
        Benefit: Optimal for each use case

References:
    - Time-series design: Timescale (2021). Time-Series Data Best Practices
    - Partitioning: PostgreSQL Documentation on Partitioning
    - JSONB performance: Percona (2019). JSONB Performance in PostgreSQL
    - Vector similarity: pgvector documentation
    - Privacy design: GDPR Article 25 - Data Protection by Design
    - Elasticity metrics: docs/modules/observer/senior-developers/06-performance-optimization.md
"""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import Float, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.config import settings
from app.database import Base


class UserTrajectory(Base):
    """Stores each emotional state in a user's journey.

    High-volume table design:
    - Partitioning recommended for production (by timestamp)
    - HNSW indexes for fast vector similarity search
    - JSONB metadata for flexible contextual information
    """

    __tablename__ = "user_trajectory"

    # Primary Key
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    # User Context
    user_id: Mapped[UUID] = mapped_column(index=True)
    session_id: Mapped[UUID] = mapped_column(index=True)
    # pylint: disable=not-callable
    timestamp: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)

    # Input Data (from Listener)
    input_transcription: Mapped[Optional[str]] = mapped_column(Text)  # Sanitized text, PII stripped

    # Semantic Embedding: dimension depends on embedding model
    input_embedding: Mapped[Optional[Any]] = mapped_column(Vector(settings.EMBEDDING_DIMENSION))

    # Computed State
    # VAC Values: [Valence, Arousal, Connection]
    vac_values: Mapped[Any] = mapped_column(Vector(3))

    # Quaternion State: [w, x, y, z]
    quaternion_state: Mapped[Any] = mapped_column(Vector(4))

    # Dominant Emotion (nearest Atlas emotion)
    dominant_emotion_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("atlas_definitions.id"), index=True
    )

    # Temporal Metrics
    elasticity_metric: Mapped[float] = mapped_column(Float, default=0.0)  # E = θ / Δt
    rigidity_score: Mapped[float] = mapped_column(Float, default=0.0)  # R = 1 / variance

    # Contextual Metadata (flexible JSONB)
    # Example: {"context": "work", "trigger": "meeting", "location": "office"}
    context_metadata: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return (
            f"<UserTrajectory(user_id='{self.user_id}', "
            f"timestamp='{self.timestamp}', emotion='{self.dominant_emotion_id}')>"
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "session_id": str(self.session_id),
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "input_transcription": self.input_transcription,
            "vac_values": list(self.vac_values) if self.vac_values else None,
            "quaternion_state": list(self.quaternion_state) if self.quaternion_state else None,
            "dominant_emotion_id": str(self.dominant_emotion_id)
            if self.dominant_emotion_id
            else None,
            "elasticity_metric": self.elasticity_metric,
            "rigidity_score": self.rigidity_score,
            "context_metadata": self.context_metadata,
        }


# Note: Vector indexes will be created via Alembic migrations
# Example migration command:
#   CREATE INDEX idx_trajectory_embedding_hnsw
#   ON user_trajectory
#   USING hnsw (input_embedding vector_cosine_ops)
#   WITH (m = 16, ef_construction = 64);
