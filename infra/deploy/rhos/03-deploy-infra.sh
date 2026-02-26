#!/bin/bash
# =============================================================================
# DEPRECATED — Use 'ansible-playbook ansible/deploy-openshift.yml' instead.
# This script is kept for reference only.
# =============================================================================
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/config.sh"

echo "Phase 3: Deploy Infrastructure"

oc apply -f "$DIR/manifests/postgres.yaml"
oc apply -f "$DIR/manifests/redis.yaml"
oc apply -f "$DIR/manifests/ollama.yaml"

echo "Infrastructure deployed."
