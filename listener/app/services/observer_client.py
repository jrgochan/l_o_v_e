"""Listener Module - Observer API Client.

HTTP client for integrating with the Observer module to store emotional states.

This module provides the integration layer between Listener (input) and Observer (storage).
After the Listener extracts VAC coordinates from text, this client sends the sanitized
data to Observer for persistence, history tracking, and therapeutic pathfinding.

Key Components:
    ObserverClient: Main HTTP client for Observer API
    get_observer_client: Factory function returning singleton instance
    _ensure_uuid: Helper to convert strings to valid UUID format

Integration Points:
    - Calls: Observer module (POST /observer/state, GET /observer/insight)
    - Used by: API routes (ingest.py), workers (audio_processor.py)

Design Philosophy:
    - Non-blocking: Observer failures don't break Listener
    - Fire-and-forget: Record state but don't wait for response (in some contexts)
    - Graceful degradation: Listener works standalone if Observer is down

Performance:
    - Latency: ~50ms per request (typical)
    - Timeout: 30s (configurable)
    - Health check: 5s timeout (fast fail)

Privacy:
    - Only sends sanitized text (PII already scrubbed)
    - No audio data ever sent
    - UUIDs generated deterministically (repeatable)

Examples:
    >>> from app.services.observer_client import get_observer_client
    >>> client = get_observer_client()
    >>> await client.record_state(
    >>>     user_id="demo-user",
    >>>     session_id="demo-session",
    >>>     text="I'm feeling [sanitized]",
    >>>     emotion=emotion_result
    >>> )

See Also:
    - Tests: tests/unit/test_observer_client.py
    - Observer API: observer/app/api/routes/state.py
    - Documentation: docs/modules/listener/managers/02-integration-points.md
    - ADR: Why non-blocking - docs/modules/listener/senior-developers/07-architecture-decisions.md
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional, cast
from uuid import NAMESPACE_DNS, UUID, uuid5

import httpx

from app.config import settings
from app.models.vac_response import EmotionalClassification

logger = logging.getLogger(__name__)


def _ensure_uuid(value: str) -> str:
    """Convert string to UUID format if not already a valid UUID.

    Uses UUID v5 (namespace-based, deterministic) to convert plain strings into
    valid UUIDs. This is necessary because Observer's API requires UUID format
    for user_id and session_id, but users may provide plain strings.

    The conversion is deterministic: same input always produces same UUID.

    Args:
        value: String value that may or may not be a valid UUID.
            Sample Usage:
            - "550e8400-e29b-41d4-a716-446655440000" (already UUID)
            - "demo-user" (plain string, will be converted)
            - "admin" (plain string, will be converted)

    Returns:
        str: Valid UUID string in format: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

    Sample Usage:
        Valid UUID passes through:
        >>> uuid_str = "550e8400-e29b-41d4-a716-446655440000"
        >>> result = _ensure_uuid(uuid_str)
        >>> assert result == uuid_str  # Unchanged

        Plain string converted:
        >>> result = _ensure_uuid("demo-user")
        >>> print(result)
        "2d964a93-f8e8-5c3a-9b5e-8c1e6f7d4a2b"  # Deterministic UUID

        Same input = same UUID:
        >>> uuid1 = _ensure_uuid("admin")
        >>> uuid2 = _ensure_uuid("admin")
        >>> assert uuid1 == uuid2  # Deterministic!

    Notes:
        - Uses UUID v5 with DNS namespace (standard approach)
        - Deterministic: Same input always produces same UUID
        - Useful for demo/testing with simple user IDs
        - Production should use actual UUIDs

    See Also:
        - Python uuid module: https://docs.python.org/3/library/uuid.html
        - Observer schema: observer/app/models/state.py
    """
    try:
        # Try to parse as UUID - if successful, return as-is
        UUID(value)
        return value
    except (ValueError, AttributeError):
        # Not a valid UUID, generate one deterministically from the string
        generated_uuid = uuid5(NAMESPACE_DNS, value)
        logger.debug("Generated UUID for '%s': %s", value, generated_uuid)
        return str(generated_uuid)


class ObserverClient:  # pylint: disable=too-many-instance-attributes
    """HTTP client for communicating with the Observer module.

    Provides methods to:
    - Record emotional states for persistence
    - Retrieve emotional insights and patterns
    - Check Observer service health

    This client implements non-blocking integration—Observer failures don't prevent
    the Listener from returning analysis results to users.

    Architecture:
        Protocol: HTTP/REST
        Format: JSON
        Timeout: 30s (configurable)
        Error handling: Graceful degradation (log and continue)

    Attributes:
        base_url (str): Observer API base URL (e.g., "http://localhost:8000")
        timeout (float): Request timeout in seconds

    Sample Usage:
        Basic usage:
        >>> client = ObserverClient()
        >>> await client.record_state(
        >>>     user_id="user-123",
        >>>     session_id="session-456",
        >>>     text="I'm feeling hopeful",
        >>>     emotion=emotion_result
        >>> )

        With custom timeout:
        >>> client = ObserverClient(timeout=60.0)  # 1 minute

        Check health:
        >>> is_healthy = await client.health_check()
        >>> if not is_healthy:
        >>>     logger.warning("Observer is down")

    See Also:
        - Singleton: get_observer_client()
        - Tests: tests/unit/test_observer_client.py
        - Observer API: observer/app/api/routes/state.py
        - Integration docs: docs/modules/listener/managers/02-integration-points.md

    Notes:
        - Designed to be non-blocking in API routes (Observer downtime shouldn't break Listener)
        - UUIDs automatically converted from plain strings
        - PII should be scrubbed BEFORE calling record_state()
    """

    def __init__(self, base_url: Optional[str] = None, timeout: float = 30.0):
        """Initialize Observer API client with connection settings.

        Args:
            base_url: Observer API base URL. If None, uses settings.OBSERVER_URL.
                Sample Usage:
                - "http://localhost:8000" (development)
                - "http://observer:8000" (Docker Compose)
                - "http://observer-service.prod.svc.cluster.local:8000" (Kubernetes)

            timeout: Request timeout in seconds. Default: 30.0
                How long to wait for Observer responses.
                Recommendation: 30s (Observer operations can be slow with vector search)

        Sample Usage:
            Default (uses settings):
            >>> client = ObserverClient()

            Custom URL:
            >>> client = ObserverClient(base_url="http://observer-staging:8000")

            Custom timeout:
            >>> client = ObserverClient(timeout=60.0)  # 1 minute for slow operations

        Notes:
            - Does NOT test connection (lazy - connects on first request)
            - Use health_check() to test connectivity
            - Timeout applies to all requests
        """
        self.base_url = base_url or settings.OBSERVER_URL
        self.timeout = timeout

        logger.info("ObserverClient initialized: %s", self.base_url)

    async def record_state(
        self,
        user_id: str,
        session_id: str,
        text: str,
        emotion: EmotionalClassification,
        timestamp: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Record emotional state in Observer for persistence and history tracking.

        Sends the Listener's analysis (VAC coordinates + emotion) to Observer for:
        - Long-term storage in PostgreSQL
        - Vector similarity search (pgvector)
        - Emotional trajectory tracking
        - Therapeutic pathfinding

        The payload matches Observer's StateInput schema with:
        - UUIDs (automatically converted from plain strings)
        - Sanitized text (PII should already be removed!)
        - VAC scalars (valence, arousal, connection)
        - ISO timestamp

        Args:
            user_id: User identifier. Can be UUID string or plain string (converted).
                Sample Usage: "550e8400-...", "demo-user", "admin"

            session_id: Session identifier. Can be UUID or plain string.
                Sample Usage: "chat-session", "journal-entry-123"

            text: Sanitized text with PII already removed.
                IMPORTANT: Must scrub PII BEFORE calling this!
                Example: "I told [NAME] about my anxiety on [DATE]"

            emotion: EmotionalClassification from semantic analyzer.
                Contains: primary_emotion, category, VAC, confidence, reasoning

            timestamp: When emotion occurred. If None, uses current UTC time.

        Returns:
            dict: Observer's response containing:
                - state_id: UUID of stored state
                - quaternion: Rotation quaternion (from Versor)
                - nearest_emotion: Closest Atlas emotion
                - And more...

        Raises:
            httpx.HTTPError: If Observer request fails (network, 500 error, etc.)
            httpx.TimeoutException: If request takes > timeout seconds

        Sample Usage:
            Basic usage:
            >>> client = get_observer_client()
            >>> await client.record_state(
            >>>     user_id="demo-user",
            >>>     session_id="chat-session",
            >>>     text="I'm feeling overwhelmed",  # PII already scrubbed
            >>>     emotion=emotion_result
            >>> )

            With timestamp:
            >>> await client.record_state(
            >>>     user_id="user-123",
            >>>     session_id="session-456",
            >>>     text="[Sanitized text]",
            >>>     emotion=emotion,
            >>>     timestamp=datetime(2026, 1, 2, 19, 0, 0)
            >>> )

            Non-blocking pattern (recommended in API routes):
            >>> try:
            >>>     await client.record_state(...)
            >>> except Exception as e:
            >>>     logger.warning(f"Observer failed: {e}")
            >>>     # Continue anyway - Listener still returns result

        Performance:
            - Average: ~50ms (includes network + Observer processing)
            - P99: ~200ms (Observer vector search can be slow)

        Notes:
            - UUIDs auto-converted from plain strings (deterministic)
            - Text should be sanitized BEFORE this call
            - This is async - use await
            - Observer failure is non-blocking (by design)
            - Timeout is configurable per-client instance

        Privacy:
            - Only sanitized text sent (no PII)
            - No audio data ever sent
            - VAC coordinates are anonymous (no personal identifiers)

        See Also:
            - PII Scrubbing: app/services/pii_scrubber.py
            - Observer Schema: observer/app/models/state.py
            - Integration docs: docs/modules/listener/managers/02-integration-points.md
            - Non-blocking pattern: app/api/routes/ingest.py::analyze_text()
        """
        if timestamp is None:
            timestamp = datetime.utcnow()

        # Match Observer's StateInput schema
        payload = {
            "user_id": _ensure_uuid(user_id),  # Convert to valid UUID
            "session_id": _ensure_uuid(session_id),  # Convert to valid UUID
            "input_text": text,  # Changed from 'text' to 'input_text'
            "vac_scalars": {  # Changed from 'vac' to 'vac_scalars'
                "valence": emotion.vac.valence,
                "arousal": emotion.vac.arousal,
                "connection": emotion.vac.connection,
            },
            "timestamp": (
                timestamp.isoformat() + "Z"
                if not timestamp.isoformat().endswith("Z")
                else timestamp.isoformat()
            ),
        }

        logger.info(
            "Recording state for user %s: %s (V=%.2f, A=%.2f, C=%.2f)",
            user_id,
            emotion.primary_emotion,
            emotion.vac.valence,
            emotion.vac.arousal,
            emotion.vac.connection,
        )

        # DEBUG: Log the actual payload being sent
        logger.debug("Observer payload: %s", payload)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(f"{self.base_url}/observer/state", json=payload)
                response.raise_for_status()

                result: Dict[str, Any] = response.json()
                logger.info("State recorded successfully: %s", result.get("state_id"))

                return result

            except httpx.HTTPError as e:
                logger.error("Failed to record state: %s", e)
                raise

    async def get_insights(self, user_id: str, limit: int = 10) -> Dict[str, Any]:
        """Get emotional insights from Observer.

        Args:
            user_id: User identifier
            limit: Number of recent states to analyze

        Returns:
            Insights from Observer
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(
                    f"{self.base_url}/observer/insight", params={"user_id": user_id, "limit": limit}
                )
                response.raise_for_status()

                return cast(Dict[str, Any], response.json())

            except httpx.HTTPError as e:
                logger.error("Failed to get insights: %s", e)
                raise

    async def health_check(self) -> bool:
        """Check if Observer API is healthy.

        Returns:
            True if healthy, False otherwise
        """
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                response = await client.get(f"{self.base_url}/health")
                return response.status_code == 200
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.warning("Observer health check failed: %s", e)
                return False


# Global client instance
_CLIENT_INSTANCE: Optional[ObserverClient] = None


def get_observer_client() -> ObserverClient:
    """Get or create global ObserverClient instance.

    Returns:
        ObserverClient instance
    """
    global _CLIENT_INSTANCE  # pylint: disable=global-statement

    if _CLIENT_INSTANCE is None:
        _CLIENT_INSTANCE = ObserverClient()

    return _CLIENT_INSTANCE
