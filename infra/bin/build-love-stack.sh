#!/bin/bash
# L.O.V.E. Stack - Build Script
# Compiles artifacts for deployment/release
# Usage: ./infra/bin/build-love-stack.sh [OPTIONS]

# 1. Strict Mode
set -euo pipefail

# 2. Environment Setup
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# Global Variables
EXIT_CODE=0
START_TIME=$(date +%s)
BUILD_DIR="$PROJECT_ROOT/build_artifacts"

# Defaults
CI_MODE=false
VERBOSE=false
TARGET_MODULE="all"
CONFIGURATION="Release"
CLEAN_MODE=false

# 3. Output Styling & Common Lib
COMMON_LIB="$PROJECT_ROOT/infra/scripts/lib/common.sh"
if [ -f "$COMMON_LIB" ]; then
    #shellcheck source=infra/scripts/lib/common.sh
    . "$COMMON_LIB"
fi

# Fallback Colors/Functions
if [[ ! -t 1 ]]; then
    RED='' GREEN='' YELLOW='' BLUE='' BOLD='' NC=''
else
    RED=${RED:-""} GREEN=${GREEN:-""} YELLOW=${YELLOW:-""} BLUE=${BLUE:-""} BOLD=${BOLD:-""} NC=${NC:-""}
fi

if ! command -v print_header &> /dev/null; then
    print_header() { echo -e "\n${BLUE}${BOLD}=== $1 ===${NC}"; }
fi
if ! command -v print_success &> /dev/null; then
    print_success() { echo -e "${GREEN}✓${NC} $1"; }
fi
if ! command -v print_error &> /dev/null; then
    print_error() { echo -e "${RED}✗${NC} $1" >&2; }
fi
if ! command -v print_info &> /dev/null; then
    print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
fi

# 4. Help & Argument Parsing
show_help() {
    echo -e "${BOLD}L.O.V.E. Stack Build Script${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "    Compiles the L.O.V.E. Stack for distribution."
    echo ""
    echo -e "${BOLD}USAGE${NC}"
    echo "    $0 [OPTIONS]"
    echo ""
    echo -e "${BOLD}OPTIONS${NC}"
    echo "    -h, --help            Show this help message"
    echo "    -v, --verbose         Enable verbose output"
    echo "    --ci                  Run in CI mode"
    echo "    --module [name]       Build specific module (native-swift|experience)"
    echo "    --debug               Build in Debug configuration (default: Release)"
    echo "    --clean               Clean build artifacts before building"
    echo ""
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) show_help ;;
        -v|--verbose) VERBOSE=true; shift ;;
        --ci) CI_MODE=true; shift ;;
        --module) TARGET_MODULE="$2"; shift 2 ;;
        --module=*) TARGET_MODULE="${1#*=}"; shift ;;
        --debug) CONFIGURATION="Debug"; shift ;;
        --clean) CLEAN_MODE=true; shift ;;
        *) print_error "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ "${CI:-}" == "true" ]]; then
    CI_MODE=true
    VERBOSE=true
fi

# Export variables to suppress SC2034 and allow child scripts to use them
export CI_MODE
export VERBOSE

# 5. Build Functions

