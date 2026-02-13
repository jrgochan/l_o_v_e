#!/bin/bash
# L.O.V.E. Stack - Common Utilities
# Shared functions for all infra scripts (operations + development)

# ============================================================================
# Terminal output — colors, symbols, formatted messages
# ============================================================================

# Color codes (with terminal detection for graceful fallback)
if [ -t 1 ] && [ -n "$TERM" ] && [ "$TERM" != "dumb" ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    NC='\033[0m'
    export CHECK="✅"
    export CROSS="❌"
    export WARN="⚠️ "
    export INFO="ℹ️ "
    export ROCKET="🚀"
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    CYAN=''
    BOLD=''
    NC=''
    CHECK="[OK]"
    CROSS="[ERR]"
    WARN="[WARN]"
    INFO="[INFO]"
    ROCKET=">>>"
fi

# Print colored success message
# Usage: print_success "message"
print_success() {
    printf "%b%s %b%b\n" "$GREEN" "$CHECK" "$1" "$NC"
}

# Print colored error message (to stderr)
# Usage: print_error "message"
print_error() {
    printf "%b%s %b%b\n" "$RED" "$CROSS" "$1" "$NC" >&2
}

# Print colored warning message
# Usage: print_warning "message"
print_warning() {
    printf "%b%s%b%b\n" "$YELLOW" "$WARN" "$1" "$NC"
}

# Print colored info message
# Usage: print_info "message"
print_info() {
    printf "%b%s%b%b\n" "$BLUE" "$INFO" "$1" "$NC"
}

# Print verbose message (only if VERBOSE is true)
# Usage: print_verbose "message"
print_verbose() {
    if [ "${VERBOSE:-false}" = true ]; then
        printf "%b%s [VERBOSE] %s%b\n" "$CYAN" "$INFO" "$1" "$NC"
    fi
}

# Print colored header
# Usage: print_header "Header Text"
print_header() {
    printf "\n%b%b=== %s ===%b\n" "$BLUE" "$BOLD" "$1" "$NC"
    echo "----------------------------------------"
}

# Print a separator line
# Usage: print_separator [character] [length]
print_separator() {
    local char="${1:--}"
    local length="${2:-40}"
    local separator=""
    local i=0

    while [ $i -lt "$length" ]; do
        separator="${separator}${char}"
        i=$((i + 1))
    done

    echo "$separator"
}

# ============================================================================
# macOS-specific PATH fixes
# ============================================================================

if [ "$(uname)" = "Darwin" ]; then
    if [ -d "/opt/homebrew/opt/postgresql@18/bin" ]; then
        export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"
    fi
fi

# ============================================================================
# Command checking
# ============================================================================

# Check if command exists (silent)
# Usage: check_command <name>
# Returns: 0 if exists, 1 otherwise
check_command() {
    command -v "$1" >/dev/null 2>&1
}

# Legacy alias
command_exists() { check_command "$@"; }

# Check if a command exists and print status
# Usage: check_command_verbose <command> [friendly_name]
check_command_verbose() {
    local command_name="$1"
    local friendly_name="${2:-$command_name}"

    if check_command "$command_name"; then
        print_success "$friendly_name found"
        return 0
    else
        print_error "$friendly_name not found"
        return 1
    fi
}

# ============================================================================
# String utilities
# ============================================================================

# Check if string contains substring
# Usage: string_contains "haystack" "needle"
string_contains() {
    local haystack="$1"
    local needle="$2"

    case "$haystack" in
        *"$needle"*) return 0 ;;
        *) return 1 ;;
    esac
}

# Check if string starts with prefix
# Usage: string_starts_with "string" "prefix"
string_starts_with() {
    local string="$1"
    local prefix="$2"

    case "$string" in
        "$prefix"*) return 0 ;;
        *) return 1 ;;
    esac
}

# Check if string ends with suffix
# Usage: string_ends_with "string" "suffix"
string_ends_with() {
    local string="$1"
    local suffix="$2"

    case "$string" in
        *"$suffix") return 0 ;;
        *) return 1 ;;
    esac
}

