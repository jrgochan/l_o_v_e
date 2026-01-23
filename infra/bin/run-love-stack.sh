#!/bin/bash
# L.O.V.E. Stack - Run All Services and APIs
# Cross-platform script to start the complete stack with granular control.

set -e

# Get script directory (infra/bin)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source cross-platform libraries
. "$PROJECT_ROOT/infra/lib/os-detect.sh"
. "$PROJECT_ROOT/infra/lib/package-manager.sh"
. "$PROJECT_ROOT/infra/lib/service-manager.sh"
. "$PROJECT_ROOT/infra/lib/common.sh"

# ==========================================
# Configuration & Defaults
# ==========================================

# Default Execution Flags
RUN_INFRA=true
RUN_BACKEND=true
RUN_FRONTEND=true
RUN_DOCS=true
CLEAN_MODE=false
SKIP_INFRA_CHECKS=false

# PID file to track running processes
ensure_directory "$SCRIPT_DIR/logs"
PID_FILE="$SCRIPT_DIR/logs/.love-stack.pids"

# ==========================================
# Helper Functions
# ==========================================

show_help() {
    echo -e "${BLUE}L.O.V.E. Stack - Control Script${NC}"
    echo "Usage: ./run-love-stack.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help        Show this help message"
    echo "  --clean           Deep clean Experience module (rm node_modules/.next) before starting"
    echo "  --backend         Run ONLY the Backend APIs (Versor, Observer, Listener) + Infra"
    echo "                    (Disables Frontend)"
    echo "  --frontend        Run ONLY the Experience Web Frontend"
    echo "                    (Disables Infra, Backend, Docs. Assumes API is running at localhost:8000)"
    echo "  --infra           Run ONLY Infrastructure (PostgreSQL, Redis, Ollama)"
    echo "                    (Disables Backend, Frontend, Docs)"
    echo "  --skip-infra      Skip infrastructure checks/startup"
    echo "                    (Use if you know DB/Redis/Ollama are already running)"
    echo ""
    echo "Examples:"
    echo "  ./run-love-stack.sh --clean       # Clean start"
    echo "  ./run-love-stack.sh --backend     # Dev backend only"
    echo "  ./run-love-stack.sh --frontend    # Dev frontend only"
    echo ""
}

# Kill existing processes
kill_existing_processes() {
    print_info "Checking for existing L.O.V.E. processes..."
    
    # Kill existing Python APIs
    pkill -f "uvicorn.*versor" 2>/dev/null || true
    pkill -f "uvicorn.*observer" 2>/dev/null || true
    pkill -f "uvicorn.*listener" 2>/dev/null || true
    
    # Kill background workers
    pkill -f "arq.*app.workers" 2>/dev/null || true
    
    # Kill Node.js processes (Experience web)
    pkill -f "next dev.*experience/web" 2>/dev/null || true
    
    # Kill processes on specific ports
    kill_process_on_port 3000 2>/dev/null || true
    kill_process_on_port 3001 2>/dev/null || true
    kill_process_on_port 8003 2>/dev/null || true
    
    # Kill mkdocs
    pkill -f "mkdocs serve" 2>/dev/null || true
    
    # Clean up lock files (only if running frontend or clean mode)
    if [ "$RUN_FRONTEND" = true ] || [ "$CLEAN_MODE" = true ]; then
        rm -f "$SCRIPT_DIR/../experience/web/.next/dev/lock" 2>/dev/null || true
    fi
    
    sleep 1
    print_success "Existing processes cleaned up"
}

# Cleanup function (trap)
cleanup() {
    echo ""
    print_info "Stopping L.O.V.E. Stack..."
    
    # Stop Experience web
    pkill -f "next dev.*experience/web" 2>/dev/null || true
    kill_process_on_port 3000 2>/dev/null || true
    kill_process_on_port 3001 2>/dev/null || true
    kill_process_on_port 8003 2>/dev/null || true

    # Stop Documentation
    pkill -f "mkdocs serve" 2>/dev/null || true
    
    if [ -f "$PID_FILE" ]; then
        while read -r pid name; do
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${CYAN}  Stopping $name (PID: $pid)${NC}"
                kill "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    
    # Ensure workers are dead
    pkill -f "arq.*app.workers" 2>/dev/null || true
    
    print_success "All managed services stopped"
    echo ""
    
    if [ "$RUN_INFRA" = true ]; then
        print_info "Infrastructure (PG, Redis, Ollama) checked/started may still be running."
        print_info "Stop them manually if needed (see stop-love-stack.sh)"
    fi
    exit 0
}

