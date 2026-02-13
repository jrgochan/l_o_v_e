#!/bin/bash
# L.O.V.E. Stack — Generate .env.example files
# Creates .env.example from infra/configs/base.env for each module.
# Strips secrets and adds placeholder markers.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# shellcheck source=../../lib/common.sh
. "$PROJECT_ROOT/infra/lib/common.sh"

BASE_ENV="$PROJECT_ROOT/infra/configs/base.env"
MODULES=(versor observer listener)

print_header "📄 Generating .env.example Files"

if [ ! -f "$BASE_ENV" ]; then
    print_error "Base env not found: $BASE_ENV"
    exit 1
fi

generate_env_example() {
    local module="$1"
    local module_dir="$PROJECT_ROOT/$module"
    local output="$module_dir/.env.example"

    if [ ! -d "$module_dir" ]; then
        print_warning "Module directory not found: $module"
        return
    fi

    {
        echo "# $module — Environment Variables"
        echo "# Generated from infra/configs/base.env"
        echo "# Copy to .env and fill in sensitive values."
        echo "#"
        echo "# Usage: cp .env.example .env"
        echo ""

        while IFS= read -r line; do
            # Skip empty lines and comments
            case "$line" in
                ""|\#*)
                    echo "$line"
                    continue
                    ;;
            esac

            key="${line%%=*}"

            # Redact sensitive values
            case "$key" in
                *PASSWORD*|*SECRET*|*TOKEN*|*KEY*)
                    echo "${key}=CHANGE_ME"
                    ;;
                *)
                    echo "$line"
                    ;;
            esac
        done < "$BASE_ENV"

        # Add module-specific vars
        echo ""
        echo "# --- Module-Specific ---"
        case "$module" in
            versor)
                echo "# VERSOR_LOG_LEVEL=INFO"
                ;;
            observer)
                echo "# OBSERVER_LOG_LEVEL=INFO"
                ;;
            listener)
                echo "# LISTENER_LOG_LEVEL=INFO"
                echo "# OLLAMA_MODEL=llama3.1:8b-instruct-q4_0"
                ;;
        esac
    } > "$output"

    print_success "Generated $module/.env.example"
}

for module in "${MODULES[@]}"; do
    generate_env_example "$module"
done

echo ""
print_info "Copy to .env and fill in sensitive values:"
print_info "  cp <module>/.env.example <module>/.env"
