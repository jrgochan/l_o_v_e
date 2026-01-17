#!/bin/sh
# L.O.V.E. Stack - Project Archive Script
# POSIX-compliant script to clone and archive the entire project
#
# Usage:
#   ./archive-project.sh [OPTIONS]
#
# Examples:
#   ./archive-project.sh                    # Archive to current dir (default)
#   ./archive-project.sh -o /tmp/backups    # Archive to specific directory
#   ./archive-project.sh --format zip       # Create a zip archive
#
# For more information: ./archive-project.sh --help

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================
VERSION="1.0.0"
SCRIPT_NAME="archive-project.sh"

# Default configuration
DEFAULT_OUTPUT_DIR="."
DEFAULT_FORMAT="tar.gz"
DEFAULT_FILENAME_PREFIX="love-stack-archive"

# ============================================================================
# COMMAND-LINE OPTIONS
# ============================================================================
OPT_OUTPUT_DIR="$DEFAULT_OUTPUT_DIR"
OPT_TEMP_DIR=""
OPT_FORMAT="$DEFAULT_FORMAT"
OPT_FILENAME=""
OPT_KEEP_TEMP=false
OPT_QUIET=false
OPT_VERBOSE=false
OPT_YES=false
OPT_SKIP_DEPS=false

# Git options to pass through
OPT_GIT_PROTOCOL="ssh"
OPT_GIT_BRANCH="main"
OPT_GIT_SHALLOW=false

# ============================================================================
# UTILITIES
# ============================================================================

# Detect script directory (infra/scripts/maintenance)
SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)" || SCRIPT_DIR="."
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Source common utilities if available
if [ -f "$PROJECT_ROOT/infra/scripts/lib/common.sh" ]; then
    . "$PROJECT_ROOT/infra/scripts/lib/common.sh"
else
    # Minimal fallback utilities
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
    
    print_success() { printf "%b[OK] %s%b\n" "$GREEN" "$1" "$NC"; }
    print_error() { printf "%b[ERR] %s%b\n" "$RED" "$1" "$NC"; }
    print_warning() { printf "%b[WARN] %s%b\n" "$YELLOW" "$1" "$NC"; }
    print_info() { printf "%b[INFO] %s%b\n" "$BLUE" "$1" "$NC"; }
    print_header() { printf "\n%b%s%b\n" "$BLUE" "$1" "$NC"; echo "----------------------------------------"; }
    command_exists() { command -v "$1" >/dev/null 2>&1; }
    get_absolute_path() { echo "$1"; } # Rustic fallback
fi

# ============================================================================
# HELP TEXT
# ============================================================================

show_help() {
    cat << EOF
L.O.V.E. Stack - Project Archive Script
=========================================

Clones the entire L.O.V.E. stack into a temporary directory and creates a compressed archive.

USAGE:
    ./archive-project.sh [OPTIONS]

OPTIONS:
    -h, --help              Show this help message
    --version               Show version information
    -y, --yes               Skip confirmation prompts
    
    Output:
    -o, --output-dir DIR    Directory where the archive will be saved (default: current dir)
    -n, --name NAME         Base name for the archive file (default: love-stack-archive-YYYYMMDD)
    --format FORMAT         Archive format: tar.gz (default) or zip
    
    Temporary Storage:
    -t, --temp-dir DIR      Directory for temporary files
    --keep-temp             Do not delete temporary directory after archiving
    
    Git Options (passed to clone script):
    --https                 Use HTTPS instead of SSH
    --branch BRANCH         Clone specific branch
    --shallow               Shallow clone (faster, smaller archive)
    
    Behavior:
    -q, --quiet             Minimal output
    -v, --verbose           Detailed output

EXAMPLES:
    # Standard backup
    ./archive-project.sh
    
    # Create a zip archive in a specific folder
    ./archive-project.sh -o ~/backups --format zip
    
    # Quick shallow backup with HTTPS
    ./archive-project.sh --shallow --https

EOF
    exit 0
}

show_version() {
    echo "$SCRIPT_NAME version $VERSION"
    exit 0
}

# ============================================================================
# ARGUMENT PARSING
# ============================================================================

