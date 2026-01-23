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

echo "  DB Host: $DB_IP"
echo "  Redis: $REDIS_HOST:$REDIS_PORT"

# AI Configuration
OLLAMA_URL=""
AI_ENV_VARS=""

if [ "$CLOUD_MODE" == "true" ]; then
    echo "  AI Provider: Vertex AI (Cloud)"
    # Configure variables for Vertex AI
    # Note: We must quote value if it contains commas, but here values are simple
    AI_ENV_VARS="AI_PROVIDER=google_vertex,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION"
else
    # Legacy/Default Ollama Mode
    echo "Retrieving Ollama Info..."
    OLLAMA_IP=$(gcloud compute instances describe "$OLLAMA_INSTANCE_NAME" --zone="$ZONE" --project="$PROJECT_ID" --format='value(networkInterfaces[0].networkIP)')
    OLLAMA_URL="http://${OLLAMA_IP}:11434"
    echo "  Ollama: $OLLAMA_URL"
    AI_ENV_VARS="OLLAMA_BASE_URL=$OLLAMA_URL,AI_PROVIDER=ollama"
fi

# Service URLs (Can be overridden by env vars)
# These are needed for cross-service communication
: "${OBSERVER_URL:=http://localhost:8000}"
: "${LISTENER_URL:=http://localhost:8002}"
: "${VERSOR_URL:=http://localhost:8001}"

# CORS Configuration (Optional overrides)
# ALLOWED_ORIGINS -> Observer
# CORS_ORIGINS -> Versor
: "${ALLOWED_ORIGINS:=}"
: "${CORS_ORIGINS:=}"


# Parse command line arguments
TARGET=$1

# Track deployed URLs for the summary (via temp file)

deploy_service() {
    local service=$1
    local image="${REGISTRY}/${service}:latest"
    local port=$2
    
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
    
    # Construct base command
    local cmd="gcloud run deploy ${APP_NAME}-${service} \
        --image $image \
        --platform managed \
        --region $REGION \
        --vpc-connector $CONNECTOR_NAME \
        --allow-unauthenticated \
        --port $port \
        --min-instances $MIN_INSTANCES \
        --max-instances $MAX_INSTANCES \
        --cpu $svc_cpu \
        --memory $svc_mem \
        --cpu $svc_cpu \
        --memory $svc_mem \
        --set-env-vars POSTGRES_HOST=$DB_IP,POSTGRES_PORT=5432,POSTGRES_DB=$DB_NAME,POSTGRES_USER=$DB_USER \
        --set-env-vars REDIS_HOST=$REDIS_HOST,REDIS_PORT=$REDIS_PORT \
        --set-env-vars OBSERVER_URL=$OBSERVER_URL,LISTENER_URL=$LISTENER_URL,VERSOR_URL=$VERSOR_URL \
        --set-secrets JWT_SECRET_KEY=${JWT_SECRET_REF} \
        --set-secrets POSTGRES_PASSWORD=${DB_SECRET_VERSION} \
        --project $PROJECT_ID"

    # Add AI vars if Listener
    if [ "$service" == "listener" ]; then
        cmd="$cmd --set-env-vars $AI_ENV_VARS"
    fi

    # Add CORS/Allowed Origins if set
    if [ "$service" == "observer" ] && [ -n "$ALLOWED_ORIGINS" ]; then
         # Observer uses ALLOWED_ORIGINS list format
         # If just a single URL is passed, wrap it in brackets if not already?
         # But app/config.py expects a JSON list string.
         # So we assume the input is formatted correctly or we simplisticly wrap it.
         # For simplicity, if it doesn't start with [, wrap it.
         if [[ "$ALLOWED_ORIGINS" != \[* ]]; then
             ALLOWED_ORIGINS="[\"$ALLOWED_ORIGINS\"]"
         fi
         cmd="$cmd --set-env-vars ALLOWED_ORIGINS=$ALLOWED_ORIGINS"
    elif [ "$service" == "versor" ] && [ -n "$CORS_ORIGINS" ]; then
        # Versor uses CORS_ORIGINS list (pydantic), which usually parses a comma-separated string if it's a List[str]
        # Versor Config: CORS_ORIGINS: List[str]
        # Pydantic Settings parses JSON list OR comma separated string.
        # We will pass it as is.
        cmd="$cmd --set-env-vars CORS_ORIGINS=$CORS_ORIGINS"
    fi
    
    # Execute (suppress noise but show errors)
    # Using eval to handle quotes properly if needed, but here simple vars works
    $cmd >/dev/null 2>&1 || { echo "Deployment failed"; exit 1; }
        
    # Retrieve and print URL
    local url
    url=$(gcloud run services describe "${APP_NAME}-${service}" --platform managed --region "$REGION" --project "$PROJECT_ID" --format 'value(status.url)')
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
