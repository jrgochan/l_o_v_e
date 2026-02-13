#!/bin/bash
# L.O.V.E. Stack - Clean Artifacts Script
# Removes build artifacts, caches, temporary files, and logs across the stack.

set -euo pipefail

# Get script directory (infra/bin)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source common library
# shellcheck source=../lib/common.sh
. "$PROJECT_ROOT/infra/lib/common.sh"
timer_start

# Variables
DRY_RUN=false
VERBOSE=false
KEEP_ENV=false

show_help() {
    print_header "🧹 L.O.V.E. Stack - Clean Script"
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo "  --dry-run     Show what would be deleted without actually deleting"
    echo "  --keep-env    Keep environment (venv, node_modules) but clean other artifacts"
    echo "  --module      Clean specific module (experience, versor, observer, listener, infra)"
    echo "  -v, --verbose Show detailed output"
    echo ""
}

TARGET_MODULE="all"

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            show_help
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --keep-env)
            KEEP_ENV=true
            shift
            ;;
        --module)
            TARGET_MODULE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

clean_path() {
    local path="$1"
    local desc="$2"

    if [ -e "$path" ]; then
        if [ "$DRY_RUN" = true ]; then
            print_info "[DRY-RUN] Would remove $desc: $path"
        else
            if [ "$VERBOSE" = true ]; then
                print_info "Removing $desc: $path"
            fi
            rm -rf "$path"
        fi
        return 0
    else
        return 0
    fi
}

print_header "Starting Cleanup..."
if [ "$KEEP_ENV" = true ]; then
    print_info "Mode: Keep Environments (skipping venv/node_modules)"
fi
if [ "$TARGET_MODULE" != "all" ]; then
    print_info "Targeting Module: $TARGET_MODULE"
fi

# 1. Experience (Frontend)
if [[ "$TARGET_MODULE" == "all" || "$TARGET_MODULE" == "experience" || "$TARGET_MODULE" == "frontend" || "$TARGET_MODULE" == "web" ]]; then
    print_info "Cleaning Experience (Frontend)..."
    EXPERIENCE_DIR="$PROJECT_ROOT/experience/web"

    if [ "$KEEP_ENV" = false ]; then
        clean_path "$EXPERIENCE_DIR/node_modules" "Node Modules"
    fi

    clean_path "$EXPERIENCE_DIR/.next" "Next.js Build"
    clean_path "$EXPERIENCE_DIR/dist" "Dist"
    clean_path "$EXPERIENCE_DIR/out" "Out"
    clean_path "$EXPERIENCE_DIR/coverage" "Coverage"
    clean_path "$EXPERIENCE_DIR/tsconfig.tsbuildinfo" "TS Build Info"
    clean_path "$EXPERIENCE_DIR/.turbo" "Turbo Cache"

    if [ "$KEEP_ENV" = false ]; then
        clean_path "$EXPERIENCE_DIR/package-lock.json" "Package Lock"
    fi
fi

# 2. Backend (Python)
# Loop over backends, but only clean if they match the target (or if target is all/backend)
for module in versor observer listener; do
    if [[ "$TARGET_MODULE" == "all" || "$TARGET_MODULE" == "backend" || "$TARGET_MODULE" == "python" || "$TARGET_MODULE" == "$module" ]]; then
        print_info "Cleaning $module..."
        MODULE_DIR="$PROJECT_ROOT/$module"

        if [ "$KEEP_ENV" = false ]; then
            clean_path "$MODULE_DIR/venv" "$module venv"
        fi

        clean_path "$MODULE_DIR/.pytest_cache" "$module pytest cache"
        clean_path "$MODULE_DIR/.mypy_cache" "$module mypy cache"
        clean_path "$MODULE_DIR/.coverage" "$module coverage"
        clean_path "$MODULE_DIR/htmlcov" "$module coverage report"

        # Recursive clean of __pycache__
        if [ "$DRY_RUN" = true ]; then
             print_info "[DRY-RUN] Would remove all __pycache__ and *.pyc in $MODULE_DIR"
        else
             find "$MODULE_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
             find "$MODULE_DIR" -type f -name "*.pyc" -delete 2>/dev/null || true
        fi
    fi
done

# 3. Root/Infra
if [[ "$TARGET_MODULE" == "all" || "$TARGET_MODULE" == "infra" || "$TARGET_MODULE" == "root" ]]; then
    print_info "Cleaning Root & Infra..."
    clean_path "$PROJECT_ROOT/.coverage" "Root coverage"
    clean_path "$PROJECT_ROOT/htmlcov" "Root coverage report"
    clean_path "$PROJECT_ROOT/.mypy_cache" "Root mypy cache"
    clean_path "$PROJECT_ROOT/.pytest_cache" "Root pytest cache"

    # Logs and PIDs
    clean_path "$PROJECT_ROOT/infra/bin/logs" "Infra Logs"
    clean_path "$PROJECT_ROOT/infra/bin/.pids" "PID files"
fi

print_success "Cleanup complete!"
timer_end "Clean"
