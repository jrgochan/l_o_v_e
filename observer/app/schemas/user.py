"""User Schemas."""

import re
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole

# ---------------------------------------------------------------------------
# Password complexity validator (reusable across schemas)
# ---------------------------------------------------------------------------


def _validate_password_complexity(password: str) -> str:
    """Enforce password complexity rules.

    Rules: ≥8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special character.
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?`~]", password):
        raise ValueError("Password must contain at least one special character")
    return password


# ---------------------------------------------------------------------------
# Core schemas
# ---------------------------------------------------------------------------


class UserBase(BaseModel):
    """Base schema for user data."""

    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.USER
    is_active: bool = True


class UserCreate(UserBase):
    """Schema for user creation (registration)."""

    password: str = Field(..., min_length=8)
    consents: list[str] = Field(
        default_factory=list,
        description="List of consent policy keys to accept during registration",
    )

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate password meets complexity requirements."""
        return _validate_password_complexity(v)


class UserUpdate(BaseModel):
    """Schema for admin-initiated user update.

    Admins can change role, status, and assign clinicians.
    """

    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8)
    assigned_clinician_id: Optional[UUID] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: Optional[str]) -> Optional[str]:
        """Validate password meets complexity requirements."""
        if v is not None:
            return _validate_password_complexity(v)
        return v


# ---------------------------------------------------------------------------
# Self-service schemas (for /users/me endpoints)
# ---------------------------------------------------------------------------


class UserProfileUpdate(BaseModel):
    """Schema for user-initiated profile update.

    Users can only change their name and email — NOT role, status, or password.
    """

    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    """Schema for user-initiated password change.

    Requires the current password for verification before accepting the new one.
    """

    current_password: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        """Validate new password meets complexity requirements."""
        return _validate_password_complexity(v)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class UserResponse(UserBase):
    """Schema for user response (public-facing data)."""

    id: UUID
    created_at: datetime
    updated_at: datetime
    assigned_clinician_id: Optional[UUID] = None
    preferences: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Schema for authentication token."""

    access_token: str
    token_type: str
    consent_required: bool = False
    outstanding_policies: list[dict[str, Any]] = []


class TokenData(BaseModel):
    """Schema for token payload data."""

    email: Optional[str] = None
