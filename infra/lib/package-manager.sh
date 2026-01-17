#!/bin/bash
# L.O.V.E. Stack - Package Manager Library
# POSIX-compliant package management abstraction

# Source OS detection if not already loaded
if ! command -v detect_os >/dev/null 2>&1; then
    # shellcheck source=./os-detect.sh
    . "$(dirname "$0")/os-detect.sh"
fi

# Map generic package name to platform-specific name
# Usage: map_package_name <generic_name>
# Returns: platform-specific package name
map_package_name() {
    local pkg="$1"
    local pkg_mgr
    pkg_mgr=$(detect_package_manager)
    
    case "$pkg" in

        python3.14)
            case "$pkg_mgr" in
                brew) echo "python@3.14" ;;
                apt) echo "python3.14 python3.14-venv python3.14-dev" ;;
                dnf|yum) echo "python3.14 python3.14-devel" ;;
                *) echo "$pkg" ;;
            esac
            ;;
        postgresql)
            case "$pkg_mgr" in
                brew)
                    # Use PostgreSQL 18
                    echo "postgresql@18"
                    ;;
                apt) echo "postgresql postgresql-contrib" ;;
                dnf|yum) echo "postgresql-server" ;;
                *) echo "postgresql" ;;
            esac
            ;;
        redis)
            case "$pkg_mgr" in
                brew) echo "redis" ;;
                apt) echo "redis-server" ;;
                dnf|yum) echo "redis" ;;
                *) echo "redis" ;;
            esac
            ;;
        node)
            case "$pkg_mgr" in
                brew) echo "node@18" ;;
                apt) echo "nodejs" ;;
                dnf|yum) echo "nodejs" ;;
                *) echo "nodejs" ;;
            esac
            ;;
        ffmpeg)
            echo "ffmpeg"
            ;;
        build-essential)
            case "$pkg_mgr" in
                apt) echo "build-essential" ;;
                dnf|yum) echo "gcc gcc-c++ make" ;;
                brew) echo "" ;; # Comes with Xcode command line tools
                *) echo "" ;;
            esac
            ;;
        *)
            echo "$pkg"
            ;;
    esac
}

# Check if a package is installed
# Usage: check_package_installed <package_name>
# Returns: 0 if installed, 1 otherwise
check_package_installed() {
    local pkg="$1"
    local pkg_mgr
    pkg_mgr=$(detect_package_manager)
    
    case "$pkg_mgr" in
        brew)
            brew list "$pkg" >/dev/null 2>&1
            ;;
        apt)
            dpkg -l "$pkg" 2>/dev/null | grep -q "^ii"
            ;;
        dnf)
            dnf list installed "$pkg" >/dev/null 2>&1
            ;;
        yum)
            yum list installed "$pkg" >/dev/null 2>&1
            ;;
        pacman)
            pacman -Q "$pkg" >/dev/null 2>&1
            ;;
        *)
            return 1
            ;;
    esac
}

# Install a package using the appropriate package manager
# Usage: install_package <package_name> [--no-confirm]
# Returns: 0 on success, 1 on failure
install_package() {
    local pkg="$1"
    local no_confirm="$2"
    local pkg_mgr
    local mapped_pkg
    local sudo_cmd
    
    pkg_mgr=$(detect_package_manager)
    mapped_pkg=$(map_package_name "$pkg")
    sudo_cmd=$(get_sudo)
    
    # Skip if nothing to install
    if [ -z "$mapped_pkg" ]; then
        return 0
    fi
    
    case "$pkg_mgr" in
        brew)
            # Homebrew doesn't need sudo
            if [ "$no_confirm" = "--no-confirm" ]; then
                HOMEBREW_NO_AUTO_UPDATE=1 brew install "$mapped_pkg"
            else
                brew install "$mapped_pkg"
            fi
            ;;
        apt)
            if [ "$no_confirm" = "--no-confirm" ]; then
                $sudo_cmd apt-get install -y "$mapped_pkg"
            else
                $sudo_cmd apt-get install "$mapped_pkg"
            fi
            ;;
        dnf)
            if [ "$no_confirm" = "--no-confirm" ]; then
                $sudo_cmd dnf install -y "$mapped_pkg"
            else
                $sudo_cmd dnf install "$mapped_pkg"
            fi
            ;;
        yum)
            if [ "$no_confirm" = "--no-confirm" ]; then
                $sudo_cmd yum install -y "$mapped_pkg"
            else
                $sudo_cmd yum install "$mapped_pkg"
            fi
            ;;
        pacman)
            if [ "$no_confirm" = "--no-confirm" ]; then
                $sudo_cmd pacman -S --noconfirm "$mapped_pkg"
            else
                $sudo_cmd pacman -S "$mapped_pkg"
            fi
            ;;
        *)
            echo "Unknown package manager: $pkg_mgr"
            return 1
            ;;
    esac
}

