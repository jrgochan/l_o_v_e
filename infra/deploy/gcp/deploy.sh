#!/bin/bash
# shellcheck disable=SC2154
set -e

# L.O.V.E. Stack - Master GCP Deployment Script
# Orchestrates the 2-stage deployment pipeline

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GCP_DIR="$DIR"
source "$DIR/config.sh"

# Parse arguments

PROJECT_ARG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --cloud)
            # Check if next argument is "gcp" (optional value)
            if [ "$2" == "gcp" ]; then
                CLOUD_MODE="true"
                export CLOUD_MODE
                shift 2
            else
                # Treat as boolean flag
                CLOUD_MODE="true"
                export CLOUD_MODE
                shift 1
            fi
            ;;
        --force-reseed)
            FORCE_RESEED="true"
            export FORCE_RESEED
            shift 1
            ;;
        --project)
            PROJECT_ARG="$2"
            shift 2
            ;;
        --compute-paths)
            COMPUTE_PATHS="true"
            export COMPUTE_PATHS
            shift 1
            ;;
        *)
            shift
            ;;
    esac
done

echo "=================================================="
echo "❤️  L.O.V.E. Stack - GCP Deployment"
if [ "$CLOUD_MODE" == "true" ]; then
    echo "☁️  Mode: Cloud AI (Vertex AI)"
else
    echo "🦙 Mode: Self-Hosted AI (Ollama)"
fi
echo "=================================================="

# Check if logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "Error: Not verified with gcloud."
    echo "Please run: gcloud auth login"
    exit 1
fi

# Select Project
if [ -n "$PROJECT_ARG" ]; then
    PROJECT_ID="$PROJECT_ARG"
    gcloud config set project "$PROJECT_ID"
else
    CURRENT_PROJECT=$(gcloud config get-value project)
    echo "Current GCP Project: $CURRENT_PROJECT"
    read -r -p "Use this project? (y/n): " confirm
    if [[ "$confirm" != "y" ]]; then
        read -r -p "Enter GCP Project ID: " NEW_PROJECT
        gcloud config set project "$NEW_PROJECT"
        export PROJECT_ID="$NEW_PROJECT"
    else
        export PROJECT_ID="$CURRENT_PROJECT"
    fi
fi

# Export variables for child scripts
export PROJECT_ID
export CLOUD_MODE
export HF_TOKEN

# 1. Setup Project (APIs, AR)
"$GCP_DIR/01-setup-project.sh"

# 2. Build & Deploy Backend (Stage 1)
echo ""
echo ">>> STAGE 1: Backend Deployment (Bootstrap)"
echo "Building backend images..."
"$GCP_DIR/02-build-push.sh" backend

echo "Provisioning infrastructure..."
"$GCP_DIR/03-provision-infrastructure.sh"

echo "Deploying backend services (Pass 1 - Discovery)..."
# Pass 1: Deploy with internal/placeholder URLs first to reserve Cloud Run names and get URLs
"$GCP_DIR/04-deploy-services.sh" backend

# 3. Capture URLs
echo ""
echo ">>> Capturing Backend URLs..."
if [ -f "deployed_services.tmp" ]; then
    # Read from temp file created by 04-deploy-services.sh
    source deployed_services.tmp
else
    echo "Error: Could not find deployed services info."
    exit 1
fi

echo "  Observer: $observer"
echo "  Listener: $listener"
echo "  Versor:   $versor"

# 4. Update Backend with Correct URLs (Stage 1.5)
echo ""
echo ">>> STAGE 1.5: Inter-Service Configuration (Pass 2)"
echo "Updating backend services with each others' URLs..."

# Export for sub-process
export OBSERVER_URL="$observer"
export LISTENER_URL="$listener"
export VERSOR_URL="$versor"

# Also set CORS/Allowed Origins for backend services to trust the frontend
# The 04-deploy-services.sh script handles formatting these for each service
export ALLOWED_ORIGINS="$experience"
export CORS_ORIGINS="$experience"

# Re-run deployment logic to update env vars (Cloud Run updates are fast)
"$GCP_DIR/04-deploy-services.sh" backend

# 5. Build & Deploy Frontend (Stage 2)
echo ""
echo ">>> STAGE 2: Frontend Deployment"
echo "Building frontend image with baked-in URLs..."

# Construct build args
# Note: We provide both generic API_URL and specific service URLs
BUILD_ARGS="--build-arg NEXT_PUBLIC_API_URL=$observer \
--build-arg NEXT_PUBLIC_OBSERVER_URL=$observer \
--build-arg NEXT_PUBLIC_LISTENER_URL=$listener \
--build-arg NEXT_PUBLIC_VERSOR_URL=$versor"

"$GCP_DIR/02-build-push.sh" frontend "$BUILD_ARGS"

echo "Deploying frontend..."
"$GCP_DIR/04-deploy-services.sh" frontend

# 6. Final Report
echo ""
echo "=================================================="
echo "✅ Deployment Complete!"
echo "=================================================="
# Reload source to get frontend URL
if [ -f "deployed_services.tmp" ]; then
    source deployed_services.tmp
fi

echo "Web App:  $experience"
echo "Observer: $observer"
echo "Listener: $listener"
echo "Versor:   $versor"
echo "=================================================="

echo "=================================================="

# Update Backend CORS (Pass 3)
echo ""
echo ">>> STAGE 3: CORS Configuration (Pass 3)"
echo "Updating backend CORS to allow $experience..."
export ALLOWED_ORIGINS="[\"$experience\", \"http://localhost:3000\", \"http://127.0.0.1:3000\"]"
export CORS_ORIGINS="[\"$experience\", \"http://localhost:3000\", \"http://127.0.0.1:3000\"]"

# Re-run backend deployment to apply CORS
"$GCP_DIR/04-deploy-services.sh" backend

# 7. Compute Path Matrix (Optional)
"$GCP_DIR/06-compute-paths.sh"

# Cleanup
rm -f deployed_services.tmp
