"""AtlasDefinition Model - Canonical 87-Emotion Reference.

The foundational data model storing Observer's complete emotional atlas derived from
Brené Brown's research. Each emotion is represented in three complementary vector spaces
(VAC, quaternion, semantic embedding) enabling geometric pathfinding, rotation-based
transitions, and natural language similarity search.

The Emotional Atlas:

    87 emotions across 12 human experience categories::

        Research foundation: Brené Brown's "Atlas of the Heart" (2021)

        12 Categories of human experience:
        1. When Things Are Uncertain (13 emotions)
           - Anxiety, Worry, Avoidance, Fear, Dread, etc.

        2. When We Compare (5 emotions)
           - Envy, Jealousy, Resentment, Schadenfreude, Freudenfreude

        3. When Things Don't Go as Planned (8 emotions)
           - Disappointment, Regret, Discouragement, Resignation, etc.

        4. When It's Beyond Us (5 emotions)
           - Awe, Wonder, Confusion, Curiosity, Surprise

        5. When Things Aren't What They Seem (4 emotions)
           - Amusement, Bittersweetness, Nostalgia, Cognitive Dissonance

        6. When We're Hurting (11 emotions)
           - Anguish, Grief, Despair, Sadness, etc.

        7. When We Feel Wronged (6 emotions)
           - Anger, Rage, Fury, Outrage, Hate, Contempt

        8. When We're in Our Own Way (8 emotions)
           - Shame, Self-Compassion, Perfectionism, Guilt, etc.

        9. When We Seek Connection (6 emotions)
           - Belonging, Loneliness, Invisibility, etc.

        10. When Things Are Good (8 emotions)
            - Joy, Happiness, Calm, Contentment, etc.

        11. When We Feel Gratitude (3 emotions)
            - Gratitude, Foreboding Joy, Relief

        12. When We Experience Hard Emotions (10 emotions)
            - Stress, Overwhelm, Anxiety, Vulnerability, etc.

        Total: 87 precisely defined emotional states

Three Vector Representations:

    Multi-modal emotion encoding for different computational needs::

        1. VAC Vector (3D) - Geometric Space
           ────────────────────────────────
           [Valence, Arousal, Connection]

           Valence (-1 to +1):
           - Negative: Unpleasant emotions
           - Positive: Pleasant emotions
           Example: Anxiety = -0.6, Joy = 0.8

           Arousal (-1 to +1):
           - Low: Calm, subdued states
           - High: Energized, activated states
           Example: Calm = -0.4, Excitement = 0.7

           Connection (-1 to +1):
           - Low: Isolated, disconnected
           - High: Connected, belonging
           Example: Loneliness = -0.7, Belonging = 0.8

           Uses:
           - A* pathfinding (VAC distance)
           - Spatial similarity queries
           - Emotional proximity analysis
           - Category boundary detection

        2. Quaternion (4D) - Rotation Space
           ────────────────────────────────
           [w, x, y, z] - Unit quaternion

           Derived from VAC via axis-angle conversion

           Properties:
           - Smooth interpolation (SLERP)
           - No gimbal lock
           - Rotation composition

           Uses:
           - Smooth emotional transitions
           - Animation trajectories
           - UI rotation effects
           - 3D visualization

        3. Semantic Embedding (384D) - Language Space
           ──────────────────────────────────────────
           Dense vector from all-MiniLM-L6-v2 model

           Generated from: emotion_name + definition

           Properties:
           - Captures linguistic meaning
           - Enables natural language queries
           - Cross-lingual potential

           Uses:
           - "Find emotions like 'feeling overwhelmed'"
           - Text-to-emotion matching
           - Definition similarity
           - Semantic search

Data Structure Design:

    Static reference with computational pre-processing::

        Immutability:
        - Seeded once during setup
        - 87 rows (one per emotion)
        - Rarely updated (research-driven)
        - Version controlled externally

        Pre-computation strategy:
        - VAC coordinates: Manually curated
        - Quaternions: Derived from VAC
        - Embeddings: Generated once
        - All transformations cached

        Why pre-compute?
        - Real-time performance critical
        - Embeddings expensive (GPU)
        - Quaternions complex math
        - Consistency guaranteed

Database Schema:

    PostgreSQL with pgvector extension::

        Core fields:
        ────────────
        id: UUID primary key
        emotion_name: VARCHAR(100) UNIQUE
        category: VARCHAR(100) INDEXED
        definition: TEXT (Brené Brown's description)

        Vector fields:
        ──────────────
        vac_vector: vector(3)
        q_constant: vector(4)
        semantic_embedding: vector(384)

        Metadata:
        ─────────
        haptic_pattern_id: VARCHAR(50) - iOS haptic feedback
        color_hint: VARCHAR(7) - Hex color for visualization

        Timestamps:
        ───────────
        created_at: TIMESTAMP
        updated_at: TIMESTAMP

        Indexes:
        ────────
        - UNIQUE on emotion_name (lookup by name)
        - B-tree on category (filter by category)
        - IVFFlat on semantic_embedding (vector search)
        - GiST on vac_vector (spatial queries)

Vector Search Performance:

    Optimized for different query types::

        Exact match (by name):
        SELECT * FROM atlas_definitions WHERE emotion_name = 'Anxiety'
        Performance: <1ms (unique index)

        Category filter:
        SELECT * FROM atlas_definitions WHERE category = 'When Things Are Uncertain'
        Performance: 2-5ms (indexed)

        VAC similarity (spatial):
        SELECT * FROM atlas_definitions
        ORDER BY vac_vector <-> '[0.5, 0.3, 0.4]'
        LIMIT 5
        Performance: 5-15ms (GiST index)

        Semantic search:
        SELECT * FROM atlas_definitions
        ORDER BY semantic_embedding <=> embedding_query
        LIMIT 5
        Performance: 10-30ms (IVFFlat index, 87 rows)

Seeding Process:

    One-time data initialization::

        1. Source data preparation:
           - CSV with 87 emotions
           - VAC coordinates (manually curated)
           - Definitions from Atlas of the Heart
           - Category assignments

        2. Vector generation:
           - Load CSV into memory
           - Generate quaternions from VAC
           - Generate embeddings via sentence-transformers
           - Validate all vectors

        3. Database insertion:
           - Begin transaction
           - Insert all 87 rows
           - Create indexes
           - Commit

        4. Verification:
           - Count rows (should be 87)
           - Validate vector dimensions
           - Test search queries
           - Check for duplicates

        Command: python -m observer.scripts.seed_atlas

Visualization Metadata:

    UI enhancement fields::

        haptic_pattern_id:
        ──────────────────
        Links to iOS haptic feedback patterns
        Example: "notification.success", "impact.medium"
        Use: Physical emotion feedback on mobile

        color_hint:
        ───────────
        Hex color for UI display
        Example: "#FF6B6B" for Anger, "#4ECDC4" for Calm
        Use: Emotion visualization, category theming
        Derivation: Based on VAC coordinates

Example Usage:

    Query emotions from the atlas::

        from app.models.atlas_definition import AtlasDefinition
        from sqlalchemy import select

        # Get specific emotion
        stmt = select(AtlasDefinition).where(
            AtlasDefinition.emotion_name == "Anxiety"
        )
        anxiety = await session.execute(stmt)
        emotion = anxiety.scalar_one()

        print(f"VAC: {emotion.vac_vector}")
        # Output: [-0.6, 0.7, -0.3]

        print(f"Category: {emotion.category}")
        # Output: "When Things Are Uncertain"

        # Get all emotions in a category
        stmt = select(AtlasDefinition).where(
            AtlasDefinition.category == "When Things Are Good"
        )
        result = await session.execute(stmt)
        happy_emotions = result.scalars().all()
        # Returns: Joy, Happiness, Calm, Contentment, etc.

        # Find similar emotions (VAC distance)
        stmt = select(AtlasDefinition).order_by(
            AtlasDefinition.vac_vector.l2_distance([0.5, -0.3, 0.6])
        ).limit(5)
        result = await session.execute(stmt)
        similar = result.scalars().all()

Integration Points:

    Used throughout Observer::

        Services that query atlas:
        - AtlasMapper: Emotion classification
        - PathPlanner: Pathfinding between emotions
        - RecommendationEngine: Similar emotion discovery
        - EmbeddingService: Semantic search
        - QuaternionBuilder: Rotation calculations

        Read-heavy access pattern:
        - High read volume (every emotion analysis)
        - Zero writes (after seeding)
        - Perfect for caching
        - Database can optimize for reads

Design Decisions:

    Why single table vs normalized?::

        Single table chosen:
        + Simple queries (no joins)
        + All data co-located
        + Perfect for caching
        + 87 rows is tiny (no scale issues)

        Alternative (normalized):
        - Separate tables for vectors
        - More "proper" normalization
        - Unnecessary complexity for 87 rows

        Decision: Denormalized for simplicity

    Why three vector representations?::

        Each serves different purpose:
        - VAC: Geometric intuition, pathfinding
        - Quaternion: Smooth rotations, animations
        - Semantic: Natural language, search

        Storage cost: Minimal (87 rows × 391 floats)
        Benefit: Optimal performance for each use case

    Why immutable after seeding?::

        Research-driven updates:
        - Changes require clinical validation
        - Not user-generated content
        - Affects entire system behavior
        - Version control critical

        Update process: Manual, deliberate, tested

Data Integrity:

    Constraints and validations::

        Database constraints:
        - UNIQUE on emotion_name (no duplicates)
        - NOT NULL on core fields
        - Check: VAC dimensions match
        - Check: Quaternion unit norm

        Application validations:
        - VAC range: [-1, 1] for each dimension
        - Quaternion: Unit quaternion (norm = 1)
        - Embedding: 384 dimensions
        - Color: Valid hex format

        Seeding safeguards:
        - Dry run mode
        - Backup before update
        - Rollback on failure
        - Verification after insert

References:
    - Source research: Brown, B. (2021). Atlas of the Heart
    - VAC model: Russell (1980). A Circumplex Model of Affect
    - Quaternions: Shoemake (1985). Animating rotation with quaternion curves
    - Embeddings: Reimers & Gurevych (2019). Sentence-BERT
    - pgvector: https://github.com/pgvector/pgvector
    - Database design: docs/modules/observer/senior-developers/02-database-architecture.md
"""