# Start API Helper
start_api() {
    local name=$1
    local dir="$PROJECT_ROOT/$2"
    local port=$3
    local log_file="$SCRIPT_DIR/logs/${name}.log"
    
    print_info "Starting $name API (port $port)..."
    
    if [ ! -d "$dir" ]; then
        print_error "Module directory not found: $dir"
        return 1
    fi
    
    # Install/update dependencies first
    cd "$dir"
    if [ -f "requirements.txt" ] && [ -d ".venv" ]; then
        # Check if we should update deps? For now, we assume setup script ran.
        # But let's run a quick pip install to be safe if env exists.
        # Using bash -c to ensure venv activation works
        bash -c ". .venv/bin/activate && pip install -q -r requirements.txt" > /dev/null 2>&1 || {
            print_warning "Dependency check failed (non-fatal)"
        }
    fi
    
    if [ ! -d ".venv" ]; then
        print_error "$name: Virtual environment not found in .venv. Run setup-love-stack.sh first"
        cd - > /dev/null
        return 1
    fi
    
    bash -c ". .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port $port --reload" > "$log_file" 2>&1 &
    local pid=$!
    echo "$pid $name" >> "$PID_FILE"
    
    cd - > /dev/null
    
    if wait_for_url "http://localhost:$port/health" 10; then
        print_success "$name API ready: ${CYAN}http://localhost:$port/docs${NC}"
        return 0
    else
        print_warning "$name API took longer than expected"
        print_info "Check logs: tail -f $log_file"
        return 1
    fi
}

start_worker() {
    local name=$1
    local dir="$PROJECT_ROOT/$2"
    local worker_class=$3
    local log_file="$SCRIPT_DIR/logs/${name}-Worker.log"
    
    print_info "Starting $name Worker..."
    
    if [ ! -d "$dir" ]; then return 1; fi
    cd "$dir"
    if [ ! -d ".venv" ]; then return 1; fi
    
    bash -c ". .venv/bin/activate && arq $worker_class" > "$log_file" 2>&1 &
    local pid=$!
    echo "$pid ${name}-Worker" >> "$PID_FILE"
    print_success "$name Worker started"
    cd - > /dev/null
}

# ==========================================
# Argument Parsing
# ==========================================

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --clean)
            CLEAN_MODE=true
            shift
            ;;
        --backend)
            RUN_FRONTEND=false
            shift
            ;;
        --frontend)
            RUN_BACKEND=false
            RUN_INFRA=false
            RUN_DOCS=false
            shift
            ;;
        --infra)
            RUN_BACKEND=false
            RUN_FRONTEND=false
            RUN_DOCS=false
            shift
            ;;
        --skip-infra)
            SKIP_INFRA_CHECKS=true
            shift
            ;;
        *)
            print_error "Unknown argument: $1"
            show_help
            exit 1
            ;;
    esac
done

# ==========================================
# Execution Flow
# ==========================================

echo -e "${BLUE}${ROCKET} Starting L.O.V.E. Stack${NC}"

# 1. Cleanup before start
rm -f "$PID_FILE"
kill_existing_processes
trap cleanup SIGINT SIGTERM

echo ""

# 2. Infrastructure (Postgres, Redis, Ollama, Database tables)
if [ "$RUN_INFRA" = true ] && [ "$SKIP_INFRA_CHECKS" = false ]; then
    print_header "🔍 Checking Database & Infrastructure"

    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-love_db}"
    DB_USER="${DB_USER:-love_user}"
    DB_PASSWORD="${DB_PASSWORD:-love_password}"

    # Database Status Check
    if command_exists psql; then
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt 2>/dev/null | grep -qw "$DB_NAME"; then
            # Check for data presence
            atlas_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM emotion_definitions;" 2>/dev/null | xargs)
            if [ -n "$atlas_count" ] && [ "$atlas_count" -ge 10 ]; then
                print_success "Database ready: $atlas_count emotions loaded"
            else
                print_warning "Database low count: ${atlas_count:-0} (expected > 10). Run ./init-database.sh"
            fi
        else
            print_warning "Database '$DB_NAME' not found or not accessible."
            print_info "If this fails, run: ./infra/scripts/db/init-database.sh"
        fi
    fi
    echo ""

    print_header "📋 Infrastructure Services"
    
    # Postgres
    if check_service_running postgresql; then
        print_success "PostgreSQL running"
    else
        print_info "Starting PostgreSQL..."
        start_service postgresql >/dev/null 2>&1 || print_warning "Failed to start PostgreSQL (check manual logs)"
    fi

    # Redis
    if check_service_running redis; then
        print_success "Redis running"
    else
        if start_service redis >/dev/null 2>&1; then
            print_success "Redis started"
        else
            print_warning "Failed to start Redis"
        fi
    fi

    # Ollama (Skip if using Cloud AI)
    AI_PROVIDER=""
    if [ -f "$PROJECT_ROOT/listener/.env" ]; then
        AI_PROVIDER=$(grep "^AI_PROVIDER=" "$PROJECT_ROOT/listener/.env" | cut -d '=' -f2)
    fi

    if [ "$AI_PROVIDER" = "google_vertex" ]; then
        print_info "Ollama skipped (Cloud Mode: Vertex AI Active)"
    else
        if check_service_running ollama; then
            print_success "Ollama running"
        else
            if start_ollama; then
                print_success "Ollama started"
            else
                print_warning "Failed to start Ollama"
            fi
        fi
    fi
    echo ""
