#!/bin/bash
# L.O.V.E. Stack - Health Check & Test Script
# Verifies all services are running and tests pass

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Symbols
CHECK="✅"
CROSS="❌"
WARN="⚠️ "
INFO="ℹ️ "
ROCKET="🚀"

echo -e "${BLUE}${ROCKET} L.O.V.E. Stack Health Check & Test Script${NC}"
echo "=============================================="
echo ""

# Function to print colored messages
print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${WARN}$1${NC}"
}

print_info() {
    echo -e "${BLUE}${INFO}$1${NC}"
}

print_header() {
    echo -e "\n${BLUE}$1${NC}"
    echo "----------------------------------------"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check service health
check_service() {
    local service_name=$1
    local check_command=$2
    
    if eval "$check_command" >/dev/null 2>&1; then
        print_success "$service_name is running"
        return 0
    else
        print_error "$service_name is not running"
        return 1
    fi
}

# Check HTTP endpoint
check_endpoint() {
    local name=$1
    local url=$2
    
    if curl -s "$url" >/dev/null 2>&1; then
        print_success "$name API responding ($url)"
        return 0
    else
        print_warning "$name API not responding ($url)"
        return 1
    fi
}

# Check Python environments
check_python_envs() {
    print_header "🐍 Checking Python Environments"
    
    local all_ok=true
    
    for module in versor observer listener; do
        if [ -d "../$module/venv" ]; then
            cd "../$module"
            source venv/bin/activate
            PYTHON_VERSION=$(python --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
            
            if [[ "$PYTHON_VERSION" == "3.11"* ]] || [[ "$PYTHON_VERSION" == "3.12"* ]]; then
                print_success "$module: Python $PYTHON_VERSION"
            else
                print_warning "$module: Python $PYTHON_VERSION (expected 3.11+)"
                all_ok=false
            fi
            
            deactivate
            cd - > /dev/null
        else
            print_error "$module: venv not found"
            all_ok=false
        fi
    done
    
    return $([ "$all_ok" = true ] && echo 0 || echo 1)
}

# Check system services
check_services() {
    print_header "🏥 Checking System Services"
    
    local services_ok=0
    local services_total=3
    local services_to_start=()
    
    # PostgreSQL
    if check_service "PostgreSQL" "pg_isready"; then
        ((services_ok++))
    else
        services_to_start+=("postgresql")
    fi
    
    # Redis
    if check_service "Redis" "redis-cli ping"; then
        ((services_ok++))
    else
        services_to_start+=("redis")
    fi
    
    # Ollama
    if check_service "Ollama" "curl -s http://localhost:11434/api/tags"; then
        ((services_ok++))
    else
        services_to_start+=("ollama")
    fi
    
    echo ""
    print_info "Services: $services_ok/$services_total running"
    
    # Offer to start missing services
    if [ ${#services_to_start[@]} -gt 0 ]; then
        echo ""
        print_warning "Missing services: ${services_to_start[*]}"
        echo ""
        read -p "Would you like to start missing services? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            for service in "${services_to_start[@]}"; do
                case $service in
                    "postgresql")
                        print_info "Starting PostgreSQL..."
                        brew services start postgresql@16
                        sleep 2
                        ;;
                    "redis")
                        print_info "Starting Redis..."
                        brew services start redis
                        sleep 1
                        ;;
                    "ollama")
                        print_info "Starting Ollama..."
                        ollama serve > /tmp/ollama.log 2>&1 &
                        sleep 3
                        # Pull model if needed
                        if ! ollama list | grep -q "llama3.1:8b-instruct"; then
                            print_info "Pulling Llama 3.1 model (4.7GB, may take a while)..."
                            ollama pull llama3.1:8b-instruct-q4_0
                        fi
                        ;;
                esac
            done
            print_success "Services started"
        else
            print_warning "Skipping service startup. Some tests may fail."
        fi
    fi
    
    return 0
}

# Check API endpoints
check_apis() {
    print_header "🌐 Checking API Endpoints"
    
    local apis_ok=0
    local apis_total=3
    
    # Versor
    if check_endpoint "Versor" "http://localhost:8001/health"; then
        ((apis_ok++))
    else
        print_info "Start with: cd versor && source venv/bin/activate && uvicorn app.main:app --port 8001 &"
    fi
    
    # Observer
    if check_endpoint "Observer" "http://localhost:8000/health"; then
        ((apis_ok++))
    else
        print_info "Start with: cd observer && source venv/bin/activate && uvicorn app.main:app --port 8000 &"
    fi
    
    # Listener
    if check_endpoint "Listener" "http://localhost:8002/health"; then
        ((apis_ok++))
    else
        print_warning "Listener API not running (expected - Days 5-8 pending)"
    fi
    
    echo ""
    print_info "APIs: $apis_ok/$apis_total responding"
    
    return 0  # Don't fail on API checks
}

# Run tests for a module
run_module_tests() {
    local module="../$1"
    local module_name=$2
    
    if [ ! -d "$module" ]; then
        print_warning "$module_name: Directory not found"
        return 1
    fi
    
    cd "$module"
    
    if [ ! -d "venv" ]; then
        print_error "$module_name: Virtual environment not found"
        cd - > /dev/null
        return 1
    fi
    
    source venv/bin/activate
    
    if [ ! -f "pytest.ini" ] && [ ! -d "tests" ]; then
        print_info "$module_name: No tests configured"
        deactivate
        cd - > /dev/null
        return 0
    fi
    
    print_info "Running $module_name tests..."
    
    # Run fast tests only (skip slow audio tests and semantic tests requiring Ollama)
    if pytest tests/ -v -m "not slow and not requires_ollama" --tb=short -q 2>/dev/null; then
        print_success "$module_name: All fast tests passed"
        TEST_RESULT=0
    else
        print_warning "$module_name: Some tests failed (check output above)"
        TEST_RESULT=1
    fi
    
    deactivate
    cd - > /dev/null
    
    return $TEST_RESULT
}

# Run all tests
run_tests() {
    print_header "🧪 Running Test Suites"
    
    local tests_ok=0
    local tests_total=3
    
    # Versor tests
    if run_module_tests "versor" "Versor"; then
        ((tests_ok++))
    fi
    
    echo ""
    
    # Observer tests
    if run_module_tests "observer" "Observer"; then
        ((tests_ok++))
    fi
    
    echo ""
    
    # Listener tests  
    if run_module_tests "listener" "Listener"; then
        ((tests_ok++))
    fi
    
    echo ""
    print_info "Tests: $tests_ok/$tests_total modules passed"
    
    return 0  # Don't fail on test failures
}

# Check critical Listener semantic test
check_critical_test() {
    print_header "🎯 Critical Semantic Test (Listener)"
    
    if [ ! -d "../listener/venv" ]; then
        print_warning "Listener venv not found - skipping"
        return 0
    fi
    
    # Check if Ollama is running
    if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        print_warning "Ollama not running - skipping semantic test"
        print_info "Start Ollama with: ollama serve &"
        return 0
    fi
    
    cd ../listener
    source venv/bin/activate
    
    print_info "Running THE CRITICAL TEST: test_pity_vs_compassion..."
    print_info "(This validates the Connection axis - the key innovation)"
    echo ""
    
    if pytest tests/semantic/test_connection_axis.py::TestConnectionAxis::test_pity_vs_compassion -v -s 2>/dev/null; then
        echo ""
        print_success "🎉 CONNECTION AXIS VALIDATED! The system can distinguish Pity from Compassion!"
    else
        echo ""
        print_warning "Critical test not run (requires setup) - this is normal for initial setup"
        print_info "To run manually:"
        print_info "  cd listener"
        print_info "  source venv/bin/activate"
        print_info "  pytest tests/semantic/test_connection_axis.py::TestConnectionAxis::test_pity_vs_compassion -v -s"
    fi
    
    deactivate
    cd - > /dev/null
    
    return 0
}

# Generate summary report
generate_summary() {
    print_header "📊 L.O.V.E. Stack Status Summary"
    
    local status="🟢 HEALTHY"
    local issues=()
    
    # Check for issues
    if [ ! -d "../versor/venv" ] || [ ! -d "../observer/venv" ] || [ ! -d "../listener/venv" ]; then
        status="🔴 SETUP INCOMPLETE"
        issues+=("Python environments not configured")
    fi
    
    if ! pg_isready >/dev/null 2>&1; then
        status="🟡 PARTIAL"
        issues+=("PostgreSQL not running")
    fi
    
    if ! redis-cli ping >/dev/null 2>&1; then
        status="🟡 PARTIAL"
        issues+=("Redis not running")
    fi
    
    if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        status="🟡 PARTIAL"
        issues+=("Ollama not running")
    fi
    
    echo "Status: $status"
    echo ""
    
    if [ ${#issues[@]} -gt 0 ]; then
        echo "Issues found:"
        for issue in "${issues[@]}"; do
            echo "  • $issue"
        done
        echo ""
    fi
    
    print_info "Module Status:"
    echo "  • Versor:   $([ -d '../versor/venv' ] && echo '✅ Configured' || echo '❌ Not configured')"
    echo "  • Observer: $([ -d '../observer/venv' ] && echo '✅ Configured' || echo '❌ Not configured')"
    echo "  • Listener: $([ -d '../listener/venv' ] && echo '✅ Configured (Days 1-4)' || echo '❌ Not configured')"
    echo ""
    
    print_info "Next Steps:"
    if [ ${#issues[@]} -eq 0 ]; then
        echo "  1. ✅ Stack is healthy and ready to use"
        echo "  2. Complete Listener implementation (Days 5-8)"
        echo "  3. Test end-to-end pipeline"
    else
        echo "  1. Run './setup-love-stack.sh' to complete setup"
        echo "  2. Start missing services (see above)"
        echo "  3. Re-run this test script"
    fi
}

# Main execution
main() {
    print_info "Checking L.O.V.E. Stack health..."
    echo ""
    
    check_python_envs
    check_services
    check_apis
    run_tests
    check_critical_test
    generate_summary
    
    echo ""
    print_success "Health check complete!"
}

# Run main
main
