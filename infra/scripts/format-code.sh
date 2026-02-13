#!/bin/bash
# Auto-format all code (Python + TypeScript)
# idempotent, safe

set -e

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/common.sh
. "$SCRIPT_DIR/lib/common.sh"

# Change to project root
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# Parse arguments
TARGET_MODULE=""

while [ $# -gt 0 ]; do
    case "$1" in
        --module=*)
            TARGET_MODULE="${1#*=}"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            print_info "Usage: $0 [--module=observer|listener|versor|experience]"
            exit 1
            ;;
    esac
done

print_header "Auto-Formatting Code"

# Activate project venv for formatting tools
print_info "Activating project venv..."
if ! activate_project_venv; then
    print_error "Project venv setup failed. Ensure uv is installed: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi
print_success "Project venv ready"

# Track failures
total_failures=0

# === Python Modules ===
if [ -z "$TARGET_MODULE" ] || [ "$TARGET_MODULE" != "experience" ]; then
    # Determine which Python modules to format
    if [ -n "$TARGET_MODULE" ] && [ "$TARGET_MODULE" != "experience" ]; then
        PY_MODULES=("$TARGET_MODULE")
    else
        PY_MODULES=(observer listener versor)
    fi

    for module in "${PY_MODULES[@]}"; do
        if [ ! -d "$module" ]; then
            print_warning "Skipping $module (directory not found)"
            continue
        fi

        print_header "Formatting $module (Python)"

        # Black
        print_info "Running black..."
        if run_in_module "$module" "black app/"; then
            print_success "black: Formatted"
        else
            print_error "black: Failed"
            total_failures=$((total_failures + 1))
        fi

        # isort
        print_info "Running isort..."
        if run_in_module "$module" "isort app/"; then
            print_success "isort: Imports sorted"
        else
            print_error "isort: Failed"
            total_failures=$((total_failures + 1))
        fi

        # autoflake (remove unused imports)
        if check_command autoflake; then
            print_info "Running autoflake..."
            if run_in_module "$module" "autoflake --in-place --remove-all-unused-imports --remove-unused-variables --recursive app/"; then
                print_success "autoflake: Cleaned up"
            fi
        fi
    done
fi

# === Experience Module (TypeScript) ===
if [ -z "$TARGET_MODULE" ] || [ "$TARGET_MODULE" = "experience" ]; then
    if [ -d "experience" ]; then
        print_header "Formatting Experience (TypeScript)"

        # Check node_modules
        if [ ! -d "experience/node_modules" ]; then
            print_warning "Node modules not installed, running npm install..."
            run_in_module "experience" "npm install"
        fi

        # Prettier
        print_info "Running prettier..."
        if run_in_module "experience" "npm run format 2>/dev/null || prettier --write '**/*.{ts,tsx,js,jsx,json,md}'"; then
            print_success "prettier: Formatted"
        else
            print_error "prettier: Failed"
            total_failures=$((total_failures + 1))
        fi

        # ESLint --fix
        print_info "Running eslint --fix..."
        if run_in_module "experience" "npm run lint:fix 2>/dev/null || eslint . --ext .ts,.tsx,.js,.jsx --fix"; then
            print_success "eslint: Fixed"
        else
            print_warning "eslint: Some issues remain"
        fi
    fi
fi

# === Summary ===
print_header "Format Summary"

if [ $total_failures -eq 0 ]; then
    print_success "All code formatted successfully!"
    print_info "\nNext steps:"
    print_info "  1. Review changes: git diff"
    print_info "  2. Run quality check: infra/scripts/check-python-quality.sh"
    print_info "  3. Run tests: infra/scripts/run-tests.sh"
    exit 0
else
    print_error "Formatting failed: $total_failures error(s)"
    exit 1
fi
