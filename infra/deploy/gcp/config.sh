# GCP Project Configuration
# Source this file in deployment scripts

# ==========================================
# User Configurable Variables
# ==========================================

# GCP Project ID (Leave empty to use current gcloud default)
PROJECT_ID="love-484103"

# Region and Zone
REGION="us-central1"
ZONE="us-central1-a"

# App Name (Prefix for resources)
APP_NAME="love-stack"

# Repository Name (Artifact Registry)
REPO_NAME="love-images"

# Build-time variables (Injected during deployment)
# These are needed for the frontend build
NEXT_PUBLIC_API_URL=""
NEXT_PUBLIC_OBSERVER_URL=""
NEXT_PUBLIC_LISTENER_URL=""
NEXT_PUBLIC_VERSOR_URL=""

# Security
# Shared secret for JWT signature verification across services
# If empty, a random one will be generated during deployment
# Shared secret for JWT signature verification across services
# We try to fetch from Secret Manager first, otherwise generate and store it.
JWT_SECRET_NAME="${APP_NAME}-jwt-secret"
JWT_SECRET_KEY=""

# Function to get or create JWT secret
get_or_create_jwt_secret() {
    if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$(gcloud config get-value project)
    fi

    # Try to access the secret
    if gcloud secrets describe "$JWT_SECRET_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
        echo "Found existing JWT secret in Secret Manager."
        # We don't fetch the value here to avoid exposing it in logs, 
        # we just pass the reference to Cloud Run.
        # BUT for local scripts or invalidation, we might need it. 
        # For Cloud Run deployment, we use the version reference.
    else
        echo "Creating new JWT secret..."
        # Generate a secure random string
        local secret_value=$(openssl rand -base64 32)
        
        # Create secret
        gcloud secrets create "$JWT_SECRET_NAME" \
            --replication-policy="automatic" \
            --project="$PROJECT_ID"
            
        # Add version
        echo -n "$secret_value" | gcloud secrets versions add "$JWT_SECRET_NAME" --data-file=- --project="$PROJECT_ID"
        echo "JWT secret created and stored in Secret Manager."
    fi
}

# Define the reference for Cloud Run env injection
JWT_SECRET_REF="${JWT_SECRET_NAME}:latest"

# ==========================================
# Infrastructure Settings
# ==========================================

# Database (Cloud SQL)
DB_TIER="db-f1-micro"  # Cheapest for dev, upgrade for prod
DB_NAME="love_db"
DB_USER="love_user"
# DB_PASSWORD will be generated or read from Secret Manager if not set

# Redis (Memorystore)
REDIS_TIER="basic"
REDIS_SIZE="1" # GB

# Ollama VM
OLLAMA_MACHINE_TYPE="e2-standard-4" # 4 vCPUs, 16GB RAM (Cost effective-ish for CPU inference)
# For GPU support, you'd need n1-standard-4 + accelerator, but that's complex to automate
# We'll stick to CPU for "easy deploy" unless specified.

# ==========================================
# Service Settings
# ==========================================

# Cloud Run Scaling
MIN_INSTANCES=0
MAX_INSTANCES=5
CPU="1"
MEMORY="512Mi"

# Experience Web needs more juice usually
EXP_CPU="1"
EXP_MEMORY="1Gi"

# Listener might need more for audio processing
LISTENER_CPU="2"
LISTENER_MEMORY="2Gi"

# ==========================================
# Derived Variables (Do not edit usually)
# ==========================================
OLLAMA_INSTANCE_NAME="${APP_NAME}-ollama"
SQL_INSTANCE_NAME="${APP_NAME}-db"
REDIS_INSTANCE_NAME="${APP_NAME}-redis"
VPC_NAME="${APP_NAME}-vpc"
CONNECTOR_NAME="${APP_NAME}-vpc-conn"
