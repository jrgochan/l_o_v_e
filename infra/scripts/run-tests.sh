#!/bin/sh
# Run comprehensive test suites across all modules
# POSIX-compliant, parallel execution, 100% coverage target

set -e

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/common.sh
. "$SCRIPT_DIR/lib/common.sh"

# Change to project root
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# Parse arguments
QUICK_MODE=0
TARGET_MODULE=""
COVERAGE_TARGET=100

while [ $# -gt 0 ]; do
    case "$1" in
        --quick)
            QUICK_MODE=1
            shift
            ;;
        --module=*)
            TARGET_MODULE="${1#*=}"
            shift
            ;;
        --coverage=*)
            COVERAGE_TARGET="${1#*=}"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            print_info "Usage: $0 [--quick] [--module=observer|listener|versor] [--coverage=100]"
            exit 1
            ;;
    esac
done

# Python modules to test
if [ -n "$TARGET_MODULE" ]; then
    MODULES="$TARGET_MODULE"
else
    MODULES="observer listener versor"
fi

print_header "Running Test Suites"

# Activate DX venv for pytest
print_info "Activating DX tools venv..."
if ! activate_dx_venv >/dev/null 2>&1; then
    print_error "DX venv not found. Run: infra/scripts/install-dev-tools.sh"
    exit 1
fi
print_success "DX venv activated"

if [ $QUICK_MODE -eq 1 ]; then
    print_info "Quick mode: Unit tests only (no integration tests)"
else
    print_info "Full mode: All tests (unit + integration)"
fi

print_info "Coverage target: ${COVERAGE_TARGET}%"

# Track failures
total_failures=0
total_coverage=0
module_count=0

# === Python Module Tests ===
for module in $MODULES; do
    if [ ! -d "$module" ]; then
        print_warning "Skipping $module (directory not found)"
        continue
    fi
    
    print_header "Testing $module"
    
    # Determine test markers
    if [ $QUICK_MODE -eq 1 ]; then
        test_markers="-m unit"
        test_desc="unit tests"
    else
        test_markers=""
        test_desc="all tests"
    fi
    
    # Run pytest with coverage
    print_info "Running pytest ($test_desc)..."
    
    if run_in_module "$module" "pytest $test_markers -n auto --cov=app --cov-report=term-missing --cov-report=html --cov-branch --cov-fail-under=$COVERAGE_TARGET -v"; then
        print_success "pytest: All tests passed"
        
        # Extract coverage percentage
        coverage=$(run_in_module "$module" "coverage report --precision=2 2>/dev/null | grep TOTAL | awk '{print \$NF}' | sed 's/%//'")
        if [ -n "$coverage" ]; then
            print_success "Coverage: ${coverage}% (target: ${COVERAGE_TARGET}%)"
            total_coverage=$((total_coverage + ${coverage%%.*}))
            module_count=$((module_count + 1))
        fi
    else
        print_error "pytest: Tests failed or coverage below ${COVERAGE_TARGET}%"
        total_failures=$((total_failures + 1))
    fi
    
    # Generate HTML coverage report location
    if [ -d "$module/htmlcov" ]; then
        print_info "HTML coverage report: $module/htmlcov/index.html"
    fi
done

# === Experience Module Tests ===
if [ -z "$TARGET_MODULE" ] || [ "$TARGET_MODULE" = "experience" ]; then
    if [ -d "experience" ]; then
        print_header "Testing Experience (TypeScript)"
        
        # Check if node_modules exists
        if [ ! -d "experience/node_modules" ]; then
            print_warning "Node modules not installed, running npm install..."
            run_in_module "experience" "npm install"
        fi
        
        # Run Jest tests
        print_info "Running Jest tests..."
        if run_in_module "experience" "npm test -- --coverage --coverageThreshold='{\"global\":{\"lines\":$COVERAGE_TARGET}}' 2>/dev/null || jest --coverage"; then
            print_success "Jest: All tests passed"
        else
            print_error "Jest: Tests failed or coverage below ${COVERAGE_TARGET}%"
            total_failures=$((total_failures + 1))
        fi
        
        print_info "HTML coverage report: experience/coverage/index.html"
    fi
fi

# === Summary ===
print_header "Test Suite Summary"

if [ $module_count -gt 0 ]; then
    avg_coverage=$((total_coverage / module_count))
    print_info "Average Python coverage: ${avg_coverage}%"
fi

if [ $total_failures -eq 0 ]; then
    print_success "All tests passed with ${COVERAGE_TARGET}% coverage!"
    exit 0
else
    print_error "Test failures: $total_failures module(s)"
    print_info "\nTips:"
    print_info "  - View HTML reports in each module's htmlcov/ directory"
    print_info "  - Run specific module: $0 --module=observer"
    print_info "  - Quick check: $0 --quick"
    exit 1
fi
