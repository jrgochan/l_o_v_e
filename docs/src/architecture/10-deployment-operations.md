# Deployment & Operations

**Last Updated:** February 2026
**Description**: Guide for deploying and operating the L.O.V.E. stack.

## Local Development

The stack operates on a "Local First" philosophy. All dependencies run locally.

### Start/Stop Services

```bash
# Start all services (Observer, Versor, Listener, Experience)
./infra/bin/run-love-stack.sh

# Stop all services
./infra/bin/stop-love-stack.sh
```

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| Observer | 8000 | <http://localhost:8000> |
| Versor | 8001 | <http://localhost:8001> |
| Listener | 8002 | <http://localhost:8002> |
| Experience | 3000 | <http://localhost:3000> |
| PostgreSQL | 5432 | localhost |
| Ollama | 11434 | <http://localhost:11434> |

### Container Development (Alternative)

For containerized local development:

- **Compose file**: `infra/podman-compose.yml`
- Orchestrates 4 services + PostgreSQL + Ollama
- Compatible with Docker Compose or Podman Compose

## Environment Variables

Configuration is managed via `.env` files.

| Variable | Used By | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Experience | API base URL for frontend |
| `DATABASE_URL` | Observer | PostgreSQL connection string |
| `OLLAMA_BASE_URL` | Listener | Ollama API endpoint |
| `SECRET_KEY` | Observer | JWT authentication secret |

## Production Deployment (Ansible)

The production stack runs on a RHEL 9 server, deployed via Ansible.

### Architecture

```text
love.jrgochan.io (RHEL 9)
├── Nginx (SSL termination + reverse proxy)
│   ├── / → Experience (:3000)
│   ├── /observer/* → Observer (:8000)
│   ├── /versor/* → Versor (:8001)
│   ├── /listener/* → Listener (:8002)
│   └── /docs → MkDocs static site
├── systemd services (one per module)
├── PostgreSQL 18 + pgvector
└── Ollama (LLM inference)
```

### Deployment Process

```bash
# Deploy everything (backend, frontend, docs, nginx)
./infra/deploy/deploy-ansible.sh
```

The Ansible playbook executes these steps in order:

1. **System dependencies** (`common` role) — Python, Node.js, system packages
2. **Backend services** (`backend.yml`) — Clone/pull code, install Python deps, configure systemd
3. **Frontend build** (`frontend.yml`) — `npm install` + `npm run build`
4. **Documentation build** (`docs.yml`) — MkDocs build into static site
5. **Nginx configuration** (`nginx.yml`) — Apply template, reload Nginx

### Key Configuration Files

| File | Purpose |
|------|---------|
| `infra/deploy/deploy-ansible.sh` | Entry point script |
| `infra/deploy/ansible/inventory/hosts.yml` | Server inventory |
| `infra/deploy/ansible/group_vars/production/vars.yml` | Server variables |
| `infra/deploy/ansible/roles/app/tasks/main.yml` | Task orchestration |
| `infra/deploy/ansible/roles/app/tasks/backend.yml` | Backend deployment |
| `infra/deploy/ansible/roles/app/tasks/frontend.yml` | Frontend build |
| `infra/deploy/ansible/roles/app/tasks/docs.yml` | Documentation build |
| `infra/deploy/ansible/roles/app/templates/nginx.conf.j2` | Nginx config template |

### Server Variables (`group_vars/production/vars.yml`)

```yaml
domain_name: love.jrgochan.io
app_dir: /home/love/love-stack
python_version: "3.12"
nodejs_version: "20"
postgresql_version: "18"
observer_port: 8000
versor_port: 8001
listener_port: 8002
frontend_port: 3000
```

## Monitoring

### Health Checks

Each service exposes a health endpoint:

- Observer: `GET /health`
- Versor: `GET /health`
- Listener: `GET /health`

### systemd Service Management

```bash
# Check service status
sudo systemctl status love-observer
sudo systemctl status love-versor
sudo systemctl status love-listener
sudo systemctl status love-experience

# View logs
sudo journalctl -u love-observer -f
sudo journalctl -u love-listener --since "1 hour ago"

# Restart a service
sudo systemctl restart love-observer
```