parse_arguments() {
    while [ $# -gt 0 ]; do
        case "$1" in
            -h|--help)
                show_help
                ;;
            --version)
                show_version
                ;;
            -y|--yes)
                OPT_YES=true
                shift
                ;;
            -o|--output-dir)
                OPT_OUTPUT_DIR="$2"
                shift 2
                ;;
            -n|--name)
                OPT_FILENAME="$2"
                shift 2
                ;;
            --format)
                case "$2" in
                    tar.gz|tgz|tar|zip)
                        OPT_FORMAT="$2"
                        ;;
                    *)
                        print_error "Unsupported format: $2 (use tar.gz or zip)"
                        exit 1
                        ;;
                esac
                shift 2
                ;;
            -t|--temp-dir)
                OPT_TEMP_DIR="$2"
                shift 2
                ;;
            --keep-temp)
                OPT_KEEP_TEMP=true
                shift
                ;;
            --https)
                OPT_GIT_PROTOCOL="https"
                shift
                ;;
            --ssh)
                OPT_GIT_PROTOCOL="ssh"
                shift
                ;;
            --branch)
                OPT_GIT_BRANCH="$2"
                shift 2
                ;;
            --shallow)
                OPT_GIT_SHALLOW=true
                shift
                ;;
            -q|--quiet)
                OPT_QUIET=true
                shift
                ;;
            -v|--verbose)
                OPT_VERBOSE=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Try '$SCRIPT_NAME --help' for more information."
                exit 1
                ;;
        esac
    done
}

# ============================================================================
# EXTENDED UTILITIES
# ============================================================================

# Timestamp for unique filenames
get_timestamp() {
    date +%Y%m%d_%H%M%S
}

get_date_string() {
    date +%Y-%m-%d
}

# Cleanup function to be called on exit
cleanup() {
    local temp_dir="$1"
    local keep="$2"
    
    if [ -d "$temp_dir" ]; then
        if [ "$keep" = true ]; then
            [ "$OPT_QUIET" != true ] && print_info "Keeping temporary directory: $temp_dir"
        else
            [ "$OPT_VERBOSE" = true ] && print_info "Cleaning up temporary directory: $temp_dir"
            rm -rf "$temp_dir"
        fi
    fi
}

# ============================================================================
# MAIN LOGIC
# ============================================================================

