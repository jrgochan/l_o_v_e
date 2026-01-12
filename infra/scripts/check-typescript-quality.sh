#!/bin/sh
# Check TypeScript/Experience module code quality
# POSIX-compliant, supports --fix flag

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

while [ $# -gt 0 ]; do
    case "$1" in
        --fix)
            FIX_MODE=1
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            print_info "Usage: $0 [--fix]"
            exit 1
            ;;
    esac
done

# Check if Experience directory exists
if [ ! -d "experience" ]; then
    print_warning "Experience module not found, skipping TypeScript checks"
    exit 0
fi

print_header "TypeScript/Experience Code Quality Check"

if [ $FIX_MODE -eq 1 ]; then
    print_info "Running in FIX mode - will auto-format code"
else
    print_info "Running in CHECK mode - use --fix to auto-format"
fi

# Track failures
total_failures=0

# === Check Node modules installed ===
if [ ! -d "experience/node_modules" ]; then
    print_warning "Node modules not installed, running npm install..."
    if run_in_module "experience" "npm install"; then
        print_success "npm install completed"
    else
        print_error "npm install failed"
        exit 1
    fi
fi

# === 1. TypeScript Compiler (Type Checking) ===
print_info "Running tsc (TypeScript compiler)..."
if run_in_module "experience" "npm run type-check 2>/dev/null || tsc --noEmit"; then
    print_success "tsc: No type errors"
else
    print_error "tsc: Type errors found"
    total_failures=$((total_failures + 1))
fi

# === 2. ESLint (Linting) ===
print_info "Running eslint (linter)..."
if [ $FIX_MODE -eq 1 ]; then
    if run_in_module "experience" "npm run lint:fix 2>/dev/null || eslint . --ext .ts,.tsx,.js,.jsx --fix"; then
        print_success "eslint: Code linted and fixed"
    else
        print_error "eslint: Linting errors remain after fix"
        total_failures=$((total_failures + 1))
    fi
else
    if run_in_module "experience" "npm run lint 2>/dev/null || eslint . --ext .ts,.tsx,.js,.jsx"; then
        print_success "eslint: No linting errors"
    else
        print_error "eslint: Linting errors found (run with --fix)"
        total_failures=$((total_failures + 1))
    fi
fi

# === 3. Prettier (Code Formatting) ===
print_info "Running prettier (formatter)..."
if [ $FIX_MODE -eq 1 ]; then
    if run_in_module "experience" "npm run format 2>/dev/null || prettier --write '**/*.{ts,tsx,js,jsx,json,md}'"; then
        print_success "prettier: Code formatted"
    else
        print_error "prettier: Formatting failed"
        total_failures=$((total_failures + 1))
    fi
else
    if run_in_module "experience" "npm run format:check 2>/dev/null || prettier --check '**/*.{ts,tsx,js,jsx,json,md}'"; then
        print_success "prettier: Code is formatted correctly"
    else
        print_error "prettier: Code needs formatting (run with --fix)"
        total_failures=$((total_failures + 1))
    fi
fi

# === 4. Package Audit (Security) ===
print_info "Running npm audit (security check)..."
if run_in_module "experience" "npm audit --audit-level=moderate 2>/dev/null"; then
    print_success "npm audit: No security vulnerabilities"
else
    print_warning "npm audit: Vulnerabilities found (run 'npm audit fix')"
    # Don't fail on audit issues - can be fixed separately
fi

# === 5. Build Test ===
print_info "Running build test..."
if run_in_module "experience" "npm run build 2>/dev/null"; then
    print_success "Build: Success"
else
    print_error "Build: Failed"
    total_failures=$((total_failures + 1))
fi

# === Summary ===
print_header "TypeScript Quality Check Summary"

if [ $total_failures -eq 0 ]; then
    print_success "All TypeScript quality checks passed!"
    exit 0
else
    print_error "TypeScript quality checks failed: $total_failures error(s)"
    print_info "\nRun with --fix to auto-format code:"
    print_info "  $ $0 --fix"
    exit 1
fi
