#!/bin/bash
# L.O.V.E. Stack — Database Backup & Restore
# PostgreSQL dump/restore helpers.
#
# Usage:
#   ./db-backup.sh                     # Backup to infra/backups/
#   ./db-backup.sh restore <file>      # Restore from file

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# shellcheck source=../../lib/common.sh
. "$PROJECT_ROOT/infra/lib/common.sh"
timer_start

BACKUP_DIR="$PROJECT_ROOT/infra/backups"
DB_NAME="${POSTGRES_DB:-love_db}"
DB_USER="${POSTGRES_USER:-love_user}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

# ── Functions ───────────────────────────────────────────────
do_backup() {
    local timestamp
    timestamp=$(date '+%Y%m%d_%H%M%S')
    local format="${1:-custom}"  # custom (default) or sql
    local ext="dump"

    if [ "$format" = "sql" ]; then
        ext="sql"
    fi

    local filename="love_db_${timestamp}.${ext}"
    local outfile="$BACKUP_DIR/$filename"

    mkdir -p "$BACKUP_DIR"

    print_header "💾 Backing Up Database"
    print_info "Database: $DB_NAME"
    print_info "Format:   $format"
    print_info "Output:   $outfile"

    if [ "$format" = "sql" ]; then
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$outfile"
    else
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -Fc "$DB_NAME" > "$outfile"
    fi

    local size
    size=$(du -sh "$outfile" | cut -f1)
    print_success "Backup saved: $filename ($size)"
}

do_restore() {
    local infile="$1"

    if [ -z "$infile" ]; then
        # Show available backups
        print_header "📂 Available Backups"
        if [ -d "$BACKUP_DIR" ]; then
            ls -lh "$BACKUP_DIR"/*.dump "$BACKUP_DIR"/*.sql 2>/dev/null || print_warning "No backups found."
        else
            print_warning "No backup directory found."
        fi
        echo ""
        print_info "Usage: $0 restore <backup_file>"
        return 1
    fi

    if [ ! -f "$infile" ]; then
        # Try relative to BACKUP_DIR
        if [ -f "$BACKUP_DIR/$infile" ]; then
            infile="$BACKUP_DIR/$infile"
        else
            print_error "Backup file not found: $infile"
            return 1
        fi
    fi

    print_header "📥 Restoring Database"
    print_info "From: $infile"
    print_info "To:   $DB_NAME"

    print_warning "This will OVERWRITE the current database!"
    printf "  Continue? [y/N] "
    read -r confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        print_info "Aborted."
        return 0
    fi

    case "$infile" in
        *.sql)
            # Drop and recreate
            dropdb --if-exists -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || true
            createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || createdb "$DB_NAME"
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" < "$infile"
            ;;
        *.dump)
            pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists "$infile" 2>/dev/null || \
            pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$infile"
            ;;
        *)
            print_error "Unknown format. Use .sql or .dump"
            return 1
            ;;
    esac

    print_success "Database restored from $(basename "$infile")"
}

do_list() {
    print_header "📂 Available Backups"
    if [ -d "$BACKUP_DIR" ] && ls "$BACKUP_DIR"/*.dump "$BACKUP_DIR"/*.sql >/dev/null 2>&1; then
        ls -lh "$BACKUP_DIR"/*.dump "$BACKUP_DIR"/*.sql 2>/dev/null
    else
        print_info "No backups found in $BACKUP_DIR"
    fi
}

# ── Help ────────────────────────────────────────────────────
show_help() {
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  backup [format]       Create backup (format: custom|sql, default: custom)"
    echo "  restore <file>        Restore from backup file"
    echo "  list                  List available backups"
    echo "  help                  Show this help"
}

# ── Main ────────────────────────────────────────────────────
cmd="${1:-backup}"
shift 2>/dev/null || true

case "$cmd" in
    backup)   do_backup "$1" ;;
    restore)  do_restore "$1" ;;
    list)     do_list ;;
    help|-h|--help) show_help ;;
    *)
        print_error "Unknown command: $cmd"
        show_help
        exit 1
        ;;
esac

timer_end "Database backup"
