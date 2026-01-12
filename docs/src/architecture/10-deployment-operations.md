# Deployment & Operations

**Status**: Placeholder Stub
**Description**: Guide for deploying and operating the L.O.V.E. stack.

## Local Development

The stack operates on a "Local First" philosophy.

- Start all services: `./infra/run-love-stack.sh`
- Stop services: `./infra/stop-love-stack.sh`

## Containerization

We interpret standard OCI containers suitable for Docker or Podman.

- **Compose**: `infra/podman-compose.yml` orchestrates the 4 services + databases.

## Environment Variables

Configuration is managed via `.env` files.

- `NEXT_PUBLIC_API_URL`: Experience -> API
- `DATABASE_URL`: Observer -> Postgres
- `REDIS_URL`: Async queue connection

*(This document is a stub. See `infra/README.md` for executable instructions.)*