build_native_swift() {
    if [[ "$TARGET_MODULE" != "all" && "$TARGET_MODULE" != "native-swift" ]]; then return 0; fi

    print_info "Building Native Swift ($CONFIGURATION)..."

    local native_dir="experience/desktop/native-swift"
    local output_dir="$BUILD_DIR/macos"
    local config_lower
    config_lower=$(echo "$CONFIGURATION" | tr '[:upper:]' '[:lower:]')

    mkdir -p "$output_dir"

    if (
        cd "$native_dir"

        # Check tools
        if ! command -v swift &> /dev/null; then
            print_error "swift not found. Install Xcode Command Line Tools."
            exit 1
        fi

        # Clean
        if [[ "$CLEAN_MODE" == "true" ]]; then
            print_info "Cleaning Native Swift..."
            swift package --package-path LoveApp clean
        fi

        # Build Command
        local cmd="swift build --package-path LoveApp --configuration $config_lower"

        if [[ "$VERBOSE" == "true" ]]; then
             eval "$cmd"
        else
             eval "$cmd > /dev/null"
        fi

        # Verify Binary
        # Default build location: LoveApp/.build/$config_lower/LoveApp
        if [ -f "LoveApp/.build/$config_lower/LoveApp" ]; then
             print_success "Native Swift binary created at LoveApp/.build/$config_lower/LoveApp"
        else
             print_warning "Binary check failed (file not found), but build command exited 0."
        fi
    ); then
        # Manual Metal Compilation (Post-Build Hack) - DISABLED (Phase 80)
        # SwiftPM sometimes fails to compile Metal in release mode for executables.
        # We manually compile and inject it into the bundle.
        # print_info "🔧 Verifying Metal Library..."

        # local bundle_path
        # bundle_path=$(find "$native_dir/LoveApp/.build" -name "SoulUI_SoulUI.bundle" -type d | head -n 1)

        # if [[ -n "$bundle_path" && -d "$bundle_path" ]]; then
        #      local shader_src="$native_dir/Packages/SoulUI/Sources/SoulUI/Shaders/SoulSphere.metal"
        #      # Use the parent directory of the bundle as the app_dir for intermediate artifacts
        #      local app_dir
        #      app_dir="$(dirname "$bundle_path")"
        #
        #      if [[ -d "$(dirname "$shader_src")" ]]; then
        #          print_info "🔨 Manually Compiling Metal Shaders (*.metal)..."
        #          local shader_dir
        #          shader_dir="$(dirname "$shader_src")"
        #
        #          # Compile all .metal files to .air
        #          for f in "$shader_dir"/*.metal; do
        #              filename=$(basename "$f" .metal)
        #              xcrun -sdk macosx metal -c "$f" -o "$app_dir/$filename.air" -I "$shader_dir"
        #          done
        #
        #          # Link all .air files to formatted default.metallib
        #          xcrun -sdk macosx metallib "$app_dir"/*.air -o "$bundle_path/default.metallib"
        #          rm "$app_dir"/*.air
        #          print_success "💉 Injected default.metallib into SoulUI_SoulUI.bundle"
        #      else
        #          print_warning "Shader source not found at $shader_src"
        #      fi
        # else
        #      print_warning "SoulUI_SoulUI.bundle not found. Metal injection skipped."
        # fi

        print_success "Native Swift build complete"
    else
        print_error "Native Swift build failed"
        EXIT_CODE=1
    fi
}

build_experience_web() {
    if [[ "$TARGET_MODULE" != "all" && "$TARGET_MODULE" != "experience" ]]; then return 0; fi

    print_info "Building Web Experience..."

    if (
        cd "experience/web"
        if [ ! -d "node_modules" ]; then
            print_info "Installing dependencies..."
            npm ci --silent
        fi

        if [[ "$CLEAN_MODE" == "true" ]]; then
            rm -rf dist out .next
        fi

         if [[ "$VERBOSE" == "true" ]]; then
             npm run build
        else
             npm run build >/dev/null 2>&1
        fi
    ); then
        print_success "Web Experience build complete"
    else
        print_error "Web Experience build failed"
        EXIT_CODE=1
    fi
}

# Python Build Function
build_python_module() {
    local module=$1
    if [[ "$TARGET_MODULE" != "all" && "$TARGET_MODULE" != "$module" ]]; then return 0; fi

    print_info "Building Python Module: $module..."

    if (
        cd "$module"

        # 1. Check for Python 3.12+ (Use setup script logic or simple check)
        if ! command -v python3 &> /dev/null; then
             print_error "python3 not found"
             exit 1
        fi

        # 2. Setup Venv (Deployment Mode)
        if [ ! -d ".venv" ] || [[ "$CLEAN_MODE" == "true" ]]; then
             print_info "Creating .venv for $module..."
             rm -rf .venv
             python3 -m venv .venv
        fi

        # 3. Install Production Dependencies
        # shellcheck disable=SC1091
        source .venv/bin/activate

        print_info "Installing dependencies..."
        if [[ "$VERBOSE" == "true" ]]; then
             pip install --upgrade pip
             pip install -r requirements.txt
        else
             pip install --upgrade pip >/dev/null 2>&1
             pip install -r requirements.txt >/dev/null 2>&1
        fi

        # 4. Sanity Check (Import main module)
        # Assuming folder structure 'app' usually
        if [ -d "app" ]; then
             if python3 -c "import app" 2>/dev/null; then
                  print_success "$module Verified (Import Success)"
             else
                  print_warning "$module Import Check Failed (Runtime may be broken)"
             fi
        fi

        deactivate
    ); then
        print_success "$module build complete"
    else
        print_error "$module build failed"
        EXIT_CODE=1
    fi
}

# 6. Main Flow

main() {
    print_header "🏗️  Building L.O.V.E. Stack ($CONFIGURATION)"
    mkdir -p "$BUILD_DIR"

    # Python Core Modules
    build_python_module "versor"
    build_python_module "observer"
    build_python_module "listener"

    # Frontend / Native
    build_experience_web
    build_native_swift

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    print_header "📊 Request Summary"
    echo "Duration: ${DURATION}s"

    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}${BOLD}SUCCESS: Build complete.${NC}"
    else
        echo -e "${RED}${BOLD}FAILURE: Build failed.${NC}"
    fi
    exit $EXIT_CODE
}

main
