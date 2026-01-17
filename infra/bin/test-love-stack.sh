#!/bin/bash
# L.O.V.E. Stack - Health Check & Test Script
# Verifies all services are running and tests pass
# Safe for CI/CD and local development

# 1. Strict Mode
set -euo pipefail

# 2. Environment Setup
# Determine project root to ensure script runs from anywhere
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# Global Variables
EXIT_CODE=0
START_TIME=$(date +%s)

# Defaults
CI_MODE=false
VERBOSE=false
TARGET_MODULE="all"
SKIP_DEPS=false

# 3. Output Styling & Common Lib
# Try to source common lib, otherwise fallback to local definitions
COMMON_LIB="$PROJECT_ROOT/infra/scripts/lib/common.sh"
if [ -f "$COMMON_LIB" ]; then
    #shellcheck source=infra/scripts/lib/common.sh
    . "$COMMON_LIB"
    # Overwrite vars if common.sh doesn't handle CI/dumb terminals nicely for this specific script's needs
    # (common.sh handles tput checks, which is good)
fi

# If common.sh was sourced, ensure variables are set to avoid unbound errors in strict mode
RED=${RED:-""}
GREEN=${GREEN:-""}
YELLOW=${YELLOW:-""}
BLUE=${BLUE:-""}
BOLD=${BOLD:-""}
NC=${NC:-""}

if [[ ! -t 1 ]]; then
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    BOLD=''
    NC=''
fi

# Fallback functions if not defined
if ! command -v print_header &> /dev/null; then
    print_header() { echo -e "\n${BLUE}${BOLD}=== $1 ===${NC}"; }
fi
if ! command -v print_success &> /dev/null; then
    print_success() { echo -e "${GREEN}✓${NC} $1"; }
fi
if ! command -v print_error &> /dev/null; then
    print_error() { echo -e "${RED}✗${NC} $1" >&2; }
fi
if ! command -v print_warning &> /dev/null; then
    print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
fi
if ! command -v print_info &> /dev/null; then
    print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
fi
if ! command -v check_command &> /dev/null; then
    check_command() { command -v "$1" >/dev/null 2>&1; }
fi

# 4. Help & Argument Parsing

show_help() {
    echo -e "${BOLD}L.O.V.E. Stack Health Check & Test Script${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BOLD}DESCRIPTION${NC}"
    echo "    Runs health checks and test suites for the L.O.V.E. Stack."
    echo "    Verifies Python environments, system services, and runs integration tests."
    echo "    Designed for both local development (interactive) and CI/CD (robust/strict)."
    echo ""
    echo -e "${BOLD}USAGE${NC}"
    echo "    $0 [OPTIONS]"
    echo ""
    echo -e "${BOLD}OPTIONS${NC}"
    echo "    -h, --help            Show this help message"
    echo "    -v, --verbose         Enable verbose output"
    echo "    --ci                  Run in CI/CD mode (non-interactive, minimal output)"
    echo "    --module [name]       Run tests for specific module only (versor|observer|listener|experience)"
    echo "    --skip-deps           Skip service health checks (only run tests)"
    echo ""
    echo -e "${BOLD}EXAMPLES${NC}"
    echo "    Test everything:      $0"
    echo "    Test CI mode:         $0 --ci"
    echo "    Test Versor only:     $0 --module versor"
    echo "    Fast test run:        $0 --skip-deps"
    echo ""
    exit 0
}

# Parse Arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            show_help
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --ci)
            CI_MODE=true
            shift
            ;;
        --module)
            TARGET_MODULE="$2"
            shift 2
            ;;
        --module=*)
            TARGET_MODULE="${1#*=}"
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Auto-detect CI environment variables
if [[ "${CI:-}" == "true" ]]; then
    CI_MODE=true
fi

# Adjust output for CI
if [[ "$CI_MODE" == "true" ]]; then
    VERBOSE=true # Force verbose in CI so we see logs
    # Disable colors if common.sh didn't already
    # (Optional: some CI supports color, let common.sh decide based on TTY or env)
