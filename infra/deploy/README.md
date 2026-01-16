# Deployment Configurations

This directory will contain deployment configurations for various platforms and orchestration systems.

## Status: Placeholder for Future Implementation

**See:** `../CONTAINERIZATION_ROADMAP.md` for complete implementation plan (Phase 2.3)

## Planned Subdirectories

### kubernetes/
Kubernetes manifests for deploying L.O.V.E. stack to K8s clusters:
- Deployments for each service
- StatefulSets for databases
- Services and Ingress
- ConfigMaps and Secrets
- PersistentVolumeClaims

**Target platforms:**
- Minikube (local testing)
- AWS EKS
- Google GKE
- Azure AKS
- Self-hosted Kubernetes

### systemd/
Systemd service definitions for running containers as system services:
- Auto-generated from Podman (`podman generate systemd`)
- Suitable for production Linux servers
- Automatic restart and dependency management

### aws/
AWS-specific deployment guides and configs:
- ECS (Elastic Container Service)
- EKS (Elastic Kubernetes Service)
- CloudFormation templates
- Terraform configurations

### gcp/
Google Cloud Platform deployment guides:
- Cloud Run
- GKE (Google Kubernetes Engine)
- Deployment Manager templates
- Terraform configurations

### azure/
Microsoft Azure deployment guides:
- ACI (Azure Container Instances)
- AKS (Azure Kubernetes Service)
- ARM templates
- Terraform configurations

## 🚀 Deployment Instructions

### One-Command Deployment (Recommended)

We provide a master script that orchestrates the entire deployment process, including the build-time injection of API URLs into the web application.

```bash
cd infra
./deploy-to-gcp.sh
```

**What this script does:**
1.  **Sets up Project:** Enables APIs and creates Artifact Registry.
2.  **Deploys Backend:** Builds and deploys Versor, Observer, and Listener.
3.  **Captures URLs:** retrieves the public Cloud Run URLs.
4.  **Deploys Frontend:** Rebuilds the Experience web app with the backend URLs baked in, then deploys it.

### Manual Usage (Advanced)

If you need to run specific phases manually:

```bash
cd infra/deploy/gcp

# 1. Setup
./01-setup-project.sh

# 2. Build & Push (Backend only)
./02-build-push.sh backend

# 3. Provision Infrastructure (DB, Redis, VM)
./03-provision-infrastructure.sh

# 4. Deploy Services (Backend only)
./04-deploy-services.sh backend

# 5. Build Frontend (requires backend URLs)
./02-build-push.sh frontend \
  --build-arg NEXT_PUBLIC_OBSERVER_URL=https://... \
  --build-arg NEXT_PUBLIC_LISTENER_URL=https://...

# 6. Deploy Frontend
./04-deploy-services.sh frontend
```

## Architecture

- **Web:** Cloud Run (Next.js)
- **API:** Cloud Run (FastAPI/Python)
- **DB:** Cloud SQL (PostgreSQL + pgvector)
- **Cache:** Memorystore (Redis)
- **AI:** Compute Engine VM (Ollama)


## Next Steps

1. Complete Phase 1 (Native development) ✅
2. Complete Phase 2.1-2.2 (Containerization)
3. Implement Phase 2.3 (Production deployment configs)

See `../CONTAINERIZATION_ROADMAP.md` for detailed implementation plan.
