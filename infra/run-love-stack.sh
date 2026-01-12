#!/bin/bash
# L.O.V.E. Stack - Run All Services and APIs
# Cross-platform script to start the complete stack

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Source cross-platform libraries
. "$SCRIPT_DIR/lib/os-detect.sh"
. "$SCRIPT_DIR/lib/package-manager.sh"
. "$SCRIPT_DIR/lib/service-manager.sh"
. "$SCRIPT_DIR/lib/common.sh"

echo -e "${BLUE}${ROCKET} Starting L.O.V.E. Stack${NC}"
echo "=========================="
echo ""

# Create logs directory
ensure_directory "$SCRIPT_DIR/logs"

# PID file to track running processes
PID_FILE="$SCRIPT_DIR/logs/.love-stack.pids"
rm -f "$PID_FILE"

# Kill existing processes function
kill_existing_processes() {
    print_info "Checking for existing L.O.V.E. processes..."
    
    # Kill existing Python APIs (Versor, Observer, Listener)
    pkill -f "uvicorn.*versor" 2>/dev/null || true
    pkill -f "uvicorn.*observer" 2>/dev/null || true
    pkill -f "uvicorn.*listener" 2>/dev/null || true
    
    # Kill background workers
    pkill -f "arq.*app.workers" 2>/dev/null || true
    
    # Kill existing Node.js processes (Experience web)
    pkill -f "next dev.*experience/web" 2>/dev/null || true
    
    # Kill processes on specific ports
    kill_process_on_port 3000 2>/dev/null || true
    kill_process_on_port 3000 2>/dev/null || true
    kill_process_on_port 3001 2>/dev/null || true
    kill_process_on_port 8003 2>/dev/null || true
    
    # Kill mkdocs
    pkill -f "mkdocs serve" 2>/dev/null || true
    
    # Clean up lock files
    rm -f "$SCRIPT_DIR/../experience/web/.next/dev/lock" 2>/dev/null || true
    
    sleep 2
    print_success "Existing processes cleaned up"
}

# Cleanup function
cleanup() {
    echo ""
    print_info "Stopping L.O.V.E. Stack..."
    
    # Stop Experience web
    pkill -f "next dev.*experience/web" 2>/dev/null || true
    kill_process_on_port 3000 2>/dev/null || true
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
    
    print_success "All APIs stopped"
    echo ""
    print_info "Services (PostgreSQL, Redis, Ollama) are still running"
    print_info "Stop them manually if needed (see stop-love-stack.sh)"
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Function to start an API
start_api() {
    local name=$1
    local dir="$SCRIPT_DIR/../$2"
    local port=$3
    local log_file="$SCRIPT_DIR/logs/${name}.log"
    
    print_info "Starting $name API (port $port)..."
    
    if [ ! -d "$dir" ]; then
        print_error "Module directory not found: $dir"
        return 1
    fi
    
    # Install/update dependencies first
    cd "$dir"
    if [ -f "requirements.txt" ] && [ -d "venv" ]; then
        echo -e "${CYAN}    Installing $name dependencies...${NC}"
        bash -c ". venv/bin/activate && pip install -q -r requirements.txt" > /dev/null 2>&1 || {
            print_warning "Some dependencies may have failed to install"
        }
    fi
    
    # Start uvicorn with venv activated
    if [ ! -d "venv" ]; then
        print_error "$name: Virtual environment not found. Run setup-love-stack.sh first"
        cd - > /dev/null
        return 1
    fi
    
    bash -c ". venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port $port --reload" > "$log_file" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid $name" >> "$PID_FILE"
    
    cd - > /dev/null
    
    # Wait for API to be ready
    if wait_for_url "http://localhost:$port/health" 10; then
        print_success "$name API ready: ${CYAN}http://localhost:$port/docs${NC}"
        return 0
    else
        print_warning "$name API took longer than expected to start"
        print_info "Check logs: tail -f $log_file"
        return 1
    fi
}

# Function to start a worker
start_worker() {
    local name=$1
    local dir="$SCRIPT_DIR/../$2"
    local worker_class=$3
    local log_file="$SCRIPT_DIR/logs/${name}-Worker.log"
    
    print_info "Starting $name Worker..."
    
    if [ ! -d "$dir" ]; then
        print_error "Module directory not found: $dir"
        return 1
    fi
    
    cd "$dir"
    
    if [ ! -d "venv" ]; then
        print_error "$name: Virtual environment not found for worker."
        cd - > /dev/null
        return 1
    fi
    
    # Start arq worker
    bash -c ". venv/bin/activate && arq $worker_class" > "$log_file" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid ${name}-Worker" >> "$PID_FILE"
    
    print_success "$name Worker started"
    
    cd - > /dev/null
}

# Kill existing processes first
kill_existing_processes

echo ""

# Verify database is initialized
print_header "🔍 Checking Database Status"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-love_db}"
DB_USER="${DB_USER:-love_user}"
DB_PASSWORD="${DB_PASSWORD:-love_password}"

