#!/bin/bash
# L.O.V.E. Stack - Complete Setup Script
# Cross-platform setup for Python modules with Python 3.14+
#
# This script sets up the complete L.O.V.E. (Listener-Observer-Versor-Experience) Stack
# development environment from a fresh clone. It handles:
#   - Dependency verification and installation
#   - Python virtual environment creation for each module
#   - Database initialization with migrations
#   - Data seeding (87 emotions, strategies, patterns)
#   - Service configuration
#
# Requirements:
#   - Python 3.14+
#   - PostgreSQL 14+ (auto-detects version)
#   - Redis
#   - Ollama
#   - Node.js 18+
#   - ffmpeg
#
# Usage:
#   ./setup-love-stack.sh              # Interactive setup with prompts
#   ./setup-love-stack.sh --help       # Show detailed help
#   ./setup-love-stack.sh --skip-db    # Skip database initialization
#
# For more information, see: infra/README.md

set -e  # Exit on error

# Get script directory (infra/bin)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source cross-platform libraries
. "$PROJECT_ROOT/infra/lib/os-detect.sh"
. "$PROJECT_ROOT/infra/lib/package-manager.sh"
. "$PROJECT_ROOT/infra/lib/service-manager.sh"
. "$PROJECT_ROOT/infra/lib/common.sh"

# Required Python version
REQUIRED_PYTHON_MAJOR=3
REQUIRED_PYTHON_MINOR=14

# Parse command line arguments
SKIP_DATABASE=false
SKIP_DEPENDENCIES=false
SKIP_OLLAMA=false
AUTO_YES=false
VERBOSE=false
QUIET=false
UPDATE_MODE=false
MINIMAL_MODE=false
CLEAN_MODE=false

show_help() {
    # Check if terminal supports colors
    if [ -t 1 ] && command -v tput >/dev/null 2>&1 && [ "$(tput colors 2>/dev/null)" -ge 8 ]; then
        # Terminal supports colors - use formatted output
        local BOLD='\033[1m'
        local BLUE='\033[0;34m'
        local GREEN='\033[0;32m'
        local NC='\033[0m'
        
        echo -e "${BOLD}L.O.V.E. Stack Setup Script${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${BOLD}DESCRIPTION${NC}"
        echo "    Complete setup script for the L.O.V.E. Stack development environment."
        echo "    Sets up all modules (Listener, Observer, Versor, Experience) from a fresh"
        echo "    clone with all dependencies, databases, and seed data."
        echo ""
        echo -e "${BOLD}USAGE${NC}"
        echo "    $0 [OPTIONS]"
        echo ""
        echo -e "${BOLD}OPTIONS${NC}"
        echo -e "    ${BOLD}General:${NC}"
        echo "    -h, --help              Show this help message and exit"
        echo "    --version               Show script version information"
        echo "    -y, --yes               Auto-accept all prompts (non-interactive mode)"
        echo ""
        echo -e "    ${BOLD}Setup Control:${NC}"
        echo "    --skip-db               Skip database initialization"
        echo "    --skip-deps             Skip system dependency installation"
        echo "    --skip-ollama           Skip Ollama model download (saves 4.7GB)"
        echo "    --update                Update mode: keep venvs, update deps ${GREEN}(fast!)${NC}"
        echo "    --minimal               Minimal mode: fastest combo ${GREEN}(~3-5 min)${NC}"
        echo "    --clean                 Clean mode: drop DB, remove venvs, fresh install"
        echo "    --force-reseed          Force re-seed DB from JSON (no prompts)"
        echo "    --precompute-paths      Pre-compute all 7,569 transition paths (30-60 min)"
        echo ""
        echo -e "${BOLD}EXAMPLES${NC}"
        echo "    Interactive setup:        ./setup-love-stack.sh"
        echo "    CI/CD automated:          ./setup-love-stack.sh --yes"
        echo "    Fresh DB from JSON:       ./setup-love-stack.sh --clean --force-reseed --yes"
        echo -e "    ${GREEN}Fastest re-run:${NC}           ./setup-love-stack.sh --minimal"
        echo -e "    ${GREEN}Update deps only:${NC}         ./setup-love-stack.sh --update --skip-ollama --skip-db"
        echo "    Production minimal:       ./setup-love-stack.sh --yes --skip-ollama --skip-db"
        echo ""
        echo -e "For complete documentation, run: ${BOLD}cat $SCRIPT_DIR/.setup-help.txt${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    else
        # Terminal doesn't support colors - use plain text
        cat "$SCRIPT_DIR/.setup-help.txt"
    fi
    exit 0
}

