#!/bin/bash
# =============================================================================
# DEPRECATED — Use 'ansible-playbook ansible/deploy-openshift.yml' instead.
# This script is kept for reference only.
# =============================================================================
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/config.sh"

SERVICE=$1

deploy_svc() {
    local svc_name=$1
    echo "Deploying $svc_name..."
    oc apply -f "$DIR/manifests/$svc_name.yaml"
}

echo "Phase 4: Deploy App Services"

if [ -z "$SERVICE" ]; then
    # All
    deploy_svc "versor"
    deploy_svc "observer"
    deploy_svc "listener"
    deploy_svc "experience"
elif [ "$SERVICE" == "backend" ]; then
    deploy_svc "versor"
    deploy_svc "observer"
    deploy_svc "listener"
else
    deploy_svc "$SERVICE"
fi