print_info "Checking if database is initialized..."

if ! command_exists psql; then
    print_warning "PostgreSQL client not found, skipping database check"
else
    # Check if database exists and has required tables
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        # Check for atlas_definitions table
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt atlas_definitions" 2>/dev/null | grep -q "atlas_definitions"; then
            atlas_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM atlas_definitions;" 2>/dev/null | xargs)
            
            if [ "$atlas_count" -ge 87 ]; then
                print_success "Database ready: $atlas_count emotions loaded"
            else
                print_warning "Database has only $atlas_count emotions (expected 87+)"
                print_info "Run: cd infra && ./init-database.sh"
            fi
        else
            print_error "Database exists but tables not created"
            echo ""
            print_info "Initialize the database first:"
            echo "  cd infra && ./init-database.sh"
            echo ""
            
            if ! prompt_yes_no "Start stack anyway? (Observer API may fail)"; then
                print_info "Aborted by user"
                exit 1
            fi
        fi
    else
        print_error "Database '$DB_NAME' does not exist"
        echo ""
        print_info "Initialize the database first:"
        echo "  cd infra && ./init-database.sh"
        echo ""
        
        if ! prompt_yes_no "Start stack anyway? (Observer API may fail)"; then
            print_info "Aborted by user"
            exit 1
        fi
    fi
fi

echo ""

# Start services
print_header "📋 Starting Services"

# PostgreSQL
print_info "Checking PostgreSQL..."
if check_service_running postgresql; then
    print_success "PostgreSQL already running"
else
    print_info "Starting PostgreSQL..."
    # Capture stderr to handle bootstrap errors gracefully
    start_output=$(start_service postgresql 2>&1)
    start_exit_code=$?
    
    # Check if it's a bootstrap error (service already registered)
    if [ $start_exit_code -ne 0 ] && echo "$start_output" | grep -q "Bootstrap failed"; then
        # Service might already be running despite the error
        if check_service_running postgresql; then
            print_success "PostgreSQL already running (service was already registered)"
        else
            print_error "Failed to start PostgreSQL"
            print_info "Try: brew services restart postgresql@16"
            print_info "Or run setup-love-stack.sh"
        fi
    elif [ $start_exit_code -eq 0 ]; then
        if wait_for_service postgresql 30; then
            print_success "PostgreSQL started"
        else
            print_warning "PostgreSQL may not be ready yet"
        fi
    else
        print_error "Failed to start PostgreSQL"
        print_info "Start it manually or run setup-love-stack.sh"
    fi
fi

# Redis
print_info "Checking Redis..."
if check_service_running redis; then
    print_success "Redis already running"
else
    print_info "Starting Redis..."
    if start_service redis; then
        if wait_for_service redis 30; then
            print_success "Redis started"
        else
            print_warning "Redis may not be ready yet"
        fi
    else
        print_error "Failed to start Redis"
        print_info "Start it manually or run setup-love-stack.sh"
    fi
fi

# Ollama
print_info "Checking Ollama..."
if check_service_running ollama; then
    print_success "Ollama already running"
else
    print_info "Starting Ollama..."
    if start_ollama; then
        print_success "Ollama started"
    else
        print_warning "Ollama may not have started"
        print_info "You can start it manually: ollama serve &"
    fi
fi

echo ""

# Start APIs
print_header "🎯 Starting Backend APIs"
start_api "Versor" "versor" 8001
start_api "Observer" "observer" 8000
start_api "Listener" "listener" 8002
start_worker "Listener" "listener" "app.workers.audio_processor.WorkerSettings"

echo ""

# Start Documentation (MkDocs)
print_header "📚 Starting Documentation"
DOCS_LOG="$SCRIPT_DIR/logs/Documentation.log"
DOCS_PORT=8003

print_info "Starting MkDocs on port $DOCS_PORT..."

# Check and run serve-docs.sh
DOCS_SCRIPT="$SCRIPT_DIR/../docs/serve-docs.sh"

