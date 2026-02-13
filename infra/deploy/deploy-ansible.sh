#!/bin/bash
# L.O.V.E. Stack - Ansible Deployment Runner
# Orchestrates Ansible playbook execution from a local machine (macOS/Linux).
# Usage: ./deploy-ansible.sh [OPTIONS] user@host [check|setup|deploy]

# 1. Strict Mode
set -euo pipefail

# 2. Environment Setup
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ANSIBLE_DIR="$SCRIPT_DIR/ansible"

# Global Variables
START_TIME=$(date +%s)
VERBOSE=false
EXTRA_TAGS=""
REMOTE_HOST=""
ACTION="deploy"
TIER="production"

# 3. Output Styling & Common Lib
# shellcheck source=../scripts/../lib/common.sh
. "$PROJECT_ROOT/infra/lib/common.sh"

# 4. Help & Argument Parsing
show_help() {
    echo -e "${BOLD}L.O.V.E. Stack - Ansible Deployment Runner${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "    Orchestrates Ansible playbook execution from your local machine."
    echo ""
    echo -e "${BOLD}USAGE${NC}"
    echo "    $0 [OPTIONS] user@host [check|setup|deploy]"
    echo ""
    echo -e "${BOLD}ACTIONS${NC}"
    echo "    check       Syntax check + dry-run (--check --diff)"
    echo "    setup       Run infrastructure setup tasks (--tags setup)"
    echo "    deploy      Run application deployment tasks (--tags deploy) [default]"
    echo ""
    echo -e "${BOLD}OPTIONS${NC}"
    echo "    -h, --help            Show this help message"
    echo "    -v, --verbose         Enable verbose Ansible output (-vv)"
    echo "    --tags [tags]         Pass additional Ansible tags (comma-separated)"
    echo "    --tier [tier]         Deployment tier: minimal, staging, production [default: production]"
    echo "    --vault               Prompt for Ansible Vault password"
    echo ""
    echo -e "${BOLD}TIERS${NC}"
    echo "    minimal     Dev/CI  — 4GB RAM, no Ollama/PersonaPlex, debug logging"
    echo "    staging     QA      — 8GB RAM, optional Ollama, LE staging certs"
    echo "    production  Live    — 16GB+ RAM, full services, LE production certs"
    echo ""
    echo -e "${BOLD}EXAMPLES${NC}"
    echo "    $0 jrgochan@love.jrgochan.io deploy"
    echo "    $0 --tier staging jrgochan@staging.jrgochan.io deploy"
    echo "    $0 --tier minimal --verbose jrgochan@dev-server setup"
    echo "    $0 --vault jrgochan@love.jrgochan.io deploy"
    echo ""
    exit 0
}

USE_VAULT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) show_help ;;
        -v|--verbose) VERBOSE=true; shift ;;
        --tags) EXTRA_TAGS="$2"; shift 2 ;;
        --tags=*) EXTRA_TAGS="${1#*=}"; shift ;;
        --tier) TIER="$2"; shift 2 ;;
        --tier=*) TIER="${1#*=}"; shift ;;
        --vault) USE_VAULT=true; shift ;;
        -*)
            print_error "Unknown option: $1"
            echo "Run '$0 --help' for usage."
            exit 1
            ;;
        *)
            # Positional arguments: user@host, then action
            if [ -z "$REMOTE_HOST" ]; then
                REMOTE_HOST="$1"
            else
                ACTION="$1"
            fi
            shift
            ;;
    esac
done

# 5. Input Validation

if [ -z "$REMOTE_HOST" ]; then
    print_error "Missing required argument: user@host"
    echo "Run '$0 --help' for usage."
    exit 1
fi

# Validate user@host format
case "$REMOTE_HOST" in
    *@*) ;; # contains @, valid
    *)
        print_error "Invalid target '$REMOTE_HOST'. Expected format: user@host"
        exit 1
        ;;
esac

# Validate action
case "$ACTION" in
    check|setup|deploy) ;; # valid
    *)
        print_error "Unknown action '$ACTION'. Use 'check', 'setup', or 'deploy'."
        exit 1
        ;;
esac

# Validate tier
case "$TIER" in
    minimal|staging|production) ;; # valid
    *)
        print_error "Unknown tier '$TIER'. Use 'minimal', 'staging', or 'production'."
        exit 1
        ;;
esac

