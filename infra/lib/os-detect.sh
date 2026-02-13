#!/bin/bash
# L.O.V.E. Stack - OS Detection Library
# platform detection functions

# Detect the operating system
# Returns: "macos", "ubuntu", "debian", "rhel", "fedora", "arch", "wsl", "unknown"
detect_os() {
    if [ "$(uname)" = "Darwin" ]; then
        echo "macos"
        return 0
    fi

    # Check if we're in WSL
    if is_wsl; then
        # Detect Linux distro within WSL
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            case "$ID" in
                ubuntu) echo "wsl-ubuntu" ;;
                debian) echo "wsl-debian" ;;
                *) echo "wsl-$ID" ;;
            esac
        else
            echo "wsl"
        fi
        return 0
    fi

    # Detect Linux distribution
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    elif [ -f /etc/redhat-release ]; then
        echo "rhel"
    elif [ -f /etc/debian_version ]; then
        echo "debian"
    else
        echo "unknown"
    fi
}

# Check if running in WSL
# Returns: 0 if WSL, 1 otherwise
is_wsl() {
    if [ -f /proc/version ]; then
        if grep -qi microsoft /proc/version; then
            return 0
        fi
    fi

    if [ -n "$WSL_DISTRO_NAME" ]; then
        return 0
    fi

    return 1
}

# Detect the package manager available on the system
# Returns: "brew", "apt", "yum", "dnf", "pacman", "zypper", "unknown"
detect_package_manager() {
    if command -v brew >/dev/null 2>&1; then
        echo "brew"
    elif command -v apt-get >/dev/null 2>&1; then
        echo "apt"
    elif command -v dnf >/dev/null 2>&1; then
        echo "dnf"
    elif command -v yum >/dev/null 2>&1; then
        echo "yum"
    elif command -v pacman >/dev/null 2>&1; then
        echo "pacman"
    elif command -v zypper >/dev/null 2>&1; then
        echo "zypper"
    else
        echo "unknown"
    fi
}

# Detect the init/service management system
# Returns: "systemd", "brew-services", "sysvinit", "openrc", "none"
detect_init_system() {
    # Check for macOS/Homebrew services
    if [ "$(uname)" = "Darwin" ]; then
        if command -v brew >/dev/null 2>&1; then
            echo "brew-services"
        else
            echo "launchd"
        fi
        return 0
    fi

    # Check for systemd
    if command -v systemctl >/dev/null 2>&1; then
        if systemctl --version >/dev/null 2>&1; then
            echo "systemd"
            return 0
        fi
    fi

    # Check for OpenRC
    if command -v rc-service >/dev/null 2>&1; then
        echo "openrc"
        return 0
    fi

    # Check for SysVinit
    if [ -d /etc/init.d ]; then
        if command -v service >/dev/null 2>&1; then
            echo "sysvinit"
            return 0
        fi
    fi

    echo "none"
}

# Get OS family (for grouping similar OSes)
# Returns: "macos", "debian", "redhat", "arch", "unknown"
get_os_family() {
    local os
    os=$(detect_os)

    case "$os" in
        macos)
            echo "macos"
            ;;
        ubuntu|debian|wsl-ubuntu|wsl-debian)
            echo "debian"
            ;;
        rhel|centos|fedora|rocky|alma)
            echo "redhat"
            ;;
        arch|manjaro)
            echo "arch"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# Check if sudo is available and needed
# Returns: 0 if sudo needed and available, 1 otherwise
needs_sudo() {
    if [ "$(id -u)" -eq 0 ]; then
        # Already root
        return 1
    fi

    if [ "$(uname)" = "Darwin" ]; then
        # macOS Homebrew doesn't typically need sudo
        return 1
    fi

    if command -v sudo >/dev/null 2>&1; then
        return 0
    fi

    return 1
}

# Get sudo command prefix (empty if not needed)
get_sudo() {
    if needs_sudo; then
        echo "sudo"
    else
        echo ""
    fi
}

# Detect if running in a container
is_container() {
    if [ -f /.dockerenv ]; then
        return 0
    fi

    if [ -f /run/.containerenv ]; then
        return 0
    fi

    if grep -q "/docker/" /proc/1/cgroup 2>/dev/null; then
        return 0
    fi

    return 1
}

# Get architecture
get_architecture() {
    uname -m
}

# Print platform summary (for debugging)
print_platform_info() {
    echo "Operating System: $(detect_os)"
    echo "OS Family: $(get_os_family)"
    echo "Package Manager: $(detect_package_manager)"
    echo "Init System: $(detect_init_system)"
    echo "Architecture: $(get_architecture)"
    echo "WSL: $(if is_wsl; then echo 'Yes'; else echo 'No'; fi)"
    echo "Container: $(if is_container; then echo 'Yes'; else echo 'No'; fi)"
    echo "Needs sudo: $(if needs_sudo; then echo 'Yes'; else echo 'No'; fi)"
}
