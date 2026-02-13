#!/bin/bash
# Check for all required development tools
# idempotent, provides installation guidance

set -e

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/common.sh
. "$SCRIPT_DIR/lib/common.sh"

print_header "Checking Development Dependencies"

# Track overall status
all_found=0

# === Core Tools ===
print_info "Checking core tools..."

check_command_verbose "git" "Git" || all_found=1
check_command_verbose "sh" "POSIX Shell" || all_found=1

# === Python Toolchain ===
print_info "\nChecking Python toolchain..."

if check_python_version "3.11"; then
    python_cmd=$(get_python_cmd)
    version=$($python_cmd --version 2>&1 | awk '{print $2}')
    print_success "Python $version (3.11+ required)"
else
    all_found=1
    print_error "Install Python 3.11+:"
    print_info "  macOS:  brew install python@3.11"
    print_info "  Ubuntu: sudo apt install python3.11"
fi

check_command_verbose "pip3" "pip" || {
    all_found=1
    print_info "  Install: curl https://bootstrap.pypa.io/get-pip.py | python3"
}

# === Python Quality Tools ===
print_info "\nChecking Python quality tools (in project venv)..."

# Activate project venv to check tools there
if [ -d "$PROJECT_ROOT/.venv" ]; then
    print_info "Checking tools in project venv..."
    # Temporarily add venv to PATH for checking
    OLD_PATH="$PATH"
    export PATH="$PROJECT_ROOT/.venv/bin:$PATH"
fi

check_command_verbose "black" "black (formatter)" || {
    all_found=1
    print_info "  Install: infra/scripts/install-dev-tools.sh"
}

check_command_verbose "isort" "isort (import sorter)" || {
    all_found=1
    print_info "  Install: pip3 install isort"
}

check_command_verbose "flake8" "flake8 (linter)" || {
    all_found=1
    print_info "  Install: pip3 install flake8"
}

check_command_verbose "mypy" "mypy (type checker)" || {
    all_found=1
    print_info "  Install: pip3 install mypy"
}

check_command_verbose "pylint" "pylint (linter)" || {
    all_found=1
    print_info "  Install: pip3 install pylint"
}

check_command_verbose "pydocstyle" "pydocstyle (docstring checker)" || {
    all_found=1
    print_info "  Install: pip3 install pydocstyle"
}

check_command_verbose "bandit" "bandit (security)" || {
    all_found=1
    print_info "  Install: pip3 install bandit"
}

check_command_verbose "radon" "radon (complexity)" || {
    all_found=1
    print_info "  Install: pip3 install radon"
}

check_command_verbose "pytest" "pytest (testing)" || {
    all_found=1
    print_info "  Install: infra/scripts/install-dev-tools.sh"
}

# Restore original PATH if we modified it
if [ -n "$OLD_PATH" ]; then
    export PATH="$OLD_PATH"
fi

# === Node.js Toolchain ===
print_info "\nChecking Node.js toolchain..."

check_command_verbose "node" "Node.js" || {
    all_found=1
    print_info "  macOS:  brew install node"
    print_info "  Ubuntu: sudo apt install nodejs npm"
}

check_command_verbose "npm" "npm" || {
    all_found=1
    print_info "  Usually comes with Node.js"
}

# === TypeScript Quality Tools ===
print_info "\nChecking TypeScript quality tools..."

check_command_verbose "tsc" "TypeScript compiler" || {
    all_found=1
    print_info "  Install: npm install -g typescript"
}

check_command_verbose "eslint" "ESLint" || {
    all_found=1
    print_info "  Install: npm install -g eslint"
}

check_command_verbose "prettier" "Prettier" || {
    all_found=1
    print_info "  Install: npm install -g prettier"
}

# === Database Tools ===
print_info "\nChecking database tools..."

check_command_verbose "psql" "PostgreSQL client" || {
    all_found=1
    print_info "  macOS:  brew install postgresql"
    print_info "  Ubuntu: sudo apt install postgresql-client"
}

# === Optional but Recommended ===
print_info "\nChecking optional tools..."

check_command_verbose "shellcheck" "shellcheck (shell linter)" || {
    print_warning "  Optional but recommended"
    print_info "  macOS:  brew install shellcheck"
    print_info "  Ubuntu: sudo apt install shellcheck"
}

check_command_verbose "pre-commit" "pre-commit (git hooks)" || {
    print_warning "  Optional but recommended"
    print_info "  Install: pip3 install pre-commit"
}

# === Summary ===
print_header "Dependency Check Summary"

if [ $all_found -eq 0 ]; then
    print_success "All required tools found!"
    print_info "\nQuick install all tools:"
    print_info "  $ infra/scripts/install-dev-tools.sh"
    exit 0
else
    print_error "Some tools are missing"
    print_info "\nQuick install all tools:"
    print_info "  $ infra/scripts/install-dev-tools.sh"
    print_info "\nOr install manually using commands above"
    exit 1
fi
