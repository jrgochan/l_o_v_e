"""User Model - Identity and Access Management.

Stores user identity, authentication credentials, and role-based access control data.
Foundation for secure access to the Observer platform.
"""

# pylint: disable=not-callable, unsubscriptable-object

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from uuid import UUID, uuid4

from app.database import Base
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.chat_session import ChatSession


class UserRole(str, Enum):
    """RBAC Roles for the platform."""

    ADMIN = "admin"
    CLINICIAN = "clinician"
    USER = "user"


class User(Base):
    """User entity for authentication and authorization."""

    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[Optional[str]] = mapped_column(String(255))

    # Role-Based Access Control
    role: Mapped[UserRole] = mapped_column(String(50), default=UserRole.USER)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Soft delete — when set, the user is considered "deleted" but data is retained
    # for recovery, compliance (HIPAA: 6-year retention), or legal holds.
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    # Extensible user preferences (theme, tone, notification settings, etc.)
    # JSONB allows schema-flexible storage — no migrations needed for new prefs.
    preferences: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default="{}", nullable=False
    )

    # Clinician assignment — links a user to their supervising clinician.
    # Enables clinician-scoped queries without granting system-wide read access.
    assigned_clinician_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, default=None
    )

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    # Link to sessions (One-to-Many)
    sessions: Mapped[List["ChatSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    # Self-referential: clinician → their assigned clients
    clients: Mapped[List["User"]] = relationship(
        back_populates="assigned_clinician",
        foreign_keys=[assigned_clinician_id],
    )
    assigned_clinician: Mapped[Optional["User"]] = relationship(
        back_populates="clients",
        remote_side="User.id",
        foreign_keys=[assigned_clinician_id],
    )

    # Index for efficient clinician → clients lookup (excluding soft-deleted)
    __table_args__ = (
        Index(
            "idx_users_clinician",
            "assigned_clinician_id",
            postgresql_where=deleted_at.is_(None),
        ),
    )

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return f"<User {self.email} role={self.role}>"
