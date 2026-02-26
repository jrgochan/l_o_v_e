#!/bin/bash
# ============================================================================
# L.O.V.E. Stack — CRC Environment Setup script
# ============================================================================
# This script ensures the local development environment is ready to deploy
# the L.O.V.E. stack to Red Hat OpenShift Local (CRC).
#
# It checks dependencies, logs into the cluster, and creates necessary projects.

set -euo pipefail

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_step() { echo -e "${BLUE}==>${NC} ${BOLD}$1${NC}"; }
print_success() { echo -e "${GREEN}==>${NC} $1"; }
print_error() { echo -e "${RED}==>${NC} $1"; }
print_warning() { echo -e "${YELLOW}==>${NC} $1"; }

# 1. Dependency Checks
print_step "Checking prerequisites..."

missing_tools=()

# Check for crc
if ! command -v crc &> /dev/null; then
    missing_tools+=("crc")
fi

# Check for oc (OpenShift CLI)
if ! command -v oc &> /dev/null; then
    # Sometimes it's not in PATH but CRC provides it, we'll try to get it via crc oc-env later
    print_warning "oc CLI not found in PATH. Will attempt to use CRC's bundled oc."
fi

# Check for ansible
if ! command -v ansible-playbook &> /dev/null; then
    missing_tools+=("ansible-playbook (Ansible)")
fi

if [ ${#missing_tools[@]} -ne 0 ]; then
    print_error "Missing required tools: ${missing_tools[*]}"
    echo "Please install them before proceeding."
    echo "  - CRC: https://developers.redhat.com/products/codeready-containers/overview"
    echo "  - Ansible: brew install ansible (macOS) or pip install ansible"
    exit 1
fi

print_success "All prerequisite tools found."

# 2. Check CRC Status
print_step "Checking CRC cluster status..."

CRC_STATUS=$(crc status | grep "CRC VM:" | awk '{print $3}')

if [ "$CRC_STATUS" != "Running" ]; then
    print_error "CRC cluster is not running (Status: $CRC_STATUS)"
    echo "Please start it with: crc start"
    exit 1
fi
print_success "CRC cluster is running."

# 3. Configure oc environment
print_step "Configuring 'oc' CLI environment..."
# shellcheck disable=SC2046
eval "$(crc oc-env)"
print_success "Configured oc environment."

# 4. Authenticate
print_step "Checking OpenShift authentication..."
if ! oc whoami &> /dev/null; then
    print_warning "Not logged in. Attempting automatic login as developer..."
    # The default crc developer password is 'developer'. We try that first.
    if ! oc login -u developer -p developer https://api.crc.testing:6443 --insecure-skip-tls-verify=true &> /dev/null; then
         print_warning "Developer login failed. Attempting kubeadmin login..."
         # Ask user for kubeadmin password if developer fails. We can't easily auto-extract it after start.
         echo -n "Enter kubeadmin password (run 'crc console --credentials' to find it): "
         read -rs KUBE_PASS
         echo ""
         if ! oc login -u kubeadmin -p "$KUBE_PASS" https://api.crc.testing:6443 --insecure-skip-tls-verify=true; then
             print_error "Authentication failed."
             exit 1
         fi
    fi
fi

CURRENT_USER=$(oc whoami)
print_success "Logged in as: $CURRENT_USER"

# 5. Namespace (Project) Setup
print_step "Initializing namespaces..."

NAMESPACES=("love-stack" "slurm-cluster" "hpc-monitoring")

for ns in "${NAMESPACES[@]}"; do
    if oc get project "$ns" &> /dev/null; then
        print_success "Namespace '$ns' already exists."
    else
        echo "Creating namespace '$ns'..."
        oc new-project "$ns" > /dev/null
        print_success "Created namespace '$ns'."
    fi
done

# Switch back to love-stack as default
oc project love-stack > /dev/null

print_step "Setup Complete!"
echo "Environment is ready for deployment."
echo "Run 'eval \$(crc oc-env)' in your terminal if 'oc' commands are not found."
