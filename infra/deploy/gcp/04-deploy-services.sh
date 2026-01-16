#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/config.sh"

echo "=================================================="
echo "Phase 4: Deploy Services"
echo "=================================================="

if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project)
fi

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

# Retrieve Infrastructure Info
echo "Retrieving Connection Info..."

# DB Headers
DB_IP=$(gcloud sql instances describe "$SQL_INSTANCE_NAME" --project="$PROJECT_ID" --format='value(ipAddresses[0].ipAddress)')
# We use Secret Manager for password, but for Cloud Run env var injection "value-source", 
# we need the secret version resource ID.
DB_SECRET_VERSION="${APP_NAME}-db-password:latest"

# Redis Host
REDIS_HOST=$(gcloud redis instances describe "$REDIS_INSTANCE_NAME" --region="$REGION" --project="$PROJECT_ID" --format='value(host)')
REDIS_PORT=$(gcloud redis instances describe "$REDIS_INSTANCE_NAME" --region="$REGION" --project="$PROJECT_ID" --format='value(port)')

# Ollama Host
OLLAMA_IP=$(gcloud compute instances describe "$OLLAMA_INSTANCE_NAME" --zone="$ZONE" --project="$PROJECT_ID" --format='value(networkInterfaces[0].networkIP)')
OLLAMA_URL="http://${OLLAMA_IP}:11434"

echo "  DB Host: $DB_IP"
echo "  Redis: $REDIS_HOST:$REDIS_PORT"
echo "  Ollama: $OLLAMA_URL"

# Parse command line arguments
TARGET=$1

# Track deployed URLs for the summary
VERSOR_URL=""
OBSERVER_URL=""
LISTENER_URL=""
EXP_URL=""

deploy_service() {
    local service=$1
    local image="${REGISTRY}/${service}:latest"
    local port=$2
    local extra_env=""
    
    # Custom config per service
    local svc_cpu=$CPU
    local svc_mem=$MEMORY
    
    if [ "$service" == "experience" ]; then
        svc_cpu=$EXP_CPU
        svc_mem=$EXP_MEMORY
    elif [ "$service" == "listener" ]; then
        svc_cpu=$LISTENER_CPU
        svc_mem=$LISTENER_MEMORY
    fi
    
    echo "Deploying $service..."
    gcloud run deploy "${APP_NAME}-${service}" \
        --image "$image" \
        --platform managed \
        --region "$REGION" \
        --vpc-connector "$CONNECTOR_NAME" \
        --allow-unauthenticated \
        --port "$port" \
        --min-instances "$MIN_INSTANCES" \
        --max-instances "$MAX_INSTANCES" \
        --cpu "$svc_cpu" \
        --memory "$svc_mem" \
        --set-env-vars "DB_HOST=$DB_IP,DB_PORT=5432,DB_NAME=$DB_NAME,DB_USER=$DB_USER" \
        --set-env-vars "REDIS_HOST=$REDIS_HOST,REDIS_PORT=$REDIS_PORT" \
        --set-env-vars "OLLAMA_BASE_URL=$OLLAMA_URL" \
        --set-env-vars "OLLAMA_BASE_URL=$OLLAMA_URL" \
        --set-secrets "JWT_SECRET_KEY=${JWT_SECRET_REF}" \
        --set-secrets "DB_PASSWORD=${APP_NAME}-db-password:latest" \
        --project "$PROJECT_ID" >/dev/null 2>&1
        
    # Retrieve and print URL
    local url=$(gcloud run services describe "${APP_NAME}-${service}" --platform managed --region "$REGION" --project "$PROJECT_ID" --format 'value(status.url)')
    echo "  -> Deployed to: $url"
    
    # Export for master script usage
    echo "$service=$url" >> deployed_services.tmp
}

# Clear previous temp file
rm -f deployed_services.tmp

case "$TARGET" in
    "backend")
        echo "Deploying Backend Services..."
        deploy_service "versor" 8001
        deploy_service "observer" 8000
        deploy_service "listener" 8002
        ;;
    "frontend")
        echo "Deploying Frontend (Experience)..."
        deploy_service "experience" 3000
        ;;
    *)
        echo "Deploying All Services..."
        deploy_service "versor" 8001
        deploy_service "observer" 8000
        deploy_service "listener" 8002
        deploy_service "experience" 3000
        ;;
esac

echo "Phase 4 Complete."
