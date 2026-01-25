#!/bin/bash
# GCP Project Configuration
# shellcheck disable=SC2034

PROJECT_ID="${PROJECT_ID:-}" # Leave empty to use 'gcloud config get-value project'
CLOUD_MODE="${CLOUD_MODE:-false}" # Set to "true" via --cloud flag
APP_NAME="love-stack"
DATASET="${DATASET:-all}" # Default dataset (can be overridden)

# Region settings
REGION="us-central1"
ZONE="us-central1-a"

# Artifact Registry
REPO_NAME="love-images"

# Domain Configuration
NEXT_PUBLIC_API_URL=""
NEXT_PUBLIC_OBSERVER_URL=""
NEXT_PUBLIC_LISTENER_URL=""
NEXT_PUBLIC_VERSOR_URL=""

# Authentication (JWT)
JWT_SECRET_NAME="${APP_NAME}-jwt-secret"
JWT_SECRET_KEY=""
HF_TOKEN="${HF_TOKEN:-}" # Hugging Face Token for model downloads

# If secret key is not set, generate one (for initial setup)
if [ -z "$JWT_SECRET_KEY" ]; then
    # Helper to generate random key if needed
    generate_secret() {
        if command -v openssl >/dev/null; then
            local secret_value
            secret_value=$(openssl rand -base64 32)
            echo "$secret_value"
        else
            echo "please-replace-with-secure-random-string-$(date +%s)"
        fi
    }
fi

JWT_SECRET_REF="${JWT_SECRET_NAME}:latest"

# Database Configuration (Cloud SQL)
DB_INSTANCE_NAME="${APP_NAME}-db"
DB_TIER="db-f1-micro"  # Cheapest for dev, upgrade for prod
DB_NAME="love_db"
DB_USER="love_user"

# Redis Configuration (Memorystore)
REDIS_INSTANCE_NAME="${APP_NAME}-redis"
REDIS_TIER="basic"
REDIS_SIZE="1" # GB

# Ollama Configuration (Compute Engine)
OLLAMA_MACHINE_TYPE="e2-standard-4" # 4 vCPUs, 16GB RAM (Cost effective-ish for CPU inference)

# Cloud Run Scaling
MIN_INSTANCES=0
MAX_INSTANCES=5
CPU="1"
MEMORY="512Mi"

# Service Specific Overrides
EXP_CPU="1"
EXP_MEMORY="2Gi"

LISTENER_CPU="2"
LISTENER_MEMORY="2Gi"

OBSERVER_CPU="1"
OBSERVER_MEMORY="2Gi"

# Resource Naming (Derived)
OLLAMA_INSTANCE_NAME="${APP_NAME}-ollama"
SQL_INSTANCE_NAME="${APP_NAME}-db"
REDIS_INSTANCE_NAME="${APP_NAME}-redis"
VPC_NAME="${APP_NAME}-vpc"
CONNECTOR_NAME="${APP_NAME}-vpc-conn"