fi

# 5. Core Functions

# Check service health (Generic)
# usage: check_service "Name" "check_cmd"
check_service() {
    local service_name=$1
    local check_command=$2
    
    if eval "$check_command" >/dev/null 2>&1; then
        print_success "$service_name is running"
        return 0
    else
        if [[ "$CI_MODE" == "true" ]]; then
             print_error "$service_name is NOT running"
             return 1
        else
             print_warning "$service_name is not running"
             return 1
        fi
    fi
}

start_services() {
    local services=("$@")
    for service in "${services[@]}"; do
        case $service in
            "postgresql")
                print_info "Starting PostgreSQL..."
                if check_command brew; then
                    brew services start postgresql@16 || brew services start postgresql
                    sleep 2
                fi
                ;;
            "redis")
                print_info "Starting Redis..."
                if check_command brew; then
                    brew services start redis
                    sleep 1
                fi
                ;;
            "ollama")
                print_info "Starting Ollama..."
                if check_command ollama; then
                    ollama serve > /tmp/ollama.log 2>&1 &
                    sleep 3
                    # Pull model if needed
                    if ! ollama list | grep -q "llama3.1:8b-instruct"; then
                         print_info "Pulling Llama 3.1 model..."
                         ollama pull llama3.1:8b-instruct-q4_0 || true
                    fi
                fi
                ;;
        esac
    done
}

# 6. Check Suites

check_environments() {
    print_header "📦 Environment Check"
    local has_err=false

    # Python Envs
    for module in versor observer listener; do
        if [[ "$TARGET_MODULE" != "all" && "$TARGET_MODULE" != "$module" ]]; then continue; fi
        
        if [ -d "$module/venv" ]; then
            # We assume python check is fast, just check directory existence + bin
            if [ -x "$module/venv/bin/python" ]; then
                print_success "$module: venv ready"
            else
                print_error "$module: venv broken (python binary missing)"
                has_err=true
            fi
        else
            if [[ "$CI_MODE" == "true" ]]; then
                print_error "$module: venv missing"
                has_err=true
            else
                print_warning "$module: venv missing (run setup-love-stack.sh)"
                has_err=true
            fi
        fi
    done

    # Node Env
    if [[ "$TARGET_MODULE" == "all" || "$TARGET_MODULE" == "experience" ]]; then
        if [ -d "experience/web/node_modules" ]; then
            print_success "experience: node_modules ready"
        else
            print_warning "experience: node_modules missing"
            has_err=true
        fi
    fi

    if [[ "$has_err" == "true" ]] && [[ "$CI_MODE" == "true" ]]; then
        return 1
    fi
    return 0
}

check_system() {
    if [[ "$SKIP_DEPS" == "true" ]]; then return 0; fi
    print_header "🏥 System Health"
    
    local services_to_start=()
    local has_err=false
    
    # Postgres
    if ! check_service "PostgreSQL" "pg_isready"; then
        services_to_start+=("postgresql")
        has_err=true
    fi
    
    # Redis
    if check_command redis-cli; then
        if ! check_service "Redis" "redis-cli ping"; then
             services_to_start+=("redis")
             has_err=true
        fi
    fi
    
    # Ollama
    if ! check_service "Ollama" "curl -s http://localhost:11434/api/tags"; then
        services_to_start+=("ollama")
        has_err=true
    fi

    # Interactive Fix (Local only)
    if [[ "$has_err" == "true" ]] && [[ "$CI_MODE" == "false" ]] && [[ -t 0 ]]; then
        echo ""
        print_info "Some services are missing."
        printf "Would you like to start them? [y/N] "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            start_services "${services_to_start[@]}"
            # Re-check? Just proceed, individual tests will fail if start failed.
        fi
    fi

    if [[ "$has_err" == "true" ]] && [[ "$CI_MODE" == "true" ]]; then
        return 1 # In CI, missing services = fail
    fi
    return 0
}

