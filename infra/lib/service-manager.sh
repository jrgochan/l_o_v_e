#!/bin/sh
# L.O.V.E. Stack - Service Manager Library
# POSIX-compliant service management abstraction

# Source OS detection if not already loaded
if ! command -v detect_os >/dev/null 2>&1; then
    # shellcheck source=./os-detect.sh
    . "$(dirname "$0")/os-detect.sh"
fi

# Map generic service name to platform-specific service name
# Usage: map_service_name <generic_name>
# Returns: platform-specific service name
map_service_name() {
    local service="$1"
    local init_system
    local pkg_mgr
    
    init_system=$(detect_init_system)
    pkg_mgr=$(detect_package_manager)
    
    case "$service" in
        postgresql)
            case "$init_system" in
                brew-services)
                    # Detect installed PostgreSQL version dynamically
                    # Prioritize postgresql@18, then sort by version descending
                    if brew services list | grep -q "^postgresql@18"; then
                         echo "postgresql@18"
                    elif brew services list | grep -q "^postgresql@"; then
                        brew services list | grep "^postgresql@" | awk '{print $1}' | sort -r | head -1
                    else
                        echo "postgresql"
                    fi
                    ;;
                systemd|sysvinit) echo "postgresql" ;;
                *) echo "postgresql" ;;
            esac
            ;;
        redis)
            case "$init_system" in
                brew-services) echo "redis" ;;
                systemd) echo "redis-server" ;;
                sysvinit) echo "redis-server" ;;
                *) echo "redis" ;;
            esac
            ;;
        *)
            echo "$service"
            ;;
    esac
}

# Start a service using the appropriate init system
# Usage: start_service <service_name>
# Returns: 0 on success, 1 on failure
start_service() {
    local service="$1"
    local init_system
    local mapped_service
    local sudo_cmd
    
    init_system=$(detect_init_system)
    mapped_service=$(map_service_name "$service")
    sudo_cmd=$(get_sudo)
    
    case "$init_system" in
        brew-services)
            brew services start "$mapped_service"
            ;;
        systemd)
            $sudo_cmd systemctl start "$mapped_service"
            ;;
        sysvinit)
            $sudo_cmd service "$mapped_service" start
            ;;
        openrc)
            $sudo_cmd rc-service "$mapped_service" start
            ;;
        none)
            # Manual service startup
            case "$service" in
                postgresql)
                    $sudo_cmd pg_ctl -D /var/lib/postgresql/data -l /var/log/postgresql/postgresql.log start
                    ;;
                redis)
                    $sudo_cmd redis-server /etc/redis/redis.conf --daemonize yes
                    ;;
                *)
                    echo "Cannot start $service - no init system and no manual method"
                    return 1
                    ;;
            esac
            ;;
        *)
            echo "Unknown init system: $init_system"
            return 1
            ;;
    esac
}

# Stop a service using the appropriate init system
# Usage: stop_service <service_name>
# Returns: 0 on success, 1 on failure
stop_service() {
    local service="$1"
    local init_system
    local mapped_service
    local sudo_cmd
    
    init_system=$(detect_init_system)
    mapped_service=$(map_service_name "$service")
    sudo_cmd=$(get_sudo)
    
    case "$init_system" in
        brew-services)
            brew services stop "$mapped_service"
            ;;
        systemd)
            $sudo_cmd systemctl stop "$mapped_service"
            ;;
        sysvinit)
            $sudo_cmd service "$mapped_service" stop
            ;;
        openrc)
            $sudo_cmd rc-service "$mapped_service" stop
            ;;
        none)
            # Manual service shutdown
            case "$service" in
                postgresql)
                    $sudo_cmd pg_ctl -D /var/lib/postgresql/data stop
                    ;;
                redis)
                    $sudo_cmd redis-cli shutdown
                    ;;
                *)
                    echo "Cannot stop $service - no init system and no manual method"
                    return 1
                    ;;
            esac
            ;;
        *)
            echo "Unknown init system: $init_system"
            return 1
            ;;
    esac
}

# Restart a service using the appropriate init system
# Usage: restart_service <service_name>
# Returns: 0 on success, 1 on failure
restart_service() {
    local service="$1"
    local init_system
    local mapped_service
    local sudo_cmd
    
    init_system=$(detect_init_system)
    mapped_service=$(map_service_name "$service")
    sudo_cmd=$(get_sudo)
    
    case "$init_system" in
        brew-services)
            brew services restart "$mapped_service"
            ;;
        systemd)
            $sudo_cmd systemctl restart "$mapped_service"
            ;;
        sysvinit)
            $sudo_cmd service "$mapped_service" restart
            ;;
        openrc)
            $sudo_cmd rc-service "$mapped_service" restart
            ;;
        none)
            stop_service "$service"
            sleep 2
            start_service "$service"
            ;;
        *)
            echo "Unknown init system: $init_system"
            return 1
            ;;
    esac
}

# Check if a service is running
# Usage: check_service_running <service_name>
# Returns: 0 if running, 1 otherwise
check_service_running() {
    local service="$1"
    local init_system
    local mapped_service
    
    init_system=$(detect_init_system)
    mapped_service=$(map_service_name "$service")
    
    # For PostgreSQL and Redis, use functional checks first (more reliable)
    case "$service" in
        postgresql)
            # Priority 1: Check if PostgreSQL is actually responding
            if check_postgres_ready; then
                return 0
            fi
            ;;
        redis)
            # Priority 1: Check if Redis is actually responding
            if check_redis_ready; then
                return 0
            fi
            ;;
    esac
    
    # Priority 2: Check service manager status
    case "$init_system" in
        brew-services)
            brew services list | grep "$mapped_service" | grep -q "started"
            ;;
        systemd)
            systemctl is-active --quiet "$mapped_service"
            ;;
        sysvinit)
            service "$mapped_service" status >/dev/null 2>&1
            ;;
        openrc)
            rc-service "$mapped_service" status >/dev/null 2>&1
            ;;
        none)
            # Check by process/port
            case "$service" in
                postgresql)
                    pg_isready >/dev/null 2>&1
                    ;;
                redis)
                    redis-cli ping >/dev/null 2>&1
                    ;;
                ollama)
                    curl -s http://localhost:11434/api/tags >/dev/null 2>&1
                    ;;
                *)
                    return 1
                    ;;
            esac
            ;;
        *)
            return 1
            ;;
    esac
}

