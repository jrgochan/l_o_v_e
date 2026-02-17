#!/bin/bash
# L.O.V.E. Stack - Deployment Configuration
# Central configuration file for deployment variables.
# Usage: source deploy-config.sh

# ==========================================
# Server Configuration
# ==========================================
export DOMAIN_NAME="love.jrgochan.io"
export ADMIN_EMAIL="admin@jrgochan.io"
export APP_DIR="/opt/love-stack"
export USER="jrgochan"  # User running the application services (should match your SSH user or a dedicated service user)
export GROUP="jrgochan"

# ==========================================
# Repository Configuration
# ==========================================
export REPO_URL="https://github.com/jrgochan/l_o_v_e.git"
export BRANCH="main"

# ==========================================
# Service Configuration
# ==========================================
# Ports (Must match what's in your code/env vars)
export PORT_FRONTEND=3000
export PORT_OBSERVER=8000
export PORT_VERSOR=8001
export PORT_LISTENER=8002

# Python Version
export PYTHON_VERSION="3.12"

# Database Configuration (for initial setup)
export DB_NAME="love_db"
export DB_USER="love_user"
# DB_PASSWORD should be set in environment variables or prompted, not hardcoded here for security if possible.
# However, for automated setup, we might need a default or a way to inject it.
# We will use a placeholder or expect it to be set in the environment.

# ==========================================
# Paths
# ==========================================
export VENV_DIR=".venv"
export LOG_DIR="$APP_DIR/infra/logs"
