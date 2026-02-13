#!/bin/bash
set -e

# Love Stack Security Scanner
# Runs SAST checks locally.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/../../"

echo "=========================================="
echo "🛡️  Love Stack Security Scanner"
echo "=========================================="

# Check for Python tools
if ! command -v bandit &> /dev/null; then
    echo "⚠️  Bandit not found. Installing..."
    python3 -m pip install bandit
fi

if ! command -v safety &> /dev/null; then
    echo "⚠️  Safety not found. Installing..."
    python3 -m pip install safety
fi

echo ""
echo "🔍 Running SAST (Static Application Security Testing)..."

# 1. Bandit (Python Code Analysis)
echo "------------------------------------------"
echo "🐍 Running Bandit (Python Security Audit)..."
echo "------------------------------------------"
# Exclude tests and migrations
python3 -m bandit -r "$ROOT_DIR/observer" "$ROOT_DIR/listener" "$ROOT_DIR/versor" \
    -x tests,migrations,.venv \
    -ll \
    --format custom --msg-template "{abspath}:{line}: {severity}: {coderr} : {msg}" || true

# 2. Safety (Python Dependencies)
echo ""
echo "------------------------------------------"
echo "📦 Running Safety (Dependency Audit)..."
echo "------------------------------------------"
if [ -f "$ROOT_DIR/observer/requirements.txt" ]; then
    python3 -m safety scan -r "$ROOT_DIR/observer/requirements.txt" --full-report || true
else
    echo "⚠️  No requirements.txt found for safety check."
fi

# 3. npm audit (Frontend)
echo ""
echo "------------------------------------------"
echo "🌐 Running npm audit (Frontend)..."
echo "------------------------------------------"
if [ -d "$ROOT_DIR/experience/web" ]; then
    cd "$ROOT_DIR/experience/web"
    npm audit --audit-level=high || true
    cd "$SCRIPT_DIR"
else
    echo "⚠️  Frontend directory not found."
fi

echo ""
echo "=========================================="
echo "✅ SAST Scan Complete."
echo "=========================================="
echo ""

TARGET_URL="https://love.jrgochan.io"

echo "=========================================="
echo "🕵️  Dynamic Application Security Testing (DAST)"
echo "Target: $TARGET_URL"
echo "=========================================="

# 4. Nikto
if ! command -v nikto &> /dev/null; then
    echo "⚠️  Nikto not found."
    if command -v brew &> /dev/null; then
        echo "🍺 Installing Nikto via Homebrew..."
        brew install nikto
    else
        echo "❌ Homebrew not found. Please install Nikto manually."
    fi
fi

if command -v nikto &> /dev/null; then
    echo ""
    read -p "Run Nikto web server scan? (y/N) " run_nikto
    if [[ "$run_nikto" =~ ^[Yy]$ ]]; then
        echo "------------------------------------------"
        echo "🕷️  Running Nikto..."
        echo "------------------------------------------"
        nikto -h "$TARGET_URL"
    fi
fi

# 5. OWASP ZAP (Podman)
if command -v podman &> /dev/null; then
    echo ""
    read -p "Run OWASP ZAP Baseline Scan (Podman)? (y/N) " run_zap
    if [[ "$run_zap" =~ ^[Yy]$ ]]; then
        echo "------------------------------------------"
        echo "⚡ Running OWASP ZAP..."
        echo "------------------------------------------"
        # Using zaproxy/zap-stable (Official)
        podman run -t zaproxy/zap-stable zap-baseline.py -t "$TARGET_URL"
    fi
else
    echo "⚠️  Podman not found. Skipping OWASP ZAP scan."
fi

echo ""
echo "=========================================="
echo "🎉 Security Audit Complete!"
echo "=========================================="
