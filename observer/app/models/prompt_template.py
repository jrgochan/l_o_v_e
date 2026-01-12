"""Prompt Template Model.

Defines the configuration for AI function prompts.
"""

# pylint: disable=not-callable

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import Boolean, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, uuid_factory


class PromptTemplate(Base):
    """Prompt template for AI functions.

    Stores the system prompts and user templates used by the Listener
    and Observer services. Allows dynamic tuning of AI behavior without
    code changes.
    """

    __tablename__ = "prompt_templates"

    id: Mapped[UUID] = mapped_column(default=uuid_factory, primary_key=True)

    # Function identifier (e.g., "semantic_vac", "multi_emotion", "insight_generation")
    function_name: Mapped[str] = mapped_column(String(100), index=True)

    # Version identifier (e.g., "1.0.0", "experimental-v2")
    version: Mapped[str] = mapped_column(String(50))

    # The actual prompt content (usually a Jinja2 template or formatted string)
    template_content: Mapped[str] = mapped_column(Text)

    # List of expected input variables (e.g., ["input_text", "history"])
    # Stored as JSON array of strings
    input_variables: Mapped[List[str]] = mapped_column(JSONB, default=list)

    # Whether this is the currently active version for this function
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)

    # Metadata for the UI or logic
    description: Mapped[Optional[str]] = mapped_column(String(500))

    # Tracking
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(onupdate=func.now())
    created_by: Mapped[Optional[str]] = mapped_column(String(100))  # User ID

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return (
            f"<PromptTemplate(function='{self.function_name}', "
            f"version='{self.version}', active={self.is_active})>"
        )
