# Development Guide

**Status**: Placeholder Stub
**Description**: Instructions for new developers contributing to the platform.

## Setup

1. **Prerequisites**:
   - Python 3.12+
   - Node.js 18+
   - Docker/Podman
   - Ollama (installed and running)

2. **Installation**:

   ```bash
   cd infra
   ./bin/setup-love-stack.sh
   # To update existing envs:
   ./bin/setup-love-stack.sh --update
   ```

## Dependency Management

We use a split dependency model to optimize production images:

- **`requirements.txt`**: Production-only dependencies (installed in Docker).
- **`requirements-dev.txt`**: Development/Testing dependencies (pytest, mypy, flake8).

**Adding a dependency:**
1.  Add to the appropriate file.
2.  Run `pip install -r <file>` to update local venv.
3.  Rebuild images if changing `requirements.txt`.

## Workflow

- We use **GitHub Flow** (feature branches off `main`).
- **Commits**: Use conventional commits (e.g., `feat:`, `fix:`, `docs:`).

## Testing

- Run full suite: `./infra/bin/test-love-stack.sh`
- Backend: `pytest`
- Frontend: `npm run test`

*(This document is a stub. See `CONTRIBUTING.md` for more details.)*