show_version() {
    echo "L.O.V.E. Stack Setup Script"
    echo "Version: 2.0.0 (2026-01-03)"
    echo "Platform: $(detect_os)"
    echo "Package Manager: $(detect_package_manager)"
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            ;;
        --version)
            show_version
            ;;
        -y|--yes)
            AUTO_YES=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        --skip-db)
            SKIP_DATABASE=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPENDENCIES=true
            shift
            ;;
        --skip-ollama)
            SKIP_OLLAMA=true
            shift
            ;;
        --update)
            UPDATE_MODE=true
            shift
            ;;
        --minimal)
            MINIMAL_MODE=true
            # Set all fast flags
            SKIP_DATABASE=true
            SKIP_OLLAMA=true
            UPDATE_MODE=true
            shift
            ;;
        --clean)
            CLEAN_MODE=true
            # Clean mode: complete fresh install
            AUTO_YES=true  # Auto-accept all prompts
            UPDATE_MODE=false  # Force venv recreation
            shift
            ;;
        --force-reseed)
            FORCE_RESEED=true
            shift
            ;;
        --precompute-paths)
            PRECOMPUTE_PATHS=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Try './setup-love-stack.sh --help' for more information."
            exit 1
            ;;
    esac
done

# Override prompt_yes_no if AUTO_YES is set
if [ "$AUTO_YES" = true ]; then
    prompt_yes_no() {
        print_info "Auto-accepting: $1"
        return 0
    }
fi

# Show mode info
if [ "$MINIMAL_MODE" = true ]; then
    print_info "Minimal mode: Skipping database, Ollama, using update mode (fastest)"
fi

# Set verbosity flags
if [ "$VERBOSE" = true ]; then
    PIP_ARGS=""
    NPM_ARGS=""
    CURL_ARGS=""
    print_info "Verbose mode enabled"
else
    PIP_ARGS="--quiet"
    NPM_ARGS="--silent"
    CURL_ARGS="--silent"
fi