# Enable a service to start on boot
# Usage: enable_service <service_name>
# Returns: 0 on success, 1 on failure
enable_service() {
    local service="$1"
    local init_system
    local mapped_service
    local sudo_cmd
    
    init_system=$(detect_init_system)
    mapped_service=$(map_service_name "$service")
    sudo_cmd=$(get_sudo)
    
    case "$init_system" in
        brew-services)
            # Homebrew services are enabled when started
            return 0
            ;;
        systemd)
            $sudo_cmd systemctl enable "$mapped_service"
            ;;
        sysvinit)
            $sudo_cmd update-rc.d "$mapped_service" defaults
            ;;
        openrc)
            $sudo_cmd rc-update add "$mapped_service" default
            ;;
        *)
            # Not supported or not needed
            return 0
            ;;
    esac
}

# Disable a service from starting on boot
# Usage: disable_service <service_name>
# Returns: 0 on success, 1 on failure
disable_service() {
    local service="$1"
    local init_system
    local mapped_service
    local sudo_cmd
    
    init_system=$(detect_init_system)
    mapped_service=$(map_service_name "$service")
    sudo_cmd=$(get_sudo)
    
    case "$init_system" in
        brew-services)
            # Homebrew services are disabled when stopped
            return 0
            ;;
        systemd)
            $sudo_cmd systemctl disable "$mapped_service"
            ;;
        sysvinit)
            $sudo_cmd update-rc.d -f "$mapped_service" remove
            ;;
        openrc)
            $sudo_cmd rc-update del "$mapped_service" default
            ;;
        *)
            # Not supported or not needed
            return 0
            ;;
    esac
}

# Get service status string
# Usage: get_service_status <service_name>
# Returns: status string
get_service_status() {
    local service="$1"
    
    if check_service_running "$service"; then
        echo "running"
    else
        echo "stopped"
    fi
}

# Start Ollama service (special handling)
# Usage: start_ollama
start_ollama() {
    local init_system
    init_system=$(detect_init_system)
    
    # Check if already running
    if check_service_running ollama; then
        return 0
    fi
    
    case "$init_system" in
        brew-services)
            # Try brew services first
            if brew services list | grep -q ollama; then
                brew services start ollama
            else
                # Fall back to direct command
                nohup ollama serve >/dev/null 2>&1 &
            fi
            ;;
        systemd)
            # Try systemd service if available
            if systemctl list-unit-files | grep -q ollama; then
                systemctl start ollama
            else
                # Fall back to direct command
                nohup ollama serve >/dev/null 2>&1 &
            fi
            ;;
        *)
            # Direct command for other systems
            nohup ollama serve >/dev/null 2>&1 &
            ;;
    esac
    
    # Wait for Ollama to be ready
    local max_wait=10
    local count=0
    while [ $count -lt $max_wait ]; do
        if check_service_running ollama; then
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    return 1
}

# Stop Ollama service (special handling)
# Usage: stop_ollama
stop_ollama() {
    local init_system
    init_system=$(detect_init_system)
    
    case "$init_system" in
        brew-services)
            if brew services list | grep ollama | grep -q "started"; then
                brew services stop ollama
            else
                pkill -f "ollama serve" || true
            fi
            ;;
        systemd)
            if systemctl list-unit-files | grep -q ollama; then
                systemctl stop ollama
            else
                pkill -f "ollama serve" || true
            fi
            ;;
        *)
            pkill -f "ollama serve" || true
            ;;
    esac
}

# Check PostgreSQL readiness
# Usage: check_postgres_ready
# Returns: 0 if ready, 1 otherwise
check_postgres_ready() {
    if command -v pg_isready >/dev/null 2>&1; then
        pg_isready >/dev/null 2>&1
    else
        # Fallback: try to connect to default port
        if command -v nc >/dev/null 2>&1; then
            nc -z localhost 5432 2>/dev/null
        else
            return 1
        fi
    fi
}

# Check Redis readiness
# Usage: check_redis_ready
# Returns: 0 if ready, 1 otherwise
check_redis_ready() {
    if command -v redis-cli >/dev/null 2>&1; then
        redis-cli ping >/dev/null 2>&1
    else
        # Fallback: try to connect to default port
        if command -v nc >/dev/null 2>&1; then
            nc -z localhost 6379 2>/dev/null
        else
            return 1
        fi
    fi
}

# Wait for a service to be ready
# Usage: wait_for_service <service_name> [timeout_seconds]
# Returns: 0 if ready, 1 if timeout
wait_for_service() {
    local service="$1"
    local timeout="${2:-30}"
    local count=0
    
    while [ $count -lt "$timeout" ]; do
        case "$service" in
            postgresql)
                if check_postgres_ready; then
                    return 0
                fi
                ;;
            redis)
                if check_redis_ready; then
                    return 0
                fi
                ;;
            ollama)
                if check_service_running ollama; then
                    return 0
                fi
                ;;
            *)
                if check_service_running "$service"; then
                    return 0
                fi
                ;;
        esac
        
        sleep 1
        count=$((count + 1))
    done
    
    return 1
}
