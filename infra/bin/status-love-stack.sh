#!/bin/bash
# L.O.V.E. Stack — Status Dashboard
# Quick overview of service health, environment, and disk usage.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=../lib/common.sh
. "$PROJECT_ROOT/infra/lib/common.sh"

print_header "💜 L.O.V.E. Stack Status"

# ── Services ────────────────────────────────────────────────
echo ""
printf "%b%bServices%b\n" "$BOLD" "$BLUE" "$NC"

check_service_status() {
    local name="$1"
    local port="$2"
    local check_cmd="$3"

    if eval "$check_cmd" >/dev/null 2>&1; then
        printf "  %-18s %b%s running%b  (port %s)\n" "$name" "$GREEN" "$CHECK" "$NC" "$port"
    else
        printf "  %-18s %b%s not running%b  (port %s)\n" "$name" "$RED" "$CROSS" "$NC" "$port"
    fi
}

check_service_status "PostgreSQL" "5432" "pg_isready"
check_service_status "Redis" "6379" "redis-cli ping"
check_service_status "Ollama" "11434" "curl -sf --connect-timeout 2 --max-time 3 http://localhost:11434/api/tags"

# Python APIs — check if PID files or ports are active
for svc in Observer:8000 Versor:8001 Listener:8002; do
    name="${svc%%:*}"
    port="${svc##*:}"
    check_service_status "$name API" "$port" "curl -sf --connect-timeout 2 --max-time 3 http://localhost:$port/health"
done

# Experience Web
check_service_status "Experience Web" "3000" "curl -sf --connect-timeout 2 --max-time 3 http://localhost:3000"

# ── Python Environment ──────────────────────────────────────
echo ""
printf "%b%bPython Environment%b\n" "$BOLD" "$BLUE" "$NC"

if [ -d "$PROJECT_ROOT/.venv" ] && [ -x "$PROJECT_ROOT/.venv/bin/python" ]; then
    PY_VERSION=$("$PROJECT_ROOT/.venv/bin/python" --version 2>&1 | awk '{print $2}')
    printf "  Root .venv         %b%s healthy%b  (Python %s)\n" "$GREEN" "$CHECK" "$NC" "$PY_VERSION"
else
    printf "  Root .venv         %b%s missing/broken%b  (run: make setup-dev)\n" "$RED" "$CROSS" "$NC"
fi

for module in versor observer listener; do
    if [ -d "$PROJECT_ROOT/$module/.venv" ] && [ -x "$PROJECT_ROOT/$module/.venv/bin/python" ]; then
        printf "  %-18s %b%s ready%b\n" "$module/.venv" "$GREEN" "$CHECK" "$NC"
    else
        printf "  %-18s %b%s missing%b\n" "$module/.venv" "$YELLOW" "$WARN" "$NC"
    fi
done

# Node modules
if [ -d "$PROJECT_ROOT/experience/web/node_modules" ]; then
    printf "  %-18s %b%s ready%b\n" "experience/web" "$GREEN" "$CHECK" "$NC"
else
    printf "  %-18s %b%s missing%b  (run: make setup)\n" "experience/web" "$YELLOW" "$WARN" "$NC"
fi

# ── Key Tools ────────────────────────────────────────────────
echo ""
printf "%b%bToolchain%b\n" "$BOLD" "$BLUE" "$NC"

for tool in uv python3 node npm shellcheck pre-commit; do
    if check_command "$tool"; then
        ver=$($tool --version 2>&1 | head -1 | grep -oE '[0-9]+\.[0-9]+[^ ]*' | head -1)
        printf "  %-18s %b%s%b  %s\n" "$tool" "$GREEN" "$CHECK" "$NC" "${ver:-installed}"
    else
        printf "  %-18s %b%s not found%b\n" "$tool" "$RED" "$CROSS" "$NC"
    fi
done

# ── Disk Usage ───────────────────────────────────────────────
echo ""
printf "%b%bDisk Usage%b\n" "$BOLD" "$BLUE" "$NC"

# Logs
if [ -d "$PROJECT_ROOT/infra/logs" ]; then
    LOG_SIZE=$(du -sh "$PROJECT_ROOT/infra/logs" 2>/dev/null | cut -f1)
    # Parse MB value for warning
    LOG_MB=$(du -sm "$PROJECT_ROOT/infra/logs" 2>/dev/null | cut -f1)
    if [ "${LOG_MB:-0}" -gt 100 ]; then
        printf "  %-18s %b%s %s%b  (run: make clean-logs)\n" "infra/logs/" "$YELLOW" "$WARN" "$LOG_SIZE" "$NC"
    else
        printf "  %-18s %b%s%b  %s\n" "infra/logs/" "$GREEN" "$CHECK" "$NC" "$LOG_SIZE"
    fi
else
    printf "  %-18s %b%s%b  (empty)\n" "infra/logs/" "$GREEN" "$CHECK" "$NC"
fi

# Venvs
for venv_dir in .venv versor/.venv observer/.venv listener/.venv; do
    if [ -d "$PROJECT_ROOT/$venv_dir" ]; then
        VENV_SIZE=$(du -sh "$PROJECT_ROOT/$venv_dir" 2>/dev/null | cut -f1)
        printf "  %-18s     %s\n" "$venv_dir" "$VENV_SIZE"
    fi
done

# Node modules
if [ -d "$PROJECT_ROOT/experience/web/node_modules" ]; then
    NM_SIZE=$(du -sh "$PROJECT_ROOT/experience/web/node_modules" 2>/dev/null | cut -f1)
    printf "  %-18s     %s\n" "node_modules" "$NM_SIZE"
fi

echo ""
