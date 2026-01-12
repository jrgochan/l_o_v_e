#!/bin/sh
# Install all development tools needed for L.O.V.E. platform
# POSIX-compliant, idempotent, cross-platform guidance

set -e

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/common.sh
. "$SCRIPT_DIR/lib/common.sh"

# Change to project root
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

print_header "L.O.V.E. Development Tools Installation"

# Detect OS
OS_TYPE="unknown"
if [ -f /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    OS_TYPE="$ID"
elif [ "$(uname)" = "Darwin" ]; then
    OS_TYPE="macos"
fi

print_info "Detected OS: $OS_TYPE"

# === Step 1: Check Python ===
print_header "Step 1: Python Installation"

python_cmd=$(get_python_cmd 2>/dev/null || echo "")

if [ -z "$python_cmd" ]; then
    print_error "Python not found"
    print_info "Install Python 3.11+:"
    case "$OS_TYPE" in
        macos)
            print_info "  $ brew install python@3.11"
            ;;
        ubuntu|debian)
            print_info "  $ sudo apt update && sudo apt install python3.11 python3-pip"
            ;;
        fedora|rhel|centos)
            print_info "  $ sudo dnf install python3.11"
            ;;
        *)
            print_info "  Download from: https://www.python.org/downloads/"
            ;;
    esac
    exit 1
else
    if check_python_version "3.11"; then
        print_success "Python $(${python_cmd} --version 2>&1 | awk '{print $2}') installed"
    else
        print_error "Python version too old, need 3.11+"
        exit 1
    fi
fi

# === Step 2: Create DX Tools Virtual Environment ===
print_header "Step 2: DX Tools Virtual Environment"

print_info "Creating isolated venv for DX tools at infra/.venv-dx..."
print_info "Creating isolated venv for DX tools at infra/.venv-dx..."
activate_dx_venv || exit 1
dx_venv_pip=$(get_dx_pip)

print_success "DX venv ready: infra/.venv-dx"

# === Step 3: Install Python Dev Tools into DX venv ===
print_header "Step 3: Installing DX Tools into venv"

print_info "Installing all development tools..."

# List of required tools
python_tools="black isort flake8 mypy pylint pydocstyle bandit radon vulture pytest pytest-asyncio pytest-cov pytest-xdist hypothesis autoflake pre-commit"

# Install all at once for speed
if $dx_venv_pip install $python_tools --quiet; then
    print_success "All DX tools installed in venv"
else
    print_error "DX tools installation failed"
    exit 1
fi

# Verify tools are accessible
print_info "Verifying tools in venv..."
for tool in black isort flake8 mypy pytest; do
    if check_command "$tool"; then
        print_success "$tool available"
    else
        print_error "$tool not found in PATH"
    fi
done

# === Step 4: Install Node.js (if not present) ===
print_header "Step 4: Node.js Installation"

if check_command node; then
    node_version=$(node --version 2>&1)
    print_success "Node.js $node_version installed"
else
    print_error "Node.js not found"
    print_info "Install Node.js:"
    case "$OS_TYPE" in
        macos)
            print_info "  $ brew install node"
            ;;
        ubuntu|debian)
            print_info "  $ curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
            print_info "  $ sudo apt-get install -y nodejs"
            ;;
        *)
            print_info "  Download from: https://nodejs.org/"
            ;;
    esac
    print_warning "Skipping TypeScript tools (Node.js required)"
fi

# === Step 5: Install Node.js Dev Tools ===
if check_command npm; then
    print_header "Step 4: TypeScript Development Tools"
    
    print_info "Installing global TypeScript tools..."
    
    node_tools="typescript eslint prettier"
    
    for tool in $node_tools; do
        if check_command "$tool"; then
            print_success "$tool already installed"
        else
            print_info "Installing $tool globally..."
            if npm install -g "$tool" >/dev/null 2>&1; then
                print_success "$tool installed"
            else
                print_error "$tool installation failed"
            fi
        fi
    done
    
    # Install Experience module dependencies
    if [ -d "experience" ]; then
        print_info "Installing Experience module dependencies..."
        if run_in_module "experience" "npm install"; then
            print_success "Experience dependencies installed"
        else
            print_error "Experience npm install failed"
        fi
    fi
fi

# === Step 6: Install Python Module Dependencies into DX venv ===
print_header "Step 6: Python Module Dependencies (for DX tools)"

print_info "Installing module dependencies into DX venv for proper linting..."
print_info "This ensures pylint/mypy can resolve all imports correctly"

for module in observer listener versor; do
    if [ -d "$module" ] && [ -f "$module/requirements.txt" ]; then
        print_info "Installing $module dependencies into DX venv..."
        if $dx_venv_pip install -r "$module/requirements.txt" --quiet 2>/dev/null; then
            print_success "$module dependencies installed in DX venv"
        else
            print_warning "$module dependencies installation had issues (may be OK)"
        fi
    fi
done

print_success "All module dependencies available for linting tools"

# === Step 7: Setup Pre-commit Hooks ===
print_header "Step 7: Pre-commit Hooks"

if check_command pre-commit; then
    if [ -f ".pre-commit-config.yaml" ]; then
        print_info "Installing pre-commit hooks..."
        if pre-commit install >/dev/null 2>&1; then
            print_success "Pre-commit hooks installed"
        else
            print_error "Pre-commit hook installation failed"
        fi
    else
        print_warning "No .pre-commit-config.yaml found (will be created)"
    fi
else
    print_warning "pre-commit not installed (optional)"
fi

# === Step 8: Verify Installation ===
print_header "Step 8: Verification"

print_info "Running dependency check..."
if "$SCRIPT_DIR/check-dependencies.sh" >/dev/null 2>&1; then
    print_success "All dependencies verified!"
else
    print_warning "Some dependencies still missing"
    print_info "Run: infra/scripts/check-dependencies.sh"
fi

# === Summary ===
print_header "Installation Complete!"

print_success "Development environment setup complete!"
print_info "\nNext steps:"
print_info "  1. Verify installation:"
print_info "     $ infra/scripts/check-dependencies.sh"
print_info ""
print_info "  2. Format code:"
print_info "     $ infra/scripts/format-code.sh"
print_info ""
print_info "  3. Run full verification:"
print_info "     $ infra/scripts/verify-all.sh"
print_info ""
print_info "  4. Quick check before commit:"
print_info "     $ infra/scripts/verify-all.sh --quick --fix"

exit 0
