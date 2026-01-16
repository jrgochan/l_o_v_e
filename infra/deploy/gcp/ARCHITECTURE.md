# L.O.V.E. Stack - GCP Deployment Architecture

This directory contains scripts to deploy the entire L.O.V.E. stack to Google Cloud Platform (GCP).

## Architecture Overview

To mirror the local development environment while leveraging managed cloud services, we utilize the following GCP components:

### 1. Compute Layer (Cloud Run)
Serverless, stateless containers for the core application services.
- **Experience (Web)**: Next.js frontend.
- **Observer (API)**: Core logic and orchestration.
- **Listener (API)**: Audio processing gateway.
- **Versor (API)**: Mathematical emotion processing.
- **Listener Worker**: Background processing (deployed as a Cloud Run Service or Job).

### 2. Data Layer
- **Cloud SQL (PostgreSQL)**: Managed relational database. Replaces local Postgres container.
- **Memorystore (Redis)**: Managed Redis instance. Replaces local Redis container.

### 3. AI Infrastructure (Compute Engine)
- **Ollama Host (GCE VM)**: Since Cloud Run does not support persistent GPU/heavy background processes well for LLMs, we deploy a standalone Compute Engine VM to host Ollama. This VM exposes the Ollama API internally to the Cloud Run services.

### 4. Networking & Security
- **Artifact Registry**: Stores the Docker images.
- **Secret Manager**: Securely stores database credentials, API keys, and other secrets.
- **Serverless VPC Access**: Connects Cloud Run services to Cloud SQL, Redis, and the Ollama VM via internal IP addresses.
- **Service Accounts**: Granular identity for each service.

## Deployment Workflow

The deployment is split into 4 phases, represented by numbered scripts:

1.  **`01-setup-project.sh`**: Enables required APIs (Run, SQL, Compute, etc.) and creates the Artifact Registry repository.
2.  **`02-build-push.sh`**: Builds all Docker images locally and pushes them to Google Artifact Registry.
3.  **`03-provision-infrastructure.sh`**: Provisions the "heavy" infrastructure:
    *   VPC Network & Firewall rules
    *   Cloud SQL Instance
    *   Memorystore (Redis)
    *   Ollama GCE VM (with startup script to install/run models)
4.  **`04-deploy-services.sh`**: Deploys the application containers to Cloud Run, injecting environment variables (DB connections, Ollama URL, etc.).

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated.
- A GCP Project with billing enabled.
- Docker installed and authenticated with GCP.
