#!/bin/bash
# shellcheck disable=SC2154
set -e

# L.O.V.E. Stack - Master GCP Deployment Script
# Orchestrates the 2-stage deployment pipeline

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GCP_DIR="$DIR/gcp"

echo "=================================================="
echo "❤️  L.O.V.E. Stack - GCP Deployment"
echo "=================================================="

# Check if logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "Error: Not verified with gcloud."
    echo "Please run: gcloud auth login"
    exit 1
fi

# Select Project
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

# 1. Setup Project (APIs, AR)
"$GCP_DIR/01-setup-project.sh"

# 2. Build & Deploy Backend (Stage 1)
echo ""
echo ">>> STAGE 1: Backend Deployment"
echo "Building backend images..."
"$GCP_DIR/02-build-push.sh" backend

echo "Provisioning infrastructure..."
"$GCP_DIR/03-provision-infrastructure.sh"

echo "Deploying backend services..."
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

# 4. Build & Deploy Frontend (Stage 2)
echo ""
echo ">>> STAGE 2: Frontend Deployment"
echo "Building frontend image with baked-in URLs..."

# Construct build args
BUILD_ARGS="--build-arg NEXT_PUBLIC_API_URL=$observer \
--build-arg NEXT_PUBLIC_OBSERVER_URL=$observer \
--build-arg NEXT_PUBLIC_LISTENER_URL=$listener \
--build-arg NEXT_PUBLIC_VERSOR_URL=$versor"

"$GCP_DIR/02-build-push.sh" frontend "$BUILD_ARGS"

echo "Deploying frontend..."
"$GCP_DIR/04-deploy-services.sh" frontend

# 5. Final Report
echo ""
echo "=================================================="
echo "✅ Deployment Complete!"
echo "=================================================="
source deployed_services.tmp
echo "Web App:  $experience"
echo "Observer: $observer"
echo "Listener: $listener"
echo "Versor:   $versor"
echo "=================================================="

# Cleanup
rm -f deployed_services.tmp
