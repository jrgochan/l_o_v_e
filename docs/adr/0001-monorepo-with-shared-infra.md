# ADR 0001: Monorepo with Shared Infrastructure

**Status:** Accepted  
**Date:** 2026-02-15  
**Context:** L.O.V.E. consists of four services (Listener, Observer, Versor, Experience) plus a PersonaPlex module.

## Decision

Use a **single monorepo** with shared infrastructure in `infra/lib/python/` for cross-cutting concerns (logging, security, error handling, tracing).

## Rationale

- **Consistency:** Shared modules ensure identical behavior across services (e.g., the same exception hierarchy, the same structured logging format).
- **Atomic changes:** A single commit can update a shared module and all consumers.
- **Simpler CI:** One repository means one CI pipeline matrix, not N independent repos.
- **Low ceremony:** No package registry needed — modules are mounted via `PYTHONPATH` in containers and `sys.path` in tests.

## Trade-offs

- Services must coordinate Python version and shared dependency pins.
- Large-scale refactors touch many directories in one PR.
- Container builds copy the shared directory, increasing image layer size slightly.

## Consequences

- All Python services set `PYTHONPATH=/app:/app/common` in their Containerfiles.
- Tests add `infra/lib/python` to `sys.path` via `conftest.py`.
- The root `pyproject.toml` is the single source of truth for shared dependencies.
