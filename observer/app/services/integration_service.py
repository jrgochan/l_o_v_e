"""Integration Service — Business logic for managing external integrations.

Handles connecting/disconnecting integrations, credential encryption,
manual sync triggers, and file imports.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.crypto import decrypt_dict, encrypt_dict
from app.core.events import DomainEvent, event_bus
from app.models.integration_credential import IntegrationCredential
from app.models.life_event import LifeEvent
from app.services.integrations.base import SyncResult
from app.services.integrations.registry import adapter_registry

logger = logging.getLogger(__name__)


class IntegrationService:
    """Manages the lifecycle of external integrations."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize with a database session."""
        self.db = db

    # ------------------------------------------------------------------
    # Connect / Disconnect
    # ------------------------------------------------------------------

    async def connect(
        self,
        user_id: UUID,
        adapter_id: str,
        auth_data: Dict[str, Any],
        *,
        scopes: Optional[List[str]] = None,
        settings: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Connect an integration for a user.

        Validates credentials, encrypts and stores them, then emits
        a domain event.

        Returns:
            Dict with connection status.
        """
        adapter = adapter_registry.get(adapter_id)
        if adapter is None:
            raise ValueError(f"Unknown adapter: {adapter_id}")

        # Validate credentials
        valid = await adapter.validate_credential(auth_data)
        if not valid:
            raise ValueError(f"Invalid credentials for {adapter_id}")

        # Check for existing credential
        existing = await self._get_credential(user_id, adapter_id)
        if existing:
            # Update existing
            existing.encrypted_credentials = encrypt_dict(auth_data)
            existing.scopes_granted = scopes or []
            existing.settings = settings or {}
            existing.sync_status = "connected"
            existing.sync_error = None
        else:
            # Create new
            credential = IntegrationCredential(
                user_id=user_id,
                adapter_id=adapter_id,
                encrypted_credentials=encrypt_dict(auth_data),
                scopes_granted=scopes or [],
                settings=settings or {},
                sync_status="connected",
            )
            self.db.add(credential)

        await self.db.flush()

        # Emit domain event
        await event_bus.emit(
            DomainEvent(
                event_type="journal.integration_connected",
                actor_id=user_id,
                metadata={"adapter_id": adapter_id},
                ip_address=ip_address,
            )
        )

        logger.info(
            "Integration connected",
            extra={"user_id": str(user_id), "adapter_id": adapter_id},
        )

        return {"status": "connected", "adapter_id": adapter_id}

    async def disconnect(
        self,
        user_id: UUID,
        adapter_id: str,
        *,
        ip_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Disconnect an integration and delete credentials.

        Also calls the adapter's disconnect() for external cleanup
        (e.g., revoking OAuth tokens).
        """
        adapter = adapter_registry.get(adapter_id)
        if adapter is None:
            raise ValueError(f"Unknown adapter: {adapter_id}")

        credential = await self._get_credential(user_id, adapter_id)
        if credential is None:
            raise ValueError(f"Integration {adapter_id} is not connected")

        # Let adapter do external cleanup
        await adapter.disconnect(user_id)

        # Delete credential (hard delete — no orphaned tokens)
        await self.db.delete(credential)
        await self.db.flush()

        # Emit domain event
        await event_bus.emit(
            DomainEvent(
                event_type="journal.integration_disconnected",
                actor_id=user_id,
                metadata={"adapter_id": adapter_id},
                ip_address=ip_address,
            )
        )

        logger.info(
            "Integration disconnected",
            extra={"user_id": str(user_id), "adapter_id": adapter_id},
        )

        return {"status": "disconnected", "adapter_id": adapter_id}

    # ------------------------------------------------------------------
    # Sync
    # ------------------------------------------------------------------

    async def sync(
        self,
        user_id: UUID,
        adapter_id: str,
        *,
        ip_address: Optional[str] = None,
    ) -> SyncResult:
        """Manually trigger a sync for an integration.

        Decrypts credentials, calls the adapter's sync(), persists
        any returned events as LifeEvent records, and updates the
        credential's sync state.
        """
        adapter = adapter_registry.get(adapter_id)
        if adapter is None:
            raise ValueError(f"Unknown adapter: {adapter_id}")

        credential = await self._get_credential(user_id, adapter_id)
        if credential is None:
            raise ValueError(f"Integration {adapter_id} is not connected")

        # Decrypt credentials
        creds = decrypt_dict(credential.encrypted_credentials)

        # Run sync
        result = await adapter.sync(
            user_id=user_id,
            credentials=creds,
            since=credential.last_sync_at,
            settings_data=credential.settings,
        )

        # Update sync state
        if result.success:
            credential.last_sync_at = datetime.now(timezone.utc)
            credential.sync_status = "success"
            credential.sync_error = None
        else:
            credential.sync_status = "error"
            credential.sync_error = "; ".join(result.errors)

        await self.db.flush()

        # Emit domain event
        await event_bus.emit(
            DomainEvent(
                event_type="journal.integration_synced",
                actor_id=user_id,
                metadata={
                    "adapter_id": adapter_id,
                    "result": result.to_dict(),
                },
                ip_address=ip_address,
            )
        )

        return result

    # ------------------------------------------------------------------
    # File Import (iCal)
    # ------------------------------------------------------------------

    async def import_file(
        self,
        user_id: UUID,
        adapter_id: str,
        file_content: str,
        *,
        ip_address: Optional[str] = None,
    ) -> SyncResult:
        """Import a file through an adapter.

        Used for iCal imports and future Apple Health XML imports.
        """
        adapter = adapter_registry.get(adapter_id)
        if adapter is None:
            raise ValueError(f"Unknown adapter: {adapter_id}")

        if adapter.auth_type != "file":
            raise ValueError(f"Adapter {adapter_id} does not support file import")

        # For file-based adapters, pass content as credential
        result = await adapter.sync(
            user_id=user_id,
            credentials={"ical_content": file_content},
            since=None,
        )

        # Persist the parsed events
        if hasattr(adapter, "parse_ical") and result.success:
            events = adapter.parse_ical(file_content, user_id)
            for event_dict in events:
                life_event = LifeEvent(
                    user_id=user_id,
                    event_type=event_dict["event_type"],
                    title=event_dict["title"],
                    description=event_dict.get("description"),
                    timestamp=event_dict.get("timestamp", datetime.now(timezone.utc)),
                    duration_minutes=event_dict.get("duration_minutes"),
                    is_recurring=event_dict.get("is_recurring", False),
                    source=event_dict.get("source", adapter_id),
                    tags=event_dict.get("tags", []),
                    event_data=event_dict.get("event_data", {}),
                )
                self.db.add(life_event)

            await self.db.flush()
            result.events_imported = len(events)

        # Emit domain event
        await event_bus.emit(
            DomainEvent(
                event_type="journal.integration_imported",
                actor_id=user_id,
                metadata={
                    "adapter_id": adapter_id,
                    "result": result.to_dict(),
                },
                ip_address=ip_address,
            )
        )

        return result

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    async def list_active(self, user_id: UUID) -> List[Dict[str, Any]]:
        """List all active integrations for a user."""
        stmt = select(IntegrationCredential).where(IntegrationCredential.user_id == user_id)
        result = await self.db.execute(stmt)
        credentials = list(result.scalars().all())

        # Enrich with adapter metadata
        enriched = []
        for cred in credentials:
            adapter = adapter_registry.get(cred.adapter_id)
            info = cred.to_dict()
            if adapter:
                meta = adapter.get_metadata()
                info["display_name"] = meta.display_name
                info["category"] = meta.category
            enriched.append(info)

        return enriched

    async def get_status(self, user_id: UUID, adapter_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a specific integration."""
        credential = await self._get_credential(user_id, adapter_id)
        if credential is None:
            return None
        return credential.to_dict()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _get_credential(
        self, user_id: UUID, adapter_id: str
    ) -> Optional[IntegrationCredential]:
        """Look up a user's credential for an adapter."""
        stmt = select(IntegrationCredential).where(
            and_(
                IntegrationCredential.user_id == user_id,
                IntegrationCredential.adapter_id == adapter_id,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()
