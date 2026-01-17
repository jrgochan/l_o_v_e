#!/bin/bash
# Install all development tools needed for L.O.V.E. platform
# POSIX-compliant, idempotent, cross-platform guidance

set -e

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/common.sh
. "$SCRIPT_DIR/lib/common.sh"

# Change to project root
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

print_header "L.O.V.E. Development Tools Installation"

# === Step 1: Check Python ===
print_header "Step 1: Python Check"

PYTHON_CMD=$(find_python_314)

if [ -z "$PYTHON_CMD" ]; then
    print_error "Python 3.14+ not found"
    print_info "Please install Python 3.14 to proceed."
    exit 1
else
    VERSION=$($PYTHON_CMD --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
    print_success "Found Python $VERSION: $PYTHON_CMD"
fi

# === Step 2: Create DX Tools Virtual Environment ===
print_header "Step 2: DX Tools Virtual Environment"

VENV_DIR="infra/.venv-dx"

if [ ! -d "$VENV_DIR" ]; then
    print_info "Creating isolated venv at $VENV_DIR..."
    "$PYTHON_CMD" -m venv "$VENV_DIR"
    print_success "Created venv"
else
    print_info "Using existing venv at $VENV_DIR"
fi

# Activate venv
# shellcheck source=/dev/null
. "$VENV_DIR/bin/activate"

# === Step 3: Install Python Dev Tools ===
print_header "Step 3: Installing DX Tools"

print_info "Upgrading pip..."
pip install --upgrade pip --quiet

TOOLS=(black isort flake8 mypy pylint pydocstyle bandit radon vulture pytest pytest-asyncio pytest-cov pytest-xdist hypothesis autoflake pre-commit types-requests types-PyYAML types-setuptools)

print_info "Installing tools: ${TOOLS[*]}"
if pip install "${TOOLS[@]}" --quiet; then
    print_success "All DX tools installed successfully"
else
    print_error "Failed to install DX tools"
    exit 1
fi

# === Verify ===
print_header "Verification"
if command -v black >/dev/null; then
    print_success "Tools available in venv path"
else
    print_error "Tools not found in path"
    exit 1
fi

print_success "Development environment ready!"
print_info "To use tools manually: source infra/.venv-dx/bin/activate"