# Update package repository
# Usage: update_package_repo
update_package_repo() {
    local pkg_mgr
    local sudo_cmd
    
    pkg_mgr=$(detect_package_manager)
    sudo_cmd=$(get_sudo)
    
    case "$pkg_mgr" in
        brew)
            brew update
            ;;
        apt)
            $sudo_cmd apt-get update
            ;;
        dnf)
            $sudo_cmd dnf check-update || true
            ;;
        yum)
            $sudo_cmd yum check-update || true
            ;;
        pacman)
            $sudo_cmd pacman -Sy
            ;;
        *)
            return 1
            ;;
    esac
}

# Add a repository (for special packages)
# Usage: add_repository <repo_identifier>
add_repository() {
    local repo="$1"
    local pkg_mgr
    local sudo_cmd
    local os_family
    
    pkg_mgr=$(detect_package_manager)
    sudo_cmd=$(get_sudo)
    os_family=$(get_os_family)
    
    case "$repo" in
        python-deadsnakes)
            if [ "$pkg_mgr" = "apt" ]; then
                # Check if software-properties-common is installed
                if ! command -v add-apt-repository >/dev/null 2>&1; then
                    $sudo_cmd apt-get install -y software-properties-common
                fi
                $sudo_cmd add-apt-repository ppa:deadsnakes/ppa -y
                $sudo_cmd apt-get update
            fi
            ;;
        postgresql-official)
            if [ "$pkg_mgr" = "apt" ]; then
                # Add PostgreSQL APT repository
                if [ ! -f /etc/apt/sources.list.d/pgdg.list ]; then
                    # shellcheck disable=SC2016
                    $sudo_cmd sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
                    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | $sudo_cmd apt-key add -
                    $sudo_cmd apt-get update
                fi
            fi
            ;;
        nodesource-18)
            if [ "$pkg_mgr" = "apt" ]; then
                if [ ! -f /etc/apt/sources.list.d/nodesource.list ]; then
                    curl -fsSL https://deb.nodesource.com/setup_18.x | $sudo_cmd -E bash -
                fi
            fi
            ;;
        *)
            echo "Unknown repository: $repo"
            return 1
            ;;
    esac
}

# Install development tools (compilers, etc.)
# Usage: install_dev_tools
install_dev_tools() {
    local os_family
    os_family=$(get_os_family)
    
    case "$os_family" in
        macos)
            # Check for Xcode Command Line Tools
            if ! xcode-select -p >/dev/null 2>&1; then
                echo "Installing Xcode Command Line Tools..."
                xcode-select --install
                echo "Please complete the Xcode installation and re-run this script."
                return 1
            fi
            ;;
        debian)
            install_package build-essential --no-confirm
            ;;
        redhat)
            install_package gcc --no-confirm
            install_package gcc-c++ --no-confirm
            install_package make --no-confirm
            ;;
        *)
            echo "Unknown OS family for dev tools installation"
            return 1
            ;;
    esac
}

# Install Python 3.14 (handles special cases like PPA on Ubuntu)
# Usage: install_python_314
install_python_314() {
    local pkg_mgr
    pkg_mgr=$(detect_package_manager)
    
    # Add Python PPA for Ubuntu/Debian
    if [ "$pkg_mgr" = "apt" ]; then
        add_repository python-deadsnakes
    fi
    
    # Install Python 3.14
    install_package python3.14 --no-confirm
}

# Install PostgreSQL 18 (handles special cases like official repo)
# Usage: install_postgresql_18
install_postgresql_18() {
    local pkg_mgr
    pkg_mgr=$(detect_package_manager)
    
    # Add PostgreSQL official repository for Ubuntu/Debian
    if [ "$pkg_mgr" = "apt" ]; then
        add_repository postgresql-official
    fi
    
    # Install PostgreSQL 18
    install_package postgresql --no-confirm
}

# Install Node.js 18+ (handles special cases like NodeSource)
# Usage: install_nodejs_18
install_nodejs_18() {
    local pkg_mgr
    pkg_mgr=$(detect_package_manager)
    
    # Add NodeSource repository for Ubuntu/Debian
    if [ "$pkg_mgr" = "apt" ]; then
        add_repository nodesource-18
    fi
    
    # Install Node.js
    install_package node --no-confirm
}

# Install Ollama (special installation method)
# Usage: install_ollama
install_ollama() {
    local pkg_mgr
    pkg_mgr=$(detect_package_manager)
    
    if [ "$pkg_mgr" = "brew" ]; then
        install_package ollama --no-confirm
    else
        # Use official install script for Linux
        if ! command -v ollama >/dev/null 2>&1; then
            echo "Installing Ollama via official script..."
            curl -fsSL https://ollama.com/install.sh | sh
        fi
    fi
}

# Check if command/binary is available
# Usage: check_command <command_name>
# Returns: 0 if available, 1 otherwise
check_command() {
    command -v "$1" >/dev/null 2>&1
}
