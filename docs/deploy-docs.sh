#!/usr/bin/env bash
#
# Deploy documentation to GitLab Pages or GitHub Pages
#
# Usage: ./deploy-docs.sh [--provider gitlab|github]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Default provider
PROVIDER="gitlab"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --provider)
            PROVIDER="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./deploy-docs.sh [--provider gitlab|github]"
            exit 1
            ;;
    esac
done

echo "📚 Deploying L.O.V.E. Documentation..."
echo "🎯 Provider: $PROVIDER"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 not found. Please install Python 3.11+"
    exit 1
fi

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Error: git not found. Please install git"
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

# Deploy based on provider
if [ "$PROVIDER" = "github" ]; then
    echo ""
    echo "🚀 Deploying to GitHub Pages..."
    mkdocs gh-deploy --force
    echo ""
    echo "✅ Documentation deployed to GitHub Pages!"
    echo "🌐 Your docs will be available at: https://<username>.github.io/<repo>/"
elif [ "$PROVIDER" = "gitlab" ]; then
    echo ""
    echo "🚀 Building for GitLab Pages..."

    # GitLab Pages expects the site in a 'public' directory
    # Build with custom site_dir
    mkdocs build --clean --site-dir public

    echo ""
    echo "✅ Documentation built for GitLab Pages!"
    echo "📁 Output: $SCRIPT_DIR/public/"
    echo ""
    echo "ℹ️  To deploy to GitLab Pages:"
    echo "   1. Commit the 'public/' directory"
    echo "   2. Push to GitLab"
    echo "   3. Configure Pages in CI/CD settings"
    echo ""
    echo "   Or add this to .gitlab-ci.yml:"
    echo ""
    echo "   pages:"
    echo "     stage: deploy"
    echo "     script:"
    echo "       - cd docs && ./deploy-docs.sh --provider gitlab"
    echo "     artifacts:"
    echo "       paths:"
    echo "         - docs/public"
    echo "     only:"
    echo "       - main"
else
    echo "❌ Error: Unknown provider '$PROVIDER'"
    echo "Supported providers: gitlab, github"
    exit 1
fi
