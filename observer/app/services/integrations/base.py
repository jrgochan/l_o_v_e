"""Integration Adapter base class and supporting types.

All external data source integrations implement the ``IntegrationAdapter``
abstract base class.  This ensures a consistent interface for authentication,
syncing, disconnection, and data transformation across calendars, wearables,
and environment sources.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID


@dataclass
class AdapterMetadata:
    """Describes an adapter's capabilities for the registry and UI."""

    adapter_id: str
    display_name: str
    category: str  # "calendar", "wearable", "environment"
    auth_type: str  # "file", "api_key", "oauth2", "none"
    description: str = ""
    icon: str = ""  # emoji or icon name
    required_settings: List[str] = field(default_factory=list)


@dataclass
class SyncResult:
    """Result of a sync operation."""

    events_imported: int = 0
    events_updated: int = 0
    events_skipped: int = 0
    errors: List[str] = field(default_factory=list)
    next_sync_hint: Optional[datetime] = None

    @property
    def success(self) -> bool:
        """True if the sync completed without fatal errors."""
        return len(self.errors) == 0

    def to_dict(self) -> Dict[str, Any]:
        """Serialize for API responses."""
        return {
            "events_imported": self.events_imported,
            "events_updated": self.events_updated,
            "events_skipped": self.events_skipped,
            "errors": self.errors,
            "success": self.success,
        }


class IntegrationAdapter(ABC):
    """Abstract base class for all external data source integrations.

    Subclasses must implement:
    - ``sync()`` — Pull data and return LifeEvent-compatible dicts
    - ``validate_credential()`` — Check if auth data is valid
    - ``disconnect()`` — Clean up on revocation

    The adapter MUST set class-level attributes:
    - ``adapter_id`` — Unique identifier (e.g., "ical_import")
    - ``display_name`` — Human-readable name
    - ``category`` — "calendar", "wearable", "environment"
    - ``auth_type`` — "file", "api_key", "oauth2", "none"
    - ``consent_policy_key`` — Key linking to ConsentPolicy
    """

    # --- Subclass MUST override these ---
    adapter_id: str = ""
    display_name: str = ""
    category: str = ""
    auth_type: str = ""
    consent_policy_key: str = ""
    description: str = ""

    def get_metadata(self) -> AdapterMetadata:
        """Return adapter metadata for registration and UI."""
        return AdapterMetadata(
            adapter_id=self.adapter_id,
            display_name=self.display_name,
            category=self.category,
            auth_type=self.auth_type,
            description=self.description,
        )

    @abstractmethod
    async def validate_credential(self, auth_data: Dict[str, Any]) -> bool:
        """Validate that the provided credentials are usable.

        Args:
            auth_data: Credential data (API key, OAuth tokens, etc.)

        Returns:
            True if the credentials are valid and usable.
        """

    @abstractmethod
    async def sync(
        self,
        user_id: UUID,
        credentials: Dict[str, Any],
        since: Optional[datetime] = None,
        settings: Optional[Dict[str, Any]] = None,
    ) -> SyncResult:
        """Pull data from the external source and persist as LifeEvents.

        Args:
            user_id: User who owns this integration
            credentials: Decrypted credential data
            since: Only fetch data newer than this timestamp
            settings: User-specific integration settings

        Returns:
            SyncResult with import counts and any errors.
        """

    @abstractmethod
    async def disconnect(self, user_id: UUID) -> None:
        """Revoke access and clean up resources.

        Called when a user disconnects an integration. Should revoke
        any external tokens if possible.

        Args:
            user_id: User disconnecting
        """

    async def transform_to_events(
        self,
        raw_data: List[Dict[str, Any]],
        user_id: UUID,
    ) -> List[Dict[str, Any]]:
        """Transform raw external data into LifeEvent-compatible dicts.

        Default implementation returns raw_data unchanged. Subclasses
        should override for adapter-specific transformation logic.
        """
        return raw_data
