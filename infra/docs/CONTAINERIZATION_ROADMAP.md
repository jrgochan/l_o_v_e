# L.O.V.E. Stack - Containerization Roadmap

## Status: Planned for Future Implementation

This document outlines the complete plan for containerizing the L.O.V.E. stack using **Containerfiles** (OCI standard) and **Podman Compose**.

**Current Status:** Phase 1 (Native/WSL Development) - ✅ Complete
**Next Phase:** Phase 2 (Containerization) - 🔜 Planned

---

## Why Containerfiles + Podman?

### Decision Rationale

**Containerfiles over Dockerfiles:**
- ✅ OCI (Open Container Initiative) standard
- ✅ Works with both Docker and Podman
- ✅ More portable and vendor-neutral
- ✅ Better for open-source projects
- ✅ Future-proof specification

**Podman over Docker:**
- ✅ Daemonless architecture (more secure)
- ✅ Rootless containers by default
- ✅ Drop-in replacement for Docker (`alias docker=podman`)
- ✅ Native systemd integration
- ✅ Kubernetes-compatible (`podman kube generate`)
- ✅ No licensing concerns

**Why NOT Apptainer/Singularity:**
- ❌ Designed for HPC/scientific computing
- ❌ Single-container focus (not multi-service orchestration)
- ❌ Limited compose/orchestration support
- ❌ Our stack is a web application (better suited for Podman)

---

## Architecture Vision

### Three Deployment Modes

```
┌──────────────────────────────────────────────────────────┐
│  MODE 1: Native Development (Current - Phase 1)         │
├──────────────────────────────────────────────────────────┤
│  All services installed directly on host system          │
│  • Fast iteration & debugging                            │
│  • Simple setup with scripts                             │
│  • Platform-specific (macOS/Linux/WSL)                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  MODE 2: Hybrid Development (Phase 2.1)                 │
├──────────────────────────────────────────────────────────┤
│  Services in containers, APIs native                     │
│  • Consistent PostgreSQL/Redis/Ollama                    │
│  • Fast API hot-reload                                   │
│  • Easy cleanup                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  MODE 3: Full Containerization (Phase 2.2)              │
├──────────────────────────────────────────────────────────┤
│  Everything in containers                                │
│  • Complete consistency                                  │
│  • Production parity                                     │
│  • Platform independent                                  │
└──────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 2.1: Service Containers (2-3 days)

**Goal:** Run PostgreSQL, Redis, and Ollama in containers

#### Deliverables

**1. Containerfiles for Services**
```
infra/containers/
├── Containerfile.postgresql
├── Containerfile.redis
└── Containerfile.ollama
```

**2. Services-Only Compose File**
```yaml
# infra/compose/compose.services.yml
services:
  postgresql:
    build:
      context: ..
      dockerfile: containers/Containerfile.postgresql
    ports: ["5432:5432"]
    volumes: ["postgres-data:/var/lib/postgresql/data"]

  redis:
    build:
      context: ..
      dockerfile: containers/Containerfile.redis
    ports: ["6379:6379"]
    volumes: ["redis-data:/data"]

  ollama:
    build:
      context: ..
      dockerfile: containers/Containerfile.ollama
    ports: ["11434:11434"]
    volumes: ["ollama-models:/root/.ollama"]
```

**3. Management Scripts**
```bash
infra/scripts/
├── build-services.sh    # Build service containers
├── start-services.sh    # Start service containers
└── stop-services.sh     # Stop service containers
```

**4. Updated Documentation**
- Add hybrid mode to setup guides
- Document switching between native and hybrid
- Update troubleshooting for containers

#### Benefits of Phase 2.1

- ✅ Team gets consistent service versions
- ✅ No system-level PostgreSQL installation needed
- ✅ APIs still run natively (fast development)
- ✅ Easy to test and validate approach
- ✅ Incremental migration (low risk)

#### Developer Workflow (Phase 2.1)

```bash
# Option A: Native (current)
cd infra
./run-love-stack.sh

