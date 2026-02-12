#!/bin/bash
# L.O.V.E. Stack - Deployment Configuration
# Central configuration file for deployment variables.
# Usage: source deploy-config.sh

# ==========================================
# Server Configuration
# ==========================================
DOMAIN_NAME="love.jrgochan.io"
ADMIN_EMAIL="admin@jrgochan.io"
APP_DIR="/opt/love-stack"
USER="jrgochan"  # User running the application services (should match your SSH user or a dedicated service user)
GROUP="jrgochan"

# ==========================================
# Repository Configuration
# ==========================================
REPO_URL="https://github.com/jrgochan/l_o_v_e.git"
BRANCH="main"

# ==========================================
# Service Configuration
# ==========================================
# Ports (Must match what's in your code/env vars)
PORT_FRONTEND=3000
PORT_OBSERVER=8000
PORT_VERSOR=8001
PORT_LISTENER=8002

# Python Version
PYTHON_VERSION="3.12"

# Database Configuration (for initial setup)
DB_NAME="love_db"
DB_USER="love_user"
# DB_PASSWORD should be set in environment variables or prompted, not hardcoded here for security if possible.
# However, for automated setup, we might need a default or a way to inject it.
# We will use a placeholder or expect it to be set in the environment.

# ==========================================
# Paths
# ==========================================
VENV_DIR=".venv"
LOG_DIR="$APP_DIR/infra/logs"
