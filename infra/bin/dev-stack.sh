#!/bin/bash
# L.O.V.E. Stack - Developer Start Script (Honcho)
# Usage: ./infra/bin/dev-stack.sh [--no-infra]

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source common libs
. "$PROJECT_ROOT/infra/lib/common.sh"
. "$PROJECT_ROOT/infra/lib/service-manager.sh"

print_header "🚀 Starting L.O.V.E. Stack (Dev Mode)"

# Check uv availability
if ! command -v uv &> /dev/null; then
    print_error "uv not found. Please run ./infra/bin/setup-love-stack.sh first."
    exit 1
fi

SKIP_INFRA=false
ENABLE_VOICE=false

for arg in "$@"; do
    case $arg in
        --no-infra) SKIP_INFRA=true ;;
        --voice) ENABLE_VOICE=true ;;
    esac
done

if [ "$SKIP_INFRA" = false ]; then
    print_info "Checking infrastructure..."

    # Check Postgres
    if ! check_service_running postgresql && ! check_service_running postgres; then
        print_warning "PostgreSQL is not running. Starting..."
        brew services start postgresql@18 || true  # Try specific version first
        sleep 2
    fi

    # Check Redis
    if ! check_service_running redis-server; then
        print_warning "Redis is not running. Starting..."
        brew services start redis || true
        sleep 1
    fi

    # Check Ollama
    if ! check_service_running ollama; then
        print_warning "Ollama is not running. Starting..."
        start_ollama
        sleep 2
    fi
fi

print_success "Infrastructure ready"

# Strict .env generation...

# Export PYTHONPATH to include shared libraries
export PYTHONPATH="$PROJECT_ROOT/infra/lib/python:$PYTHONPATH"

cd "$PROJECT_ROOT"

print_info "Starting services with Honcho..."
echo ""
echo "  [Services]"
echo "  - Versor (Core): http://localhost:8001"
echo "  - Observer (VAC): http://localhost:8000"
echo "  - Listener (Audio): http://localhost:8002"
echo "  - Experience (Web): http://localhost:3000"
if [ "$ENABLE_VOICE" = true ]; then
    echo "  - PersonaPlex (Voice): http://localhost:8003"
    export PROCFILE_TARGET="Procfile" # Default to all if enabled in Procfile, or we create a dynamic one
    # Currently Procfile has personaplex commented out.
    # Let's dynamically enable it if requested contextually, strictly talking 'honcho' filters aren't standardized across versions
    # For now, we instruct to uncomment or use a separate procfile.
    # PROPOSAL: We can use `honcho start -f Procfile -c personaplex=1` if strictly defined?
    # Simple workaround: Create a Procfile.voice include?
    # Simplest: Just inform the user.
    print_warning "To enable PersonaPlex, uncomment it in the Procfile or run separately."
fi
echo ""
echo "Press Ctrl+C to stop all services."
echo "---------------------------------------------------"

# Run Honcho
uv run honcho start -f Procfile
