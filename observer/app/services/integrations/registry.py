"""Adapter Registry — Central registry for all integration adapters.

Adapters register themselves at import time.  The registry is used by
the integration service and API routes to discover available adapters,
look up adapters by ID, and list adapters by category.
"""

import logging
from typing import Dict, List, Optional

from app.services.integrations.base import AdapterMetadata, IntegrationAdapter

logger = logging.getLogger(__name__)


class AdapterRegistry:
    """Central registry for integration adapters.

    Usage:
        from app.services.integrations.registry import adapter_registry

        adapter_registry.register(ICalAdapter())
        adapter = adapter_registry.get("ical_import")
    """

    def __init__(self) -> None:
        """Initialize an empty registry."""
        self._adapters: Dict[str, IntegrationAdapter] = {}

    def register(self, adapter: IntegrationAdapter) -> None:
        """Register an adapter instance.

        Args:
            adapter: An IntegrationAdapter subclass instance.

        Raises:
            ValueError: If adapter_id is empty or already registered.
        """
        if not adapter.adapter_id:
            raise ValueError(f"Adapter {type(adapter).__name__} has no adapter_id")

        if adapter.adapter_id in self._adapters:
            logger.warning("Overwriting existing adapter '%s'", adapter.adapter_id)

        self._adapters[adapter.adapter_id] = adapter
        logger.info(
            "Registered integration adapter '%s' (%s)",
            adapter.adapter_id,
            adapter.display_name,
        )

    def get(self, adapter_id: str) -> Optional[IntegrationAdapter]:
        """Get an adapter by ID.

        Returns:
            The adapter instance, or None if not found.
        """
        return self._adapters.get(adapter_id)

    def list_all(self) -> List[AdapterMetadata]:
        """List metadata for all registered adapters."""
        return [a.get_metadata() for a in self._adapters.values()]

    def list_by_category(self, category: str) -> List[AdapterMetadata]:
        """List adapters filtered by category."""
        return [a.get_metadata() for a in self._adapters.values() if a.category == category]

    @property
    def adapter_ids(self) -> List[str]:
        """Return all registered adapter IDs."""
        return list(self._adapters.keys())


# Module-level singleton
adapter_registry = AdapterRegistry()