if [ -f "$DOCS_SCRIPT" ]; then
    # Run the existing serve script with custom port
    bash "$DOCS_SCRIPT" --port $DOCS_PORT > "$DOCS_LOG" 2>&1 &
    docs_pid=$!
    echo "$docs_pid Documentation" >> "$PID_FILE"
    
    # Wait for docs to be ready (give it time to install deps if needed)
    if wait_for_url "http://localhost:$DOCS_PORT" 20; then
        print_success "Documentation ready: ${CYAN}http://localhost:$DOCS_PORT${NC}"
    else
        print_warning "Documentation starting slowly (installing dependencies?)"
        print_info "Check logs: tail -f $DOCS_LOG"
    fi
else
    print_warning "Docs script not found: $DOCS_SCRIPT"
fi

echo ""

# Verify APIs are healthy before starting Experience
print_header "🏥 Verifying API Health"
ALL_HEALTHY=true

for service in "Versor:8001" "Observer:8000" "Listener:8002"; do
    name="${service%:*}"
    port="${service#*:}"
    if check_url_responding "http://localhost:$port/health"; then
        print_success "$name healthy"
    else
        print_error "$name not healthy"
        ALL_HEALTHY=false
    fi
done

echo ""

# Start Experience Web (only if APIs are healthy)
if [ "$ALL_HEALTHY" = true ]; then
    print_header "🎨 Starting Experience Web UI"
    
    EXPERIENCE_DIR="$SCRIPT_DIR/../experience/web"
    EXPERIENCE_LOG="$SCRIPT_DIR/logs/Experience-Web.log"
    
    if [ ! -d "$EXPERIENCE_DIR" ]; then
        print_error "Experience web directory not found"
    else
        # Ensure dependencies are installed in monorepo root
        EXPERIENCE_ROOT="$SCRIPT_DIR/../experience"
        if [ -d "$EXPERIENCE_ROOT" ]; then
             if [ ! -d "$EXPERIENCE_ROOT/node_modules" ]; then
                 print_info "Experience dependencies not found. Installing..."
                 cd "$EXPERIENCE_ROOT"
                 npm install || print_warning "npm install failed"
                 cd - > /dev/null
                 print_success "Experience dependencies installed"
             fi
        fi

        cd "$EXPERIENCE_DIR"
        
        # Start Next.js dev server in background
        npm run dev > "$EXPERIENCE_LOG" 2>&1 &
        experience_pid=$!
        
        echo "$experience_pid Experience-Web" >> "$PID_FILE"
        
        cd - > /dev/null
        
        # Wait for Next.js to be ready
        print_info "Waiting for Next.js to compile..."
        sleep 5
        
        # Check if running on port 3000 or 3001
        if check_url_responding "http://localhost:3000"; then
            print_success "Experience Web ready: ${CYAN}http://localhost:3000${NC}"
        elif check_url_responding "http://localhost:3001"; then
            print_success "Experience Web ready: ${CYAN}http://localhost:3001${NC}"
        else
            print_warning "Experience Web may still be starting"
            print_info "Check logs: tail -f $EXPERIENCE_LOG"
        fi
    fi
else
    print_warning "Skipping Experience Web - APIs not healthy"
    print_info "Fix API issues and restart the stack"
fi

echo ""
print_success "${ROCKET} L.O.V.E. Stack Running!"
print_separator "=" 40
echo ""
echo -e "${BLUE}Backend APIs:${NC}"
echo -e "  • Versor:   ${CYAN}http://localhost:8001/docs${NC}"
echo -e "  • Observer: ${CYAN}http://localhost:8000/docs${NC}"
echo -e "  • Listener: ${CYAN}http://localhost:8002/docs${NC}
  • MkDocs:   ${CYAN}http://localhost:8003${NC}"
echo ""
echo -e "${BLUE}Frontend:${NC}"
echo -e "  • Main Experience:  ${CYAN}http://localhost:3000${NC} (or :3001)"
echo -e "  • Admin Interface:  ${CYAN}http://localhost:3000/admin/atlas${NC}"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo "  • Versor:     tail -f $SCRIPT_DIR/logs/Versor.log"
echo "  • Observer:   tail -f $SCRIPT_DIR/logs/Observer.log"
echo "  • Listener:   tail -f $SCRIPT_DIR/logs/Listener.log"
echo "  • Listener:   tail -f $SCRIPT_DIR/logs/Listener.log
  • Experience: tail -f $SCRIPT_DIR/logs/Experience-Web.log
  • MkDocs:     tail -f $SCRIPT_DIR/logs/Documentation.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services...${NC}"
echo ""

# Wait for interrupt
while true; do
    sleep 1
done
