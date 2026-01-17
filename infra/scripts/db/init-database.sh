#!/bin/bash
# L.O.V.E. Stack - Database Initialization Script
# Comprehensive setup: creates database, runs migrations, seeds all required data

set -e

# Get script directory (infra/scripts/db)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Source cross-platform libraries
. "$PROJECT_ROOT/infra/lib/os-detect.sh"
. "$PROJECT_ROOT/infra/lib/common.sh"

# Database configuration (from Observer .env or defaults)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-love_db}"
DB_USER="${DB_USER:-love_user}"
DB_PASSWORD="${DB_PASSWORD:-love_password}"

# Observer module path
OBSERVER_DIR="$PROJECT_ROOT/observer"

# Flags
SKIP_SEED=false
WITH_DEMO=false
WITH_BOOTSTRAP=false
FORCE_RESEED=false
PRECOMPUTE_PATHS=false

echo -e "${BLUE}${ROCKET} L.O.V.E. Stack - Database Initialization${NC}"
echo "=================================================="
echo ""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        --with-demo)
            WITH_DEMO=true
            shift
            ;;
        --with-bootstrap)
            WITH_BOOTSTRAP=true
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
            echo "Usage: $0 [--skip-seed] [--with-demo] [--with-bootstrap] [--force-reseed] [--precompute-paths]"
            exit 1
            ;;
    esac
done

# Check if PostgreSQL is installed
check_postgresql() {
    print_header "🔍 Checking PostgreSQL"
    
    if command_exists psql; then
        print_success "PostgreSQL client installed"
        return 0
    else
        print_error "PostgreSQL client not found"
        echo ""
        echo "PostgreSQL is required. Install it using:"
        echo "  macOS:   brew install postgresql@16"
        echo "  Ubuntu:  sudo apt install postgresql postgresql-contrib"
        echo ""
        return 1
    fi
}

# Check if PostgreSQL is running
check_postgresql_running() {
    print_info "Checking if PostgreSQL is running..."
    
    # Try to connect to PostgreSQL
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; then
        print_success "PostgreSQL is running and accessible"
        return 0
    else
        print_error "Cannot connect to PostgreSQL"
        echo ""
        echo "Start PostgreSQL using:"
        echo "  macOS:   brew services start postgresql@16"
        echo "  Ubuntu:  sudo systemctl start postgresql"
        echo "  Manual:  pg_ctl -D /path/to/data start"
        echo ""
        return 1
    fi
}

# Create database if it doesn't exist
create_database() {
    print_header "🗄️  Creating Database"
    
    print_info "Checking if database '$DB_NAME' exists..."
    
    # Check if database exists (PostgreSQL 17 compatible query)
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
        print_success "Database '$DB_NAME' already exists"
        return 0
    fi
    
    print_info "Creating database '$DB_NAME'..."
    
    # Database creation requires superuser privileges
    # Try using the local user first (macOS default), fallback to postgres user
    if psql -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null; then
        print_success "Database '$DB_NAME' created"
        return 0
    elif PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null; then
        print_success "Database '$DB_NAME' created"
        return 0
    else
        print_error "Failed to create database '$DB_NAME' (requires superuser)"
        print_info "Try running manually: psql -d postgres -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\""
        return 1
    fi
}

# Initialize extensions
initialize_extensions() {
    print_header "🔧 Initializing Extensions"
    
    print_info "Creating PostgreSQL extensions (requires superuser)..."
    
    # Extensions require superuser privileges, so we use the default postgres user
    # Try using the local user first (macOS default), fallback to postgres user
    if psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS pg_trgm;" > /dev/null 2>&1; then
        print_success "Extensions initialized successfully"
    elif PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS pg_trgm;" > /dev/null 2>&1; then
        print_success "Extensions initialized successfully"
    else
        print_error "Failed to create extensions (superuser privileges required)"
        print_info "Try running manually: psql -d $DB_NAME -c \"CREATE EXTENSION IF NOT EXISTS vector;\""
        return 1
    fi
    
    # Verify vector extension was created
    print_info "Verifying vector extension..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT extname FROM pg_extension WHERE extname = 'vector';" 2>/dev/null | grep -q "vector"; then
        print_success "Vector extension verified (v$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';" 2>/dev/null | xargs))"
        return 0
    else
        print_error "Vector extension not found in database"
        print_warning "pgvector may not be installed for your PostgreSQL version"
        print_info "Install pgvector: https://github.com/pgvector/pgvector#installation"
        return 1
    fi
}

# Run Alembic migrations
run_migrations() {
    print_header "🔄 Running Database Migrations"
    
    if [ ! -d "$OBSERVER_DIR" ]; then
        print_error "Observer directory not found: $OBSERVER_DIR"
        return 1
    fi
    
    cd "$OBSERVER_DIR"
    
    # Check for virtual environment
    if [ ! -d "venv" ]; then
        print_error "Virtual environment not found. Run setup-love-stack.sh first"
        cd - > /dev/null
        return 1
    fi
    
    # Activate venv
    . venv/bin/activate
    
    print_info "Running Alembic migrations..."
    
    # Run migrations
    if alembic upgrade head 2>&1 | tee /tmp/alembic-output.log; then
        print_success "Migrations completed successfully"
        deactivate
        cd - > /dev/null
        return 0
    else
        print_error "Migration failed"
        echo "Check logs at: /tmp/alembic-output.log"
        deactivate
        cd - > /dev/null
        return 1
    fi
}

