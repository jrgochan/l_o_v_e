#!/bin/bash
# ============================================================================
# L.O.V.E. Stack — CRC Environment Cleanup Script
# ============================================================================
# This script completely tears down the L.O.V.E. stack and SLURM
# deployments from the CRC cluster to ensure a fresh starting state.
#
# DANGER: This will delete namespaces and all resources within them.

set -euo pipefail

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${RED}${BOLD}WARNING: DANGER ZONE${NC}"
echo "This script will completely delete the following OpenShift projects (namespaces)"
echo "and ALL resources (Pods, PVCs, Services, Routes) inside them:"
echo "  - love-stack"
echo "  - slurm-cluster"
echo "  - hpc-monitoring"
echo ""
echo -n "Are you sure you want to proceed? Type 'DELETE' to confirm: "
read -r CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
    echo "Cleanup aborted."
    exit 0
fi

# Ensure oc is available
if ! command -v oc &> /dev/null; then
    # shellcheck disable=SC2046
    eval $(crc oc-env)
fi

echo -e "\n${YELLOW}Starting cleanup process...${NC}"

NAMESPACES=("love-stack" "slurm-cluster" "hpc-monitoring")

for ns in "${NAMESPACES[@]}"; do
    if oc get project "$ns" &> /dev/null; then
        echo "Deleting project: $ns (This may take a minute or two)..."
        # Run in background to speed up, then wait
        oc delete project "$ns" &
    else
        echo "Project $ns does not exist. Skipping."
    fi
done

echo "Waiting for all deletions to complete..."
wait

echo -e "${GREEN}Cleanup complete!${NC} The cluster is now clean."
echo "You can run './setup-crc-env.sh' to re-initialize the environment."
