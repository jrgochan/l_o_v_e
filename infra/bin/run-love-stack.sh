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

# Execution Flags
RUN_INFRA=true
RUN_BACKEND=true
RUN_FRONTEND=true
RUN_DOCS=true
CLEAN_MODE=false
SKIP_INFRA_CHECKS=false
SKIP_VOICE=false
VERBOSE=false

# PID Management
ensure_directory "$SCRIPT_DIR/logs"
PID_FILE="$SCRIPT_DIR/logs/.love-stack.pids"

# ==========================================
# Logging Helper Override
# ==========================================

# Function to handle command output based on verbosity
run_cmd() {
    local cmd="$1"
    local log_file="$2"

    if [ "$VERBOSE" = true ]; then
        # In verbose mode, pipe to both stdout and log file
        eval "$cmd" 2>&1 | tee -a "$log_file" &
    else
        # In silence mode, redirect everything to log file
        eval "$cmd" > "$log_file" 2>&1 &
    fi
}

# ==========================================
# Helper Functions
# ==========================================

show_help() {
    echo -e "${BLUE}L.O.V.E. Stack - Control Script${NC}"
    echo "Usage: ./run-love-stack.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help        Show this help message"
    echo "  -v, --verbose     Show detailed output for all services (foreground logs)"
    echo "  --clean           Deep clean Experience module (rm node_modules/.next) before starting"
    echo "  --backend         Run ONLY the Backend APIs (Versor, Observer, Listener) + Infra"
    echo "                    (Disables Frontend)"
    echo "  --frontend        Run ONLY the Experience Web Frontend"
    echo "                    (Disables Infra, Backend, Docs. Assumes API is running at localhost:8000)"
    echo "  --infra           Run ONLY Infrastructure (PostgreSQL, Redis, Ollama)"
    echo "                    (Disables Backend, Frontend, Docs)"
    echo "  --skip-infra      Skip infrastructure checks/startup"
    echo "                    (Use if you know DB/Redis/Ollama are already running)"
    echo "  --no-voice        Skip starting PersonaPlex Voice Service"
    echo ""
    echo "Examples:"
    echo "  ./run-love-stack.sh --verbose     # Run with full output"
    echo "  ./run-love-stack.sh --clean       # Clean start"
    echo "  ./run-love-stack.sh --backend     # Dev backend only"
}

# Kill existing processes
kill_existing_processes() {
    print_info "Checking for existing L.O.V.E. processes..."

    # Python APIs
    pkill -f "uvicorn.*versor" 2>/dev/null || true
    pkill -f "uvicorn.*observer" 2>/dev/null || true
    pkill -f "uvicorn.*listener" 2>/dev/null || true
    pkill -f "uvicorn.*personaplex" 2>/dev/null || true

    # Background workers
    pkill -f "arq.*app.workers" 2>/dev/null || true

    # Node.js processes
    pkill -f "next dev.*experience/web" 2>/dev/null || true

    # Specific ports
    kill_process_on_port 3000 2>/dev/null || true
    kill_process_on_port 3001 2>/dev/null || true
    kill_process_on_port 8003 2>/dev/null || true
    kill_process_on_port 8004 2>/dev/null || true

    # Docs
    pkill -f "mkdocs serve" 2>/dev/null || true

    # Lock files
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

    # Stop explicitly tracked PIDs first
    if [ -f "$PID_FILE" ]; then
        while read -r pid name; do
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${CYAN}  Stopping $name (PID: $pid)${NC}"
                kill "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi

    # Fallback to pattern matching ensure everything is dead
    pkill -f "next dev.*experience/web" 2>/dev/null || true
    pkill -f "uvicorn.*app.main:app" 2>/dev/null || true
    pkill -f "arq.*app.workers" 2>/dev/null || true
    pkill -f "mkdocs serve" 2>/dev/null || true

    print_success "All managed services stopped"
    echo ""
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

    # Install/update dependencies
    cd "$dir"
    if [ -d ".venv" ]; then
        # Check requirements non-intrusively
         if [ "$VERBOSE" = true ]; then
            bash -c ". .venv/bin/activate && pip install -r requirements.txt"
         else
            bash -c ". .venv/bin/activate && pip install -q -r requirements.txt" > /dev/null 2>&1 || true
         fi
    else
        print_error "$name: Virtual environment not found. Run setup-love-stack.sh first"
        cd - > /dev/null
        return 1
    fi

    # Run Command
    cmd="bash -c '. .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port $port --reload'"
    run_cmd "$cmd" "$log_file"

    local pid=$!
    echo "$pid $name" >> "$PID_FILE"

    cd - > /dev/null
    print_info "$name API starting..."
    return 0
}

wait_for_backends() {
    print_header "⏳ Waiting for APIs to be ready..."
    local services=("Versor:8001" "Observer:8000" "Listener:8002")

    # Add PersonaPlex if running
    if [ "$SKIP_VOICE" = false ] && [ -d "$PROJECT_ROOT/personaplex" ]; then
        services+=("PersonaPlex:8003")
    fi

    local pids=""
    for service_pair in "${services[@]}"; do
        local name="${service_pair%%:*}"
        local port="${service_pair##*:}"

        # Check in background
        (
            if wait_for_url "http://localhost:$port/health" 30; then
                print_success "$name API ready: ${CYAN}http://localhost:$port/docs${NC}"
            else
                print_warning "$name API timed out or failed (check logs)"
                # fail gracefully?
            fi
        ) &
        pids="$pids $!"
    done

    # Wait for all checks
    wait $pids
    echo ""
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

    cmd="bash -c '. .venv/bin/activate && arq $worker_class'"
    run_cmd "$cmd" "$log_file"

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
        -v|--verbose)
            VERBOSE=true
            shift
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
        --no-voice)
            SKIP_VOICE=true
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

