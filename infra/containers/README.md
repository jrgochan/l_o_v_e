# Containerfiles Directory

This directory will contain Containerfiles (OCI-compliant container definitions) for all L.O.V.E. stack components.

## Status: Placeholder for Future Implementation

**See:** `../CONTAINERIZATION_ROADMAP.md` for complete implementation plan

## Planned Containerfiles

### Services
- `Containerfile.postgresql` - PostgreSQL 16 with pgvector extension
- `Containerfile.redis` - Redis 7 for caching and job queues
- `Containerfile.ollama` - Ollama LLM server

### APIs
- `Containerfile.versor` - Versor quaternion math API
- `Containerfile.observer` - Observer data persistence API
- `Containerfile.listener` - Listener audio/semantic analysis API

### Frontend
- `Containerfile.experience-web` - Next.js web application

## Why Containerfiles?

Containerfiles are the **OCI (Open Container Initiative) standard** format for container images:
- Compatible with both Docker and Podman
- Vendor-neutral and future-proof
- Same syntax as Dockerfiles

## Building Containers

Once implemented, use:
```bash
# Build all containers
cd infra
./scripts/build-containers.sh

# Or build individually with Podman
podman build -f containers/Containerfile.versor -t love-versor ..

# Or with Docker (compatible)
docker build -f containers/Containerfile.versor -t love-versor ..
```

## Next Steps

1. Complete Phase 1 (Native/WSL development) ✅
2. Gather feedback and assess need for containerization
3. Implement Phase 2.1 (Service containers)
4. Implement Phase 2.2 (Full containerization)

See `../CONTAINERIZATION_ROADMAP.md` for detailed timeline and implementation guide.
