#!/bin/bash
# =============================================================================
# DEPRECATED — Use 'ansible-playbook ansible/deploy-openshift.yml' instead.
# This script is kept for reference only.
# =============================================================================
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/config.sh"

echo "Phase 1: Initialization"

# Check oc CLI
if ! command -v oc &> /dev/null; then
    echo "Error: 'oc' command not found."
    exit 1
fi

# Check connection
if ! oc whoami &> /dev/null; then
    echo "Error: Not logged into OpenShift."
    exit 1
fi

# Create Project
if ! oc get project "$PROJECT_NAME" &> /dev/null; then
    echo "Creating project $PROJECT_NAME..."
    oc new-project "$PROJECT_NAME"
else
    echo "Project $PROJECT_NAME exists."
    oc project "$PROJECT_NAME"
fi

# Create ConfigMap
echo "Creating ConfigMap..."
oc create configmap love-config \
    --from-literal=DB_NAME="$DB_NAME" \
    --from-literal=DB_USER="$DB_USER" \
    --dry-run=client -o yaml | oc apply -f -

# Create Secrets
echo "Creating Secrets..."
# Check if secret exists to avoid overwriting password
if ! oc get secret love-secrets &> /dev/null; then
    DB_PASSWORD=$(openssl rand -base64 12)
    echo "Generated DB Password."
    oc create secret generic love-secrets \
        --from-literal=DB_PASSWORD="$DB_PASSWORD"
else
    echo "Secrets already exist."
fi

# Service Accounts (Default usually fine, but good to grant privileges if needed)
# For now, default is fine.
