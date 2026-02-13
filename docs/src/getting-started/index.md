# Getting Started

Welcome to the L.O.V.E. platform! Follow these guides to set up and start using the system.

## Quick Links

| Guide | Time | Description |
|-------|------|-------------|
| **[Installation](installation.md)** | 15 min | Install prerequisites and set up the stack |
| **[Quick Start](quick-start.md)** | 10 min | Run your first emotional analysis |

## Prerequisites

- **Python 3.12+** — Backend services
- **Node.js 18+** — Experience module
- **PostgreSQL 18+** with pgvector — Vector search
- **Redis 7+** — Task queuing
- **Ollama** — Local LLM inference

## One-Command Setup

```bash
cd infra
./bin/setup-love-stack.sh
```

This script handles everything: Python environments, database initialization, model downloads, and dependency installation.

## Next Steps

After setup, explore the [Module Documentation](../modules/index.md) to learn about each component, or dive into the [Architecture Overview](../architecture/01-system-overview.md) for a technical deep-dive.
