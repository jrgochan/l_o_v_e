#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/config.sh"

echo "=================================================="
echo "Phase 5: Master Deployment Orchestration"
echo "=================================================="

# 1. Ensure Project Setup & Secrets
echo "[1/6] Verifying Secrets..."
get_or_create_jwt_secret

# 2. Build & Deploy Backend
echo "[2/6] Building & Deploying Backend..."
"$DIR/02-build-push.sh" backend
"$DIR/04-deploy-services.sh" backend

# 3. Retrieve Observer URL
OBSERVER_URL=$(grep "observer=" deployed_services.tmp | cut -d'=' -f2)
if [ -z "$OBSERVER_URL" ]; then
    echo "Error: Could not determine Observer URL from deployed_services.tmp"
    exit 1
fi
echo "Observer URL captured: $OBSERVER_URL"

# 4. Build Frontend (with API URL)
echo "[3/6] Building Frontend with API URL..."
"$DIR/02-build-push.sh" frontend --api-url "$OBSERVER_URL"

# 5. Deploy Frontend
echo "[4/6] Deploying Frontend..."
"$DIR/04-deploy-services.sh" frontend

# 6. Retrieve Experience URL
EXP_URL=$(grep "experience=" deployed_services.tmp | cut -d'=' -f2)
if [ -z "$EXP_URL" ]; then
    echo "Error: Could not determine Experience URL from deployed_services.tmp"
    exit 1
fi
echo "Experience URL captured: $EXP_URL"

# 7. Update Backend CORS
echo "[5/6] Updating Observer CORS Policy..."
# Format as JSON array string: ["https://exp.run.app"]
CORS_ORIGINS="[\"$EXP_URL\"]"

gcloud run services update "${APP_NAME}-observer" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --update-env-vars "ALLOWED_ORIGINS=$CORS_ORIGINS" \
    --quiet

echo "[6/6] Deployment Complete!"
echo "Backend:  $OBSERVER_URL"
echo "Frontend: $EXP_URL"
echo "=================================================="
