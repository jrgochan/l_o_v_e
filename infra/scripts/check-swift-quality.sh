#!/bin/bash
# check-swift-quality.sh
# Checks Swift code quality using swiftlint and custom complexity analysis.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"
SWIFT_ROOT="$PROJECT_ROOT/experience/desktop/native-swift"

# Load common utils if available
if [ -f "$PROJECT_ROOT/infra/scripts/lib/common.sh" ]; then
    . "$PROJECT_ROOT/infra/scripts/lib/common.sh"
else
    # Minimal Fallback
    print_header() { echo "=== $1 ==="; }
    print_info() { echo "INFO: $1"; }
    print_error() { echo "ERROR: $1"; }
    print_success() { echo "SUCCESS: $1"; }
fi

print_header "🍎 Checking Swift Quality"

# 1. Check for SwiftLint
if command -v swiftlint >/dev/null 2>&1; then
    print_info "Running SwiftLint..."
    
    # Check if .swiftlint.yml exists
    if [ ! -f "$SWIFT_ROOT/.swiftlint.yml" ]; then
        print_error "Configuration .swiftlint.yml not found in $SWIFT_ROOT"
        # Optional: Continue anyway with defaults?
    fi
    
    # Run linting
    # Allow failure if we just want to report, but stricter for CI
    # Using --strict if CI is set
    LINT_ARGS=""
    if [ "${CI-}" = "true" ]; then
        LINT_ARGS="--strict"
    fi
    
    # We change dir to valid lint root usually
    cd "$SWIFT_ROOT"
    
    if swiftlint lint $LINT_ARGS; then
        print_success "SwiftLint Passed"
    else
        print_error "SwiftLint Failed"
        # Don't exit immediately if we want to run complexity analysis too?
        # Typically lint failure is blocking.
        exit 1
    fi
else
    print_error "SwiftLint not installed. (brew install swiftlint)"
    # We don't fail hard here if user just doesn't have it, unless strict
    if [ "${CI-}" = "true" ]; then
        exit 1
    fi
fi

echo ""

# 2. Run Complexity Analysis
print_info "Running Complexity Analysis..."
PYTHON_SCRIPT="$SCRIPT_DIR/analyze-swift-complexity.py"

if [ -f "$PYTHON_SCRIPT" ]; then
    python3 "$PYTHON_SCRIPT" "$SWIFT_ROOT" --min-loc 300
else
    print_error "Complexity script not found at $PYTHON_SCRIPT"
    exit 1
fi
