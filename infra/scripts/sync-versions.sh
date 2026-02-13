#!/bin/bash
# Synchronize tool versions and configs from infra/ to all modules
# idempotent, safe

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/common.sh
. "$SCRIPT_DIR/lib/common.sh"

# Change to project root
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

print_header "Synchronizing Tool Versions and Configs"

# Python modules
PYTHON_MODULES="observer listener versor"

# === Step 1: Create Symlinks in Root (for tools that need root configs) ===
print_header "Step 1: Creating Root-Level Symlinks"

create_symlink() {
    target="$1"
    link_name="$2"

    # Remove existing file/link
    if [ -e "$link_name" ] || [ -L "$link_name" ]; then
        rm -f "$link_name"
    fi

    # Create symlink
    ln -s "$target" "$link_name"
    print_success "Symlink created: $link_name -> $target"
}

# Symlink configs from infra/configs/ to root (for tools that expect root location)
create_symlink "infra/configs/pyproject.toml" "pyproject.toml"
create_symlink "infra/configs/.flake8" ".flake8"
create_symlink "infra/configs/.pre-commit-config.yaml" ".pre-commit-config.yaml"

print_info "Tools will find configs at root via symlinks"

# === Step 2: Copy Shared Configs to Each Python Module ===
print_header "Step 2: Syncing Configs to Python Modules"

for module in $PYTHON_MODULES; do
    if [ ! -d "$module" ]; then
        print_warning "Skipping $module (directory not found)"
        continue
    fi

    print_info "Syncing to $module..."

    # Copy pyproject.toml
    if [ -f "infra/configs/pyproject.toml" ]; then
        cp "infra/configs/pyproject.toml" "$module/pyproject.toml"
        print_success "$module/pyproject.toml synced"
    fi

    # Copy .flake8
    if [ -f "infra/configs/.flake8" ]; then
        cp "infra/configs/.flake8" "$module/.flake8"
        print_success "$module/.flake8 synced"
    fi

    # Update PYTHON_VERSION file if it exists
    python_min=$(grep "^PYTHON_MIN_VERSION=" infra/TOOL_VERSIONS | cut -d= -f2)
    if [ -n "$python_min" ]; then
        echo "$python_min" > "infra/PYTHON_VERSION"
        print_success "infra/PYTHON_VERSION updated to $python_min"
    fi
done

# === Step 3: Sync to Experience Module (TypeScript) ===
print_header "Step 3: Syncing to Experience Module"

if [ -d "experience" ]; then
    print_info "Syncing TypeScript configs to experience..."

    # Create Experience config files if they don't exist
    # These would be created from templates in infra/configs/ if they exist

    if [ -f "infra/configs/.prettierrc.json" ]; then
        cp "infra/configs/.prettierrc.json" "experience/.prettierrc.json"
        print_success "experience/.prettierrc.json synced"
    fi

    if [ -f "infra/configs/.eslintrc.json" ]; then
        cp "infra/configs/.eslintrc.json" "experience/.eslintrc.json"
        print_success "experience/.eslintrc.json synced"
    fi
else
    print_warning "Experience module not found"
fi

# === Step 4: Verify Sync ===
print_header "Step 4: Verification"

print_info "Checking synced files..."

sync_ok=0

for module in $PYTHON_MODULES; do
    if [ -d "$module" ]; then
        if [ -f "$module/pyproject.toml" ]; then
            print_success "$module/pyproject.toml present"
        else
            print_error "$module/pyproject.toml missing"
            sync_ok=1
        fi
    fi
done

# === Summary ===
print_header "Sync Complete"

if [ $sync_ok -eq 0 ]; then
    print_success "All configs synchronized successfully!"
    print_info "\nWhat was synced:"
    print_info "  ✓ Root symlinks created (pyproject.toml, .flake8, .pre-commit-config.yaml)"
    print_info "  ✓ Configs copied to all Python modules"
    print_info "  ✓ PYTHON_VERSION updated"
    print_info "\nNext steps:"
    print_info "  1. Review changes: git diff"
    print_info "  2. Run verification: infra/scripts/verify-all.sh --quick"
    exit 0
else
    print_error "Some synchronization issues occurred"
    exit 1
fi
