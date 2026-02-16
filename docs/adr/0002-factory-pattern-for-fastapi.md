# ADR 0002: Factory Pattern for FastAPI Services

**Status:** Accepted  
**Date:** 2026-02-15  
**Context:** Each Python service needs a consistent way to create and configure a FastAPI application with middleware, routes, and shared integrations.

## Decision

Use an **application factory pattern** (`create_app()` function) in each service's `app/core/factory.py`.

## Structure

```
app/core/factory.py
├── lifespan()              # async context manager for startup/shutdown
└── create_app() -> FastAPI
    ├── Middleware           # CORS, correlation IDs
    ├── setup_rate_limiting()
    ├── register_error_handlers()
    ├── configure_tracing()
    └── Routers             # service-specific routes
```

## Rationale

- **Testability:** Tests can create a fresh app instance (`app = create_app()`) without module-level side effects.
- **Lifespan management:** The `@asynccontextmanager` pattern replaces deprecated `@app.on_event("startup")` / `@app.on_event("shutdown")` handlers.
- **Extensibility:** New integrations (tracing, error handlers) slot in as single function calls with `ImportError` fallbacks.
- **Uniformity:** All 3 Python services follow the same structure, making onboarding and cross-service changes predictable.

## Consequences

- `app/main.py` contains only `from app.core.factory import create_app; app = create_app()`.
- Shared modules use try/except `ImportError` guards so services degrade gracefully when run outside containers.
- Container entrypoints reference `app.main:app`.
