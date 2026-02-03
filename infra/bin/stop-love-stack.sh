#!/bin/bash
# L.O.V.E. Stack - Stop All APIs
# Cross-platform script to stop all running APIs (keeps services running)

# Get script directory (infra/bin)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source cross-platform libraries
. "$PROJECT_ROOT/infra/scripts/lib/os-detect.sh"
. "$PROJECT_ROOT/infra/scripts/lib/package-manager.sh"
. "$PROJECT_ROOT/infra/scripts/lib/service-manager.sh"
. "$PROJECT_ROOT/infra/scripts/lib/common.sh"

PID_FILE="$SCRIPT_DIR/logs/.love-stack.pids"

print_info "Stopping L.O.V.E. Stack..."
echo ""

# Kill Experience Web processes
print_info "Stopping Experience Web..."
pkill -f "next dev.*experience/web" 2>/dev/null || true
kill_process_on_port 3000 2>/dev/null || true
kill_process_on_port 3001 2>/dev/null || true
kill_process_on_port 8003 2>/dev/null || true # PersonaPlex
sleep 1

if [ ! -f "$PID_FILE" ]; then
    print_warning "No running APIs found (PID file doesn't exist)"
    echo "But checked for stray Experience processes"
    exit 0
fi

# Stop each API
while read -r pid name; do
    if kill -0 "$pid" 2>/dev/null; then
        print_info "Stopping $name (PID: $pid)"
        kill "$pid" 2>/dev/null || true
        sleep 1
    else
        echo "$name (PID: $pid) not running"
    fi
done < "$PID_FILE"

# Clean up PID file and lock files
rm -f "$PID_FILE"
rm -f "$SCRIPT_DIR/../experience/web/.next/dev/lock" 2>/dev/null || true

echo ""
print_success "All APIs stopped"
echo ""
print_info "Services are still running. To stop them:"

# Platform-specific stop instructions
INIT_SYSTEM=$(detect_init_system)
case "$INIT_SYSTEM" in
    brew-services)
        echo "  • PostgreSQL: brew services stop postgresql@16"
        echo "  • Redis:      brew services stop redis"
        echo "  • Ollama:     pkill ollama"
        ;;
    systemd)
        echo "  • PostgreSQL: sudo systemctl stop postgresql"
        echo "  • Redis:      sudo systemctl stop redis-server"
        echo "  • Ollama:     pkill ollama"
        ;;
    sysvinit)
        echo "  • PostgreSQL: sudo service postgresql stop"
        echo "  • Redis:      sudo service redis-server stop"
        echo "  • Ollama:     pkill ollama"
        ;;
    *)
        echo "  • PostgreSQL: pg_ctl stop"
        echo "  • Redis:      redis-cli shutdown"
        echo "  • Ollama:     pkill ollama"
        ;;
esac
