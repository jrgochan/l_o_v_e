#!/bin/bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/config.sh"

echo "=================================================="
echo "❤️  L.O.V.E. Stack - RHOS Deployment"
echo "=================================================="

# 1. Init
"$DIR/01-init.sh"

# 2. Build Backend
echo ">>> Building Backend..."
"$DIR/02-build.sh" backend

# 3. Infra
echo ">>> Deploying Infrastructure..."
"$DIR/03-deploy-infra.sh"

# 4. Deploy Backend
echo ">>> Deploying Backend..."
"$DIR/04-deploy-app.sh" backend

# 5. Capture URL
echo ">>> Capturing Observer Route..."
# Wait for route?
OBSERVER_HOST=$(oc get route love-observer -o jsonpath='{.spec.host}')
if [ -z "$OBSERVER_HOST" ]; then
    echo "Warning: Route not found immediately. Waiting..."
    sleep 5
    OBSERVER_HOST=$(oc get route love-observer -o jsonpath='{.spec.host}')
fi
# Prepend protocol
OBSERVER_URL="https://$OBSERVER_HOST"
echo "Observer URL: $OBSERVER_URL"

# 6. Build Frontend
echo ">>> Building Frontend..."
# Build args for Next.js
# Note: --build-arg is passed to oc start-build
"$DIR/02-build.sh" experience "--build-arg NEXT_PUBLIC_API_URL=$OBSERVER_URL --build-arg NEXT_PUBLIC_OBSERVER_URL=$OBSERVER_URL"

# 7. Deploy Frontend
echo ">>> Deploying Frontend..."
"$DIR/04-deploy-app.sh" experience

echo "=================================================="
echo "✅ Deployment Complete!"
echo "Observer: $OBSERVER_URL"
EXP_HOST=$(oc get route love-experience -o jsonpath='{.spec.host}')
echo "Experience: https://$EXP_HOST"
echo "=================================================="