main() {
    parse_arguments "$@"
    
    [ "$OPT_QUIET" != true ] && print_header "📦 L.O.V.E. Stack Archiver"
    
    # Check dependencies
    if [ "$OPT_FORMAT" = "zip" ]; then
        if ! command_exists zip; then
            print_error "'zip' command not found. Please install zip or use tar.gz format."
            exit 1
        fi
    else
        if ! command_exists tar; then
            print_error "'tar' command not found."
            exit 1
        fi
    fi
    
    # Determine full output paths
    local output_dir_abs
    if [ -d "$OPT_OUTPUT_DIR" ]; then
        output_dir_abs="$(cd "$OPT_OUTPUT_DIR" && pwd)"
    else
        # If directory doesn't exist, we'll try to create it later, but resolve parent now
        mkdir -p "$OPT_OUTPUT_DIR" 2>/dev/null || true
        if [ -d "$OPT_OUTPUT_DIR" ]; then
            output_dir_abs="$(cd "$OPT_OUTPUT_DIR" && pwd)"
        else
            print_error "Cannot create output directory: $OPT_OUTPUT_DIR"
            exit 1
        fi
    fi
    
    # Set filename if not provided
    if [ -z "$OPT_FILENAME" ]; then
        OPT_FILENAME="${DEFAULT_FILENAME_PREFIX}-$(get_date_string)"
    fi
    
    # Clean filename of extension if user provided one that matches format
    local clean_filename="${OPT_FILENAME%.zip}"
    clean_filename="${clean_filename%.tar.gz}"
    clean_filename="${clean_filename%.tgz}"
    clean_filename="${clean_filename%.tar}"
    
    # Setup temporary directory
    local temp_root="${OPT_TEMP_DIR:-${TMPDIR:-/tmp}}"
    local work_dir="$temp_root/love-archive-$(get_timestamp)"
    
    # Register cleanup trap
    trap 'cleanup "$work_dir" "$OPT_KEEP_TEMP"' EXIT INT TERM
    
    mkdir -p "$work_dir"
    [ "$OPT_VERBOSE" = true ] && print_info "Created working directory: $work_dir"
    
    # ------------------------------------------------------------------------
    # STEP 1: Clone Repositories
    # ------------------------------------------------------------------------
    [ "$OPT_QUIET" != true ] && print_info "Step 1/3: Cloning repositories..."
    
    local clone_script="$PROJECT_ROOT/infra/scripts/setup/clone-love-repos.sh"
    if [ ! -f "$clone_script" ]; then
        print_error "Clone script not found at: $clone_script"
        exit 1
    fi
    
    # Build clone options
    local clone_opts="--target-dir $work_dir --yes"
    
    [ "$OPT_GIT_PROTOCOL" = "https" ] && clone_opts="$clone_opts --https"
    [ "$OPT_GIT_BRANCH" != "main" ] && clone_opts="$clone_opts --branch $OPT_GIT_BRANCH"
    [ "$OPT_GIT_SHALLOW" = true ] && clone_opts="$clone_opts --shallow"
    [ "$OPT_QUIET" = true ] && clone_opts="$clone_opts --quiet"
    [ "$OPT_VERBOSE" = true ] && clone_opts="$clone_opts --verbose"
    
    # Run the clone script
    if ! "$clone_script" $clone_opts; then
        print_error "Failed to clone repositories."
        exit 1
    fi
    
    # Verify the clone worked
    local project_dir="$work_dir/l_o_v_e"
    if [ ! -d "$project_dir" ]; then
        print_error "Project directory not found after sync: $project_dir"
        exit 1
    fi
    
    # Remove .git directories to make archive smaller data-only snapshot?
    # Usually 'archive' implies clean source code.
    # But if users want git history, they might not want this. 
    # Let's clean .git folders by default if shallow is on, otherwise keep them? 
    # Actually, standard behavior for "Snapshot" archives (like GitHub's download ZIP) is NO .git folders.
    # But for a developer backup, maybe yes.
    # Let's remove .git folders if shallow is used (since history is truncated anyway), 
    # or if a --clean flag is passed (which we can add, but for now lets stick to the plan).
    # Since the request says "compress the project", usually that means the source tree. 
    # I'll leave .git folders for now as it's a "clone", not just an "export".
    
    # ------------------------------------------------------------------------
    # STEP 2: Create Archive
    # ------------------------------------------------------------------------
    [ "$OPT_QUIET" != true ] && print_info "Step 2/3: Compressing files..."
    
    local archive_msg=""
    local final_archive_path=""
    
    cd "$work_dir"
    
    if [ "$OPT_FORMAT" = "zip" ]; then
        local zip_file="${clean_filename}.zip"
        final_archive_path="$output_dir_abs/$zip_file"
        
        if [ "$OPT_VERBOSE" = true ]; then
            zip -r "$final_archive_path" l_o_v_e
        else
            zip -q -r "$final_archive_path" l_o_v_e
        fi
        
    else
        # Default: tar.gz
        local tar_file="${clean_filename}.tar.gz"
        final_archive_path="$output_dir_abs/$tar_file"
        
        if [ "$OPT_VERBOSE" = true ]; then
            tar -czf "$final_archive_path" l_o_v_e
        else
            tar -czf "$final_archive_path" l_o_v_e
        fi
    fi
    
    if [ ! -f "$final_archive_path" ]; then
        print_error "Failed to create archive."
        exit 1
    fi
    
    # ------------------------------------------------------------------------
    # STEP 3: Finalize
    # ------------------------------------------------------------------------
    local file_size
    if command_exists stat; then
        # POSIX compliant stat is hard, try nice options
        if stat -f %z "$final_archive_path" >/dev/null 2>&1; then
            file_size=$(stat -f %z "$final_archive_path") # BSD
        elif stat -c %s "$final_archive_path" >/dev/null 2>&1; then
            file_size=$(stat -c %s "$final_archive_path") # GNU
        else
            file_size="unknown"
        fi
    else
        file_size="unknown"
    fi
    
    # Convert size to human readable if possible
    local file_size_hr="$file_size bytes"
    if [ "$file_size" != "unknown" ]; then
        if [ "$file_size" -gt 1048576 ]; then
            file_size_hr="$((file_size / 1048576)) MB"
        elif [ "$file_size" -gt 1024 ]; then
            file_size_hr="$((file_size / 1024)) KB"
        fi
    fi
    
    [ "$OPT_QUIET" != true ] && print_success "Archive created successfully!"
    [ "$OPT_QUIET" != true ] && echo ""
    [ "$OPT_QUIET" != true ] && echo "  File:   $final_archive_path"
    [ "$OPT_QUIET" != true ] && echo "  Size:   $file_size_hr"
    [ "$OPT_QUIET" != true ] && echo "  Format: $OPT_FORMAT"
    [ "$OPT_QUIET" != true ] && echo ""
    
    cd "$SCRIPT_DIR" # Restore directory before exit (not strictly needed due to subshell but good practice)
}

main "$@"