# Trim whitespace from string
# Usage: trim_string "  text  "
trim_string() {
    local string="$1"
    string="${string#"${string%%[![:space:]]*}"}"
    string="${string%"${string##*[![:space:]]}"}"
    echo "$string"
}

# Pluralize word
# Usage: pluralize <count> <singular> [plural]
pluralize() {
    local count="$1"
    local singular="$2"
    local plural="${3:-${singular}s}"

    if [ "$count" -eq 1 ]; then
        echo "$singular"
    else
        echo "$plural"
    fi
}

# ============================================================================
# File & path utilities
# ============================================================================

# Resolve project root by walking up to find pyproject.toml
# Sets PROJECT_ROOT if not already set. Safe to call multiple times.
# Usage: resolve_project_root [start_dir]
resolve_project_root() {
    # If already set, reuse
    if [ -n "${PROJECT_ROOT:-}" ] && [ -d "$PROJECT_ROOT" ]; then
        return 0
    fi

    local dir="${1:-$(pwd)}"

    while [ "$dir" != "/" ]; do
        if [ -f "$dir/pyproject.toml" ]; then
            PROJECT_ROOT="$dir"
            export PROJECT_ROOT
            return 0
        fi
        dir=$(dirname "$dir")
    done

    print_error "Could not find project root (no pyproject.toml found)"
    return 1
}

# Get absolute path of a file/directory
# Usage: get_absolute_path "relative/path"
get_absolute_path() {
    local path="$1"

    if [ -d "$path" ]; then
        (cd "$path" && pwd)
    elif [ -f "$path" ]; then
        local dir
        local file
        dir=$(dirname "$path")
        file=$(basename "$path")
        echo "$(cd "$dir" && pwd)/$file"
    else
        echo "$path"
    fi
}

# Get script directory (where the script is located)
# Usage: get_script_dir
get_script_dir() {
    local script_path

    if [ -n "${BASH_SOURCE[0]}" ]; then
        script_path="${BASH_SOURCE[0]}"
    else
        script_path="$0"
    fi

    dirname "$(get_absolute_path "$script_path")"
}

# Create directory if it doesn't exist
# Usage: ensure_directory <path>
ensure_directory() {
    local dir="$1"

    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
    fi
}

# Backup file if it exists
# Usage: backup_file <file>
# Returns: backup path via echo
backup_file() {
    local file="$1"

    if [ -f "$file" ]; then
        local backup
        backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$file" "$backup"
        echo "$backup"
    fi
}

# Check if file is older than N days
# Usage: is_file_older_than <file> <days>
is_file_older_than() {
    local file="$1"
    local days="$2"

    if [ ! -f "$file" ]; then
        return 1
    fi

    local file_age now threshold

    if check_command stat; then
        if stat -f %m "$file" >/dev/null 2>&1; then
            file_age=$(stat -f %m "$file")  # BSD/macOS
        else
            file_age=$(stat -c %Y "$file")  # GNU/Linux
        fi

        now=$(date +%s)
        threshold=$((days * 86400))

        if [ $((now - file_age)) -gt "$threshold" ]; then
            return 0
        fi
    fi

    return 1
}

# Check if variable is set and not empty
# Usage: is_set <variable_value>
is_set() {
    [ -n "$1" ]
}

# ============================================================================
# Prompt utilities
# ============================================================================

# Prompt for yes/no
# Usage: prompt_yes_no "Question?"
# Returns: 0 for yes, 1 for no
prompt_yes_no() {
    local question="$1"
    local answer

    printf "%s (y/n) " "$question"
    read -r answer

    case "$answer" in
        [Yy]|[Yy][Ee][Ss]) return 0 ;;
        *) return 1 ;;
    esac
}

# ============================================================================
# System checks — root, ports, URLs
# ============================================================================

# Check if running as root
is_root() {
    [ "$(id -u)" -eq 0 ]
}

# Check if port is in use
# Usage: check_port_in_use <port>
check_port_in_use() {
    local port="$1"

    if check_command ss; then
        ss -tln | grep -q ":${port} "
    elif check_command netstat; then
        netstat -tln | grep -q ":${port} "
    elif check_command lsof; then
        lsof -i ":${port}" >/dev/null 2>&1
    elif check_command nc; then
        nc -z localhost "$port" 2>/dev/null
    else
        return 1
    fi
}

