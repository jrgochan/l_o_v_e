# ADR 0003: Structured Logging and Distributed Tracing

**Status:** Accepted  
**Date:** 2026-02-15  
**Context:** Services need correlated, queryable logs and distributed traces for debugging cross-service request flows.

## Decision

Use **structlog** for structured logging, **asgi-correlation-id** for request correlation, and **OpenTelemetry** for distributed tracing.

## Stack

| Layer | Tool | Purpose |
|---|---|---|
| Structured logs | `structlog` | JSON/console output with context binding |
| Request IDs | `asgi-correlation-id` | Propagate `X-Request-ID` across services |
| Traces | `opentelemetry-sdk` + OTLP exporter | Distributed tracing with span context |
| Correlation | `tracing.add_trace_context` structlog processor | Inject `trace_id`/`span_id` into log events |

## Rationale

- **structlog** produces machine-parseable JSON in production and human-readable colored output in development, from the same code.
- **asgi-correlation-id** gives every request a unique ID that propagates through HTTP headers, enabling log correlation without full tracing infrastructure.
- **OpenTelemetry** is the CNCF standard for distributed tracing, ensuring vendor neutrality (can export to Jaeger, Grafana Tempo, Datadog, etc.).
- The tracing module **no-ops gracefully** when the SDK isn't installed or the exporter endpoint isn't configured, keeping local development friction-free.

## Configuration

- `OTEL_EXPORTER_OTLP_ENDPOINT` — set to enable trace export (e.g., `http://tempo:4317`)
- `LOG_FORMAT=json` — switch to JSON structured logs (default: console)
- `LOG_LEVEL` — standard Python log level (default: `INFO`)

## Consequences

- All services share `infra/lib/python/logging_config.py` and `infra/lib/python/tracing.py`.
- Factory functions call `configure_logging()` and `configure_tracing()` at startup.
- Log events include `request_id`, and optionally `trace_id`/`span_id` when OTel is active.
