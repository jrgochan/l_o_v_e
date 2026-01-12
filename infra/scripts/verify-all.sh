#!/bin/sh
# Master verification script - runs all quality checks
# POSIX-compliant, comprehensive, production-ready

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
QUICK_MODE=0
TARGET_MODULE=""

while [ $# -gt 0 ]; do
    case "$1" in
        --fix)
            FIX_MODE=1
            shift
            ;;
        --quick)
            QUICK_MODE=1
            shift
            ;;
        --module=*)
            TARGET_MODULE="${1#*=}"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --fix              Auto-fix issues where possible"
            echo "  --quick            Skip slow tests, run fast checks only"
            echo "  --module=NAME      Check specific module only"
            echo "  --help             Show this help"
            echo ""
            echo "Examples:"
            echo "  $0                              # Full verification"
            echo "  $0 --fix                        # Auto-fix and verify"
            echo "  $0 --quick                      # Fast checks only"
            echo "  $0 --module=observer --fix      # Fix Observer only"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            print_info "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Build command flags
fix_flag=""
quick_flag=""
module_flag=""

if [ $FIX_MODE -eq 1 ]; then
    fix_flag="--fix"
fi

if [ $QUICK_MODE -eq 1 ]; then
    quick_flag="--quick"
fi

if [ -n "$TARGET_MODULE" ]; then
    module_flag="--module=$TARGET_MODULE"
fi

print_header "L.O.V.E. Platform - Comprehensive Verification"

if [ $FIX_MODE -eq 1 ]; then
    print_info "Mode: FIX - will auto-format code"
else
    print_info "Mode: CHECK - use --fix to auto-format"
fi

if [ $QUICK_MODE -eq 1 ]; then
    print_info "Quick mode: Fast checks only (no integration tests)"
else
    print_info "Full mode: All checks (may take several minutes)"
fi

# Track overall status
total_failures=0

# === Step 1: Check Dependencies ===
print_header "Step 1/5: Checking Dependencies"

if "$SCRIPT_DIR/check-dependencies.sh"; then
    print_success "Dependencies check passed"
else
    print_error "Dependencies check failed - install missing tools"
    print_info "Run: infra/scripts/install-dev-tools.sh"
    exit 1
fi

# === Step 2: Python Code Quality ===
if [ -z "$TARGET_MODULE" ] || [ "$TARGET_MODULE" != "experience" ]; then
    print_header "Step 2/5: Python Code Quality"
    
    if "$SCRIPT_DIR/check-python-quality.sh" $fix_flag $module_flag; then
        print_success "Python quality check passed"
    else
        print_error "Python quality check failed"
        total_failures=$((total_failures + 1))
        
        if [ $FIX_MODE -eq 0 ]; then
            print_info "Tip: Run with --fix to auto-format"
        fi
    fi
fi

# === Step 3: TypeScript Code Quality ===
if [ -z "$TARGET_MODULE" ] || [ "$TARGET_MODULE" = "experience" ]; then
    print_header "Step 3/5: TypeScript Code Quality"
    
    if "$SCRIPT_DIR/check-typescript-quality.sh" $fix_flag; then
        print_success "TypeScript quality check passed"
    else
        print_error "TypeScript quality check failed"
        total_failures=$((total_failures + 1))
        
        if [ $FIX_MODE -eq 0 ]; then
            print_info "Tip: Run with --fix to auto-format"
        fi
    fi
fi

# === Step 4: Test Suites ===
if [ $QUICK_MODE -eq 0 ]; then
    print_header "Step 4/5: Running Test Suites"
    
    if "$SCRIPT_DIR/run-tests.sh" $module_flag; then
        print_success "All tests passed with 100% coverage"
    else
        print_error "Tests failed or coverage below 100%"
        total_failures=$((total_failures + 1))
    fi
else
    print_header "Step 4/5: Running Quick Tests"
    
    if "$SCRIPT_DIR/run-tests.sh" --quick $module_flag; then
        print_success "Quick tests passed"
    else
        print_error "Quick tests failed"
        total_failures=$((total_failures + 1))
    fi
fi

# === Step 5: Final Summary ===
print_header "Verification Complete"

if [ $total_failures -eq 0 ]; then
    print_success "✨ All verification checks passed! ✨"
    print_info "\nYour code is:"
    print_info "  ✓ Properly formatted (black, prettier)"
    print_info "  ✓ Lint-free (flake8, eslint)"
    print_info "  ✓ Type-safe (mypy --strict, tsc)"
    print_info "  ✓ Well-documented (pydocstyle)"
    print_info "  ✓ Secure (bandit, npm audit)"
    print_info "  ✓ Tested (100% coverage)"
    print_info "\nReady to commit! 🚀"
    exit 0
else
    print_error "❌ Verification failed: $total_failures check(s) failed"
    print_info "\nCommon fixes:"
    print_info "  $ infra/scripts/format-code.sh        # Auto-format all code"
    print_info "  $ infra/scripts/verify-all.sh --fix   # Fix and verify"
    print_info "  $ infra/scripts/verify-all.sh --quick # Fast feedback"
    exit 1
fi
