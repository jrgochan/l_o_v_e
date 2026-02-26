# RHOS Deployment — L.O.V.E. Stack on OpenShift

Deploy the L.O.V.E. emotional intelligence platform to Red Hat OpenShift (CRC or production cluster) using **Ansible Infrastructure-as-Code**.

## Prerequisites

| Tool | Purpose |
|------|---------|
| `crc` | OpenShift Local cluster ([install](https://developers.redhat.com/products/codeready-containers/overview)) |
| `oc` | OpenShift CLI (bundled with CRC, or via `crc oc-env`) |
| `ansible-playbook` | Ansible core (`pip install ansible` or `brew install ansible`) |
| `kubernetes.core` | Ansible k8s collection (`ansible-galaxy collection install kubernetes.core`) |
| `helm` | Helm CLI (required for observability stack only) |
| `trivy` | Container security scanner (`brew install trivy`) — optional |

Ensure CRC is running (`crc status`) and you are logged in before proceeding.

## Quick Start

```bash
# 1. Bootstrap the CRC environment (namespaces, oc login, dependency checks)
./setup-crc-env.sh

# 2. Deploy the full L.O.V.E. stack via Ansible
cd ansible
ansible-playbook deploy-openshift.yml

# 3. (Optional) Deploy observability stack (Prometheus + Grafana)
ansible-playbook monitoring.yml

# 4. (Optional) Deploy SLURM HPC cluster
ansible-playbook slurm.yml
```

## Architecture

```
infra/deploy/rhos/
├── ansible/                        # Infrastructure-as-Code (primary deploy method)
│   ├── ansible.cfg                 # Ansible configuration
│   ├── deploy-openshift.yml        # Main deployment playbook
│   ├── teardown-openshift.yml      # Full teardown playbook
│   ├── monitoring.yml              # Prometheus + Grafana observability stack
│   ├── monitoring-values.yaml      # Helm values for kube-prometheus-stack
│   ├── slurm.yml                   # SLURM HPC cluster deployment
│   └── roles/
│       ├── namespace/              # Creates love-stack namespace
│       ├── rbac/                   # Roles, RoleBindings, ServiceAccounts
│       ├── network-policies/       # NetworkPolicy for namespace isolation
│       ├── secrets/                # Secrets (DB_PASSWORD, SECRET_KEY) + ConfigMap
│       ├── database/               # PostgreSQL (pgvector) deployment
│       ├── redis/                  # Redis cache deployment
│       ├── ollama/                 # Ollama AI service deployment
│       ├── backend/                # Observer, Listener, Versor builds + deploys
│       └── frontend/               # Experience (Next.js) build + deploy
├── manifests/                      # Kubernetes YAML manifests
│   ├── observer.yaml               # FastAPI API gateway
│   ├── versor.yaml                 # Quaternion math engine
│   ├── listener.yaml               # Audio processing service
│   ├── experience.yaml             # Next.js frontend
│   ├── postgres.yaml               # PostgreSQL + pgvector
│   ├── redis.yaml                  # Redis cache
│   ├── ollama.yaml                 # Ollama LLM service
│   ├── service-monitors.yaml       # Prometheus ServiceMonitors
│   ├── grafana-dashboard.yaml      # Custom Grafana dashboard
│   └── job-emotional-batch.yaml    # HPC batch processing Job
├── slurm/                          # SLURM HPC integration
│   ├── Dockerfile                  # Rocky Linux + SLURM all-in-one image
│   ├── docker-entrypoint.sh        # SLURM controller/worker startup
│   └── slurm-manifests.yaml        # K8s resources for SLURM
├── setup-crc-env.sh                # CRC bootstrap (checks, login, namespaces)
├── cleanup-env.sh                  # Full environment teardown (DANGER ZONE)
├── config.sh                       # Shared configuration variables
├── 02-build.sh                     # OpenShift build helper (used by Ansible roles)
└── README.md                       # This file
```

## Playbook Details

### `deploy-openshift.yml` — Full Stack Deploy
Deploys the complete L.O.V.E. stack in dependency order:
1. **Namespace** → **RBAC** → **NetworkPolicies** → **Secrets/ConfigMap**
2. **Database** → **Redis** → **Ollama**
3. **Backend** (build + deploy observer, versor, listener)
4. **Frontend** (build + deploy experience with injected API URLs)
5. **Rollout verification** (waits for all deployments to become ready)

### `monitoring.yml` — Observability Stack
Deploys `kube-prometheus-stack` via Helm with OpenShift-compatible SCC overrides, then applies custom `ServiceMonitor` and `GrafanaDashboard` resources.

### `slurm.yml` — HPC Cluster
Deploys a single-node SLURM cluster demonstrating `sbatch` job submission workflows within OpenShift.

## Teardown

```bash
# Full teardown via Ansible
cd ansible
ansible-playbook teardown-openshift.yml

# Or use the interactive cleanup script (asks for confirmation)
./cleanup-env.sh
```

## Security Scanning

```bash
# Scan all container images with Trivy (from repo root)
make scan
```

## Configuration

Edit [`config.sh`](config.sh) for shared constants (namespace, ports, resource limits).

CORS origins and database credentials are managed via the `love-config` ConfigMap and `love-secrets` Secret, configured in the [`secrets` Ansible role](ansible/roles/secrets/tasks/main.yml).

## Legacy Scripts

The `01-init.sh`, `03-deploy-infra.sh`, and `04-deploy-app.sh` scripts are **deprecated** and retained for reference only. Use the Ansible playbooks for all deployments.
