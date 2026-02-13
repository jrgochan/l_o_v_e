#!/bin/bash
# L.O.V.E. Stack — Log Cleanup
# Removes old/large log files from infra/logs/
# Safe to run anytime; does not delete logs newer than 1 day.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# shellcheck source=../../lib/common.sh
. "$PROJECT_ROOT/infra/lib/common.sh"

LOG_DIR="$PROJECT_ROOT/infra/logs"
MAX_SIZE_MB="${1:-50}"        # Default: delete files > 50 MB
MAX_AGE_DAYS="${2:-7}"        # Default: delete files older than 7 days
DRY_RUN=false

# Parse args
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --help|-h)
            echo "Usage: $0 [max_size_mb] [max_age_days] [--dry-run]"
            echo ""
            echo "Removes log files from infra/logs/ that are larger than max_size_mb"
            echo "or older than max_age_days."
            echo ""
            echo "Defaults: max_size_mb=50, max_age_days=7"
            exit 0
            ;;
    esac
done

print_header "🧹 Log Cleanup"

if [ ! -d "$LOG_DIR" ]; then
    print_info "No logs directory found — nothing to clean."
    exit 0
fi

TOTAL_BEFORE=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
print_info "Current log directory size: $TOTAL_BEFORE"

CLEANED=0

# Find and remove large files
while IFS= read -r -d '' file; do
    SIZE_MB=$(( $(stat -f %z "$file" 2>/dev/null || stat -c %s "$file" 2>/dev/null || echo 0) / 1048576 ))
    REL_PATH="${file#"$PROJECT_ROOT"/}"

    if [ "$SIZE_MB" -gt "$MAX_SIZE_MB" ]; then
        if [ "$DRY_RUN" = true ]; then
            print_warning "[dry-run] Would remove $REL_PATH (${SIZE_MB}MB)"
        else
            rm -f "$file"
            print_success "Removed $REL_PATH (${SIZE_MB}MB)"
        fi
        CLEANED=$((CLEANED + 1))
    fi
done < <(find "$LOG_DIR" -name "*.log" -type f -print0 2>/dev/null)

# Find and remove old files
while IFS= read -r -d '' file; do
    REL_PATH="${file#"$PROJECT_ROOT"/}"

    if [ "$DRY_RUN" = true ]; then
        print_warning "[dry-run] Would remove $REL_PATH (older than ${MAX_AGE_DAYS} days)"
    else
        rm -f "$file"
        print_success "Removed $REL_PATH (older than ${MAX_AGE_DAYS} days)"
    fi
    CLEANED=$((CLEANED + 1))
done < <(find "$LOG_DIR" -name "*.log" -type f -mtime +"$MAX_AGE_DAYS" -print0 2>/dev/null)

if [ "$CLEANED" -eq 0 ]; then
    print_success "All logs within limits — nothing to clean."
else
    TOTAL_AFTER=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
    print_success "Cleaned $CLEANED file(s). Size: $TOTAL_BEFORE → $TOTAL_AFTER"
fi
