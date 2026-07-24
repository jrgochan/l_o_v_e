"""IntegrationCredential Model — Encrypted storage for external service credentials.

Stores OAuth tokens, API keys, and other authentication data for external
integrations (calendars, wearables, environment services).  Credentials are
encrypted at rest using AES-256-GCM via ``app.core.crypto``.

Security Design:
    - ``encrypted_credentials`` stores a base64-encoded AES-256-GCM ciphertext
      containing the JSON-serialized credential dictionary.
    - Each record uses a unique random salt for key derivation (inside the
      ciphertext blob), so two records with the same plaintext produce
      different ciphertexts.
    - The application ``SECRET_KEY`` is the root key material.
    - Revoking an integration deletes the credential row entirely — no
      soft-delete, no orphaned tokens.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Index, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class IntegrationCredential(Base):
    """Encrypted credential storage for external integrations.

    One row per (user, adapter) pair.  The ``encrypted_credentials`` column
    holds AES-256-GCM encrypted JSON containing the actual tokens / API keys.
    """

    __tablename__ = "integration_credentials"

    # ═══════════════════════════════════════════════════════════════════════
    # Primary Key
    # ═══════════════════════════════════════════════════════════════════════

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    # ═══════════════════════════════════════════════════════════════════════
    # Ownership
    # ═══════════════════════════════════════════════════════════════════════

    user_id: Mapped[UUID] = mapped_column(index=True, nullable=False)
    adapter_id: Mapped[str] = mapped_column(String(50), index=True, nullable=False)

    # ═══════════════════════════════════════════════════════════════════════
    # Encrypted Credentials (AES-256-GCM)
    # ═══════════════════════════════════════════════════════════════════════

    encrypted_credentials: Mapped[str] = mapped_column(Text, nullable=False)

    # What scopes the user granted (for display and audit)
    scopes_granted: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), default=list)

    # ═══════════════════════════════════════════════════════════════════════
    # Sync State
    # ═══════════════════════════════════════════════════════════════════════

    last_sync_at: Mapped[Optional[datetime]] = mapped_column(default=None)
    sync_status: Mapped[str] = mapped_column(String(30), default="never_synced", nullable=False)
    sync_error: Mapped[Optional[str]] = mapped_column(Text, default=None)

    # ═══════════════════════════════════════════════════════════════════════
    # User Preferences for this integration
    # ═══════════════════════════════════════════════════════════════════════

    settings: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default="{}", nullable=False
    )

    # ═══════════════════════════════════════════════════════════════════════
    # Timestamps
    # ═══════════════════════════════════════════════════════════════════════

    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ═══════════════════════════════════════════════════════════════════════
    # Indexes
    # ═══════════════════════════════════════════════════════════════════════

    __table_args__ = (
        Index(
            "uq_integration_user_adapter",
            "user_id",
            "adapter_id",
            unique=True,
        ),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize for API responses (excludes encrypted credentials)."""
        return {
            "id": str(self.id),
            "adapter_id": self.adapter_id,
            "scopes_granted": self.scopes_granted or [],
            "last_sync_at": self.last_sync_at.isoformat() if self.last_sync_at else None,
            "sync_status": self.sync_status,
            "sync_error": self.sync_error,
            "settings": self.settings,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
