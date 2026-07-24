"""NATS JetStream Client — Connection management and stream setup.

Manages the async lifecycle of the NATS connection, creates JetStream
streams and consumers on startup, and handles auto-reconnect with
exponential backoff.

Usage:
    client = NATSClient()
    await client.connect()
    js = client.jetstream    # JetStream context
    await client.disconnect()
"""

import logging
from typing import Optional

import nats
from nats.aio.client import Client as NATS
from nats.js import JetStreamContext
from nats.js.api import (
    ConsumerConfig,
    DeliverPolicy,
    RetentionPolicy,
    StorageType,
    StreamConfig,
)

from app.core.settings import settings

logger = logging.getLogger(__name__)


class NATSClient:
    """Async NATS client with JetStream stream management.

    Designed to be used as a singleton — created once at app startup,
    shared across all services, and shut down gracefully on exit.
    """

    def __init__(self) -> None:
        """Initialize the client (does NOT connect)."""
        self._nc: Optional[NATS] = None
        self._js: Optional[JetStreamContext] = None
        self._connected: bool = False

    @property
    def is_connected(self) -> bool:
        """Check if NATS is connected."""
        return self._connected and self._nc is not None and self._nc.is_connected

    @property
    def jetstream(self) -> JetStreamContext:
        """Get the JetStream context. Raises if not connected."""
        if self._js is None:
            raise RuntimeError("NATS JetStream not connected. Call connect() first.")
        return self._js

    @property
    def nc(self) -> NATS:
        """Get the raw NATS connection."""
        if self._nc is None:
            raise RuntimeError("NATS not connected. Call connect() first.")
        return self._nc

    async def connect(self) -> None:
        """Connect to NATS and create the JetStream stream.

        Idempotent — safe to call multiple times.
        """
        if self.is_connected:
            return

        try:
            self._nc = await nats.connect(
                servers=[settings.NATS_URL],
                connect_timeout=settings.NATS_CONNECT_TIMEOUT,
                reconnect_time_wait=settings.NATS_RECONNECT_DELAY,
                max_reconnect_attempts=settings.NATS_MAX_RECONNECTS,
                error_cb=self._error_cb,
                disconnected_cb=self._disconnected_cb,
                reconnected_cb=self._reconnected_cb,
                closed_cb=self._closed_cb,
            )

            self._js = self._nc.jetstream()
            self._connected = True

            # Create or update the stream
            await self._ensure_stream()
            await self._ensure_consumers()

            logger.info(
                "NATS connected",
                extra={"server": settings.NATS_URL, "stream": settings.NATS_STREAM_NAME},
            )

        except Exception:
            self._connected = False
            logger.exception("Failed to connect to NATS at %s", settings.NATS_URL)
            raise

    async def disconnect(self) -> None:
        """Gracefully disconnect from NATS, draining pending messages."""
        if self._nc and not self._nc.is_closed:
            try:
                await self._nc.drain()
            except Exception:
                logger.exception("Error draining NATS connection")
            finally:
                self._connected = False
                self._js = None
                logger.info("NATS disconnected")

    async def _ensure_stream(self) -> None:
        """Create or update the JOURNAL stream.

        Subjects covered:
        - journal.*.emotion   — Emotional state changes
        - journal.*.event     — Life events
        - journal.*.context   — Contextual data (weather, location)
        - journal.*.correlation — Correlation results
        """
        config = StreamConfig(
            name=settings.NATS_STREAM_NAME,
            subjects=[
                "journal.*.emotion",
                "journal.*.event",
                "journal.*.context",
                "journal.*.correlation",
            ],
            retention=RetentionPolicy.LIMITS,
            storage=StorageType.FILE,
            max_age=0,  # No expiry — lifetime data
            max_bytes=-1,  # No size limit
            duplicate_window=60,  # 60-second dedup window
            description="Life Journal event stream — persistent emotional and life event data",
        )

        try:
            await self._js.add_stream(config)
            logger.info("Stream '%s' created/updated", settings.NATS_STREAM_NAME)
        except Exception:
            logger.exception("Failed to create stream '%s'", settings.NATS_STREAM_NAME)
            raise

    async def _ensure_consumers(self) -> None:
        """Create durable consumers for stream processing."""
        consumers = [
            ConsumerConfig(
                durable_name="persister",
                deliver_policy=DeliverPolicy.ALL,
                ack_wait=30,
                max_deliver=3,
                description="Persists journal events to PostgreSQL",
            ),
            ConsumerConfig(
                durable_name="correlator",
                deliver_policy=DeliverPolicy.ALL,
                ack_wait=60,
                max_deliver=3,
                filter_subject="journal.*.emotion",
                description="Feeds emotional state changes to the correlation engine",
            ),
        ]

        for config in consumers:
            try:
                await self._js.add_consumer(settings.NATS_STREAM_NAME, config)
                logger.debug("Consumer '%s' created/updated", config.durable_name)
            except Exception:
                logger.exception("Failed to create consumer '%s'", config.durable_name)

    # ------------------------------------------------------------------
    # Connection lifecycle callbacks
    # ------------------------------------------------------------------

    async def _error_cb(self, e: Exception) -> None:
        logger.error("NATS error: %s", e)

    async def _disconnected_cb(self) -> None:
        logger.warning("NATS disconnected — will attempt reconnect")
        self._connected = False

    async def _reconnected_cb(self) -> None:
        logger.info("NATS reconnected to %s", self._nc.connected_url if self._nc else "unknown")
        self._connected = True

    async def _closed_cb(self) -> None:
        logger.info("NATS connection closed")
        self._connected = False


# Module-level singleton
nats_client = NATSClient()
