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

## Google Cloud Deployment

The stack is designed for production deployment on GCP.

### Services
- **Cloud Run Services**: Hosts `versor`, `observer`, and `listener` APIs.
- **Cloud Run Jobs**: Handles the `compute-paths` task (previously local).
- **Cloud SQL (PostgreSQL 16)**: Managed database with `pgvector` extension.
- **Memorystore (Redis)**: Managed Redis for Asyncio task queuing.
- **Secret Manager**: Securely stores DB passwords and API tokens.

### Deployment Commands

Deploying to GCP involves a multi-stage process handled by scripts in `infra/deploy/gcp/`:

1.  **Build & Push**: `02-build-push.sh`
2.  **Deploy Infra**: `03-provision-infra.sh` (Terraform/gcloud)
3.  **Deploy Services**: `04-deploy-services.sh`
4.  **Compute Paths**: `06-compute-paths.sh` (Runs remotely)
