#!/bin/bash
# L.O.V.E. Stack - RHEL9 Initial Server Setup
# Installs system dependencies and configures the environment.
# Run this once on a fresh RHEL9 server.

set -e

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/deploy-config.sh"

echo "=========================================="
echo " Setting up Love Stack on RHEL9"
echo " Domain: $DOMAIN_NAME"
echo " App Dir: $APP_DIR"
echo "=========================================="

# 0. Cleanup Conflicts (Fixes Remi/EPEL conflicts)
echo "-> Cleaning up potential repo conflicts..."
sudo dnf remove -y remi-release || true
sudo dnf clean all

# 1. Enable CRB (Code Ready Builder) - Required for many EPEL packages
echo "-> Enabling Code Ready Builder (CRB)..."
sudo dnf config-manager --set-enabled crb || sudo dnf config-manager --set-enabled codeready-builder-for-rhel-9-x86_64-rpms || echo "CRB enable failed, continuing..."

# 2. Update System (Best Effort)
echo "-> Updating system packages (Best Effort)..."
# Use --nobest and --skip-broken to handle unregistered systems with old base packages
sudo dnf update -y --nobest --skip-broken || true

# 3. Install EPEL
echo "-> Installing EPEL release..."
sudo dnf install -y epel-release

# 4. Install Core Dependencies
echo "-> Installing core tools..."
sudo dnf install -y git curl wget tar gcc make openssl-devel bzip2-devel libffi-devel zlib-devel --nobest --skip-broken

# 5. Install Python 3.12
echo "-> Installing Python $PYTHON_VERSION..."
# If 3.12 fails due to rpm-libs, we might need to fallback or user needs to upgrade OS.
# We attempt with --nobest to accept older versions if available.
sudo dnf install -y python3.12 python3.12-devel python3.12-pip --nobest --skip-broken

# 5. Install Node.js 20 (LTS)
echo "-> Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 6. Install PostgreSQL 15 (via PGDG)
echo "-> Installing PostgreSQL 15 via PGDG..."

# Remove potential conflicts from default RHEL postgresql module
echo "   Cleaning up old PostgreSQL packages..."
sudo dnf remove -y postgresql postgresql-server postgresql-libs || true

# Install PGDG Repo
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm || true
# Disable default module to avoid conflicts
sudo dnf -qy module disable postgresql || true
# Install server and contrib
sudo dnf install -y postgresql15-server postgresql15-contrib --nobest --skip-broken

# Initialize DB (PGDG style)
if [ ! -f /var/lib/pgsql/15/data/PG_VERSION ]; then
    echo "-> Initializing PostgreSQL database..."

    # Check for existing data that might be blocking init (e.g. from failed runs)
    if [ -d "/var/lib/pgsql/15/data" ] && [ "$(sudo ls -A /var/lib/pgsql/15/data)" ]; then
        echo "   Warning: Data directory exists but PG_VERSION missing. Backing up and clearing..."
        TIMESTAMP=$(date +%s)
        sudo mv /var/lib/pgsql/15/data "/var/lib/pgsql/15/data.bak.$TIMESTAMP"
        sudo mkdir -p /var/lib/pgsql/15/data
        sudo chown postgres:postgres /var/lib/pgsql/15/data
        sudo chmod 700 /var/lib/pgsql/15/data
    fi

    # Check if the setup script exists
    if [ -f /usr/pgsql-15/bin/postgresql-15-setup ]; then
        sudo /usr/pgsql-15/bin/postgresql-15-setup initdb
    else
        echo "Warning: postgresql-15-setup not found. Initialization might have failed."
    fi
fi

echo "-> Starting PostgreSQL..."
if ! sudo systemctl enable --now postgresql-15; then
    echo "Error: Failed to start PostgreSQL 15."
    echo "Printing git logs:"
    sudo journalctl -xeu postgresql-15.service --no-pager | tail -n 50
    exit 1
fi

# 7. Install Redis
echo "-> Installing Redis..."
sudo dnf install -y redis
sudo systemctl enable --now redis

# 8. Install Nginx
echo "-> Installing Nginx..."
sudo dnf install -y nginx
sudo systemctl enable --now nginx

# 9. Create Application Directory
echo "-> Creating application directory at $APP_DIR..."
if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p "$APP_DIR"
    sudo chown "$USER:$GROUP" "$APP_DIR"
    sudo chmod 755 "$APP_DIR"
    echo "   Created $APP_DIR and set ownership to $USER:$GROUP"
fi

# 10. Install Certbot (for SSL)
echo "-> Installing Certbot..."
sudo dnf install -y certbot python3-certbot-nginx

# 11. Firewall Configuration (firewalld)
# Only if firewalld is running
if systemctl is-active --quiet firewalld; then
    echo "-> Configuring firewall..."
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
fi

echo ""
echo "=========================================="
echo " Server setup complete!"
echo " Next steps:"
echo " 1. Configure PostgreSQL user/database manually or via script."
echo " 2. Run ./deploy.sh to deploy the application."
echo "=========================================="
