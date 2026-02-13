#!/bin/bash
# L.O.V.E. Stack — Changelog Generator
# Generates a changelog from git commits, grouped by module.
#
# Usage:
#   ./generate-changelog.sh                 # Since last tag
#   ./generate-changelog.sh v1.0..v1.1      # Between tags
#   ./generate-changelog.sh --since="1 week ago"

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# shellcheck source=../../lib/common.sh
. "$PROJECT_ROOT/infra/lib/common.sh"

# Defaults
RANGE=""
SINCE=""
OUTPUT=""

# Parse args
while [[ $# -gt 0 ]]; do
    case "$1" in
        --since=*) SINCE="${1#*=}"; shift ;;
        --since) SINCE="$2"; shift 2 ;;
        -o|--output) OUTPUT="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 [range] [--since=<date>] [-o <file>]"
            echo ""
            echo "Examples:"
            echo "  $0                        # Since last tag"
            echo "  $0 v1.0..HEAD             # Between tags"
            echo "  $0 --since='1 week ago'   # Last week"
            echo "  $0 -o CHANGELOG.md        # Output to file"
            exit 0
            ;;
        *) RANGE="$1"; shift ;;
    esac
done

# Determine git range
if [ -n "$SINCE" ]; then
    GIT_ARGS=(log --since="$SINCE")
elif [ -n "$RANGE" ]; then
    GIT_ARGS=(log "$RANGE")
else
    # Since last tag, or last 50 commits
    LAST_TAG=$(git -C "$PROJECT_ROOT" describe --tags --abbrev=0 2>/dev/null || echo "")
    if [ -n "$LAST_TAG" ]; then
        GIT_ARGS=(log "${LAST_TAG}..HEAD")
    else
        GIT_ARGS=(log -50)
    fi
fi

generate_changelog() {
    local date_generated
    date_generated=$(date '+%Y-%m-%d')

    echo "# Changelog"
    echo ""
    echo "_Generated: ${date_generated}_"
    echo ""

    # Modules to categorize
    local modules=("versor" "observer" "listener" "experience" "infra" "docs")

    for module in "${modules[@]}"; do
        local commits
        commits=$(git -C "$PROJECT_ROOT" "${GIT_ARGS[@]}" \
            --pretty=format:"- %s (%h, %an)" \
            -- "$module/" 2>/dev/null || true)

        if [ -n "$commits" ]; then
            echo "## ${module^}"
            echo ""
            echo "$commits" | sort -u
            echo ""
        fi
    done

    # Commits that don't match any module (root-level changes)
    local root_commits
    root_commits=$(git -C "$PROJECT_ROOT" "${GIT_ARGS[@]}" \
        --pretty=format:"- %s (%h, %an)" \
        -- "*.toml" "*.yaml" "*.yml" "*.md" "Makefile" ".pre-commit*" 2>/dev/null || true)

    if [ -n "$root_commits" ]; then
        echo "## Project"
        echo ""
        echo "$root_commits" | sort -u
        echo ""
    fi
}

if [ -n "$OUTPUT" ]; then
    generate_changelog > "$OUTPUT"
    print_success "Changelog written to $OUTPUT"
else
    generate_changelog
fi