# Verify tables exist
verify_tables() {
    print_header "✅ Verifying Database Schema"
    
    print_info "Checking for required tables..."
    
    # List of required tables (complete as of 2026-01-03)
    # Core tables
    required_tables=(
        "atlas_definitions"
        "user_trajectory"
    )
    
    # Transition system tables
    required_tables+=(
        "transition_strategies"
        "transition_patterns"
        "category_transitions"
        "pattern_strategies"
        "user_journeys"
        "journey_waypoints"
        "strategy_attempts"
    )
    
    # New tables (added 2026-01-03)
    required_tables+=(
        "waypoint_explanation_templates"
        "path_matrix_cache"
        "path_computation_jobs"
        "chat_sessions"
        "chat_messages"
        "session_analytics"
        "clinical_alerts"
        "model_assignments"
        "model_performance_metrics"
    )
    
    # Multi-emotion analysis tables (exist but no migration yet - created by models)
    # Note: These are created automatically by SQLAlchemy from models
    required_tables+=(
        "multi_emotion_analyses"
        "detected_emotions"
        "emotion_relationships"
        "emotion_goals"
    )
    
    all_exist=true
    missing_count=0
    for table in "${required_tables[@]}"; do
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt $table" 2>/dev/null | grep -q "$table"; then
            print_success "✓ $table"
        else
            print_error "✗ $table (missing)"
            all_exist=false
            ((missing_count++))
        fi
    done
    
    echo ""
    if [ "$all_exist" = true ]; then
        print_success "All ${#required_tables[@]} required tables exist"
        return 0
    else
        print_error "$missing_count of ${#required_tables[@]} tables are missing"
        print_warning "Run 'alembic upgrade head' in observer directory"
        return 1
    fi
}

# Validate JSON data files
validate_json_data() {
    print_header "✅ Validating JSON Data"
    
    cd "$OBSERVER_DIR"
    
    if [ ! -d "venv" ]; then
        print_error "Virtual environment not found"
        cd - > /dev/null
        return 1
    fi
    
    . venv/bin/activate
    
    print_info "Validating canonical data files..."
    
    if python scripts/validate_data.py; then
        print_success "All JSON data validated successfully"
        deactivate
        cd - > /dev/null
        return 0
    else
        print_error "JSON data validation failed"
        print_warning "Fix data errors before seeding"
        print_info "Run: cd observer && python scripts/validate_data.py"
        deactivate
        cd - > /dev/null
        return 1
    fi
}

# Seed database
seed_database() {
    print_header "🌱 Seeding Database"
    
    if [ "$SKIP_SEED" = true ]; then
        print_warning "Skipping data seeding (--skip-seed flag)"
        return 0
    fi
    
    # Seeding requires Versor API for quaternion calculation
    print_info "Checking Versor availability..."
    VERSOR_DIR="$PROJECT_ROOT/versor"
    
    if [ ! -d "$VERSOR_DIR/venv" ]; then
        print_error "Versor virtual environment not found"
        print_info "Run setup-love-stack.sh first to set up Versor"
        return 1
    fi
    
    # Check if Versor is running
    if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
        print_info "Starting Versor API (required for Atlas seeding)..."
        cd "$VERSOR_DIR"
        . venv/bin/activate
        nohup uvicorn app.main:app --host 0.0.0.0 --port 8080 > /tmp/versor.log 2>&1 &
        VERSOR_PID=$!
        
        # Track PID for graceful cleanup
        mkdir -p "$SCRIPT_DIR/.pids"
        echo "$VERSOR_PID" > "$SCRIPT_DIR/.pids/versor_seeding.pid"
        
        deactivate
        
        # Wait for Versor to be ready
        print_info "Waiting for Versor to start..."
        for i in {1..30}; do
            if curl -s http://localhost:8080/health > /dev/null 2>&1; then
                print_success "Versor API started (PID: $VERSOR_PID)"
                break
            fi
            sleep 1
        done
        
        if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
            print_error "Versor failed to start (check /tmp/versor.log)"
            return 1
        fi
    else
        print_success "Versor API already running"
    fi
    
    cd "$OBSERVER_DIR"
    
    if [ ! -d "venv" ]; then
        print_error "Virtual environment not found"
        cd - > /dev/null
        return 1
    fi
    
    . venv/bin/activate
    
    # Check if already seeded
    if [ "$FORCE_RESEED" = false ]; then
        print_info "Checking if database already has data..."
        
        atlas_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM atlas_definitions;" 2>/dev/null | xargs)
        
        if [ "$atlas_count" -gt 0 ]; then
            print_warning "Database already contains $atlas_count emotions"
            
            if prompt_yes_no "Clear and re-seed all data?"; then
                print_info "Clearing existing data..."
                FORCE_RESEED=true
            else
                print_info "Skipping seeding (data already exists)"
                deactivate
                cd - > /dev/null
                return 0
            fi
        fi
    fi
    
    # Build seed_all.py arguments
    seed_args="--level=enhanced --verify"
    
    if [ "$WITH_DEMO" = true ]; then
        seed_args="$seed_args --with-demo"
    fi
    
    if [ "$WITH_BOOTSTRAP" = true ]; then
        seed_args="$seed_args --with-bootstrap"
    fi
    
    if [ "$FORCE_RESEED" = true ]; then
        seed_args="$seed_args --force-reseed"
    fi
    
    print_info "Running master seeding script with args: $seed_args"
    echo ""
    
    # Run seed_all.py
    if python scripts/seed_all.py $seed_args; then
        echo ""
        print_success "Database seeding completed"
        deactivate
        cd - > /dev/null
        return 0
    else
        print_error "Database seeding failed"
        deactivate
        cd - > /dev/null
        return 1
    fi
}

