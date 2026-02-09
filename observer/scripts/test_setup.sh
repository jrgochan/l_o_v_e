#!/bin/bash

###############################################################################
# Observer Module - Automated Setup & Testing Script
###############################################################################
#
# This script automates the complete setup and testing process for both
# the Versor and Observer modules.
#
# Usage:
#   chmod +x scripts/test_setup.sh
#   ./scripts/test_setup.sh
#
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base paths
BASE_DIR="/Users/jrgochan/code/gitlab.com/l_o_v_e"
VERSOR_DIR="$BASE_DIR/versor"
OBSERVER_DIR="$BASE_DIR/observer"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "\n${BLUE}============================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================${NC}\n"
}

print_step() {
    echo -e "${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is available"
        return 0
    else
        print_error "$1 is not available"
        return 1
    fi
}

wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0

    print_step "Waiting for $service_name to be ready..."

    while [ $attempt -lt $max_attempts ]; do
        if curl -s $url > /dev/null 2>&1; then
            print_success "$service_name is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
        echo -n "."
    done

    echo ""
    print_error "$service_name failed to start after $max_attempts seconds"
    return 1
}

###############################################################################
# Phase 1: Environment Verification
###############################################################################

test_environment() {
    print_header "PHASE 1: Environment Verification"

    print_step "Checking required tools..."
    check_command python3 || check_command python3.11 || return 1
    check_command pip || echo "pip will be available after venv activation"
    check_command podman || check_command docker || {
        print_error "Neither podman nor docker found"
        return 1
    }
    check_command curl
    check_command psql || print_info "psql not required (can use podman exec)"

    print_step "Checking directory structure..."
    if [ -d "$VERSOR_DIR" ]; then
        print_success "Versor directory exists"
    else
        print_error "Versor directory not found at $VERSOR_DIR"
        return 1
    fi

    if [ -d "$OBSERVER_DIR" ]; then
        print_success "Observer directory exists"
    else
        print_error "Observer directory not found at $OBSERVER_DIR"
        return 1
    fi
}

###############################################################################
# Phase 2: PostgreSQL Setup
###############################################################################

test_postgres() {
    print_header "PHASE 2: PostgreSQL Setup"

    cd "$OBSERVER_DIR"

    print_step "Starting PostgreSQL container..."
    podman-compose up -d postgres || {
        print_error "Failed to start PostgreSQL"
        return 1
    }

    sleep 5  # Give container time to initialize

    print_step "Verifying PostgreSQL is running..."
    if podman ps | grep -q observer_postgres; then
        print_success "PostgreSQL container is running"
    else
        print_error "PostgreSQL container is not running"
        return 1
    fi

    print_step "Testing database connection..."
    if podman exec observer_postgres psql -U love_user -d love_db -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed"
        return 1
    fi

    print_step "Checking pgvector extension..."
    if podman exec observer_postgres psql -U love_user -d love_db -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';" | grep -q "0\."; then
        print_success "pgvector extension is installed"
    else
        print_info "pgvector extension not found, installing..."
        podman exec observer_postgres psql -U love_user -d love_db -c "CREATE EXTENSION IF NOT EXISTS vector;" || {
            print_error "Failed to install pgvector extension"
            return 1
        }
        print_success "pgvector extension installed"
    fi
}

###############################################################################
# Phase 3: Versor Module Setup
###############################################################################

