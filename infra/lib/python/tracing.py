"""
Shared OpenTelemetry tracing configuration for L.O.V.E. services.

Usage in each service's factory.py:

    from tracing import configure_tracing
    configure_tracing(app, service_name="observer")

The tracer is a **no-op** unless ``OTEL_EXPORTER_OTLP_ENDPOINT`` is set,
so local development is unaffected.
"""

from __future__ import annotations

import logging
import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import FastAPI

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def get_tracer(name: str = __name__):
    """Return an OTel tracer (or a no-op tracer if the SDK is absent)."""
    try:
        from opentelemetry import trace  # type: ignore[import-untyped]

        return trace.get_tracer(name)
    except ImportError:
        return _NoOpTracer()


def configure_tracing(app: "FastAPI", service_name: str) -> None:
    """
    Bootstrap OpenTelemetry tracing for a FastAPI application.

    * Sets up a :class:`TracerProvider` with an OTLP/gRPC exporter.
    * Auto-instruments FastAPI (inbound HTTP spans).
    * Injects ``trace_id`` / ``span_id`` into structlog context so logs
      and traces are correlated.

    **Safe to call unconditionally** — if the ``opentelemetry`` packages
    are not installed or ``OTEL_EXPORTER_OTLP_ENDPOINT`` is not set, this
    function logs a message and returns without side-effects.
    """
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")

    # ------------------------------------------------------------------
    # Guard: OTel SDK must be installed
    # ------------------------------------------------------------------
    try:
        from opentelemetry import trace  # type: ignore[import-untyped]
        from opentelemetry.instrumentation.fastapi import (  # type: ignore[import-untyped]
            FastAPIInstrumentor,
        )
        from opentelemetry.sdk.resources import Resource  # type: ignore[import-untyped]
        from opentelemetry.sdk.trace import TracerProvider  # type: ignore[import-untyped]
    except ImportError:
        logger.info(
            "opentelemetry SDK not installed — tracing disabled. "
            "Install with: pip install opentelemetry-api opentelemetry-sdk "
            "opentelemetry-instrumentation-fastapi opentelemetry-exporter-otlp-proto-grpc"
        )
        return

    # ------------------------------------------------------------------
    # Guard: exporter endpoint must be configured
    # ------------------------------------------------------------------
    if not endpoint:
        logger.info(
            "OTEL_EXPORTER_OTLP_ENDPOINT not set — tracing disabled. "
            "Set it to enable trace export (e.g. http://localhost:4317)."
        )
        return

    # ------------------------------------------------------------------
    # Configure TracerProvider + OTLP exporter
    # ------------------------------------------------------------------
    try:
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (  # type: ignore[import-untyped]
            OTLPSpanExporter,
        )
        from opentelemetry.sdk.trace.export import (  # type: ignore[import-untyped]
            BatchSpanProcessor,
        )
    except ImportError:
        logger.warning(
            "opentelemetry OTLP exporter not installed — tracing disabled. "
            "Install with: pip install opentelemetry-exporter-otlp-proto-grpc"
        )
        return

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.namespace": "love",
        }
    )

    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))

    trace.set_tracer_provider(provider)

    # ------------------------------------------------------------------
    # Auto-instrument FastAPI
    # ------------------------------------------------------------------
    FastAPIInstrumentor.instrument_app(app)

    logger.info(
        "OpenTelemetry tracing enabled — service=%s endpoint=%s",
        service_name,
        endpoint,
    )


# ---------------------------------------------------------------------------
# Structlog processor (optional — add to your processor chain)
# ---------------------------------------------------------------------------


def add_trace_context(logger, method_name, event_dict):
    """
    Structlog processor that injects ``trace_id`` and ``span_id`` into
    every log event, enabling log-trace correlation in backends like
    Grafana or Datadog.

    Usage::

        processors.insert(0, add_trace_context)
    """
    try:
        from opentelemetry import trace  # type: ignore[import-untyped]

        span = trace.get_current_span()
        ctx = span.get_span_context()
        if ctx and ctx.trace_id:
            event_dict["trace_id"] = format(ctx.trace_id, "032x")
            event_dict["span_id"] = format(ctx.span_id, "016x")
    except ImportError:
        pass
    return event_dict


# ---------------------------------------------------------------------------
# Minimal no-op fallback
# ---------------------------------------------------------------------------


class _NoOpSpan:
    """Context-manager that does nothing."""

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def set_attribute(self, key, value):
        pass

    def add_event(self, name, attributes=None):
        pass


class _NoOpTracer:
    """Returned by :func:`get_tracer` when the OTel SDK is not installed."""

    def start_as_current_span(self, name, **kwargs):
        return _NoOpSpan()
