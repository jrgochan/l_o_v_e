# Infrastructure: Ansible Deployment Pipeline

**Last Updated:** February 2026
**Audience:** DevOps, System Administrators

---

## Overview

The L.O.V.E. stack is deployed to production via an **Ansible playbook** that manages a single RHEL 9 server. The deployment is fully automated — a single command deploys all backend services, the frontend, documentation, and Nginx configuration.

```bash
./infra/deploy/deploy-ansible.sh
```

---

## Architecture

```text
Developer Machine                    Production Server (RHEL 9)
┌──────────────────┐                ┌────────────────────────────────┐
│ deploy-ansible.sh│ ──SSH──────→   │ love.jrgochan.io               │
│                  │                │                                │
│ ansible-playbook │                │ ┌──────────┐  ┌──────────┐    │
│ + inventory      │                │ │ Observer  │  │  Versor  │    │
│ + group_vars     │                │ │ (systemd) │  │ (systemd)│    │
│ + roles/app      │                │ └──────────┘  └──────────┘    │
│                  │                │ ┌──────────┐  ┌──────────┐    │
│                  │                │ │ Listener  │  │Experience│    │
│                  │                │ │ (systemd) │  │ (systemd)│    │
│                  │                │ └──────────┘  └──────────┘    │
│                  │                │ ┌──────────┐  ┌──────────┐    │
│                  │                │ │  Nginx   │  │PostgreSQL│    │
│                  │                │ │ (SSL+RP) │  │ 18+pgvec │    │
│                  │                │ └──────────┘  └──────────┘    │
└──────────────────┘                └────────────────────────────────┘
```

---

## Directory Structure

```text
infra/deploy/
├── deploy-ansible.sh              # Entry point script
└── ansible/
    ├── playbook.yml               # Main playbook
    ├── inventory/
    │   └── hosts.yml              # Server inventory
    ├── group_vars/
    │   └── rhel9.yml              # Configuration variables
    └── roles/
        ├── common/
        │   └── tasks/main.yml     # System dependencies
        └── app/
            ├── tasks/
            │   ├── main.yml       # Task orchestration
            │   ├── backend.yml    # Backend deployment
            │   ├── frontend.yml   # Frontend build
            │   ├── docs.yml       # Documentation build
            │   └── nginx.yml      # Nginx configuration
            └── templates/
                └── nginx.conf.j2  # Nginx config template
```

---

## Deployment Stages

The playbook executes these stages in order:

### 1. Common Role — System Dependencies

Installs and configures:
- Python 3.12
- Node.js 20
- PostgreSQL 18 + pgvector
- Ollama
- System packages (git, gcc, etc.)

### 2. Backend Deployment (`backend.yml`)

For each backend module (Observer, Versor, Listener):
- Clone or pull the latest code
- Create Python virtual environment
- Install dependencies from `pyproject.toml`
- Configure systemd service
- Restart service

### 3. Frontend Build (`frontend.yml`)

- Install npm dependencies
- Run `npm run build` (Next.js production build)
- Configure systemd service for Next.js

### 4. Documentation Build (`docs.yml`)

- Create Python venv for MkDocs
- Install MkDocs + mkdocs-material
- Build static site: `mkdocs build --clean`
- Output to `{{ app_dir }}/docs-build`
- Set permissions for Nginx

### 5. Nginx Configuration (`nginx.yml`)

- Apply Jinja2 template for Nginx config
- Configure SSL (Let's Encrypt)
- Set up reverse proxy for all modules
- Serve `/docs` static site
- Reload Nginx

---

## Key Variables (`group_vars/rhel9.yml`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `domain_name` | `love.jrgochan.io` | Server domain |
| `app_dir` | `/home/love/love-stack` | Application root |
| `python_version` | `3.12` | Python version |
| `nodejs_version` | `20` | Node.js version |
| `postgresql_version` | `18` | PostgreSQL version |
| `observer_port` | `8000` | Observer port |
| `versor_port` | `8001` | Versor port |
| `listener_port` | `8002` | Listener port |
| `frontend_port` | `3000` | Experience port |

---

## Nginx Configuration

The Nginx template (`nginx.conf.j2`) provides:

- **SSL termination** with Let's Encrypt certificates
- **HTTP → HTTPS redirect**
- **Reverse proxy** locations for each module:
  - `/` → Experience (`:3000`)
  - `/observer/*` → Observer (`:8000`)
  - `/versor/*` → Versor (`:8001`)
  - `/listener/*` → Listener (`:8002`)
  - `/docs` → MkDocs static site

---

## systemd Services

Each module runs as a systemd service:

```bash
# Service names
love-observer.service
love-versor.service
love-listener.service
love-experience.service

# Management commands
sudo systemctl status love-observer
sudo systemctl restart love-observer
sudo journalctl -u love-observer -f
```

---

## Monitoring & Troubleshooting

### Health Checks

```bash
# Check all services
for svc in observer versor listener experience; do
  echo "$svc: $(sudo systemctl is-active love-$svc)"
done

# API health endpoints
curl -s http://localhost:8000/observer/health | jq .
curl -s http://localhost:8001/versor/health | jq .
curl -s http://localhost:8002/health | jq .
```

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Service won't start | Missing env vars | Check `.env` file |
| 502 Bad Gateway | Backend not running | `sudo systemctl restart love-observer` |
| SSL certificate error | Cert expired | Renew Let's Encrypt cert |
| Docs not updating | Build cache | Delete `docs-build/` and rebuild |

---

## See Also

- [Deployment & Operations](../../architecture/10-deployment-operations.md) — Overview of deployment process
- [Technology Stack](../../architecture/09-technology-stack.md) — Full tech stack details
