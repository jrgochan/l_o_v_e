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
    aiplatform.googleapis.com \
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
    echo "Repository $REPO_NAME already exists."
fi

# IAM Permissions
# Grant Secret Accessor to Default Compute Service Account (used by Cloud Run)
echo "Configuring IAM permissions..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Granting Secret Accessor to $COMPUTE_SA..."
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null

echo "Granting Vertex AI User to $COMPUTE_SA..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/aiplatform.user" >/dev/null

echo "Phase 1 Complete."
