"""BootstrapData Model - Cold-Start Intelligence.

Stores aggregate population-level data to solve the cold-start problem for new users.
Includes strategy effectiveness ratings, path templates, and context modifiers.
"""

# pylint: disable=not-callable

from datetime import datetime
from typing import Any, Dict
from uuid import UUID, uuid4

from sqlalchemy import JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BootstrapData(Base):
    """Bootstrap data entity for storing cold-start intelligence.

    Data Types:
    - strategy_effectiveness: Aggregate ratings
    - path_template: Pre-validated journeys
    - context_modifier: Situational rules
    - challenge_pattern: Structured solutions
    """

    __tablename__ = "bootstrap_data"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    # Type of data (e.g., 'strategy_effectiveness', 'path_template')
    data_type: Mapped[str] = mapped_column(String(50), index=True)

    # Optional sub-category for organization
    data_category: Mapped[str | None] = mapped_column(String(50), index=True, nullable=True)

    # JSON content payload
    content: Mapped[Dict[str, Any]] = mapped_column(JSON)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "data_type": self.data_type,
            "data_category": self.data_category,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