# Option B: Hybrid (new)
cd infra
podman-compose -f compose/compose.services.yml up -d
./run-love-stack.sh  # Runs APIs natively, connects to containerized services
```

---

### Phase 2.2: Full Stack Containerization (3-4 days)

**Goal:** Containerize all components including APIs

#### Deliverables

**1. API Containerfiles**
```
infra/containers/
├── Containerfile.versor
├── Containerfile.observer
├── Containerfile.listener
├── Containerfile.experience-web
```

**2. Full Stack Compose File**
```yaml
# infra/compose/compose.yml
services:
  postgresql: {...}
  redis: {...}
  ollama: {...}

  versor:
    build:
      context: ..
      dockerfile: containers/Containerfile.versor
    depends_on: [postgresql, redis]
    ports: ["8001:8001"]

  observer:
    build:
      context: ..
      dockerfile: containers/Containerfile.observer
    depends_on: [postgresql]
    ports: ["8000:8000"]

  listener:
    build:
      context: ..
      dockerfile: containers/Containerfile.listener
    depends_on: [redis, ollama]
    ports: ["8002:8002"]

  experience-web:
    build:
      context: ..
      dockerfile: containers/Containerfile.experience-web
    depends_on: [versor, observer, listener]
    ports: ["3000:3000"]
```

**3. Development Overrides**
```yaml
# infra/compose/compose.dev.yml
# Overrides for development (hot-reload, volumes, etc.)
services:
  versor:
    volumes:
      - ../versor/app:/app/app:ro
    command: uvicorn app.main:app --reload --host 0.0.0.0

  experience-web:
    volumes:
      - ../experience/web:/app:ro
      - /app/node_modules
      - /app/.next
```

**4. Container Management Scripts**
```bash
infra/scripts/
├── build-containers.sh     # Build all Containerfiles
├── push-containers.sh      # Push to registry
├── run-containers-dev.sh   # Start with dev overrides
├── run-containers-prod.sh  # Start production mode
└── clean-containers.sh     # Clean up images/volumes
```

#### Benefits of Phase 2.2

- ✅ Complete reproducibility
- ✅ Works on any platform (Windows, macOS, Linux)
- ✅ Production parity
- ✅ Easy onboarding (one command)
- ✅ Ready for cloud deployment

#### Developer Workflow (Phase 2.2)

```bash
# Development with hot-reload
podman-compose -f compose/compose.yml -f compose/compose.dev.yml up

# Production-like testing
podman-compose -f compose/compose.yml up

# Clean rebuild
podman-compose down -v
podman-compose build --no-cache
podman-compose up
```

---

### Phase 2.3: Production Deployment (2-3 days)

**Goal:** Enable production deployments

#### Deliverables

**1. Kubernetes Manifests**
```bash
# Generate from Podman
podman kube generate love-stack > infra/deploy/kubernetes/love-stack.yml

# Or create manually
infra/deploy/kubernetes/
├── namespace.yaml
├── postgresql-statefulset.yaml
├── redis-deployment.yaml
├── ollama-deployment.yaml
├── versor-deployment.yaml
├── observer-deployment.yaml
├── listener-deployment.yaml
├── experience-deployment.yaml
├── services.yaml
└── ingress.yaml
```

**2. Systemd Integration**
```bash
# Generate systemd service from Podman
podman generate systemd --new --name love-stack > love-stack.service

infra/deploy/systemd/
├── love-stack.service
└── README.md
```

**3. Cloud Deployment Guides**
```
infra/deploy/
├── aws/              # ECS, EKS guides
├── gcp/              # Cloud Run, GKE guides
├── azure/            # ACI, AKS guides
└── README.md
```

**4. CI/CD Integration**
```yaml
# .github/workflows/build-containers.yml
# .gitlab-ci.yml
```

---

## Detailed Containerfile Examples

### Example: Versor API

```dockerfile
# infra/containers/Containerfile.versor
FROM python:3.11-slim

