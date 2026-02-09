"""EmotionDefinition Model - Canonical Reference for Emotional States.

The foundational data model storing Observer's emotional definitions.
Supports multiple emotion datasets (collections), with "brene_brown" as the default.

Each emotion is represented in three complementary vector spaces:
1. VAC Vector (3D) - Geometric Space
2. Quaternion (4D) - Rotation Space
3. Semantic Embedding (384D+) - Language Space
"""

# pylint: disable=not-callable

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.settings import settings
from app.database import Base


class EmotionCollection(Base):
    """Registry of emotion datasets (e.g., 'Atlas of the Heart', 'Plutchik')."""

    __tablename__ = "emotion_collections"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return f"<EmotionCollection(name='{self.name}', default={self.is_default})>"


class EmotionDefinition(Base):
    """Stores the definition of an emotion within a specific collection.

    Each emotion has:
    - Unique name (within collection)
    - Category
    - VAC coordinates
    - Quaternion representation
    - Semantic embedding
    """

    __tablename__ = "emotion_definitions"

    # Composite unique constraint: emotion name must be unique per collection
    __table_args__ = (
        UniqueConstraint("collection_id", "emotion_name", name="uq_collection_emotion_name"),
    )

    # Primary Key
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    # Collection Link
    collection_id: Mapped[UUID] = mapped_column(ForeignKey("emotion_collections.id"), index=True)

    # Emotion Identity
    emotion_name: Mapped[str] = mapped_column(String(100), index=True)
    category: Mapped[str] = mapped_column(String(100), index=True)
    definition: Mapped[str] = mapped_column(Text)
    movement_pattern: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Computational Vectors
    # VAC: 3-dimensional [Valence, Arousal, Connection]
    vac_vector: Mapped[Any] = mapped_column(Vector(3))

    # Quaternion: 4-dimensional [w, x, y, z]
    q_constant: Mapped[Any] = mapped_column(Vector(4))

    # Semantic Embedding: dimension depends on embedding model
    semantic_embedding: Mapped[Any] = mapped_column(Vector(settings.EMBEDDING_DIMENSION))

    # Visualization Metadata
    haptic_pattern_id: Mapped[Optional[str]] = mapped_column(String(50))
    color_hint: Mapped[Optional[str]] = mapped_column(String(7))  # Hex color format

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    # Relationships
    collection: Mapped["EmotionCollection"] = relationship()

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return f"<EmotionDefinition(name='{self.emotion_name}', category='{self.category}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "collection_id": str(self.collection_id),
            "emotion_name": self.emotion_name,
            "category": self.category,
            "definition": self.definition,
            "movement_pattern": self.movement_pattern,
            "vac_vector": list(self.vac_vector) if self.vac_vector else None,
            "q_constant": list(self.q_constant) if self.q_constant else None,
            "haptic_pattern_id": self.haptic_pattern_id,
            "color_hint": self.color_hint,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
