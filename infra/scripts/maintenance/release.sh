#!/bin/bash
# L.O.V.E. Stack — Release Automation
# Bumps version, generates changelog, tags, and pushes.
#
# Usage:
#   ./release.sh patch          # 0.1.0 → 0.1.1
#   ./release.sh minor          # 0.1.0 → 0.2.0
#   ./release.sh major          # 0.1.0 → 1.0.0
#   ./release.sh --dry-run minor

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# shellcheck source=../../lib/common.sh
. "$PROJECT_ROOT/infra/lib/common.sh"
timer_start

DRY_RUN=false

# Parse args
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=true; shift ;;
        -h|--help)
            echo "Usage: $0 [--dry-run] <patch|minor|major>"
            echo ""
            echo "Bumps version, generates changelog, creates git tag, and pushes."
            exit 0
            ;;
        patch|minor|major) BUMP_TYPE="$1"; shift ;;
        *)
            print_error "Unknown arg: $1. Use: patch, minor, major"
            exit 1
            ;;
    esac
done

if [ -z "${BUMP_TYPE:-}" ]; then
    print_error "Must specify bump type: patch, minor, major"
    exit 1
fi

# ── Read current version ────────────────────────────────────
PYPROJECT="$PROJECT_ROOT/pyproject.toml"
if [ ! -f "$PYPROJECT" ]; then
    print_error "pyproject.toml not found"
    exit 1
fi

CURRENT_VERSION=$(grep -E '^version' "$PYPROJECT" | head -1 | sed 's/.*= *"\(.*\)"/\1/')
if [ -z "$CURRENT_VERSION" ]; then
    print_error "Could not parse version from pyproject.toml"
    exit 1
fi

print_header "🏷️  Release"
print_info "Current version: $CURRENT_VERSION"

# ── Compute new version ─────────────────────────────────────
IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"

case "$BUMP_TYPE" in
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    patch) patch=$((patch + 1)) ;;
esac

NEW_VERSION="${major}.${minor}.${patch}"
print_info "New version:     $NEW_VERSION"
print_info "Bump type:       $BUMP_TYPE"

if [ "$DRY_RUN" = true ]; then
    print_warning "[dry-run] Would bump $CURRENT_VERSION → $NEW_VERSION"
    print_warning "[dry-run] Would generate changelog"
    print_warning "[dry-run] Would create tag v$NEW_VERSION"
    print_warning "[dry-run] Would push to remote"
    exit 0
fi

# ── Verify clean working tree ───────────────────────────────
if ! git -C "$PROJECT_ROOT" diff --quiet 2>/dev/null; then
    print_error "Working tree has uncommitted changes. Commit or stash first."
    exit 1
fi

# ── Bump version in pyproject.toml ──────────────────────────
print_info "Updating pyproject.toml..."
sed -i.bak "s/^version = \"$CURRENT_VERSION\"/version = \"$NEW_VERSION\"/" "$PYPROJECT"
rm -f "${PYPROJECT}.bak"

# ── Generate changelog ──────────────────────────────────────
CHANGELOG="$PROJECT_ROOT/CHANGELOG.md"
print_info "Generating changelog..."

if [ -f "$PROJECT_ROOT/infra/scripts/maintenance/generate-changelog.sh" ]; then
    "$PROJECT_ROOT/infra/scripts/maintenance/generate-changelog.sh" -o "$CHANGELOG"
else
    echo "# Changelog v$NEW_VERSION" > "$CHANGELOG"
    {
        echo ""
        date '+%Y-%m-%d'
        echo ""
        git -C "$PROJECT_ROOT" log --oneline -20
    } >> "$CHANGELOG"
fi

# ── Commit and tag ──────────────────────────────────────────
print_info "Committing release..."
git -C "$PROJECT_ROOT" add "$PYPROJECT" "$CHANGELOG"
git -C "$PROJECT_ROOT" commit -m "release: v$NEW_VERSION

Bump version from $CURRENT_VERSION to $NEW_VERSION ($BUMP_TYPE release)"

print_info "Creating tag v$NEW_VERSION..."
git -C "$PROJECT_ROOT" tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# ── Push ────────────────────────────────────────────────────
print_info "Pushing to remote..."
git -C "$PROJECT_ROOT" push origin HEAD
git -C "$PROJECT_ROOT" push origin "v$NEW_VERSION"

print_success "Released v$NEW_VERSION! 🎉"
timer_end "Release"
