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
    echo ""
    echo -e "${BOLD}EXAMPLES${NC}"
    echo "    $0 jrgochan@love.jrgochan.io deploy"
    echo "    $0 --verbose jrgochan@love.jrgochan.io check"
    echo "    $0 --tags nginx,certs jrgochan@love.jrgochan.io setup"
    echo ""
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) show_help ;;
        -v|--verbose) VERBOSE=true; shift ;;
        --tags) EXTRA_TAGS="$2"; shift 2 ;;
        --tags=*) EXTRA_TAGS="${1#*=}"; shift ;;
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

# Extract user and host
USER_NAME="${REMOTE_HOST%%@*}"
HOST_NAME="${REMOTE_HOST#*@}"

# 6. Pre-flight Checks

print_header "🚀 Ansible Deployment: $ACTION"
echo "  Target:  $HOST_NAME ($USER_NAME)"
echo "  Verbose: $VERBOSE"
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

INVENTORY_FILE="$ANSIBLE_DIR/inventory/hosts.ini"
mkdir -p "$(dirname "$INVENTORY_FILE")"

cat > "$INVENTORY_FILE" <<EOF
[rhel9]
$HOST_NAME ansible_host=$HOST_NAME ansible_user=$USER_NAME
EOF

print_info "Inventory written to $INVENTORY_FILE"

# 8. Build Ansible Command & Execute

cd "$ANSIBLE_DIR"

ANSIBLE_ARGS=(-i inventory/hosts.ini)

if [ "$VERBOSE" = true ]; then
    ANSIBLE_ARGS+=(-vv)
fi

if [ -n "$EXTRA_TAGS" ]; then
    ANSIBLE_ARGS+=(--tags "$EXTRA_TAGS")
fi

case "$ACTION" in
    check)
        print_info "Running Syntax Check..."
        ansible-playbook deploy.yml --syntax-check
        print_info "Running Dry Run (Check Mode)..."
        ansible-playbook deploy.yml "${ANSIBLE_ARGS[@]}" --check --diff
        ;;
    setup)
        print_info "Running Infrastructure Setup..."
        ansible-playbook deploy.yml "${ANSIBLE_ARGS[@]}" --tags setup
        ;;
    deploy)
        print_info "Running Application Deployment..."
        ansible-playbook deploy.yml "${ANSIBLE_ARGS[@]}" --tags deploy
        ;;
esac

# 9. Summary

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

print_header "📊 Deployment Summary"
echo "  Action:   $ACTION"
echo "  Target:   $HOST_NAME ($USER_NAME)"
echo "  Duration: ${DURATION}s"
echo ""
print_success "Ansible operation complete!"
