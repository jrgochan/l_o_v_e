#!/usr/bin/env bash
#
# Serve MkDocs documentation locally for preview
#
# Usage: ./serve-docs.sh [--port 8000]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Default port
PORT=8000

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --port)
            PORT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./serve-docs.sh [--port 8000]"
            exit 1
            ;;
    esac
done

echo "📚 Starting L.O.V.E. Documentation Server..."
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 not found. Please install Python 3.11+"
    exit 1
fi

# Setup or activate virtual environment
VENV_DIR="$SCRIPT_DIR/.venv"

# Check for broken venv (missing pip or bad interpreter)
if [ -d "$VENV_DIR" ]; then
    if [ ! -x "$VENV_DIR/bin/pip" ] || ! "$VENV_DIR/bin/pip" --version > /dev/null 2>&1; then
        echo "⚠️  Virtual environment appears broken. Recreating..."
        rm -rf "$VENV_DIR"
    fi
fi

if [ ! -d "$VENV_DIR" ]; then
    echo "🔧 Creating virtual environment in docs/.venv..."
    python3 -m venv "$VENV_DIR"
    echo "✅ Virtual environment created"
fi

echo "🔌 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Install/update dependencies
echo "📦 Installing documentation dependencies..."
"$VENV_DIR/bin/pip" install -q -r requirements-docs.txt

# Serve with live reload (mkdocs.yml is in parent directory)
echo ""
echo "🌐 Serving documentation at http://127.0.0.1:$PORT"
echo "📝 Editing markdown files will trigger live reload"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# cd "$SCRIPT_DIR/.."
mkdocs serve --dev-addr "127.0.0.1:$PORT"