# Map tier to inventory file (used via indirect expansion below)
# shellcheck disable=SC2034
INVENTORY_MAP_minimal="dev.ini"
# shellcheck disable=SC2034
INVENTORY_MAP_staging="staging.ini"
# shellcheck disable=SC2034
INVENTORY_MAP_production="production.ini"

TIER_VAR="INVENTORY_MAP_${TIER}"
INVENTORY_FILE_NAME="${!TIER_VAR}"

# Extract user and host
USER_NAME="${REMOTE_HOST%%@*}"
HOST_NAME="${REMOTE_HOST#*@}"

# 6. Pre-flight Checks

print_header "🚀 Ansible Deployment: $ACTION"
echo "  Target:  $HOST_NAME ($USER_NAME)"
echo "  Tier:    $TIER"
echo "  Verbose: $VERBOSE"
echo "  Vault:   $USE_VAULT"
[ -n "$EXTRA_TAGS" ] && echo "  Tags:    $EXTRA_TAGS"

# 6a. Ansible installation
if ! command -v ansible-playbook &> /dev/null; then
    print_warning "'ansible-playbook' not found."

    if [[ "${OSTYPE:-}" == darwin* ]]; then
        if command -v brew &> /dev/null; then
            print_info "Installing Ansible via Homebrew..."
            brew install ansible
        else
            print_error "Homebrew not found. Please install Ansible manually."
            exit 1
        fi
    else
        if command -v pip3 &> /dev/null; then
            print_info "Installing Ansible via pip..."
            pip3 install ansible
        else
            print_error "pip3 not found. Please install Ansible manually."
            exit 1
        fi
    fi
fi

# 6b. SSH connectivity check
print_info "Testing SSH connectivity to $HOST_NAME..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes "$REMOTE_HOST" true 2>/dev/null; then
    print_success "SSH connection verified"
else
    print_error "Cannot reach $REMOTE_HOST via SSH."
    echo "  Ensure SSH keys are configured and the host is reachable."
    exit 1
fi

# 6c. Ansible directory check
if [ ! -d "$ANSIBLE_DIR" ]; then
    print_error "Ansible directory not found: $ANSIBLE_DIR"
    exit 1
fi

if [ ! -f "$ANSIBLE_DIR/deploy.yml" ]; then
    print_error "Playbook not found: $ANSIBLE_DIR/deploy.yml"
    exit 1
fi

# 7. Generate Inventory

INVENTORY_FILE="$ANSIBLE_DIR/inventory/$INVENTORY_FILE_NAME"

# Determine the Ansible group name from tier
case "$TIER" in
    minimal) GROUP_NAME="minimal" ;;
    staging) GROUP_NAME="staging" ;;
    production) GROUP_NAME="production" ;;
esac

# Write the inventory with the correct group
mkdir -p "$(dirname "$INVENTORY_FILE")"
cat > "$INVENTORY_FILE" <<EOF
[$GROUP_NAME]
$HOST_NAME ansible_host=$HOST_NAME ansible_user=$USER_NAME
EOF

print_info "Inventory written to $INVENTORY_FILE (tier: $TIER)"

# 8. Build Ansible Command & Execute

cd "$ANSIBLE_DIR"

ANSIBLE_ARGS=(-i "inventory/$INVENTORY_FILE_NAME")

if [ "$VERBOSE" = true ]; then
    ANSIBLE_ARGS+=(-vv)
fi

if [ -n "$EXTRA_TAGS" ]; then
    ANSIBLE_ARGS+=(--tags "$EXTRA_TAGS")
fi

if [ "$USE_VAULT" = true ]; then
    ANSIBLE_ARGS+=(--ask-vault-pass)
fi

case "$ACTION" in
    check)
        print_info "Running Syntax Check..."
        ansible-playbook deploy.yml --syntax-check
        print_info "Running Dry Run (Check Mode)..."
        ansible-playbook deploy.yml "${ANSIBLE_ARGS[@]}" --check --diff
        ;;
    setup)
        print_info "Running Infrastructure Setup ($TIER)..."
        ansible-playbook deploy.yml "${ANSIBLE_ARGS[@]}" --tags setup
        ;;
    deploy)
        print_info "Running Application Deployment ($TIER)..."
        ansible-playbook deploy.yml "${ANSIBLE_ARGS[@]}" --tags deploy
        ;;
esac

# 9. Summary

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

print_header "📊 Deployment Summary"
echo "  Action:   $ACTION"
echo "  Tier:     $TIER"
echo "  Target:   $HOST_NAME ($USER_NAME)"
echo "  Duration: ${DURATION}s"
echo ""
print_success "Ansible operation complete!"
