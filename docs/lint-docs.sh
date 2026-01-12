#!/usr/bin/env bash
#
# Lint documentation markdown files using pymarkdownl
#
# Usage: ./lint-docs.sh [fix]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Setup or activate virtual environment
VENV_DIR="$SCRIPT_DIR/.venv"

if [ -d "$VENV_DIR" ]; then
    if [ ! -x "$VENV_DIR/bin/pip" ] || ! "$VENV_DIR/bin/pip" --version > /dev/null 2>&1; then
        echo "⚠️  Virtual environment appears broken. Recreating..."
        rm -rf "$VENV_DIR"
    fi
fi

if [ ! -d "$VENV_DIR" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Check if node is available
if ! command -v npm &> /dev/null; then
    echo "⚠️  Node.js/npm not found. Skipping linting."
    exit 0
fi

echo "🔍 Linting documentation (using markdownlint)..."

# Run markdownlint via npx
# We use a custom config if present, or defaults
if [ "$1" == "fix" ]; then
    echo "🛠️  Auto-fixing issues..."
    npx -y markdownlint-cli "**/*.md" --fix --ignore "node_modules" --ignore ".venv"
else
    npx -y markdownlint-cli "**/*.md" --ignore "node_modules" --ignore ".venv"
fi

echo "✅ Linting passed (or finished)!"
