"""Integration adapters — External data source connectors for the Life Journal."""

from app.services.integrations.base import IntegrationAdapter
from app.services.integrations.registry import adapter_registry

__all__ = [
    "IntegrationAdapter",
    "adapter_registry",
]
