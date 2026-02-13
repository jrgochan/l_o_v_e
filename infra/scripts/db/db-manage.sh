#!/bin/bash
# L.O.V.E. Stack — Database Management
# Alembic migration helpers and database reset.
#
# Usage:
#   ./db-manage.sh migrate "add users table"
#   ./db-manage.sh upgrade
#   ./db-manage.sh downgrade
#   ./db-manage.sh reset
#   ./db-manage.sh status

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# shellcheck source=../../lib/common.sh
. "$PROJECT_ROOT/infra/lib/common.sh"
timer_start

OBSERVER_DIR="$PROJECT_ROOT/observer"
ALEMBIC_INI="$OBSERVER_DIR/alembic.ini"

if [ ! -f "$ALEMBIC_INI" ]; then
    print_error "alembic.ini not found at $ALEMBIC_INI"
    exit 1
fi

if ! check_command alembic; then
    print_error "alembic not found. Install: uv pip install alembic"
    exit 1
fi

db_migrate() {
    local message="${1:-auto migration}"
    print_header "📝 Creating Migration"
    print_info "Message: $message"
    (cd "$OBSERVER_DIR" && alembic revision --autogenerate -m "$message")
    print_success "Migration created"
}

db_upgrade() {
    local target="${1:-head}"
    print_header "⬆️  Upgrading Database"
    (cd "$OBSERVER_DIR" && alembic upgrade "$target")
    print_success "Database upgraded to $target"
}

db_downgrade() {
    local target="${1:--1}"
    print_header "⬇️  Downgrading Database"
    (cd "$OBSERVER_DIR" && alembic downgrade "$target")
    print_success "Database downgraded"
}

db_status() {
    print_header "📊 Migration Status"
    (cd "$OBSERVER_DIR" && alembic current)
    echo ""
    print_info "History:"
    if ! (cd "$OBSERVER_DIR" && alembic history --indicate-current -v 2>/dev/null); then
        (cd "$OBSERVER_DIR" && alembic history)
    fi
}

db_reset() {
    print_header "🔄 Resetting Database"
    local db_name="${POSTGRES_DB:-love_db}"
    local db_user="${POSTGRES_USER:-love_user}"

    print_warning "This will DROP and recreate database '$db_name'!"
    printf "  Continue? [y/N] "
    read -r confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        print_info "Aborted."
        exit 0
    fi

    print_info "Dropping database..."
    dropdb --if-exists "$db_name" 2>/dev/null || true
    print_info "Creating database..."
    createdb -O "$db_user" "$db_name" 2>/dev/null || createdb "$db_name"
    print_info "Running all migrations..."
    db_upgrade "head"
    print_success "Database reset complete"
}

show_help() {
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  migrate <msg>     Create a new Alembic migration"
    echo "  upgrade [rev]     Upgrade to revision (default: head)"
    echo "  downgrade [rev]   Downgrade by revision (default: -1)"
    echo "  status            Show current migration status"
    echo "  reset             DROP and recreate the database"
}

cmd="${1:-help}"
shift 2>/dev/null || true

case "$cmd" in
    migrate)   db_migrate "$*" ;;
    upgrade)   db_upgrade "$1" ;;
    downgrade) db_downgrade "$1" ;;
    status)    db_status ;;
    reset)     db_reset ;;
    help|-h|--help) show_help ;;
    *) print_error "Unknown command: $cmd"; show_help; exit 1 ;;
esac

timer_end "Database"
