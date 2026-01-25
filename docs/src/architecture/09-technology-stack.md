# Technology Stack

**Status**: Placeholder Stub
**Description**: Listing of all major technologies used in the L.O.V.E. platform.

## Backend (Python 3.12)

- **FastAPI**: High-performance async web framework.
- **Pydantic**: Data validation and hygiene.
- **Uvicorn**: ASGI server.
- **Faster-Whisper**: Local speech-to-text.
- **Spacy**: NER for PII scrubbing.

## Frontend (TypeScript)

- **Next.js 16**: React framework (App Router).
- **React 19**: Component library.
- **React Three Fiber (R3F) v9**: 3D rendering engine.
- **Three.js**: Core 3D library.
- **Zustand**: State management.
- **TailwindCSS**: Styling.

## Infrastructure: Local Development

The local stack is optimized for "Local First" development with minimal external dependencies.

- **Container Runtime**: Docker or Podman
- **Database**: PostgreSQL 16 (Local Container)
- **Cache**: Redis 7 (Local Container)
- **AI Inference**: Ollama (Running on host machine)
- **Orchestration**: `podman-compose` or `docker-compose`

## Infrastructure: Production Deployment (GCP)

The production stack scales using managed Google Cloud Platform services.

- **Compute**:
    - **Cloud Run Services**: Stateless containers for `versor`, `observer`, `listener`.
    - **Cloud Run Jobs**: On-demand execution for heavy tasks (Path Computation).
- **Data Persistence**:
    - **Cloud SQL**: Managed PostgreSQL 16 with `pgvector` extension.
    - **Memorystore**: Managed Redis for task queuing.
- **Security**:
    - **Secret Manager**: Encrypted storage for API keys and DB credentials.
    - **IAM**: Service-to-service identity (no long-lived service account keys).

*(This document is a stub. Version details available in `pyproject.toml` and `package.json` files.)*