# Compute path matrix cache
compute_path_matrix() {
    print_header "🔄 Computing Path Matrix Cache"
    
    if [ "$PRECOMPUTE_PATHS" = false ]; then
        print_info "Path matrix computation skipped (use --precompute-paths to enable)"
        return 0
    fi
    
    cd "$OBSERVER_DIR"
    
    if [ ! -d "venv" ]; then
        print_error "Virtual environment not found"
        cd - > /dev/null
        return 1
    fi
    
    . venv/bin/activate
    
    print_info "Pre-computing all 87×87 = 7,569 transition paths..."
    print_warning "This will take 30-60 minutes"
    echo ""
    
    if python scripts/compute_path_matrix.py; then
        print_success "Path matrix computed and cached"
        deactivate
        cd - > /dev/null
        return 0
    else
        print_error "Path matrix computation failed"
        deactivate
        cd - > /dev/null
        return 1
    fi
}

# Verify seeded data
verify_data() {
    print_header "📊 Verifying Seeded Data"
    
    if [ "$SKIP_SEED" = true ]; then
        print_warning "Skipping data verification (seeding was skipped)"
        return 0
    fi
    
    print_info "Checking data counts..."
    
    # Count atlas_definitions
    atlas_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM atlas_definitions;" 2>/dev/null | xargs)
    
    if [ "$atlas_count" -ge 87 ]; then
        print_success "Atlas emotions: $atlas_count (expected 87)"
    else
        print_warning "Atlas emotions: $atlas_count (expected 87)"
    fi
    
    # Count transition_strategies (if table exists)
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt transition_strategies" 2>/dev/null | grep -q "transition_strategies"; then
        strategy_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM transition_strategies;" 2>/dev/null | xargs)
        print_success "Transition strategies: $strategy_count"
    fi
    
    # Count transition_patterns (if table exists)
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt transition_patterns" 2>/dev/null | grep -q "transition_patterns"; then
        pattern_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM transition_patterns;" 2>/dev/null | xargs)
        print_success "Transition patterns: $pattern_count"
    fi
    
    return 0
}

# Main execution
main() {
    print_info "Configuration:"
    echo "  Database: $DB_NAME"
    echo "  Host: $DB_HOST:$DB_PORT"
    echo "  User: $DB_USER"
    echo "  Skip Seed: $SKIP_SEED"
    echo "  With Demo: $WITH_DEMO"
    echo "  With Bootstrap: $WITH_BOOTSTRAP"
    echo ""
    
    # Step 1: Check PostgreSQL
    if ! check_postgresql; then
        print_error "PostgreSQL not installed"
        exit 1
    fi
    
    # Step 2: Check if running
    if ! check_postgresql_running; then
        print_error "PostgreSQL not running"
        exit 1
    fi
    
    # Step 3: Create database
    if ! create_database; then
        print_error "Failed to create database"
        exit 1
    fi
    
    # Step 4: Initialize extensions
    if ! initialize_extensions; then
        print_error "Failed to initialize extensions"
        exit 1
    fi
    
    # Step 5: Run migrations
    if ! run_migrations; then
        print_error "Failed to run migrations"
        exit 1
    fi
    
    # Step 6: Verify schema
    if ! verify_tables; then
        print_error "Schema verification failed"
        exit 1
    fi
    
    # Step 7: Validate JSON data
    if ! validate_json_data; then
        print_error "JSON data validation failed"
        exit 1
    fi
    
    # Step 8: Seed database
    if ! seed_database; then
        print_error "Failed to seed database"
        exit 1
    fi
    
    # Step 9: Verify data
    verify_data
    
    # Step 10: Compute path matrix (optional)
    if [ "$PRECOMPUTE_PATHS" = true ]; then
        compute_path_matrix
    fi
    
    # Success summary
    print_header "🎉 Database Initialization Complete!"
    echo ""
    print_success "Database '$DB_NAME' is ready for use"
    echo ""
    print_info "Next steps:"
    echo "  1. Start the L.O.V.E. stack: cd infra && ./run-love-stack.sh"
    echo "  2. Access Observer API docs: http://localhost:8000/docs"
    echo "  3. Query emotions: http://localhost:8000/api/atlas/emotions"
    echo ""
}

# Run main
main

exit 0
