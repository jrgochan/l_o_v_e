#!/usr/bin/env bash
# L.O.V.E. Documentation Build Script
# Builds MkDocs static site from markdown documentation
#
# This script builds the L.O.V.E. Platform documentation using MkDocs Material theme.
# Output is generated to docs-build/ directory at workspace root.
#
# Requirements:
#   - Python 3.9+
#   - MkDocs and dependencies (auto-installed in .venv)
#
# Usage:
#   ./build-docs.sh              # Standard build
#   ./build-docs.sh --help       # Show detailed help
#   ./build-docs.sh --strict     # Fail on warnings
#
# For more information, see: docs/README.md

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments
STRICT_MODE=false
CLEAN_BUILD=true
VERBOSE=false
QUIET=false

show_help() {
    # Check if terminal supports colors
    if [ -t 1 ] && command -v tput >/dev/null 2>&1 && [ "$(tput colors 2>/dev/null)" -ge 8 ]; then
        # Terminal supports colors
        local BOLD='\033[1m'
        local BLUE='\033[0;34m'
        local GREEN='\033[0;32m'
        local NC='\033[0m'

        echo -e "${BOLD}L.O.V.E. Documentation Build Script${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${BOLD}DESCRIPTION${NC}"
        echo "    Builds the L.O.V.E. Platform documentation using MkDocs Material theme."
        echo "    Creates a static site in docs-build/ directory."
        echo ""
        echo -e "${BOLD}USAGE${NC}"
        echo "    ./build-docs.sh [OPTIONS]"
        echo ""
        echo -e "${BOLD}OPTIONS${NC}"
        echo "    -h, --help          Show this help message"
        echo "    --version           Show version information"
        echo "    --strict            Enable strict mode (fail on warnings)"
        echo "    --no-strict         Disable strict mode (default)"
        echo "    --clean             Clean build - default"
        echo "    --no-clean          Incremental build ${GREEN}(faster)${NC}"
        echo "    -v, --verbose       Detailed build output"
        echo "    -q, --quiet         Minimal output"
        echo ""
        echo -e "${BOLD}EXAMPLES${NC}"
        echo "    Standard:     ./build-docs.sh"
        echo "    Strict:       ./build-docs.sh --strict"
        echo -e "    ${GREEN}Fast:${NC}         ./build-docs.sh --no-clean"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    else
        # Plain text fallback
        cat << 'EOF'
L.O.V.E. Documentation Build Script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DESCRIPTION
    Builds the L.O.V.E. Platform documentation using MkDocs Material theme.
    Creates a static site in docs-build/ directory.

USAGE
    ./build-docs.sh [OPTIONS]

OPTIONS
    -h, --help          Show this help message
    --version           Show version information
    --strict            Enable strict mode (fail on warnings, broken links)
    --no-strict         Disable strict mode (default)
    --clean             Clean build (remove old output first) - default
    --no-clean          Incremental build (faster for development)
    -v, --verbose       Show detailed build output
    -q, --quiet         Minimal output (errors only)

WHAT IT DOES
    1. Creates Python virtual environment (if needed)
    2. Installs MkDocs and dependencies
    3. Builds static documentation site
    4. Validates links and structure (if --strict)

EXAMPLES
    Standard build:
    $ ./build-docs.sh

    Strict build (CI/CD):
    $ ./build-docs.sh --strict

    Quick incremental build:
    $ ./build-docs.sh --no-clean --no-strict

    Verbose build for debugging:
    $ ./build-docs.sh --verbose

OUTPUT
    docs-build/         Static site ready to deploy
    docs/.venv/          Python virtual environment

NEXT STEPS
    - Preview: ./serve-docs.sh
    - Deploy: ./deploy-docs.sh
    - Open: open docs-build/index.html

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
L.O.V.E. Stack Documentation
EOF
    fi
    exit 0
}

show_version() {
    echo "L.O.V.E. Documentation Build Script"
    echo "Version: 1.0.0 (2026-01-03)"
    echo "MkDocs Material Theme"
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
        --strict)
            STRICT_MODE=true
            shift
            ;;
        --no-strict)
            STRICT_MODE=false
            shift
            ;;
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --no-clean)
            CLEAN_BUILD=false
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
        *)
            echo "Unknown option: $1"
            echo "Try './build-docs.sh --help' for more information."
            exit 1
            ;;
    esac
done

cd "$SCRIPT_DIR"

if [ "$QUIET" = false ]; then
    echo "📚 Building L.O.V.E. Documentation..."
    echo ""
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 not found. Please install Python 3.9+"
    exit 1
fi

# Setup .venv
VENV_DIR="$SCRIPT_DIR/.venv"

# Check for broken venv (missing pip or bad interpreter)
if [ -d "$VENV_DIR" ]; then
    if [ ! -x "$VENV_DIR/bin/pip" ] || ! "$VENV_DIR/bin/pip" --version > /dev/null 2>&1; then
        [ "$QUIET" = false ] && echo "⚠️  Virtual environment appears broken. Recreating..."
        rm -rf "$VENV_DIR"
    fi
fi

if [ ! -d "$VENV_DIR" ]; then
    [ "$QUIET" = false ] && echo "🔧 Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
    [ "$QUIET" = false ] && echo "✅ Virtual environment created"
fi

[ "$QUIET" = false ] && echo "🔌 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Install dependencies
[ "$QUIET" = false ] && echo "📦 Installing documentation dependencies..."
if [ "$VERBOSE" = true ]; then
    "$VENV_DIR/bin/pip" install -r requirements-docs.txt
else
    "$VENV_DIR/bin/pip" install -q -r requirements-docs.txt
fi

# Lint documentation (soft check)
if [ -f "$SCRIPT_DIR/lint-docs.sh" ]; then
    echo ""
    echo "🔍 Running documentation linter..."
    bash "$SCRIPT_DIR/lint-docs.sh" || echo "⚠️  Linting found issues (see above)"
    echo ""
fi

# Build
[ "$QUIET" = false ] && echo ""
[ "$QUIET" = false ] && echo "🔨 Building MkDocs site..."

# cd "$SCRIPT_DIR/.."

# Build command with options
BUILD_CMD="mkdocs build"

if [ "$CLEAN_BUILD" = true ]; then
    BUILD_CMD="$BUILD_CMD --clean"
fi

if [ "$STRICT_MODE" = true ]; then
    BUILD_CMD="$BUILD_CMD --strict"
    [ "$QUIET" = false ] && echo "⚠️  Strict mode: Build will fail on warnings"
fi

if [ "$VERBOSE" = true ]; then
    BUILD_CMD="$BUILD_CMD --verbose"
fi

# Execute build
if [ "$VERBOSE" = true ] || [ "$QUIET" = false ]; then
    $BUILD_CMD
else
    $BUILD_CMD > /dev/null 2>&1
fi

if [ $? -eq 0 ]; then
    if [ "$QUIET" = false ]; then
        echo ""
        echo "✅ Documentation built successfully!"
        echo "📁 Output: docs-build/"
        echo ""
        echo "Next steps:"
        echo "  - Preview: cd docs && ./serve-docs.sh"
        echo "  - Open: open docs-build/index.html"
        echo "  - Deploy: cd docs && ./deploy-docs.sh"
    fi
    exit 0
else
    echo "❌ Build failed"
    exit 1
fi
