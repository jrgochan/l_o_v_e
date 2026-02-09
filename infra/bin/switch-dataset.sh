#!/bin/bash
# L.O.V.E. Stack - Switch Default Dataset
# Toggles the active/default dataset in the database

set -e

# Get script directory (infra/bin)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source cross-platform libraries
. "$PROJECT_ROOT/infra/lib/os-detect.sh"
. "$PROJECT_ROOT/infra/lib/common.sh"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-love_db}"
DB_USER="${DB_USER:-love_user}"
DB_PASSWORD="${DB_PASSWORD:-love_password}"

# Colors
BOLD='\033[1m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

print_usage() {
    echo "Usage: ./switch-dataset.sh [dataset_name]"
    echo ""
    echo "Toggles the active dataset in the L.O.V.E. stack."
    echo ""
    echo "Arguments:"
    echo "  dataset_name    Name of the dataset to activate (partial match ok)"
    echo "                  If omitted, lists available datasets."
    echo ""
    echo "Examples:"
    echo "  ./switch-dataset.sh goemotions"
    echo "  ./switch-dataset.sh atlas"
    echo "  ./switch-dataset.sh"
}

list_datasets() {
    print_header "📊 Available Datasets"

    # 1. Get datasets from DB
    print_info "Checking database state..."
    if ! command -v psql &> /dev/null; then
        print_error "psql not found. Cannot query database."
        exit 1
    fi

    # Get ID, Name, IsActive from DB
    db_datasets=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT name, is_active::text, is_default::text FROM emotion_collections ORDER BY name;" 2>/dev/null)

    # 2. Get datasets from File System
    print_info "Checking available data files..."
    fs_datasets=()
    if [ -d "$PROJECT_ROOT/observer/data" ]; then
        for d in "$PROJECT_ROOT/observer/data"/*; do
            if [ -d "$d" ] && [ -f "$d/emotions.json" ]; then
                basename=$(basename "$d")
                fs_datasets+=("$basename")
            fi
        done
    fi

    echo ""
    echo -e "${BOLD}Database Collections:${NC}"
    if [ -z "$db_datasets" ]; then
        echo "  (No datasets found in database)"
    else
        while IFS='|' read -r name active default; do
            # Trim whitespace
            name=$(echo "$name" | xargs)
            active=$(echo "$active" | xargs)
            default=$(echo "$default" | xargs)

            if [ -n "$name" ]; then
                status=""
                if [ "$active" == "true" ]; then
                    status="${GREEN}[ACTIVE]${NC}"
                else
                    status="${YELLOW}[INACTIVE]${NC}"
                fi

                if [ "$default" == "true" ]; then
                    status="$status ${BLUE}[DEFAULT]${NC}"
                fi

                echo -e "  • $name $status"
            fi
        done <<< "$db_datasets"
    fi

    echo ""
    echo -e "${BOLD}Available on Disk:${NC}"
    for ds in "${fs_datasets[@]}"; do
        echo "  • $ds"
    done

    echo ""
    print_info "To switch: ./switch-dataset.sh <name>"
}

switch_dataset() {
    target="$1"

    print_header "🔄 Switching Dataset to: $target"

    # Check if target exists in DB (partial match)
    match=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT name FROM emotion_collections WHERE name ILIKE '%$target%' LIMIT 1;" 2>/dev/null | xargs)

    if [ -z "$match" ]; then
        print_error "Dataset matching '$target' not found in database."

        # Check if it exists on disk
        if [ -d "$PROJECT_ROOT/observer/data/$target" ]; then
            print_warning "Dataset '$target' exists on disk but is not seeded."
            print_info "To seed it, run: ./infra/bin/setup-love-stack.sh --minimal --dataset $target"
        else
            print_info "Available datasets on disk:"
            find "$PROJECT_ROOT/observer/data" -maxdepth 1 -mindepth 1 -type d -not -name '.*' -exec basename {} \;
        fi
        exit 1
    fi

    print_info "Found collection: $match"

    # Perform the switch in a transaction
    # 1. Set all to inactive/non-default
    # 2. Set target to active/default

    print_info "Updating database..."

    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        BEGIN;
        UPDATE emotion_collections SET is_active = false, is_default = false;
        UPDATE emotion_collections SET is_active = true, is_default = true WHERE name = '$match';
        COMMIT;
    " > /dev/null 2>&1; then
        print_success "Switched to '$match'"
        echo ""
        echo -e "  ${GREEN}Active:${NC}  $match"
        echo -e "  ${YELLOW}Others:${NC}  Inactive"

        # Invalidate cache if needed (restarting services might be needed if they cache heavily)
        print_info "Note: You may need to restart services if they cache emotion definitions."
    else
        print_error "Failed to update database."
        exit 1
    fi
}

# Main logic
if [ -z "$1" ] || [ "$1" == "--list" ]; then
    list_datasets
else
    switch_dataset "$1"
fi
