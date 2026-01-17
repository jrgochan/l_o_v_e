#!/bin/bash
# Check Python code quality across all modules
# POSIX-compliant, supports --fix flag, mypy --strict

set -e

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/common.sh
. "$SCRIPT_DIR/lib/common.sh"

# Change to project root
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# Parse arguments
FIX_MODE=0
TARGET_MODULE=""

while [ $# -gt 0 ]; do
    case "$1" in
        --fix)
            FIX_MODE=1
            shift
            ;;
        --module=*)
            TARGET_MODULE="${1#*=}"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            print_info "Usage: $0 [--fix] [--module=observer|listener|versor]"
            exit 1
            ;;
    esac
done

# Python modules to check
if [ -n "$TARGET_MODULE" ]; then
    MODULES=("$TARGET_MODULE")
else
    MODULES=(observer listener versor)
fi

print_header "Python Code Quality Check"

# Activate DX venv to use quality tools
print_info "Activating DX tools venv..."
if ! activate_dx_venv >/dev/null 2>&1; then
    print_error "DX venv not found. Run: infra/scripts/install-dev-tools.sh"
    exit 1
fi
print_success "DX venv activated"

if [ $FIX_MODE -eq 1 ]; then
    print_info "Running in FIX mode - will auto-format code"
else
    print_info "Running in CHECK mode - use --fix to auto-format"
fi

# Track failures
total_failures=0

# === Check each module ===
for module in "${MODULES[@]}"; do
    if [ ! -d "$module" ]; then
        print_warning "Skipping $module (directory not found)"
        continue
    fi
    
    print_header "Checking $module"
    
    # === 1. Black (Code Formatting) ===
    print_info "Running black (code formatter)..."
    if [ $FIX_MODE -eq 1 ]; then
        if run_in_module "$module" "black app/"; then
            print_success "black: Code formatted"
        else
            print_error "black: Formatting failed"
            total_failures=$((total_failures + 1))
        fi
    else
        if run_in_module "$module" "black --check app/"; then
            print_success "black: Code is formatted correctly"
        else
            print_error "black: Code needs formatting (run with --fix)"
            total_failures=$((total_failures + 1))
        fi
    fi
    
    # === 2. isort (Import Sorting) ===
    print_info "Running isort (import sorter)..."
    if [ $FIX_MODE -eq 1 ]; then
        if run_in_module "$module" "isort app/"; then
            print_success "isort: Imports sorted"
        else
            print_error "isort: Sorting failed"
            total_failures=$((total_failures + 1))
        fi
    else
        if run_in_module "$module" "isort --check app/"; then
            print_success "isort: Imports are sorted correctly"
        else
            print_error "isort: Imports need sorting (run with --fix)"
            total_failures=$((total_failures + 1))
        fi
    fi
    
    # === 3. flake8 (Linting) ===
    print_info "Running flake8 (linter)..."
    if run_in_module "$module" "flake8 app/ --max-line-length=100 --max-complexity=15 --exclude=migrations,__pycache__"; then
        print_success "flake8: No linting errors"
    else
        print_error "flake8: Linting errors found"
        total_failures=$((total_failures + 1))
    fi
    
    # === 4. pylint (Additional Quality) ===
    print_info "Running pylint (additional linter)..."
    if run_in_module "$module" "pylint app/ --disable=C0111,R0903,R0913 --max-line-length=100 --fail-under=8.0 2>/dev/null"; then
        print_success "pylint: Quality score acceptable"
    else
        print_warning "pylint: Quality score below threshold (non-blocking)"
        # Don't increment failures - pylint is advisory
    fi
    
    # === 5. mypy (Type Checking) - STRICT MODE ===
    print_info "Running mypy (type checker) in STRICT mode..."
    if run_in_module "$module" "mypy app/ --strict --ignore-missing-imports --no-error-summary 2>/dev/null"; then
        print_success "mypy: All type checks passed"
    else
        print_error "mypy: Type errors found (strict mode)"
        total_failures=$((total_failures + 1))
    fi
    
    # === 6. pydocstyle (Docstring Standards) ===
    print_info "Running pydocstyle (docstring checker)..."
    if run_in_module "$module" "pydocstyle app/ --convention=google 2>/dev/null"; then
        print_success "pydocstyle: Docstrings comply with Google style"
    else
        print_error "pydocstyle: Docstring violations found"
        total_failures=$((total_failures + 1))
    fi
    
    # === 7. bandit (Security) ===
    print_info "Running bandit (security scanner)..."
    if run_in_module "$module" "bandit -r app/ -ll -q 2>/dev/null"; then
        print_success "bandit: No security issues found"
    else
        print_error "bandit: Security issues detected"
        total_failures=$((total_failures + 1))
    fi
    
    # === 8. radon (Complexity) ===
    print_info "Running radon (complexity analyzer)..."
    if run_in_module "$module" "radon cc app/ -a -nb 2>/dev/null"; then
        print_success "radon: Complexity within acceptable limits"
    else
        print_warning "radon: High complexity detected (review recommended)"
        # Don't increment failures - complexity is advisory
    fi
    
done

# === Summary ===
print_header "Python Quality Check Summary"

if [ $total_failures -eq 0 ]; then
    print_success "All Python quality checks passed!"
    exit 0
else
    print_error "Python quality checks failed: $total_failures error(s)"
    print_info "\nRun with --fix to auto-format code:"
    print_info "  $ $0 --fix"
    exit 1
fi
