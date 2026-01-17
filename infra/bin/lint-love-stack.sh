#!/bin/bash
# L.O.V.E. Stack - Master Lint & Quality Script
# Orchestrates quality checks for Infra (Shell), Backend (Python), and Frontend (TypeScript)
#
# Usage:
#   ./infra/bin/lint-love-stack.sh [OPTIONS]
#
# Examples:
#   ./infra/bin/lint-love-stack.sh              # Check everything
#   ./infra/bin/lint-love-stack.sh --fix        # Auto-fix issues where possible
#   ./infra/bin/lint-love-stack.sh --module infra # Check only infrastructure scripts

set -euo pipefail

# ============================================================================
# SETUP
# ============================================================================

# Get script directory (infra/bin)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source cross-platform libraries
if [ -f "$PROJECT_ROOT/infra/scripts/lib/common.sh" ]; then
    . "$PROJECT_ROOT/infra/scripts/lib/common.sh"
else
    echo "Error: common.sh not found at $PROJECT_ROOT/infra/scripts/lib/common.sh"
    exit 1
fi

# ============================================================================
# ARGUMENT PARSING
# ============================================================================

FIX_MODE=false
CI_MODE=false
TARGET_MODULE=""

# Default to running all checks
RUN_INFRA=true
RUN_PYTHON=true
RUN_TYPESCRIPT=true

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            echo "L.O.V.E. Stack - Master Lint Script"
            echo "==================================="
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --fix              Auto-fix issues where possible"
            echo "  --ci               Run in CI mode (minimal output, strict)"
            echo "  --module [name]    Run checks for specific module:"
            echo "                     (infra, python, typescript, backend, frontend)"
            echo "  -h, --help         Show this help message"
            exit 0
            ;;
        --fix)
            FIX_MODE=true
            shift
            ;;
        --ci)
            CI_MODE=true
            export CI=true
            shift
            ;;
        --module)
            TARGET_MODULE="$2"
            shift 2
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Try '$0 --help' for more information."
            exit 1
            ;;
    esac
done

# Filter based on module if set
if [ -n "$TARGET_MODULE" ]; then
    RUN_INFRA=false
    RUN_PYTHON=false
    RUN_TYPESCRIPT=false
    
    case "$TARGET_MODULE" in
        infra|infrastructure|shell)
            RUN_INFRA=true
            ;;
        python|backend|observer|listener|versor)
            RUN_PYTHON=true
            ;;
        typescript|ts|frontend|experience|web)
            RUN_TYPESCRIPT=true
            ;;
        all)
            RUN_INFRA=true
            RUN_PYTHON=true
            RUN_TYPESCRIPT=true
            ;;
        *)
            print_error "Unknown module: $TARGET_MODULE"
            exit 1
            ;;
    esac
fi

# ============================================================================
# MAIN LOGIC
# ============================================================================

print_header "🧹 L.O.V.E. Stack - Quality Assurance"
echo "Mode: $([ "$FIX_MODE" = true ] && echo "FIX (Auto-correct)" || echo "CHECK (Report only)")"
echo "Scope: $([ -n "$TARGET_MODULE" ] && echo "$TARGET_MODULE" || echo "All Modules")"

GLOBAL_EXIT_CODE=0

# --- 1. Infrastructure (Shell) ---
if [ "$RUN_INFRA" = true ]; then
    print_header "Checking Infrastructure (Shell Scripts)"
    
    if command -v shellcheck >/dev/null 2>&1; then
        print_info "Running shellcheck..."
        
        # Find all shell scripts in infra/
        # Exclude node_modules, venv, and hidden files
        SHELL_SCRIPTS=$(find "$PROJECT_ROOT/infra" -name "*.sh" -not -path "*/node_modules/*" -not -path "*/venv/*")
        
        FAILED_SCRIPTS=0
        
        for script in $SHELL_SCRIPTS; do
            # Compute relative path for nicer output
            REL_PATH="${script#$PROJECT_ROOT/}"
            
            # Check for exclusions (using ignore file or inline comments is better, but basic exclusion here)
            # e.g., if we want to skip legacy scripts
            
            if ! shellcheck "$script" --format=tty --color=always; then
                print_error "Use shellcheck on $REL_PATH"
                FAILED_SCRIPTS=$((FAILED_SCRIPTS + 1))
            else
                [ "$CI_MODE" != true ] && print_success "$REL_PATH"
            fi
        done
        
        if [ "$FAILED_SCRIPTS" -eq 0 ]; then
            print_success "Shell scripts look good!"
        else
            print_error "Shellcheck found issues in $FAILED_SCRIPTS script(s)."
            GLOBAL_EXIT_CODE=1
        fi
    else
        print_warning "shellcheck not found. Install it for better shell script quality."
        print_info "  brew install shellcheck"
    fi
fi

# --- 2. Python (Backend) ---
if [ "$RUN_PYTHON" = true ]; then
    echo ""
    # Call the existing python quality script
    # We pass --fix if requested
    
    PYTHON_ARGS=""
    [ "$FIX_MODE" = true ] && PYTHON_ARGS="$PYTHON_ARGS --fix"
    
    # Run from project root as it expects or from its dir? 
    # check-python-quality.sh expects to be run? It resolves its own dir. 
    # So we can call it by absolute path.
    
    if "$PROJECT_ROOT/infra/scripts/check-python-quality.sh" $PYTHON_ARGS; then
        # Script prints its own success message
        :
    else
        GLOBAL_EXIT_CODE=1
    fi
fi

# --- 3. TypeScript (Frontend) ---
if [ "$RUN_TYPESCRIPT" = true ]; then
    echo ""
    # Call the existing typescript quality script
    
    TS_ARGS=""
    [ "$FIX_MODE" = true ] && TS_ARGS="$TS_ARGS --fix"
    
    if "$PROJECT_ROOT/infra/scripts/check-typescript-quality.sh" $TS_ARGS; then
        # Script prints its own success message
        :
    else
        GLOBAL_EXIT_CODE=1
    fi
fi

echo ""
echo "=================================================="
if [ "$GLOBAL_EXIT_CODE" -eq 0 ]; then
    print_success "All quality checks passed! ✨"
    exit 0
else
    print_error "Some quality checks failed."
    exit $GLOBAL_EXIT_CODE
fi
