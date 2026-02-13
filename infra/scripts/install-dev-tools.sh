#!/bin/bash
# Install all development tools needed for L.O.V.E. platform
# Uses uv to manage the project root .venv with all dependencies + dev tools.

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

if check_command python3; then
    VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    print_success "Found Python $VERSION"
else
    print_error "Python 3 not found"
    print_info "Please install Python 3.12+ to proceed."
    exit 1
fi

# === Step 2: Check uv ===
print_header "Step 2: uv Package Manager"

if ! check_command uv; then
    print_info "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # shellcheck source=/dev/null
    . "$HOME/.cargo/env" 2>/dev/null || true
fi

if check_command uv; then
    UV_VERSION=$(uv --version 2>&1)
    print_success "Found $UV_VERSION"
else
    print_error "uv installation failed"
    print_info "  Manual install: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# === Step 3: Create/Sync Project Venv ===
print_header "Step 3: Project Virtual Environment"

if [ ! -d ".venv" ]; then
    print_info "Creating project venv at .venv..."
    uv venv .venv
    print_success "Created venv"
else
    print_info "Using existing venv at .venv"
fi

print_info "Syncing all dependencies (modules + dev tools)..."
if uv sync --all-extras; then
    print_success "All dependencies installed"
else
    print_error "Failed to sync dependencies"
    exit 1
fi

# === Step 4: Clean up legacy DX venv ===
if [ -d "infra/.venv-dx" ]; then
    print_info "Removing legacy infra/.venv-dx..."
    rm -rf "infra/.venv-dx"
    print_success "Legacy DX venv removed"
fi

# === Verify ===
print_header "Verification"

TOOLS=(black isort flake8 pylint mypy pydocstyle bandit radon pytest)
all_found=true

for tool in "${TOOLS[@]}"; do
    if .venv/bin/python -m "$tool" --version >/dev/null 2>&1 || [ -x ".venv/bin/$tool" ]; then
        print_success "$tool available"
    else
        print_warning "$tool not found in venv"
        all_found=false
    fi
done

echo ""
if [ "$all_found" = true ]; then
    print_success "Development environment ready!"
else
    print_warning "Some tools may not be available (they may still work via uv run)"
fi

print_info "To activate manually: source .venv/bin/activate"
print_info "Or use: uv run <command>"
