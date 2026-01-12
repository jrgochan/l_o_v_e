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

## Current Status: Native Deployment Only

The L.O.V.E. stack currently runs natively on:
- **macOS** (Homebrew-based)
- **Linux** (APT/systemd-based)
- **Windows** (via WSL/Ubuntu)

Use the platform-specific scripts:
```bash
# macOS/Linux
cd infra
./setup-love-stack.sh
./run-love-stack.sh

# Windows
cd infra
.\Setup-LoveStack.ps1
.\Run-LoveStack.ps1
```

## Future: Container Deployment

Once Phase 2 (Containerization) is complete, this directory will provide:

1. **Local Testing:**
   - Kubernetes manifests for minikube/kind
   - Docker Compose for simple deployments

2. **Production Deployment:**
   - Cloud provider templates
   - Infrastructure as Code (Terraform)
   - CI/CD pipeline configurations

3. **Hybrid Options:**
   - Systemd services for traditional deployments
   - Kubernetes for cloud-native deployments

## Next Steps

1. Complete Phase 1 (Native development) ✅
2. Complete Phase 2.1-2.2 (Containerization)
3. Implement Phase 2.3 (Production deployment configs)

See `../CONTAINERIZATION_ROADMAP.md` for detailed implementation plan.