fi

# 3. Backend APIs
if [ "$RUN_BACKEND" = true ]; then
    print_header "🎯 Starting Backend APIs"
    start_api "Versor" "versor" 8001
    start_api "Observer" "observer" 8000
    start_api "Listener" "listener" 8002
    start_worker "Listener" "listener" "app.workers.audio_processor.WorkerSettings"
    echo ""
fi

# 4. Documentation
if [ "$RUN_DOCS" = true ]; then
    print_header "📚 Starting Documentation"
    DOCS_PORT=8003
    DOCS_LOG="$SCRIPT_DIR/logs/Documentation.log"
    DOCS_SCRIPT="$PROJECT_ROOT/docs/serve-docs.sh"
    
    if [ -f "$DOCS_SCRIPT" ]; then
        bash "$DOCS_SCRIPT" --port $DOCS_PORT > "$DOCS_LOG" 2>&1 &
        echo "$! Documentation" >> "$PID_FILE"
        if wait_for_url "http://localhost:$DOCS_PORT" 20; then
            print_success "Documentation: ${CYAN}http://localhost:$DOCS_PORT${NC}"
        else
            print_warning "Docs slow start. Check logs."
        fi
    fi
    echo ""
fi

# 5. Experience Web (Frontend)
if [ "$RUN_FRONTEND" = true ]; then
    # Verify Backend health first (unless we skipped it, e.g. frontend-only mode)
    # In frontend-only mode, we assume backend is running elsewhere, so we might want a quick check or just proceed.
    # Let's verify health ONLY if we ran backend ourselves.
    ALL_HEALTHY=true
    if [ "$RUN_BACKEND" = true ]; then
        print_header "🏥 Verifying Backend Health"
        for p in 8000 8001 8002; do
            if ! check_url_responding "http://localhost:$p/health"; then ALL_HEALTHY=false; fi
        done
        if [ "$ALL_HEALTHY" = true ]; then print_success "Backends healthy"; else print_warning "Some backends unstable"; fi
        echo ""
    fi

    if [ "$ALL_HEALTHY" = true ]; then
        print_header "🎨 Starting Experience Web UI"
        EXPERIENCE_DIR="$PROJECT_ROOT/experience/web"
        EXPERIENCE_ROOT="$PROJECT_ROOT/experience"
        EXPERIENCE_LOG="$SCRIPT_DIR/logs/Experience-Web.log"

        if [ "$CLEAN_MODE" = true ]; then
            print_header "🧹 Cleaning Experience Context"
            echo -e "${YELLOW}Removing node_modules, .next...${NC}"
            rm -rf "$EXPERIENCE_DIR/node_modules" "$EXPERIENCE_DIR/.next" "$EXPERIENCE_DIR/package-lock.json"
            
            echo -e "${CYAN}Reinstalling dependencies...${NC}"
            if [ -d "$EXPERIENCE_ROOT" ]; then
                cd "$EXPERIENCE_ROOT" && npm install && cd - >/dev/null
            fi
            print_success "Context cleaned and reinstalled."
            echo ""
        fi

        # Install if missing (automatic)
        if [ -d "$EXPERIENCE_ROOT" ] && [ ! -d "$EXPERIENCE_ROOT/node_modules" ]; then
             print_info "Installing dependencies..."
             cd "$EXPERIENCE_ROOT" && npm install && cd - >/dev/null
        fi

        cd "$EXPERIENCE_DIR"
        npm run dev > "$EXPERIENCE_LOG" 2>&1 &
        echo "$! Experience-Web" >> "$PID_FILE"
        cd - >/dev/null

        print_info "Waiting for Next.js compilation..."
        sleep 5
        if check_url_responding "http://localhost:3000"; then
            print_success "Experience Web: ${CYAN}http://localhost:3000${NC}"
        else
            print_warning "Web UI starting (check $EXPERIENCE_LOG)"
        fi
    fi
fi

echo ""
print_success "${ROCKET} Stack Active!"
print_separator "=" 40
echo -e "${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo ""

# Wait loop
while true; do sleep 1; done
