# Development Guide

**Status**: Placeholder Stub
**Description**: Instructions for new developers contributing to the platform.

## Setup

1. **Prerequisites**:
   - Python 3.11+
   - Node.js 18+
   - Docker/Podman
   - Ollama (installed and running)

2. **Installation**:

   ```bash
   cd infra
   ./setup-love-stack.sh
   ```

## Workflow

- We use **GitLab Flow** (feature branches off `main`).
- **Commits**: Use conventional commits (e.g., `feat:`, `fix:`, `docs:`).

## Testing

- Run full suite: `./infra/test-love-stack.sh`
- Backend: `pytest`
- Frontend: `npm run test`

*(This document is a stub. See `CONTRIBUTING.md` for more details.)*
