# Compose Files Directory

This directory will contain Podman/Docker Compose files for orchestrating the L.O.V.E. stack containers.

## Status: Placeholder for Future Implementation

**See:** `../CONTAINERIZATION_ROADMAP.md` for complete implementation plan

## Planned Compose Files

- `compose.yml` - Full production stack
- `compose.dev.yml` - Development overrides (hot-reload, debug mode)
- `compose.services.yml` - Services only (PostgreSQL, Redis, Ollama)
- `compose.test.yml` - Test environment configuration

## Usage (Future)

### Full Stack (Production-like)
```bash
podman-compose -f compose/compose.yml up
```

### Development Mode (Hot-reload)
```bash
podman-compose -f compose/compose.yml -f compose/compose.dev.yml up
```

### Hybrid Mode (Services in containers, APIs native)
```bash
podman-compose -f compose/compose.services.yml up -d
cd ..
./infra/run-love-stack.sh
```

## Why Podman Compose?

- ✅ Rootless and daemonless (more secure)
- ✅ Compatible with Docker Compose files
- ✅ Drop-in replacement for docker-compose
- ✅ Native Kubernetes YAML generation

## Compatibility

All compose files use the standard Docker Compose v3.8 format and work with:
- **Podman Compose** (recommended)
- **Docker Compose** (compatible)
- **Podman Kubernetes** (`podman kube play`)

## Next Steps

See `../CONTAINERIZATION_ROADMAP.md` for:
- Phase 2.1: Service containers (hybrid development)
- Phase 2.2: Full stack containerization
- Phase 2.3: Production deployment
