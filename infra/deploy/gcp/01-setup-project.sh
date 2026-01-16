#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/config.sh"

echo "=================================================="
echo "Phase 1: Project Setup & APIs"
echo "=================================================="

# Check Project ID
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project)
    if [ -z "$PROJECT_ID" ]; then
        echo "Error: No GCP Project ID set. Run 'gcloud config set project <PROJECT_ID>' or edit config.sh"
        exit 1
    fi
fi

echo "Using Project ID: $PROJECT_ID"
echo "Region: $REGION"

# Enable APIs
echo "Enabling required APIs..."
gcloud services enable \
    artifactregistry.googleapis.com \
    run.googleapis.com \
    compute.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    vpcaccess.googleapis.com \
    secretmanager.googleapis.com \
    servicenetworking.googleapis.com \
    --project "$PROJECT_ID"

# Create Artifact Registry
echo "Checking Artifact Registry..."
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "Creating repository $REPO_NAME..."
    gcloud artifacts repositories create "$REPO_NAME" \
        --repository-format=docker \
        --location="$REGION" \
        --description="L.O.V.E. Stack Images" \
        --project="$PROJECT_ID"
else
    echo "Repository $REPO_NAME already exists."
fi

echo "Phase 1 Complete."
