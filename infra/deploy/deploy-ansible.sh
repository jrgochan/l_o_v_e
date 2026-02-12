#!/bin/bash
# L.O.V.E. Stack - Ansible Deployment Runner
# Run this from your local machine (macOS/Linux).
# Usage: ./deploy-ansible.sh [user@host] [check|deploy]

set -e

# Configuration
LOCAL_SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANSIBLE_DIR="$LOCAL_SCRIPT_DIR/ansible"
REMOTE_HOST="$1"
ACTION="${2:-deploy}"

if [ -z "$REMOTE_HOST" ]; then
    echo "Usage: $0 [user@host] [check|deploy]"
    echo "Example: $0 jrgochan@love.jrgochan.io deploy"
    exit 1
fi

# Extract user and host
USER_NAME=$(echo "$REMOTE_HOST" | cut -d@ -f1)
HOST_NAME=$(echo "$REMOTE_HOST" | cut -d@ -f2)

echo "=========================================="
echo " Ansible Deployment: $ACTION"
echo " Target: $HOST_NAME ($USER_NAME)"
echo "=========================================="

# Check if ansible is installed
if ! command -v ansible-playbook &> /dev/null; then
    echo "Warning: 'ansible-playbook' not found."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            echo "-> Installing Ansible via Homebrew..."
            brew install ansible
        else
            echo "Error: Homebrew not found. Please install Ansible manually."
            exit 1
        fi
    else
        if command -v pip3 &> /dev/null; then
             echo "-> Installing Ansible via pip..."
             pip3 install ansible
        else
             echo "Error: pip3 not found. Please install Ansible manually."
             exit 1
        fi
    fi
fi

# Create temporary inventory file if not using the default one
# We can overwrite the one in ansible/inventory/hosts.ini or pass via -i
INVENTORY_FILE="$ANSIBLE_DIR/inventory/hosts.ini"
# Update inventory with correct user/host if needed. 
# For now, we assume the user configured hosts.ini or we override variables.
# Ideally, we just pass the host in the inventory command, but Ansible needs the group structure.

# Let's ensure the inventory has the right content
cat > "$INVENTORY_FILE" <<EOF
[rhel9]
$HOST_NAME ansible_host=$HOST_NAME ansible_user=$USER_NAME
EOF

echo "-> Inventory updated in $INVENTORY_FILE"

# Execute
cd "$ANSIBLE_DIR"

if [ "$ACTION" == "check" ]; then
    echo "-> Running Syntax Check..."
    ansible-playbook deploy.yml --syntax-check
    echo "-> Running Dry Run (Check Mode)..."
    ansible-playbook deploy.yml -i inventory/hosts.ini --check --diff
elif [ "$ACTION" == "setup" ]; then
    echo "-> Running Infrastructure Setup..."
    ansible-playbook deploy.yml -i inventory/hosts.ini --tags setup
elif [ "$ACTION" == "deploy" ]; then
    echo "-> Running Application Deployment..."
    ansible-playbook deploy.yml -i inventory/hosts.ini --tags deploy
else
    echo "Error: Unknown action '$ACTION'. Use 'check', 'setup', or 'deploy'."
    exit 1
fi

echo "=========================================="
echo " Ansible operation complete!"
echo "=========================================="
