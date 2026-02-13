#!/bin/bash
# L.O.V.E. Stack - Automated Deployment Script
# Deploys code, builds assets, and configures services.

set -e

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/deploy-config.sh"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Configuration file not found at $CONFIG_FILE"
    exit 1
fi
# shellcheck source=deploy-config.sh disable=SC1091
source "$CONFIG_FILE"

echo "=========================================="
echo " Deploying Love Stack to $DOMAIN_NAME"
echo " App Dir: $APP_DIR"
echo " Branch: $BRANCH"
echo "=========================================="

# Ensure directories exist
sudo mkdir -p "$APP_DIR"
sudo chown "$USER:$GROUP" "$APP_DIR"

# 1. Update Code
echo "-> Updating code..."
if [ ! -d "$APP_DIR/.git" ]; then
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
else
    cd "$APP_DIR"
    git fetch origin
    git reset --hard "origin/$BRANCH"
fi

# 2. Setup Python Services (Versor, Observer, Listener)
# We use a single shared venv or separate ones? The codebase seems to have separate ones.
# Let's respect the repository structure.

setup_python_service() {
    local service_dir="$1"
    local service_name="$2"
    
    echo "-> Setting up $service_name ($service_dir)..."
    cd "$APP_DIR/$service_dir"
    
    if [ ! -d ".venv" ]; then
        python3.12 -m venv .venv
    fi
    
    # shellcheck disable=SC1091  # venv activate script exists at runtime
    source .venv/bin/activate
    pip install -U pip setuptools wheel
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    fi
    deactivate
}

setup_python_service "versor" "Versor API"
setup_python_service "observer" "Observer API"
setup_python_service "listener" "Listener API"

# 3. Setup Frontend
echo "-> Building Frontend (Experience)..."
cd "$APP_DIR/experience/web"
# Check if we need to install dependencies
if [ ! -d "node_modules" ] || [ "$1" == "--install" ]; then
    npm ci
fi

# Build Next.js
# We need to inject env vars for the build
export NEXT_PUBLIC_API_URL="https://$DOMAIN_NAME/api"
# Other env vars as needed...
npm run build

# 4. Generate Configuration Files
echo "-> Generating configuration files..."
TEMPLATE_DIR="$APP_DIR/infra/deploy/templates"
SYSTEMD_DIR="/etc/systemd/system"
NGINX_DIR="/etc/nginx/conf.d"

# Ensure template dir exists (it is part of the repo now)
if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "Error: Template directory not found at $TEMPLATE_DIR"
    exit 1
fi

# Helper to expand variables
expand_template() {
    local template="$1"
    local destination="$2"
    # We use envsubst, passing in only the variables we want to replace to avoid accidental replacement
    # We export the variables first
    export DOMAIN_NAME APP_DIR USER GROUP PORT_FRONTEND PORT_OBSERVER PORT_VERSOR PORT_LISTENER
    # shellcheck disable=SC2016  # Single quotes intentional: envsubst uses them to identify target variables
    envsubst '$DOMAIN_NAME $APP_DIR $USER $GROUP $PORT_FRONTEND $PORT_OBSERVER $PORT_VERSOR $PORT_LISTENER' < "$template" | sudo tee "$destination" > /dev/null
}

# Systemd Services
# We need templates for each or a generic one. Let's assume specific templates for now as commands differ.
expand_template "$TEMPLATE_DIR/systemd/love-versor.service.template" "$SYSTEMD_DIR/love-versor.service"
expand_template "$TEMPLATE_DIR/systemd/love-observer.service.template" "$SYSTEMD_DIR/love-observer.service"
expand_template "$TEMPLATE_DIR/systemd/love-listener.service.template" "$SYSTEMD_DIR/love-listener.service"
expand_template "$TEMPLATE_DIR/systemd/love-frontend.service.template" "$SYSTEMD_DIR/love-frontend.service"

sudo systemctl daemon-reload

# Nginx Config
expand_template "$TEMPLATE_DIR/nginx.conf.template" "$NGINX_DIR/love-stack.conf"

# 5. Restart Services
echo "-> Restarting services..."
sudo systemctl enable love-versor love-observer love-listener love-frontend
sudo systemctl restart love-versor love-observer love-listener love-frontend

echo "-> Reloading Nginx..."
sudo systemctl reload nginx

echo "=========================================="
echo " Deployment Complete!"
echo " https://$DOMAIN_NAME"
echo "=========================================="