LABEL org.opencontainers.image.title="L.O.V.E. Versor API"
LABEL org.opencontainers.image.description="Quaternion mathematics and vector operations API"

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        && rm -rf /var/lib/apt/lists/*

# Copy and install requirements
COPY versor/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY versor/app ./app

# Create non-root user
RUN useradd -m -u 1000 versor && \
    chown -R versor:versor /app
USER versor

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
    CMD python -c "import requests; requests.get('http://localhost:8001/health').raise_for_status()"

# Expose port
EXPOSE 8001

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Example: PostgreSQL with pgvector

```dockerfile
# infra/containers/Containerfile.postgresql
FROM postgres:16-alpine

LABEL org.opencontainers.image.title="L.O.V.E. PostgreSQL"
LABEL org.opencontainers.image.description="PostgreSQL 16 with pgvector extension"

# Install pgvector extension
RUN apk add --no-cache \
        git \
        build-base \
        postgresql-dev \
    && cd /tmp \
    && git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git \
    && cd pgvector \
    && make \
    && make install \
    && cd / \
    && rm -rf /tmp/pgvector \
    && apk del git build-base

# Copy initialization scripts
COPY observer/scripts/init-db.sql /docker-entrypoint-initdb.d/

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s \
    CMD pg_isready -U postgres

EXPOSE 5432
```

### Example: Ollama

```dockerfile
# infra/containers/Containerfile.ollama
FROM ollama/ollama:latest

LABEL org.opencontainers.image.title="L.O.V.E. Ollama"
LABEL org.opencontainers.image.description="Ollama LLM server with Llama 3.1"

# Pre-pull model (optional - increases image size)
# RUN ollama pull llama3.1:8b-instruct-q4_0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
    CMD curl -f http://localhost:11434/api/tags || exit 1

EXPOSE 11434

CMD ["serve"]
```

---

## Compose File Structure

### compose.yml (Production)

```yaml
version: '3.8'

services:
  postgresql:
    build:
      context: ..
      dockerfile: containers/Containerfile.postgresql
    container_name: love-postgresql
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-love_dev}
      POSTGRES_DB: ${POSTGRES_DB:-love_observer}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - love-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    build:
      context: ..
      dockerfile: containers/Containerfile.redis
    container_name: love-redis
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    networks:
      - love-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  ollama:
    build:
      context: ..
      dockerfile: containers/Containerfile.ollama
    container_name: love-ollama
    volumes:
      - ollama-models:/root/.ollama
    ports:
      - "11434:11434"
    networks:
      - love-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3

  versor:
    build:
      context: ..
      dockerfile: containers/Containerfile.versor
    container_name: love-versor
    depends_on:
      postgresql:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-love_dev}@postgresql:5432/${POSTGRES_DB:-love_observer}
      REDIS_URL: redis://redis:6379
    ports:
      - "8001:8001"
    networks:
      - love-network
    restart: unless-stopped

  observer:
    build:
      context: ..
      dockerfile: containers/Containerfile.observer
    container_name: love-observer
    depends_on:
      postgresql:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-love_dev}@postgresql:5432/${POSTGRES_DB:-love_observer}
    ports:
      - "8000:8000"
    networks:
      - love-network
    restart: unless-stopped

  listener:
    build:
      context: ..
      dockerfile: containers/Containerfile.listener
    container_name: love-listener
    depends_on:
      redis:
        condition: service_healthy
      ollama:
        condition: service_healthy
    environment:
      REDIS_URL: redis://redis:6379
      OLLAMA_URL: http://ollama:11434
    ports:
      - "8002:8002"
    networks:
      - love-network
    restart: unless-stopped

  experience-web:
    build:
      context: ..
      dockerfile: containers/Containerfile.experience-web
    container_name: love-experience
    depends_on:
      - versor
      - observer
      - listener
    environment:
      NEXT_PUBLIC_API_BASE_URL: http://localhost:8000
      NEXT_PUBLIC_VERSOR_URL: http://localhost:8001
      NEXT_PUBLIC_LISTENER_URL: http://localhost:8002
    ports:
      - "3000:3000"
    networks:
      - love-network
    restart: unless-stopped

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local
  ollama-models:
    driver: local

networks:
  love-network:
    driver: bridge
```

### compose.dev.yml (Development Overrides)

```yaml
version: '3.8'

services:
  versor:
    build:
      context: ..
      dockerfile: containers/Containerfile.versor
      target: development
    volumes:
      - ../versor/app:/app/app:ro
    command: uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
    environment:
      - LOG_LEVEL=debug

  observer:
    volumes:
      - ../observer/app:/app/app:ro
    command: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

  listener:
    volumes:
      - ../listener/app:/app/app:ro
    command: uvicorn app.main:app --reload --host 0.0.0.0 --port 8002

  experience-web:
    volumes:
      - ../experience/web:/app:ro
      - /app/node_modules
      - /app/.next
    command: npm run dev
```

---

## Migration Guide

### Step 1: Validate Current Setup

Before migrating, ensure native setup works:
```bash
cd infra
./test-love-stack.sh
```

### Step 2: Install Podman

**macOS:**
```bash
brew install podman
podman machine init
podman machine start
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install -y podman

# Fedora/RHEL
sudo dnf install -y podman
```

**Windows (WSL):**
```bash
# In WSL
sudo apt-get install -y podman
```

### Step 3: Build Containers

```bash
cd infra
./scripts/build-containers.sh
```

### Step 4: Start Containerized Stack

```bash
# Services only (hybrid mode)
podman-compose -f compose/compose.services.yml up -d

# Full stack
podman-compose -f compose/compose.yml up -d

# With dev hot-reload
podman-compose -f compose/compose.yml -f compose/compose.dev.yml up
```

### Step 5: Verify

```bash
podman ps
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
```

---

## Benefits Summary

### For Developers
- ✅ Consistent environment across team
- ✅ No system-level package installation
- ✅ Easy cleanup (`podman-compose down -v`)
- ✅ Faster onboarding
- ✅ Multiple versions can coexist

### For Operations
- ✅ Reproducible builds
- ✅ Easy deployment
- ✅ Better security (rootless)
- ✅ Resource isolation
- ✅ Scalability ready

### For Project
- ✅ Platform independent
- ✅ Production parity
- ✅ CI/CD friendly
- ✅ Cloud ready
- ✅ Future-proof

---

## Timeline Estimate

| Phase | Duration | Priority |
|-------|----------|----------|
| **2.1: Service Containers** | 2-3 days | Medium |
| **2.2: Full Containerization** | 3-4 days | Low |
| **2.3: Production Deployment** | 2-3 days | Low |
| **Total** | **7-10 days** | Future Work |

---

## Decision Log

**Date:** December 8, 2025
**Decision:** Use Containerfiles + Podman (not Dockerfiles + Docker)
**Rationale:**
- OCI standard compatibility
- Rootless security
- No licensing concerns
- Kubernetes-compatible

**Date:** December 8, 2025
**Decision:** Skip Apptainer/Singularity
**Rationale:**
- Designed for HPC, not web apps
- Limited orchestration support
- Podman better fits our use case

---

## Next Steps

1. Complete Phase 1 (Native/WSL) - ✅ **COMPLETE**
2. Gather feedback from Windows users
3. Assess if containerization is needed (team growth, deployment needs)
4. If yes, proceed with Phase 2.1 (Service Containers)
5. Iterate and gather feedback
6. Continue to Phase 2.2 if beneficial

---

**This roadmap will be updated as requirements evolve.**