if [ "$CLEAN_MODE" = true ]; then
    print_info "Clean mode: Dropping database, removing venvs, complete fresh install"
    
    # Step 1: Clean up tracked processes gracefully (from PID files)
    print_info "Cleaning up tracked processes..."
    PID_DIR="$SCRIPT_DIR/.pids"
    
    if [ -d "$PID_DIR" ]; then
        for pid_file in "$PID_DIR"/*.pid; do
            if [ -f "$pid_file" ]; then
                PID=$(cat "$pid_file" 2>/dev/null)
                if [ -n "$PID" ]; then
                    # Try graceful shutdown first
                    kill "$PID" 2>/dev/null || true
                    sleep 1
                    # Force kill if still alive
                    kill -9 "$PID" 2>/dev/null || true
                fi
                rm "$pid_file"
            fi
        done
    fi
    
    # Step 2: Kill any remaining L.O.V.E. stack processes by port
    print_info "Stopping any remaining L.O.V.E. stack processes..."
    lsof -ti:8000 2>/dev/null | xargs kill -9 2>/dev/null || true  # Observer
    lsof -ti:8001 2>/dev/null | xargs kill -9 2>/dev/null || true  # Versor (Observer port)
    lsof -ti:8080 2>/dev/null | xargs kill -9 2>/dev/null || true  # Versor (seeding port)
    lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true  # Listener
    pkill -9 -f "uvicorn app.main:app" 2>/dev/null || true
    sleep 2
    print_success "Processes stopped"
    
    # Step 3: Terminate all database connections before DROP
    DB_NAME="${DB_NAME:-love_db}"
    if psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null | grep -q 1; then
        print_info "Terminating database connections..."
        psql -d postgres -c "
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = '$DB_NAME' 
              AND pid <> pg_backend_pid();
        " >/dev/null 2>&1 || true
        
        sleep 2  # Let connections fully terminate
        
        print_info "Dropping existing database '$DB_NAME'..."
        psql -d postgres -c "DROP DATABASE $DB_NAME;" 2>/dev/null || true
        print_success "Database dropped"
    fi
    
    # Remove all venvs
    for module in versor observer listener; do
        if [ -d "$PROJECT_ROOT/$module/venv" ]; then
            print_info "Removing $module venv..."
            rm -rf "$PROJECT_ROOT/$module/venv"
        fi
    done
    print_success "All virtual environments removed"

    # Clean Experience module artifacts
    EXPERIENCE_DIR="$PROJECT_ROOT/experience/web"
    if [ -d "$EXPERIENCE_DIR" ]; then
        print_info "Cleaning Experience module artifacts..."
        rm -rf "$EXPERIENCE_DIR/node_modules"
        rm -rf "$EXPERIENCE_DIR/.next"
        rm -f "$EXPERIENCE_DIR/tsconfig.tsbuildinfo"
        print_success "Experience artifacts removed"
    fi
fi

echo -e "${BLUE}${ROCKET} L.O.V.E. Stack Setup Script${NC}"
echo "======================================"
echo ""

# Detect platform
print_info "Platform: $(detect_os)"
print_info "Package Manager: $(detect_package_manager)"
print_info "Init System: $(detect_init_system)"
echo ""

# Check Python 3.14 availability
check_python() {
    print_header "📋 Checking Python 3.14+"
    
    # Try to find Python 3.14+
    PYTHON_CMD=$(find_python_314)
    
    if [ -n "$PYTHON_CMD" ]; then
        VERSION=$($PYTHON_CMD --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
        print_success "Found $PYTHON_CMD (version $VERSION)"
        echo "$PYTHON_CMD" > "$PROJECT_ROOT/infra/.python_cmd"
        return 0
    fi
    
    print_error "Python 3.14+ not found"
    echo ""
    echo "Python 3.14+ is required for the L.O.V.E. stack."
    echo ""
    
    if prompt_yes_no "Would you like to install Python 3.14 now?"; then
        print_info "Installing Python 3.14..."
        if install_python_314; then
            PYTHON_CMD=$(find_python_314)
            if [ -n "$PYTHON_CMD" ]; then
                print_success "Python 3.14 installed"
                echo "$PYTHON_CMD" > "$SCRIPT_DIR/.python_cmd"
                return 0
            fi
        fi
        print_error "Failed to install Python 3.14"
        return 1
    else
        print_warning "Skipping Python installation. Please install manually."
        return 1
    fi
}

# Check system dependencies
check_dependencies() {
    print_header "🔧 Checking System Dependencies"
    
    local missing_deps=()
    
    # Load version requirements from TOOL_VERSIONS
    local pg_min_version
    pg_min_version=$(grep "^POSTGRESQL_MIN_VERSION=" "$PROJECT_ROOT/infra/TOOL_VERSIONS" 2>/dev/null | cut -d= -f2)
    pg_min_version=${pg_min_version:-18.0}
    
    # Check PostgreSQL
    if check_command psql || check_command postgres; then
        # Force binaries from postgresql@18 if available (Homebrew)
        if [ -d "/opt/homebrew/opt/postgresql@18/bin" ]; then
            export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"
        fi
        
        # Get PostgreSQL version
        pg_version=$(psql -d postgres -t -c "SHOW server_version;" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1)
        
        if [ -n "$pg_version" ]; then
            print_success "PostgreSQL installed (version $pg_version)"
            
            # Validate minimum version
            pg_major=$(echo "$pg_version" | cut -d. -f1)
            pg_min_major=$(echo "$pg_min_version" | cut -d. -f1)
            
            if [ "$pg_major" -lt "$pg_min_major" ]; then
                print_warning "PostgreSQL $pg_version is below minimum $pg_min_version"
                
                if [ -d "/opt/homebrew/opt/postgresql@18/bin" ]; then
                     print_info "Found postgresql@18. Switching services..."
                     brew services stop postgresql@17 2>/dev/null || true
                     brew services stop postgresql@14 2>/dev/null || true
                     brew services start postgresql@18
                     sleep 3
                     print_success "Switched to postgresql@18"
                else
                    print_info "Marking for upgrade to PostgreSQL $pg_min_version+"
                    missing_deps+=("postgresql")
                fi
            fi
        else
            # Service might not be running, try to find 18 bin
             if [ -d "/opt/homebrew/opt/postgresql@18/bin" ]; then
                 print_success "Found postgresql@18 binaries"
                 brew services start postgresql@18
                 sleep 3
             else 
                print_success "PostgreSQL installed"
             fi
        fi
        
        # Check for pgvector extension availability
        if psql -d postgres -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';" 2>/dev/null | grep -q "vector"; then
            pgvector_version=$(psql -d postgres -t -c "SELECT default_version FROM pg_available_extensions WHERE name = 'vector';" 2>/dev/null | xargs)
            print_success "pgvector extension available (version $pgvector_version)"
        else
            print_warning "pgvector extension not found (required for Observer)"
            print_info "Install pgvector: brew install pgvector"
            print_info "See: infra/PGVECTOR_SETUP.md for details"
        fi
    else
        print_warning "PostgreSQL not found (required for Observer, minimum version $pg_min_version)"
        missing_deps+=("postgresql")
    fi
    
    # Check Redis
    if check_command redis-server || check_command redis-cli; then
        print_success "Redis installed"
    else
        print_warning "Redis not found (required for Listener)"
        missing_deps+=("redis")
    fi
    
    # Check Ollama
    if check_command ollama; then
        print_success "Ollama installed"
    else
        print_warning "Ollama not found (required for Listener)"
        missing_deps+=("ollama")
    fi
    
    # Check ffmpeg
    if check_command ffmpeg; then
        print_success "ffmpeg installed"
    else
        print_warning "ffmpeg not found (required for Listener audio processing)"
        missing_deps+=("ffmpeg")
    fi
    
    # Check Node.js
    if check_node_version 18; then
        NODE_VERSION=$(node --version 2>&1)
        print_success "Node.js installed ($NODE_VERSION)"
    else
        if check_command node; then
            print_warning "Node.js version too old (need v18+)"
        else
            print_warning "Node.js not found (required for Experience module)"
        fi
        missing_deps+=("node")
    fi
    
    # Offer to install missing dependencies (unless --skip-deps)
    if [ ${#missing_deps[@]} -gt 0 ]; then
        if [ "$SKIP_DEPENDENCIES" = true ]; then
            print_warning "Missing dependencies: ${missing_deps[*]} (installation skipped with --skip-deps)"
            print_info "Install manually or run without --skip-deps"
        else
            echo ""
            print_warning "Missing dependencies: ${missing_deps[*]}"
            echo ""
            if prompt_yes_no "Would you like to install missing dependencies?"; then
                # Update package repos first
                print_info "Updating package repositories..."
                update_package_repo
                
                for dep in "${missing_deps[@]}"; do
                    case $dep in
                        "postgresql")
                            print_info "Installing PostgreSQL..."
                            install_postgresql_18
                            ;;
                        "redis")
                            print_info "Installing Redis..."
                            install_package redis --no-confirm
                            ;;
                        "ollama")
                            print_info "Installing Ollama..."
                            install_ollama
                            ;;
                        "ffmpeg")
                            print_info "Installing FFmpeg..."
                            install_package ffmpeg --no-confirm
                            ;;
                        "node")
                            print_info "Installing Node.js..."
                            install_nodejs_18
                            ;;
                    esac
                done
                print_success "Dependencies installed"
            fi
        fi
    fi
}

# Setup Experience module (Node.js/npm)
setup_experience_module() {
    print_header "🎨 Setting up Experience Module"
    
    local experience_path="$PROJECT_ROOT/experience/web"
    
    if [ ! -d "$experience_path" ]; then
        print_error "Experience module directory not found: $experience_path"
        return 1
    fi
    
    # Check Node.js version
    if ! check_node_version 18; then
        print_error "Node.js 18+ required for Experience module"
        print_info "Install Node.js: https://nodejs.org/"
        return 1
    fi
    
    NODE_VERSION=$(node --version 2>&1)
    print_success "Node.js installed ($NODE_VERSION)"
    
    cd "$experience_path"
    
    # Handle npm install based on UPDATE_MODE
    if [ "$UPDATE_MODE" = true ] && [ -d "node_modules" ]; then
        print_info "Update mode: Updating npm dependencies..."
        npm install $NPM_ARGS
    else
        # Check if node_modules exists
        if [ -d "node_modules" ]; then
            print_info "Dependencies already installed, updating..."
            npm install $NPM_ARGS
        else
            print_info "Installing npm dependencies (this may take a moment)..."
            npm install $NPM_ARGS
        fi
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Experience dependencies installed"
    else
        print_error "npm install failed"
        cd - > /dev/null
        return 1
    fi
    
    cd - > /dev/null
}

# Setup Python module
setup_python_module() {
    local module_name=$1
    local module_path="$PROJECT_ROOT/$2"
    
    print_header "🐍 Setting up $module_name"
    
    if [ ! -d "$module_path" ]; then
        print_error "Module directory not found: $module_path"
        return 1
    fi
    
    cd "$module_path"
    
    # Get Python command
    if [ -f "$SCRIPT_DIR/.python_cmd" ]; then
        PYTHON_CMD=$(cat "$SCRIPT_DIR/.python_cmd")
    else
        PYTHON_CMD=$(find_python_314)
    fi
    
    if [ -z "$PYTHON_CMD" ]; then
        print_error "Python 3.14+ not found"
        cd - > /dev/null
        return 1
    fi
    
    # Handle venv creation based on UPDATE_MODE
    if [ "$UPDATE_MODE" = true ] && [ -d "venv" ]; then
        print_info "Update mode: Using existing virtual environment"
        . venv/bin/activate
    else
        # Remove old venv if exists
        if [ -d "venv" ]; then
            print_info "Removing old virtual environment..."
            rm -rf venv
        fi
        
        # Create virtual environment
        print_info "Creating virtual environment..."
        $PYTHON_CMD -m venv venv
        
        # Activate venv
        . venv/bin/activate
        
        # Upgrade pip
        print_info "Upgrading pip..."
        pip install --upgrade pip $PIP_ARGS
    fi
    
    # Install dependencies
    if [ -f "requirements.txt" ]; then
        print_info "Installing dependencies..."
        pip install -r requirements.txt $PIP_ARGS
        print_success "$module_name dependencies installed"
    else
        print_warning "No requirements.txt found"
    fi
    

    
    # Verify Python version in venv
    VENV_PYTHON_VERSION=$(python --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
    print_success "$module_name using Python $VENV_PYTHON_VERSION"
    
    deactivate
    cd - > /dev/null
}

# Setup configuration files
setup_configs() {
    print_header "⚙️  Setting up Configuration Files"
    
    for module in versor observer listener; do
        if [ -f "$PROJECT_ROOT/$module/.env.example" ] && [ ! -f "$PROJECT_ROOT/$module/.env" ]; then
            cp "$PROJECT_ROOT/$module/.env.example" "$PROJECT_ROOT/$module/.env"
            print_success "$module: .env created from .env.example"
        fi
    done
}

# Pull Ollama model
setup_ollama() {
    print_header "🤖 Setting up Ollama LLM Model"
    
    if [ "$SKIP_OLLAMA" = true ]; then
        print_warning "Ollama setup skipped (--skip-ollama flag)"
        print_info "Download manually: ollama pull llama3.1:8b-instruct-q4_0"
        return 0
    fi
    
    if ! check_command ollama; then
        print_warning "Ollama not installed, skipping model download"
        return
    fi
    
    # Start Ollama if not running
    if ! check_service_running ollama; then
        print_info "Starting Ollama service..."
        start_ollama
        sleep 2
    else
        print_success "Ollama service is running"
    fi
    
    # Check if model is already downloaded
    if ollama list | grep -q "llama3.1:8b-instruct"; then
        print_success "Llama 3.1 8B model already downloaded"
    else
        print_info "Downloading Llama 3.1 8B model (4.7GB, this may take a while)..."
        ollama pull llama3.1:8b-instruct-q4_0
        print_success "Model downloaded"
    fi
}

# Setup AI Models (HuggingFace)
setup_ai_models() {
    print_header "🧠 Setting up AI Models"
    
    # 1. Listener Models (BERT for PII)
    if [ -d "$PROJECT_ROOT/listener/venv" ]; then
        print_info "Downloading Listener models (BERT for PII)..."
        . "$PROJECT_ROOT/listener/venv/bin/activate"
        
        # Use robust curl-based script
        if python "$PROJECT_ROOT/infra/scripts/download_models.py" listener --project-root "$PROJECT_ROOT"; then
            print_success "Listener PII model downloaded"
            
            # Configure Listener to use local model
            ENV_FILE="$PROJECT_ROOT/listener/.env"
            LOCAL_MODEL_PATH="$PROJECT_ROOT/infra/models/dslim_bert-base-NER"
            
            if ! grep -q "PII_MODEL_PATH" "$ENV_FILE" 2>/dev/null; then
                echo "" >> "$ENV_FILE"
                echo "# Local Model Path (set by setup script)" >> "$ENV_FILE"
                echo "PII_MODEL_PATH=$LOCAL_MODEL_PATH" >> "$ENV_FILE"
                print_info "Updated listener/.env with PII_MODEL_PATH"
            else
                # Update existing
                # simplistic update, assumes single line
                perl -pi -e "s|PII_MODEL_PATH=.*|PII_MODEL_PATH=$LOCAL_MODEL_PATH|" "$ENV_FILE"
            fi
        else
            print_error "Failed to download Listener PII model"
        fi
        deactivate
    fi

    # 2. Observer Models (Sentence Transformers)
    if [ -d "$PROJECT_ROOT/observer/venv" ]; then
        print_info "Downloading Observer models (Sentence Transformers)..."
        . "$PROJECT_ROOT/observer/venv/bin/activate"
        
        # Use robust curl-based script
        if python "$PROJECT_ROOT/infra/scripts/download_models.py" observer --project-root "$PROJECT_ROOT"; then
            print_success "Observer embedding model downloaded"
            
            # Configure Observer to use local model
            ENV_FILE="$PROJECT_ROOT/observer/.env"
            LOCAL_MODEL_PATH="$PROJECT_ROOT/infra/models/sentence-transformers_all-MiniLM-L6-v2"
             
             if ! grep -q "EMBEDDING_MODEL" "$ENV_FILE" 2>/dev/null; then
                echo "" >> "$ENV_FILE"
                echo "# Local Model Path (set by setup script)" >> "$ENV_FILE"
                echo "EMBEDDING_MODEL=$LOCAL_MODEL_PATH" >> "$ENV_FILE"
                print_info "Updated observer/.env with EMBEDDING_MODEL"
            else
                perl -pi -e "s|EMBEDDING_MODEL=.*|EMBEDDING_MODEL=$LOCAL_MODEL_PATH|" "$ENV_FILE"
            fi
        else
            print_error "Failed to download Observer embedding model"
        fi
        deactivate
    fi
}

# Main setup flow
main() {
    print_info "Starting L.O.V.E. Stack setup..."
    echo ""
    
    # Check Python
    if ! check_python; then
        print_error "Setup cannot continue without Python 3.14+"
        exit 1
    fi
    
    # Configure build environment for macOS (OpenBLAS for scipy/numpy)
    if [ "$(detect_os)" = "macos" ] && [ -d "/opt/homebrew/opt/openblas" ]; then
        print_info "Configuring build environment for OpenBLAS (macOS)..."
        export LDFLAGS="-L/opt/homebrew/opt/openblas/lib"
        export CPPFLAGS="-I/opt/homebrew/opt/openblas/include"
        export PKG_CONFIG_PATH="/opt/homebrew/opt/openblas/lib/pkgconfig"
        
        # Use GCC if available to avoid Clang OpenMP issues with Scipy
        if command -v gcc-15 >/dev/null; then
            print_info "Using gcc-15 for compilation (fixes OpenMP issues)"
            export CC=gcc-15
            export CXX=g++-15
        elif command -v gcc-14 >/dev/null; then
            print_info "Using gcc-14 for compilation (fixes OpenMP issues)"
            export CC=gcc-14
            export CXX=g++-14
        fi
    fi
    
    # Install development tools
    print_header "🔨 Checking Development Tools"
    if install_dev_tools; then
        print_success "Development tools ready"
    fi
    
    # Check dependencies
    check_dependencies
    
    # Setup Python modules
    setup_python_module "Versor" "versor"
    setup_python_module "Observer" "observer"
    setup_python_module "Listener" "listener"
    
    # Setup Experience module (Node.js/npm)
    setup_experience_module
    
    # Setup configs
    setup_configs
    
    # Setup AI models
    setup_ai_models
    
# Setup AI Models (HuggingFace)


# Setup Ollama
setup_ollama

# Initialize Database (unless --skip-db was specified)
if [ "$SKIP_DATABASE" = false ]; then
    print_header "🗄️  Initializing Database"
    echo ""
    print_info "The database needs to be initialized with tables and seed data."
    echo "This includes:"
    echo "  • 87 emotions from Atlas of the Heart"
    echo "  • 107 evidence-based strategies"
    echo "  • 18 transition patterns"
    echo "  • Category mappings and transitions"
    echo ""

    if prompt_yes_no "Initialize database now?"; then
        print_info "Running database initialization..."
        DB_INIT_ARGS=""
        if [ "$FORCE_RESEED" = true ]; then
            DB_INIT_ARGS="$DB_INIT_ARGS --force-reseed"
        fi
        if [ "$PRECOMPUTE_PATHS" = true ]; then
            DB_INIT_ARGS="$DB_INIT_ARGS --precompute-paths"
        fi
        if "$PROJECT_ROOT/infra/scripts/db/init-database.sh" $DB_INIT_ARGS; then
            print_success "Database initialized successfully"
        else
            print_warning "Database initialization had issues"
            print_info "You can run it manually later: cd infra && ./init-database.sh"
        fi
    else
        print_warning "Skipping database initialization"
        print_info "You MUST initialize the database before starting the stack"
        print_info "Run: cd infra && ./init-database.sh"
    fi
else
    print_warning "Database initialization skipped (--skip-db flag)"
    print_info "Initialize manually: cd infra && ./init-database.sh"
fi

# Summary
print_header "📊 Setup Complete!"
echo ""
print_success "All Python modules configured with Python 3.14+"
print_success "Experience module configured with Node.js dependencies"
print_success "Virtual environments created for all modules"
print_success "Dependencies installed"
echo ""
print_info "Next steps:"
echo "  1. Initialize database (if skipped): $PROJECT_ROOT/infra/scripts/db/init-database.sh"
echo "  2. Run '$PROJECT_ROOT/infra/bin/test-love-stack.sh' to verify setup"
echo "  3. Run '$PROJECT_ROOT/infra/bin/run-love-stack.sh' to start the stack"
echo ""
print_info "Platform: $(detect_os) | Package Manager: $(detect_package_manager)"
echo ""
}

# Run main
main
