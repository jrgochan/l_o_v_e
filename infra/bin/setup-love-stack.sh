#!/bin/bash
# L.O.V.E. Stack - Setup Script
# Automates environment setup using uv (ultra-fast python package manager)

set -e

# Get script directory (infra/bin)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source cross-platform libraries
. "$PROJECT_ROOT/infra/lib/os-detect.sh"
. "$PROJECT_ROOT/infra/lib/package-manager.sh"
. "$PROJECT_ROOT/infra/lib/service-manager.sh"
. "$PROJECT_ROOT/infra/lib/common.sh"

# Help message
show_help() {
    print_header "Start L.O.V.E. Stack Setup"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help           Show this help message"
    echo "  --skip-seed          Skip database seeding"
    echo "  --with-demo          Includes demo data (DEV ONLY)"
    echo "  --with-bootstrap     Includes bootstrap data"
    echo "  --force-reseed       Force clearing and reseeding data"
    echo "  --dataset <name>     Select dataset (goemotions, brene_brown, etc.)"
    echo ""
}

# Parse arguments
args=()
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            args+=("$1")
            shift
            ;;
    esac
done

print_header "🚀 Setting up L.O.V.E. Stack"

# 1. Install uv for dependency management
print_info "Installing uv (Python Package Manager)..."
if ! command -v uv &> /dev/null; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # Ensure uv is in path for this session
    export PATH="$HOME/.cargo/bin:$PATH"
    export PATH="$HOME/.local/bin:$PATH"

    if ! command -v uv &> /dev/null; then
         # Fallback to pip install if script fails or path issues
         print_warning "uv install script failed, trying pip..."
         python3 -m pip install uv --user
         USER_BASE_BIN="$(python3 -m site --user-base)/bin"
         export PATH="$USER_BASE_BIN:$PATH"
    fi
fi

if command -v uv &> /dev/null; then
    print_success "uv installed: $(uv --version)"
else
    print_error "Failed to install uv. Please install manually: pip install uv"
    exit 1
fi

# 2. Sync Dependencies
print_header "📦 Syncing Dependencies"
cd "$PROJECT_ROOT"

# Sync all groups including dev
# This creates a centralized .venv in the root
print_info "Creating unified virtual environment..."
uv sync --all-groups --all-extras

print_success "Dependencies installed in .venv"

# 3. Setup Pre-commit hooks (if git repo)
if [ -d ".git" ]; then
    print_info "Setting up pre-commit hooks..."
    uv run pre-commit install || print_warning "Failed to install pre-commit hooks"
fi

# 4. Initialize Database (Idempotent)
print_header "🗄️  Database Setup"
if command -v psql &> /dev/null; then
    # Use the existing shell script
    ./infra/scripts/db/init-database.sh "${args[@]}" || print_warning "Database init script skipped or failed"
else
    print_warning "PostgreSQL client (psql) not found. Skipping DB check."
fi

# 5. Frontend Setup
print_header "🎨 Experience Web Setup"
if [ -d "experience" ]; then
    cd experience
    if command -v npm &> /dev/null; then
        print_info "Installing npm dependencies..."
        npm install
        print_success "Frontend dependencies installed"
    else
        print_warning "npm not found. Skipping frontend setup."
    fi
    cd - > /dev/null
fi

echo ""
print_success "✅ Setup Complete!"
print_info "Run the stack with: ./infra/bin/run-love-stack.sh"