test_versor_setup() {
    print_header "PHASE 3: Versor Module Setup"

    cd "$VERSOR_DIR"

    print_step "Checking Versor venv..."
    if [ -d "venv" ]; then
        print_success "Versor venv exists"
    else
        print_info "Versor venv not found, creating..."
        python3 -m venv venv || python3.11 -m venv venv || {
            print_error "Failed to create Versor venv"
            return 1
        }
        print_success "Versor venv created"
    fi

    print_step "Activating Versor venv and checking dependencies..."
    source venv/bin/activate

    if pip show fastapi > /dev/null 2>&1; then
        print_success "Versor dependencies already installed"
    else
        print_info "Installing Versor dependencies..."
        pip install -q --upgrade pip
        pip install -q -r requirements.txt || {
            print_error "Failed to install Versor dependencies"
            return 1
        }
        print_success "Versor dependencies installed"

        # Install dev dependencies
        if [ -f "requirements-dev.txt" ]; then
            pip install -q -r requirements-dev.txt || {
                print_error "Failed to install Versor dev dependencies"
                return 1
            }
            print_success "Versor dev dependencies installed"
        fi
    fi

    print_step "Starting Versor API in background..."
    nohup uvicorn app.main:app --port 8001 > /tmp/versor.log 2>&1 &
    VERSOR_PID=$!
    echo $VERSOR_PID > /tmp/versor.pid

    wait_for_service "http://localhost:8001/health" "Versor API" || {
        print_error "Versor API failed to start"
        cat /tmp/versor.log
        return 1
    }

    print_step "Testing Versor health endpoint..."
    VERSOR_HEALTH=$(curl -s http://localhost:8001/health)
    if echo "$VERSOR_HEALTH" | grep -q "healthy"; then
        print_success "Versor health check passed"
        print_info "Response: $VERSOR_HEALTH"
    else
        print_error "Versor health check failed"
        return 1
    fi

    print_step "Testing Versor calculate endpoint..."
    CALC_RESULT=$(curl -s -X POST http://localhost:8001/versor/calculate \
        -H "Content-Type: application/json" \
        -d '{"current_vac": {"valence": 0.9, "arousal": 0.7, "connection": 0.8}, "time_delta_seconds": 1.0}')

    if echo "$CALC_RESULT" | grep -q "current_state"; then
        print_success "Versor calculate endpoint works"
        print_info "Sample calculation successful"
    else
        print_error "Versor calculate endpoint failed"
        print_info "Response: $CALC_RESULT"
        return 1
    fi

    deactivate
}

###############################################################################
# Phase 4: Observer Module Setup
###############################################################################

test_observer_setup() {
    print_header "PHASE 4: Observer Module Setup"

    cd "$OBSERVER_DIR"

    print_step "Checking Observer venv..."
    if [ -d "venv" ]; then
        print_success "Observer venv exists"
    else
        print_info "Observer venv not found, creating..."
        python3 -m venv venv || python3.11 -m venv venv || {
            print_error "Failed to create Observer venv"
            return 1
        }
        print_success "Observer venv created"
    fi

    print_step "Activating Observer venv..."
    source venv/bin/activate

    print_step "Checking/installing dependencies..."
    if pip show fastapi > /dev/null 2>&1; then
        print_success "Observer dependencies already installed"
    else
        print_info "Installing Observer dependencies (this may take a few minutes)..."
        pip install -q --upgrade pip
        pip install -q -r requirements.txt || {
            print_error "Failed to install Observer dependencies"
            return 1
        }
        print_success "Observer dependencies installed"

        # Install dev dependencies
        if [ -f "requirements-dev.txt" ]; then
            pip install -q -r requirements-dev.txt || {
                print_error "Failed to install Observer dev dependencies"
                return 1
            }
            print_success "Observer dev dependencies installed"
        fi
    fi

    print_step "Checking environment configuration..."
    if [ -f ".env" ]; then
        print_success ".env file exists"
    else
        print_info "Creating .env from template..."
        cp .env.example .env
        print_success ".env file created"
    fi

    print_step "Running database migrations..."
    if [ -z "$(ls -A migrations/versions 2>/dev/null)" ]; then
        print_info "Generating initial migration..."
        alembic revision --autogenerate -m "Initial schema with pgvector" || {
            print_error "Failed to generate migration"
            return 1
        }
        print_success "Migration generated"
    else
        print_success "Migrations already exist"
    fi

    print_step "Applying migrations..."
    alembic upgrade head || {
        print_error "Failed to apply migrations"
        return 1
    }
    print_success "Migrations applied"

    print_step "Verifying database schema..."
    TABLE_COUNT=$(podman exec observer_postgres psql -U love_user -d love_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('atlas_definitions', 'user_trajectory');" | tr -d ' ')

    if [ "$TABLE_COUNT" -eq "2" ]; then
        print_success "Database tables created successfully"
    else
        print_error "Database tables not found (expected 2, found $TABLE_COUNT)"
        return 1
    fi

    deactivate
}

###############################################################################
# Phase 5: Atlas Seeding
###############################################################################

test_atlas_seeding() {
    print_header "PHASE 5: Atlas Seeding"

    cd "$OBSERVER_DIR"
    source venv/bin/activate

    print_step "Checking if Atlas is already seeded..."
    EMOTION_COUNT=$(podman exec observer_postgres psql -U love_user -d love_db -t -c "SELECT COUNT(*) FROM atlas_definitions;" 2>/dev/null | tr -d ' ' || echo "0")

    if [ "$EMOTION_COUNT" -gt "0" ]; then
        print_success "Atlas already contains $EMOTION_COUNT emotions"
    else
        print_info "Seeding Atlas (this will take a few minutes)..."
        echo "yes" | python scripts/seed_atlas.py || {
            print_error "Atlas seeding failed"
            return 1
        }

        EMOTION_COUNT=$(podman exec observer_postgres psql -U love_user -d love_db -t -c "SELECT COUNT(*) FROM atlas_definitions;" | tr -d ' ')
        print_success "Atlas seeded with $EMOTION_COUNT emotions"
    fi

    print_step "Verifying Atlas data..."
    if [ "$EMOTION_COUNT" -eq "87" ]; then
        print_success "Atlas contains all 87 emotions from Atlas of the Heart"
    elif [ "$EMOTION_COUNT" -ge "50" ]; then
        print_success "Atlas contains $EMOTION_COUNT emotions (partial)"
    else
        print_error "Atlas contains too few emotions ($EMOTION_COUNT)"
        return 1
    fi

    print_step "Checking for critical emotions..."
    for emotion in "Joy" "Shame" "Compassion" "Pity" "Grief"; do
        if podman exec observer_postgres psql -U love_user -d love_db -t -c "SELECT emotion_name FROM atlas_definitions WHERE emotion_name = '$emotion';" | grep -q "$emotion"; then
            print_success "Found: $emotion"
        else
            print_error "Missing: $emotion"
        fi
    done

    deactivate
}

###############################################################################
# Phase 6: Observer API Testing
###############################################################################

test_observer_api() {
    print_header "PHASE 6: Observer API Testing"

    cd "$OBSERVER_DIR"
    source venv/bin/activate

    print_step "Starting Observer API in background..."
    nohup uvicorn app.main:app --port 8000 > /tmp/observer.log 2>&1 &
    OBSERVER_PID=$!
    echo $OBSERVER_PID > /tmp/observer.pid

    wait_for_service "http://localhost:8000/health" "Observer API" || {
        print_error "Observer API failed to start"
        cat /tmp/observer.log
        return 1
    }

    print_step "Testing Observer health endpoint..."
    OBSERVER_HEALTH=$(curl -s http://localhost:8000/health)

    if echo "$OBSERVER_HEALTH" | grep -q "healthy"; then
        print_success "Observer health check passed"
    else
        print_error "Observer health check failed"
        print_info "Response: $OBSERVER_HEALTH"
        return 1
    fi

    print_step "Checking Atlas count in health response..."
    EMOTION_COUNT_API=$(echo "$OBSERVER_HEALTH" | grep -o '"atlas_emotions_count":[0-9]*' | grep -o '[0-9]*')
    if [ "$EMOTION_COUNT_API" -ge "50" ]; then
        print_success "Health endpoint reports $EMOTION_COUNT_API emotions"
    else
        print_error "Health endpoint reports only $EMOTION_COUNT_API emotions"
    fi

    print_step "Testing Observer state recording endpoint..."
    STATE_RESULT=$(curl -s -X POST http://localhost:8000/observer/state \
        -H "Content-Type: application/json" \
        -d '{
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "session_id": "789e0123-e89b-12d3-a456-426614174001",
            "input_text": "I feel amazing today, everything is clicking!",
            "vac_scalars": {"valence": 0.9, "arousal": 0.7, "connection": 0.8}
        }')

    if echo "$STATE_RESULT" | grep -q "state_id"; then
        print_success "State recording endpoint works"
        DETECTED_EMOTION=$(echo "$STATE_RESULT" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
        print_info "Detected emotion: $DETECTED_EMOTION"
    else
        print_error "State recording endpoint failed"
        print_info "Response: $STATE_RESULT"
    fi

    print_step "Testing API documentation..."
    if curl -s http://localhost:8000/docs | grep -q "swagger"; then
        print_success "Swagger documentation accessible"
    else
        print_error "Swagger documentation not accessible"
    fi

    deactivate
}

###############################################################################
# Phase 7: Integration Tests
###############################################################################

test_integration() {
    print_header "PHASE 7: Integration Tests"

    print_step "Testing Compassion vs Pity distinction (THE CRITICAL TEST)..."

    # Test Compassion (positive Connection)
    COMPASSION_RESULT=$(curl -s -X POST http://localhost:8000/observer/state \
        -H "Content-Type: application/json" \
        -d '{
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "session_id": "789e0123-e89b-12d3-a456-426614174001",
            "input_text": "I feel deep connection and want to help them through their pain",
            "vac_scalars": {"valence": 0.5, "arousal": 0.2, "connection": 0.9}
        }')

    EMOTION_1=$(echo "$COMPASSION_RESULT" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

    # Test Pity (negative Connection)
    PITY_RESULT=$(curl -s -X POST http://localhost:8000/observer/state \
        -H "Content-Type: application/json" \
        -d '{
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "session_id": "789e0123-e89b-12d3-a456-426614174001",
            "input_text": "I feel sorry for them, poor thing",
            "vac_scalars": {"valence": -0.3, "arousal": -0.1, "connection": -0.7}
        }')

    EMOTION_2=$(echo "$PITY_RESULT" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ "$EMOTION_1" != "$EMOTION_2" ]; then
        print_success "Compassion vs Pity distinction works!"
        print_info "Positive Connection detected: $EMOTION_1"
        print_info "Negative Connection detected: $EMOTION_2"
    else
        print_error "Failed to distinguish Compassion from Pity"
        print_info "Both detected as: $EMOTION_1"
    fi

    print_step "Testing metrics calculation..."
    if echo "$PITY_RESULT" | grep -q '"elasticity"'; then
        print_success "Elasticity metric present"
    else
        print_error "Elasticity metric missing"
    fi

    if echo "$PITY_RESULT" | grep -q '"rigidity"'; then
        print_success "Rigidity metric present"
    else
        print_error "Rigidity metric missing"
    fi
}

###############################################################################
# Cleanup
###############################################################################

cleanup() {
    print_header "CLEANUP"

    print_step "Stopping services..."

    if [ -f /tmp/observer.pid ]; then
        OBSERVER_PID=$(cat /tmp/observer.pid)
        kill $OBSERVER_PID 2>/dev/null || true
        print_success "Observer API stopped"
        rm /tmp/observer.pid
    fi

    if [ -f /tmp/versor.pid ]; then
        VERSOR_PID=$(cat /tmp/versor.pid)
        kill $VERSOR_PID 2>/dev/null || true
        print_success "Versor API stopped"
        rm /tmp/versor.pid
    fi

    print_info "PostgreSQL container left running for development"
    print_info "To stop: cd $OBSERVER_DIR && podman-compose down"
}

###############################################################################
# Main Execution
###############################################################################

main() {
    print_header "OBSERVER MODULE - AUTOMATED SETUP & TEST SUITE"
    print_info "Testing Date: $(date)"
    print_info "Base Directory: $BASE_DIR"

    # Run all test phases
    test_environment || exit 1
    test_postgres || exit 1
    test_versor_setup || exit 1
    test_observer_setup || exit 1
    test_atlas_seeding || exit 1
    test_observer_api || exit 1
    test_integration || exit 1

    # Summary
    print_header "TEST SUMMARY"
    echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Observer module is fully operational.${NC}\n"
        print_info "Services running:"
        print_info "- Versor: http://localhost:8001/docs"
        print_info "- Observer: http://localhost:8000/docs"
        print_info "- PostgreSQL: localhost:5432"
    else
        echo -e "\n${RED}❌ SOME TESTS FAILED. Review the output above.${NC}\n"
    fi

    print_info "Logs available at:"
    print_info "- Versor: /tmp/versor.log"
    print_info "- Observer: /tmp/observer.log"

    # Cleanup
    cleanup

    return $TESTS_FAILED
}

# Handle Ctrl+C
trap cleanup INT TERM

# Run main
main
exit $?