# Kill process on port
# Usage: kill_process_on_port <port>
kill_process_on_port() {
    local port="$1"
    local sudo_cmd

    if check_command get_sudo; then
        sudo_cmd=$(get_sudo)
    else
        sudo_cmd=""
    fi

    if check_command lsof; then
        local pids
        pids=$(lsof -ti ":${port}" 2>/dev/null)
        if [ -n "$pids" ]; then
            # shellcheck disable=SC2086
            $sudo_cmd kill -9 $pids 2>/dev/null || true
        fi
    elif check_command ss; then
        local pids
        pids=$(ss -tlnp | grep ":${port} " | sed -n 's/.*pid=\([0-9]*\).*/\1/p')
        if [ -n "$pids" ]; then
            # shellcheck disable=SC2086
            $sudo_cmd kill -9 $pids 2>/dev/null || true
        fi
    fi
}

# Wait for port to be available
# Usage: wait_for_port <port> [timeout_seconds]
wait_for_port() {
    local port="$1"
    local timeout="${2:-30}"
    local count=0

    while [ $count -lt "$timeout" ]; do
        if check_port_in_use "$port"; then
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done

    return 1
}

# Check if URL is responding
# Usage: check_url_responding <url>
check_url_responding() {
    local url="$1"

    if check_command curl; then
        curl -s -f "$url" >/dev/null 2>&1
    elif check_command wget; then
        wget -q --spider "$url" 2>/dev/null
    else
        return 1
    fi
}

# Wait for URL to respond
# Usage: wait_for_url <url> [timeout_seconds]
wait_for_url() {
    local url="$1"
    local timeout="${2:-30}"
    local count=0

    while [ $count -lt "$timeout" ]; do
        if check_url_responding "$url"; then
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done

    return 1
}

# ============================================================================
# Python toolchain
# ============================================================================

# Get Python 3.11+ command (tries multiple options)
# Usage: python_cmd=$(get_python_cmd)
get_python_cmd() {
    # Try python3.11 first (most specific)
    if check_command python3.11; then
        echo "python3.11"
        return 0
    fi

    # Try python3 and check version
    if check_command python3; then
        local version major minor
        version=$(python3 --version 2>&1 | awk '{print $2}')
        major=$(echo "$version" | cut -d. -f1)
        minor=$(echo "$version" | cut -d. -f2)

        if [ "$major" -eq 3 ] && [ "$minor" -ge 11 ]; then
            echo "python3"
            return 0
        fi
    fi

    # Try brew python (macOS)
    if check_command "/usr/local/bin/python3.11"; then
        echo "/usr/local/bin/python3.11"
        return 0
    fi

    # Try pyenv
    if check_command pyenv; then
        if pyenv versions --bare 2>/dev/null | grep -q "3.11"; then
            echo "pyenv exec python3.11"
            return 0
        fi
    fi

    print_error "Python 3.11+ not found"
    print_info "Install options:"
    print_info "  macOS:  brew install python@3.11"
    print_info "  Ubuntu: sudo apt install python3.11"
    print_info "  pyenv:  pyenv install 3.11"
    return 1
}

# Check Python version meets minimum requirement
# Usage: check_python_version <min_version>
#   e.g.: check_python_version "3.11"
check_python_version() {
    local min_version="$1"
    local python_cmd
    python_cmd=$(get_python_cmd) || return 1

    local version major minor min_major min_minor
    version=$($python_cmd --version 2>&1 | awk '{print $2}')
    major=$(echo "$version" | cut -d. -f1)
    minor=$(echo "$version" | cut -d. -f2)
    min_major=$(echo "$min_version" | cut -d. -f1)
    min_minor=$(echo "$min_version" | cut -d. -f2)

    if [ "$major" -gt "$min_major" ]; then
        return 0
    elif [ "$major" -eq "$min_major" ] && [ "$minor" -ge "$min_minor" ]; then
        return 0
    else
        print_error "Python $version found, but $min_version+ required"
        return 1
    fi
}

# Get pip command (pip3 or pip)
get_pip_cmd() {
    if check_command pip3; then
        echo "pip3"
    elif check_command pip; then
        echo "pip"
    else
        print_error "pip not found"
        return 1
    fi
}

# ============================================================================
# Node.js toolchain
# ============================================================================

# Check Node.js version
# Usage: check_node_version <required_major>
check_node_version() {
    local required_major="$1"

    if ! check_command node; then
        return 1
    fi

    local version
    version=$(node --version 2>&1 | grep -oE '[0-9]+' | head -1)

    if [ -z "$version" ]; then
        return 1
    fi

    if [ "$version" -ge "$required_major" ]; then
        return 0
    fi

    return 1
}

# ============================================================================
# Virtual environment management
# ============================================================================

