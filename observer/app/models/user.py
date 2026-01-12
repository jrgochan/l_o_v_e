"""User Model - Identity and Access Management.

Stores user identity, authentication credentials, and role-based access control data.
Foundation for secure access to the Observer platform.
"""

# pylint: disable=not-callable, unsubscriptable-object

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

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

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    # Relationships
    # Link to sessions (One-to-Many)
    sessions: Mapped[List["ChatSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return f"<User {self.email} role={self.role}>"