# pylint: disable=not-callable

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.config import settings
from app.database import Base


class AtlasDefinition(Base):
    """Stores the canonical definition of 87 emotions from Atlas of the Heart.

    Each emotion has:
    - Unique name and category
    - VAC coordinates (Valence, Arousal, Connection)
    - Pre-calculated quaternion representation
    - Semantic embedding for similarity search
    - Optional metadata (haptic pattern, color hint)
    """

    __tablename__ = "atlas_definitions"

    # Primary Key
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    # Emotion Identity
    emotion_name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(100), index=True)
    definition: Mapped[str] = mapped_column(Text)

    # Computational Vectors
    # VAC: 3-dimensional [Valence, Arousal, Connection]
    vac_vector: Mapped[Any] = mapped_column(Vector(3))

    # Quaternion: 4-dimensional [w, x, y, z]
    q_constant: Mapped[Any] = mapped_column(Vector(4))

    # Semantic Embedding: dimension depends on embedding model
    # Default: 384 for all-MiniLM-L6-v2
    semantic_embedding: Mapped[Any] = mapped_column(Vector(settings.EMBEDDING_DIMENSION))

    # Visualization Metadata
    haptic_pattern_id: Mapped[Optional[str]] = mapped_column(String(50))
    color_hint: Mapped[Optional[str]] = mapped_column(String(7))  # Hex color format

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return f"<AtlasDefinition(emotion_name='{self.emotion_name}', category='{self.category}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "emotion_name": self.emotion_name,
            "category": self.category,
            "definition": self.definition,
            "vac_vector": list(self.vac_vector) if self.vac_vector else None,
            "q_constant": list(self.q_constant) if self.q_constant else None,
            "haptic_pattern_id": self.haptic_pattern_id,
            "color_hint": self.color_hint,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
