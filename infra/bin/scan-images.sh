#!/bin/bash
# L.O.V.E. Stack - Container Image Security Scanner
# Uses Trivy to scan built OpenShift images natively from the CRC registry

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if ! command -v trivy &> /dev/null; then
    echo -e "${RED}Error: trivy is not installed.${NC} Please install it first (e.g. brew install trivy)"
    exit 1
fi

if ! command -v oc &> /dev/null; then
    echo -e "${RED}Error: OpenShift CLI (oc) is not installed or available.${NC}"
    exit 1
fi

echo -e "${GREEN}Starting Trivy OpenShift Container Image Security Scan...${NC}"

# Ensure we are logged into CRC and can get a token
if ! oc whoami &> /dev/null; then
    echo -e "${YELLOW}Not logged into OpenShift. Attempting automated CRC login...${NC}"
    eval "$(crc oc-env)"
    oc login -u developer -p developer https://api.crc.testing:6443 --insecure-skip-tls-verify
fi

# Get the OpenShift registry route
REGISTRY_HOST=$(oc get route default-route -n openshift-image-registry -o jsonpath='{.spec.host}')
PROJECT="love-stack"

# Export TRIVY registry authentication variables natively
# By using TRIVY_USERNAME and TRIVY_PASSWORD instead of TRIVY_REGISTRY_TOKEN,
# we prevent Trivy from presenting the OpenShift token to ghcr.io when downloading the DB.
export TRIVY_USERNAME=developer
TRIVY_PASSWORD=$(oc whoami -t)
export TRIVY_PASSWORD
# Bypass TLS verification since CRC uses a self-signed cert for the registry route
export TRIVY_INSECURE=true

IMAGES=(
    "love-observer:latest"
    "love-listener:latest"
    "love-versor:latest"
    "love-experience:latest"
)

echo -e "${YELLOW}Target Registry:${NC} ${REGISTRY_HOST}/${PROJECT}"

for IMAGE in "${IMAGES[@]}"; do
    FULL_IMAGE="${REGISTRY_HOST}/${PROJECT}/${IMAGE}"
    echo -e "\n${CYAN}========================================================================${NC}"
    echo -e "${CYAN} Scanning: ${FULL_IMAGE}${NC}"
    echo -e "${CYAN}========================================================================${NC}\n"

    # Run Trivy against the remote registry image
    # We filter for HIGH and CRITICAL severities to keep the output actionable
    # and explicitly point to GHCR for the DB to avoid GCR auth issues
    trivy image \
        --db-repository ghcr.io/aquasecurity/trivy-db \
        --severity HIGH,CRITICAL \
        --no-progress \
        --ignore-unfixed \
        "${FULL_IMAGE}" || true # Don't halt the whole script if one image fails
done

echo -e "\n${GREEN}HPC Security & Compliance Scan Completed.${NC}"
