#!/bin/bash
# L.O.V.E. Stack - Remote Deployment Trigger
# Run this from your local machine to deploy to the remote server.
# Usage: ./remote-deploy.sh [user@host] [action]
# Actions:
#   setup   - Run the initial server setup (dependencies, etc.)
#   deploy  - Run the deployment (code update, build, restart)
#   sync    - Just sync the scripts (no execution)

set -e

# Configuration
LOCAL_SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$LOCAL_SCRIPT_DIR/../../.." && pwd)" # Assumes script is in infra/deploy
export PROJECT_ROOT
REMOTE_TEMP_DIR="$HOME/love-deploy-temp"

# Arguments
REMOTE_HOST="$1"
ACTION="${2:-deploy}"

if [ -z "$REMOTE_HOST" ]; then
    echo "Usage: $0 [user@host] [setup|deploy|sync]"
    echo "Example: $0 jrgochan@love.jrgochan.io deploy"
    exit 1
fi

echo "=========================================="
echo " Remote Deployment: $ACTION"
echo " Target: $REMOTE_HOST"
echo "=========================================="

# 1. Sync Scripts
echo "-> Syncing deployment scripts to $REMOTE_HOST..."
# We only want to sync the infra/deploy directory, not the whole repo
# The deploy.sh script on the server will pull the repo
rsync -avz --delete -e ssh \
    "$LOCAL_SCRIPT_DIR/" \
    "$REMOTE_HOST:$REMOTE_TEMP_DIR/"

echo "-> Scripts synced to $REMOTE_TEMP_DIR"

# 2. Execute Action
case "$ACTION" in
    setup)
        echo "-> Executing setup-rhel9.sh on remote..."
        ssh -t "$REMOTE_HOST" "chmod +x $REMOTE_TEMP_DIR/*.sh && cd $REMOTE_TEMP_DIR && ./setup-rhel9.sh"
        ;;
    deploy)
        echo "-> Executing deploy.sh on remote..."
        ssh -t "$REMOTE_HOST" "chmod +x $REMOTE_TEMP_DIR/*.sh && cd $REMOTE_TEMP_DIR && ./deploy.sh"
        ;;
    sync)
        echo "-> Sync complete. No action taken."
        ;;
    *)
        echo "Error: Unknown action '$ACTION'. Use 'setup', 'deploy', or 'sync'."
        exit 1
        ;;
esac

echo "=========================================="
echo " Remote operation complete!"
echo "=========================================="
