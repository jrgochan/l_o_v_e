#!/bin/sh
# Common utility functions for DX verification scripts
# POSIX-compliant for maximum portability

# Color codes for terminal output
if [ -t 1 ]; then
    # Terminal supports colors
    COLOR_RESET='\033[0m'
    COLOR_RED='\033[0;31m'
    COLOR_GREEN='\033[0;32m'
    COLOR_YELLOW='\033[0;33m'
    COLOR_BLUE='\033[0;34m'
    COLOR_BOLD='\033[1m'
else
    # No color support
    COLOR_RESET=''
    COLOR_RED=''
    COLOR_GREEN=''
    COLOR_YELLOW=''
    COLOR_BLUE=''
    COLOR_BOLD=''
fi

# Print formatted header
print_header() {
    message="$1"
    printf "\n${COLOR_BLUE}${COLOR_BOLD}=== %s ===${COLOR_RESET}\n" "$message"
}

# Print success message
print_success() {
    message="$1"
    printf "${COLOR_GREEN}✓${COLOR_RESET} %s\n" "$message"
}

# Print error message
print_error() {
    message="$1"
    printf "${COLOR_RED}✗${COLOR_RESET} %s\n" "$message" >&2
}

# Print warning message
print_warning() {
    message="$1"
    printf "${COLOR_YELLOW}⚠${COLOR_RESET} %s\n" "$message"
}

# Print info message
print_info() {
    message="$1"
    printf "${COLOR_BLUE}ℹ${COLOR_RESET} %s\n" "$message"
}

# Check if a command exists
check_command() {
    command_name="$1"
    if command -v "$command_name" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check if a command exists and print status
check_command_verbose() {
    command_name="$1"
    friendly_name="${2:-$command_name}"
    
    if check_command "$command_name"; then
        print_success "$friendly_name found"
        return 0
    else
        print_error "$friendly_name not found"
        return 1
    fi
}

# Run command in a specific module directory
run_in_module() {
    module_path="$1"
    shift
    command_to_run="$*"
    
    if [ ! -d "$module_path" ]; then
        print_error "Module directory not found: $module_path"
        return 1
    fi
    
    # shellcheck disable=SC2164
    (cd "$module_path" && eval "$command_to_run")
}

# Get Python 3.11+ command (tries multiple options)
get_python_cmd() {
    # Try python3.11 first (most specific)
    if check_command python3.11; then
        echo "python3.11"
        return 0
    fi
    
    # Try python3 and check version
    if check_command python3; then
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

# Get or create DX tools venv
get_dx_venv() {
    dx_venv="$PROJECT_ROOT/infra/.venv-dx"
    
    if [ -d "$dx_venv" ] && [ -f "$dx_venv/bin/python" ]; then
        echo "$dx_venv"
        return 0
    fi
    
    # Create venv
    python_cmd=$(get_python_cmd) || return 1
    
    print_info "Creating DX tools venv at infra/.venv-dx..."
    if $python_cmd -m venv "$dx_venv"; then
        print_success "DX venv created"
        echo "$dx_venv"
        return 0
    else
        print_error "Failed to create DX venv"
        return 1
    fi
}

# Activate DX venv and return pip command
# Activate DX venv and return pip command
activate_dx_venv() {
    dx_venv=$(get_dx_venv) || return 1
    
    # Export venv paths
    export VIRTUAL_ENV="$dx_venv"
    export PATH="$dx_venv/bin:$PATH"
    
    return 0
}

# Get pip path within DX venv
get_dx_pip() {
    dx_venv=$(get_dx_venv) || return 1
    echo "$dx_venv/bin/pip"
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

# Check Python version meets minimum requirement
check_python_version() {
    min_version="$1"
    python_cmd=$(get_python_cmd) || return 1
    
    version=$($python_cmd --version 2>&1 | awk '{print $2}')
    
    # Simple version comparison (assumes 3.x format)
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

# Load tool versions from TOOL_VERSIONS file
load_versions() {
    versions_file="${1:-$PROJECT_ROOT/infra/TOOL_VERSIONS}"
    
    if [ ! -f "$versions_file" ]; then
        print_warning "TOOL_VERSIONS file not found: $versions_file"
        return 1
    fi
    
    # Parse and export all version variables
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        case "$key" in
            \#*|'') continue ;;
        esac
        
        # Export the variable (trim whitespace)
        key=$(echo "$key" | tr -d ' ')
        value=$(echo "$value" | tr -d ' ')
        eval "export $key='$value'"
    done < "$versions_file"
    
    return 0
}

# Get version from TOOL_VERSIONS file
get_version() {
    key="$1"
    versions_file="${2:-$PROJECT_ROOT/infra/TOOL_VERSIONS}"
    
    if [ ! -f "$versions_file" ]; then
        return 1
    fi
    
    value=$(grep "^${key}=" "$versions_file" | cut -d= -f2 | tr -d ' ')
    echo "$value"
}

# Export functions for use in other scripts
# (Note: In POSIX sh, functions are automatically available to sourced scripts)
