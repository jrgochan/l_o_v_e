# Technology Stack

**Last Updated:** February 2026
**Description**: All major technologies used in the L.O.V.E. platform.

## Backend (Python 3.12)

- **FastAPI**: High-performance async web framework.
- **Pydantic**: Data validation and hygiene.
- **Uvicorn**: ASGI server.
- **SQLAlchemy** (async): ORM with PostgreSQL + pgvector.
- **Alembic**: Database migrations.
- **Faster-Whisper**: Local speech-to-text (Listener module).
- **Spacy**: NER for PII scrubbing (Listener module).
- **Ollama + Llama 3.1**: Local LLM for semantic VAC extraction.
- **NumPy / SciPy**: Vector operations and quaternion math (Versor module).

## Frontend (TypeScript)

- **Next.js 16.1.1**: React framework (App Router).
- **React 19.2.1**: Component library.
- **React Three Fiber (R3F) v9**: 3D rendering engine.
- **Three.js 0.170**: Core 3D library.
- **Zustand**: State management.
- **TypeScript**: Type safety across the codebase.

## Infrastructure: Local Development

The local stack is optimized for "Local First" development with minimal external dependencies.

- **Container Runtime**: Docker or Podman
- **Database**: PostgreSQL 18 with pgvector extension
- **AI Inference**: Ollama (running on host machine)
- **Orchestration**: `podman-compose` or `docker-compose`
- **Start Script**: `./infra/run-love-stack.sh`

## Infrastructure: Production Deployment (Ansible)

The production stack runs on a single RHEL 9 server managed by Ansible.

- **Server**: RHEL 9 (love.jrgochan.io)
- **Deployment Tool**: Ansible playbook (`infra/deploy/deploy-ansible.sh`)
- **Process Manager**: systemd (one service per module)
- **Reverse Proxy**: Nginx with SSL termination (Let's Encrypt)
- **Database**: PostgreSQL 18 with pgvector (local on server)
- **AI Inference**: Ollama (local on server)
- **Node.js**: v20 (for Experience frontend build)
- **Python**: 3.12 (for backend modules + MkDocs build)
- **Documentation**: MkDocs built on server, served at `/docs`

### Key Deployment Files

| File | Purpose |
|------|---------|
| `infra/deploy/deploy-ansible.sh` | Deployment entry point |
| `infra/deploy/ansible/group_vars/rhel9.yml` | Server configuration variables |
| `infra/deploy/ansible/roles/app/tasks/main.yml` | Main task orchestration |
| `infra/deploy/ansible/roles/app/templates/nginx.conf.j2` | Nginx configuration |

Version details are maintained in `pyproject.toml` (backend) and `package.json` (frontend).