# 2. Infrastructure
if [ "$RUN_INFRA" = true ] && [ "$SKIP_INFRA_CHECKS" = false ]; then
    print_header "🔍 Checking Database & Infrastructure"

    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-love_db}"
    DB_USER="${DB_USER:-love_user}"
    DB_PASSWORD="${DB_PASSWORD:-love_password}"

    # Database Check
    if command_exists psql; then
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt 2>/dev/null | grep -qw "$DB_NAME"; then
            atlas_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM emotion_definitions;" 2>/dev/null | xargs)
            if [ -n "$atlas_count" ] && [ "$atlas_count" -ge 10 ]; then
                print_success "Database ready: $atlas_count emotions loaded"
            else
                print_warning "Database data low. Run ./init-database.sh"
            fi
        else
            print_warning "Database '$DB_NAME' not found."
            print_info "Run: ./infra/scripts/db/init-database.sh"
        fi
    fi
    echo ""

    print_header "📋 Infrastructure Services"

    # Postgres
    if check_service_running postgresql; then
        print_success "PostgreSQL running"
    else
        start_service postgresql >/dev/null 2>&1 || print_warning "Failed to start Postgres"
    fi

    # Redis
    if check_service_running redis; then
        print_success "Redis running"
    else
        start_service redis >/dev/null && print_success "Redis started" || print_warning "Failed to start Redis"
    fi

    # Ollama
    AI_PROVIDER=$(grep "^AI_PROVIDER=" "$PROJECT_ROOT/listener/.env" 2>/dev/null | cut -d '=' -f2)
    if [ "$AI_PROVIDER" = "google_vertex" ]; then
        print_info "Ollama skipped (Cloud Mode: Vertex AI Active)"
    else
        if check_service_running ollama; then
            print_success "Ollama running"
        else
            start_ollama && print_success "Ollama started" || print_warning "Failed to start Ollama"
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

    # PersonaPlex Voice Service (optional - checks if directory exists)
    if [ "$SKIP_VOICE" = false ] && [ -d "$PROJECT_ROOT/personaplex" ] && [ -f "$PROJECT_ROOT/personaplex/app/main.py" ]; then
        start_api "PersonaPlex" "personaplex" 8003
    else
        # This warning is now less specific as the check for .venv is inside start_api
        # but keeping it as per instruction.
        print_warning "PersonaPlex directory exists but no .venv found. Skipping."
        print_info "Run setup-love-stack.sh to initialize Voice Service."
    fi

    # Parallel Wait
    wait_for_backends
    echo ""
fi

# 4. Documentation
if [ "$RUN_DOCS" = true ]; then
    print_header "📚 Starting Documentation"
    DOCS_PORT=8004
    DOCS_LOG="$SCRIPT_DIR/logs/Documentation.log"
    DOCS_SCRIPT="$PROJECT_ROOT/docs/serve-docs.sh"

    if [ -f "$DOCS_SCRIPT" ]; then
        run_cmd "bash '$DOCS_SCRIPT' --port $DOCS_PORT" "$DOCS_LOG"
        echo "$! Documentation" >> "$PID_FILE"
        if wait_for_url "http://localhost:$DOCS_PORT" 20; then
            print_success "Documentation: ${CYAN}http://localhost:$DOCS_PORT${NC}"
        else
            print_warning "Docs slow start."
        fi
    fi
    echo ""
fi

# 5. Experience Web (Frontend)
if [ "$RUN_FRONTEND" = true ]; then
    # Verify Backend
    if [ "$RUN_BACKEND" = true ]; then
        print_header "🏥 Verifying Backend Health"
        HEALTHY=true
        for p in 8000 8001 8002; do
            if ! check_url_responding "http://localhost:$p/health"; then HEALTHY=false; fi
        done
        [ "$HEALTHY" = true ] && print_success "Backends healthy" || print_warning "Some backends unstable"
        echo ""
    fi

    print_header "🎨 Starting Experience Web UI"
    EXPERIENCE_DIR="$PROJECT_ROOT/experience/web"
    EXPERIENCE_LOG="$SCRIPT_DIR/logs/Experience-Web.log"

    if [ "$CLEAN_MODE" = true ]; then
        print_header "🧹 Cleaning Experience Context"
        rm -rf "$EXPERIENCE_DIR/node_modules" "$EXPERIENCE_DIR/.next"
        cd "$PROJECT_ROOT/experience" && npm install && cd - >/dev/null
        print_success "Cleaned and reinstalled."
    fi

    # Auto-Install if needed
    if [ ! -d "$PROJECT_ROOT/experience/node_modules" ]; then
         print_info "Installing dependencies..."
         cd "$PROJECT_ROOT/experience" && npm install && cd - >/dev/null
    fi

    cd "$EXPERIENCE_DIR"
    run_cmd "npm run dev" "$EXPERIENCE_LOG"
    echo "$! Experience-Web" >> "$PID_FILE"
    cd - >/dev/null

    print_info "Waiting for Next.js compilation..."
    sleep 5
    if check_url_responding "http://localhost:3000"; then
        print_success "Experience Web: ${CYAN}http://localhost:3000${NC}"
    else
        print_warning "Web UI starting (see $EXPERIENCE_LOG)"
    fi
fi

echo ""
print_success "${ROCKET} Stack Active!"
print_separator "=" 40
if [ "$VERBOSE" = true ]; then
     echo -e "${YELLOW}Running in VERBOSE mode. Logs are streaming above.${NC}"
else
     echo -e "${YELLOW}Logs redirected to infra/bin/logs/*.log${NC}"
fi
echo -e "${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo ""

# Wait loop
while true; do sleep 1; done
