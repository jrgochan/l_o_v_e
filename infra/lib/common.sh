#!/bin/sh
# L.O.V.E. Stack - Common Utilities
# POSIX-compliant shared functions and utilities

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'  # No Color

# Unicode symbols (with ASCII fallbacks)
if [ -n "$TERM" ] && [ "$TERM" != "dumb" ]; then
    CHECK="✅"
    CROSS="❌"
    WARN="⚠️ "
    INFO="ℹ️ "
    ROCKET="🚀"
else
    CHECK="[OK]"
    CROSS="[ERR]"
    WARN="[WARN]"
    INFO="[INFO]"
    ROCKET=">>>"
fi

# Print colored success message
# Usage: print_success "message"
print_success() {
    printf "%b%s %s%b\n" "$GREEN" "$CHECK" "$1" "$NC"
}

# Print colored error message
# Usage: print_error "message"
print_error() {
    printf "%b%s %s%b\n" "$RED" "$CROSS" "$1" "$NC"
}

# Print colored warning message
# Usage: print_warning "message"
print_warning() {
    printf "%b%s%s%b\n" "$YELLOW" "$WARN" "$1" "$NC"
}

# Print colored info message
# Usage: print_info "message"
print_info() {
    printf "%b%s%s%b\n" "$BLUE" "$INFO" "$1" "$NC"
}

# Print colored header
# Usage: print_header "Header Text"
print_header() {
    printf "\n%b%s%b\n" "$BLUE" "$1" "$NC"
    echo "----------------------------------------"
}

# Check if command exists
# Usage: command_exists <command>
# Returns: 0 if exists, 1 otherwise
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# POSIX-compliant prompt for yes/no
# Usage: prompt_yes_no "Question?"
# Returns: 0 for yes, 1 for no
prompt_yes_no() {
    local question="$1"
    local answer
    
    printf "%s (y/n) " "$question"
    read -r answer
    
    case "$answer" in
        [Yy]|[Yy][Ee][Ss])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# POSIX-compliant string contains check
# Usage: string_contains "haystack" "needle"
# Returns: 0 if found, 1 otherwise
string_contains() {
    local haystack="$1"
    local needle="$2"
    
    case "$haystack" in
        *"$needle"*)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Check if string starts with prefix
# Usage: string_starts_with "string" "prefix"
# Returns: 0 if starts with, 1 otherwise
string_starts_with() {
    local string="$1"
    local prefix="$2"
    
    case "$string" in
        "$prefix"*)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Check if string ends with suffix