run_pytest() {
    local module=$1
    local name=$2
    
    if [[ "$TARGET_MODULE" != "all" && "$TARGET_MODULE" != "$module" ]]; then return 0; fi
    
    print_info "Testing $name..."
    
    if [ ! -d "$module" ]; then
        print_warning "$module directory not found"
        return 0
    fi

    if (
        cd "$module"
        if [ ! -d "venv" ]; then
            print_warning "Skipping $name (no venv)"
            exit 1
        fi
        
        # Test command
        # Use -v in verbose mode, -q otherwise
        local args=("tests/" "-m" "not slow and not requires_ollama" "--tb=short")
        if [[ "$VERBOSE" == "true" ]]; then
            args+=("-v")
        else
            args+=("-q")
        fi
        
        if ./venv/bin/pytest "${args[@]}"; then
            exit 0
        else
            exit 1
        fi
    ); then
        print_success "$name tests passed"
    else
        print_error "$name tests failed"
        EXIT_CODE=1
    fi
}

run_npm_test() {
    if [[ "$TARGET_MODULE" != "all" && "$TARGET_MODULE" != "experience" ]]; then return 0; fi
    
    print_info "Testing Experience (Web)..."
    
    local npm_exit_code=0
    (
        cd "experience/web"
        if [ ! -d "node_modules" ]; then
            print_warning "Skipping Experience (no node_modules)"
            exit 1
        fi
        
        # SC2178/SC2128: Use array for arguments
        local args=("--workspaces" "--" "--passWithNoTests")
        if [[ "$VERBOSE" != "true" ]]; then
            args+=("--silent")
        fi
        
        if [[ "$VERBOSE" == "true" ]]; then
             npm test "${args[@]}"
        else
             npm test "${args[@]}" >/dev/null 2>&1
        fi
    ) || npm_exit_code=$?
    
    if [ $npm_exit_code -eq 0 ]; then
        print_success "Experience tests passed"
    else
        print_error "Experience tests failed"
        EXIT_CODE=1
    fi
}

run_all_tests() {
    print_header "🧪 Running Tests"
    
    run_pytest "versor" "Versor"
    run_pytest "observer" "Observer"
    run_pytest "listener" "Listener"
    run_npm_test
}

check_critical() {
    # Only run critical validation if testing Listener or All
    if [[ "$TARGET_MODULE" != "all" && "$TARGET_MODULE" != "listener" ]]; then return 0; fi
    
    # Check Ollama first
    if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        return 0 # Skip cleanly if Ollama down
    fi

    print_header "🎯 Critical Validation"
    
    local critical_failed=false
    (
        cd listener
        if [ -x "venv/bin/pytest" ]; then
             if ./venv/bin/pytest tests/semantic/test_connection_axis.py::TestConnectionAxis::test_pity_vs_compassion -v -s --no-cov >/dev/null 2>&1; then
                 echo -e "${GREEN}✓${NC} Connection Axis: Validated"
             else
                 echo -e "${RED}✗${NC} Connection Axis: FAILED"
                 exit 1
             fi
        fi
    ) || critical_failed=true

    if [ "$critical_failed" = true ]; then
        EXIT_CODE=1
    fi
}

generate_report() {
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    print_header "📊 Summary"
    echo "Duration: ${DURATION}s"
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}${BOLD}SUCCESS: All checks passed.${NC}"
    else
        echo -e "${RED}${BOLD}FAILURE: Some checks failed (Exit Code $EXIT_CODE).${NC}"
    fi
}

# 7. Main Flow

main() {
    # Intro
    if [[ "$CI_MODE" == "false" ]]; then
        echo -e "${BLUE}${BOLD}L.O.V.E. Stack${NC} Health & Test Runner"
    fi
    
    check_environments || EXIT_CODE=1
    check_system || EXIT_CODE=1
    
    # Only run tests if environment looks okay-ish, or just try anyway?
    # Let's try anyway, individual tests handle missing venv.
    run_all_tests
    
    check_critical
    
    generate_report
    exit $EXIT_CODE
}

main