# Activate project root venv (managed by uv)
# Creates .venv and syncs all deps + dev tools if needed.
# Uses lockfile hash to skip sync when nothing changed.
activate_project_venv() {
    local venv="$PROJECT_ROOT/.venv"

    if [ ! -d "$venv" ] || [ ! -f "$venv/bin/python" ]; then
        print_info "Creating project venv at .venv..."
        if check_command uv; then
            uv venv "$venv" >/dev/null 2>&1
        else
            local python_cmd
            python_cmd=$(get_python_cmd) || return 1
            $python_cmd -m venv "$venv"
        fi
    fi

    # Activate
    export VIRTUAL_ENV="$venv"
    export PATH="$venv/bin:$PATH"

    # Sync dependencies (skip if lockfile hasn't changed)
    if check_command uv; then
        local lockfile="$PROJECT_ROOT/uv.lock"
        local hash_cache="$venv/.lockfile_hash"
        local current_hash=""
        local cached_hash=""

        if [ -f "$lockfile" ]; then
            if check_command md5sum; then
                current_hash=$(md5sum "$lockfile" | cut -d' ' -f1)
            elif check_command md5; then
                current_hash=$(md5 -q "$lockfile")
            fi
        fi

        if [ -f "$hash_cache" ]; then
            cached_hash=$(cat "$hash_cache")
        fi

        if [ -n "$current_hash" ] && [ "$current_hash" = "$cached_hash" ]; then
            print_verbose "Dependencies up to date (lockfile unchanged)"
        else
            print_info "Syncing dependencies with uv..."
            if uv sync --all-extras --quiet 2>/dev/null; then
                print_success "Dependencies synced"
                # Cache the hash
                if [ -n "$current_hash" ]; then
                    echo "$current_hash" > "$hash_cache"
                fi
            else
                print_warning "Failed to sync dependencies (continuing anyway)"
            fi
        fi
    fi

    return 0
}

# Backward compatibility alias
activate_dx_venv() { activate_project_venv; }

# ============================================================================
# Module management
# ============================================================================

# Run command in a specific module directory
# Usage: run_in_module <module_path> <command...>
run_in_module() {
    local module_path="$1"
    shift
    local command_to_run="$*"

    if [ ! -d "$module_path" ]; then
        print_error "Module directory not found: $module_path"
        return 1
    fi

    # shellcheck disable=SC2164
    (cd "$module_path" && eval "$command_to_run")
}

# ============================================================================
# Version management
# ============================================================================

# Load tool versions from TOOL_VERSIONS file
# Usage: load_versions [versions_file]
load_versions() {
    local versions_file="${1:-$PROJECT_ROOT/infra/TOOL_VERSIONS}"

    if [ ! -f "$versions_file" ]; then
        print_warning "TOOL_VERSIONS file not found: $versions_file"
        return 1
    fi

    while IFS='=' read -r key value; do
        case "$key" in
            \#*|'') continue ;;
        esac

        key=$(echo "$key" | tr -d ' ')
        value=$(echo "$value" | tr -d ' ')
        eval "export $key='$value'"
    done < "$versions_file"

    return 0
}

# Get single version from TOOL_VERSIONS file
# Usage: get_version <key> [versions_file]
get_version() {
    local key="$1"
    local versions_file="${2:-$PROJECT_ROOT/infra/TOOL_VERSIONS}"

    if [ ! -f "$versions_file" ]; then
        return 1
    fi

    grep "^${key}=" "$versions_file" | cut -d= -f2 | tr -d ' '
}

# ============================================================================
# Logging
# ============================================================================

# Log message to file
# Usage: log_message "message" [log_file]
log_message() {
    local message="$1"
    local log_file="${2:-/tmp/love-stack.log}"
    local timestamp

    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" >> "$log_file"
}

# ============================================================================
# Script timing
# ============================================================================

# Start a timer. Call at the top of a script.
# Usage: timer_start
timer_start() {
    _LOVE_TIMER_START=${SECONDS:-0}
}

# Print elapsed time since timer_start. Call at the end of a script.
# Usage: timer_end [label]
timer_end() {
    local label="${1:-Script}"
    local elapsed=$(( ${SECONDS:-0} - ${_LOVE_TIMER_START:-0} ))
    local mins=$(( elapsed / 60 ))
    local secs=$(( elapsed % 60 ))

    if [ "$mins" -gt 0 ]; then
        print_info "$label completed in ${mins}m ${secs}s"
    else
        print_info "$label completed in ${secs}s"
    fi
}