# Usage: string_ends_with "string" "suffix"
# Returns: 0 if ends with, 1 otherwise
string_ends_with() {
    local string="$1"
    local suffix="$2"
    
    case "$string" in
        *"$suffix")
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Trim whitespace from string
# Usage: trim_string "  text  "
# Returns: trimmed string via echo
trim_string() {
    local string="$1"
    
    # Remove leading whitespace
    string="${string#"${string%%[![:space:]]*}"}"
    
    # Remove trailing whitespace
    string="${string%"${string##*[![:space:]]}"}"
    
    echo "$string"
}

# Get absolute path of a file/directory
# Usage: get_absolute_path "relative/path"
# Returns: absolute path via echo
get_absolute_path() {
    local path="$1"
    
    if [ -d "$path" ]; then
        (cd "$path" && pwd)
    elif [ -f "$path" ]; then
        local dir=$(dirname "$path")
        local file=$(basename "$path")
        echo "$(cd "$dir" && pwd)/$file"
    else
        echo "$path"
    fi
}

# Check if running as root
# Returns: 0 if root, 1 otherwise
is_root() {
    [ "$(id -u)" -eq 0 ]
}

# Check if port is in use
# Usage: check_port_in_use <port>
# Returns: 0 if in use, 1 otherwise
check_port_in_use() {
    local port="$1"
    
    # Try different methods in order of preference
    if command_exists ss; then
        ss -tln | grep -q ":${port} "
    elif command_exists netstat; then
        netstat -tln | grep -q ":${port} "
    elif command_exists lsof; then
        lsof -i ":${port}" >/dev/null 2>&1
    elif command_exists nc; then
        # Use netcat to check
        nc -z localhost "$port" 2>/dev/null
    else
        # Can't check, assume not in use
        return 1
    fi
}

# Kill process on port
# Usage: kill_process_on_port <port>
kill_process_on_port() {
    local port="$1"
    local sudo_cmd
    
    # Source os-detect if needed
    if command_exists get_sudo; then
        sudo_cmd=$(get_sudo)
    else
        sudo_cmd=""
    fi
    
    if command_exists lsof; then
        local pids
        pids=$(lsof -ti ":${port}" 2>/dev/null)
        if [ -n "$pids" ]; then
            # shellcheck disable=SC2086
            $sudo_cmd kill -9 $pids 2>/dev/null || true
        fi
    elif command_exists ss; then
        # Extract PIDs from ss output
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
# Returns: 0 if available, 1 if timeout
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
# Returns: 0 if responding, 1 otherwise
check_url_responding() {
    local url="$1"
    
    if command_exists curl; then
        curl -s -f "$url" >/dev/null 2>&1
    elif command_exists wget; then
        wget -q --spider "$url" 2>/dev/null
    else
        return 1
    fi
}

# Wait for URL to respond
# Usage: wait_for_url <url> [timeout_seconds]
# Returns: 0 if responding, 1 if timeout
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
backup_file() {
    local file="$1"
    
    if [ -f "$file" ]; then
        local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$file" "$backup"
        echo "$backup"
    fi
}

# Check Python version
# Usage: check_python_version <python_command> <required_major> <required_minor>
# Returns: 0 if version matches, 1 otherwise
check_python_version() {
    local python_cmd="$1"
    local required_major="$2"
    local required_minor="$3"
    
    if ! command_exists "$python_cmd"; then
        return 1
    fi
    
    local version
    version=$("$python_cmd" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
    
    if [ -z "$version" ]; then
        return 1
    fi
    
    local major minor
    major=$(echo "$version" | cut -d. -f1)
    minor=$(echo "$version" | cut -d. -f2)
    
    if [ "$major" -eq "$required_major" ] && [ "$minor" -ge "$required_minor" ]; then
        return 0
    fi
    
    return 1
}

# Find Python 3.11+ command
# Usage: find_python_311
# Returns: python command via echo, or empty if not found
find_python_311() {
    local python_cmd
    
    for cmd in python3.11 python3.12 python3.13 python3 python; do
        if check_python_version "$cmd" 3 11; then
            echo "$cmd"
            return 0
        fi
    done
    
    return 1
}

# Check Node.js version
# Usage: check_node_version <required_major>
# Returns: 0 if version matches, 1 otherwise
check_node_version() {
    local required_major="$1"
    
    if ! command_exists node; then
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

# Log message to file
# Usage: log_message "message" [log_file]
log_message() {
    local message="$1"
    local log_file="${2:-/tmp/love-stack.log}"
    local timestamp
    
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" >> "$log_file"
}

# Check if variable is set and not empty
# Usage: is_set <variable_value>
# Returns: 0 if set and not empty, 1 otherwise
is_set() {
    [ -n "$1" ]
}

# Check if file is older than N days
# Usage: is_file_older_than <file> <days>
# Returns: 0 if older, 1 otherwise
is_file_older_than() {
    local file="$1"
    local days="$2"
    
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    # This is somewhat system-dependent, but works on most Unix-like systems
    local file_age
    local now
    local threshold
    
    if command_exists stat; then
        # Try to get file modification time
        if stat -f %m "$file" >/dev/null 2>&1; then
            # BSD stat (macOS)
            file_age=$(stat -f %m "$file")
        else
            # GNU stat (Linux)
            file_age=$(stat -c %Y "$file")
        fi
        
        now=$(date +%s)
        threshold=$((days * 86400))
        
        if [ $((now - file_age)) -gt "$threshold" ]; then
            return 0
        fi
    fi
    
    return 1
}

# Get script directory (where the script is located)
# Usage: get_script_dir
# Returns: script directory via echo
get_script_dir() {
    local script_path
    
    # Get the directory of the current script
    if [ -n "$BASH_SOURCE" ]; then
        script_path="$BASH_SOURCE"
    else
        script_path="$0"
    fi
    
    dirname "$(get_absolute_path "$script_path")"
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

# Pluralize word
# Usage: pluralize <count> <singular> [plural]
# Returns: singular or plural form via echo
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
