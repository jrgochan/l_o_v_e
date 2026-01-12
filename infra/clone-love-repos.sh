#!/bin/sh
# L.O.V.E. Stack - Repository Clone Script
# POSIX-compliant script to clone all L.O.V.E. repositories from GitLab
#
# This script clones all seven repositories that make up the L.O.V.E. stack:
#   - archive: Project documentation archive
#   - docs: User-facing documentation
#   - infra: Infrastructure and orchestration scripts
#   - listener: Audio transcription & semantic VAC analysis
#   - observer: Data persistence & vector search
#   - versor: Quaternion mathematics engine
#   - experience: Mobile 3D visualization
#
# Usage:
#   ./clone-love-repos.sh [OPTIONS]
#   curl -fsSL <url> | sh
#
# Examples:
#   ./clone-love-repos.sh                    # Clone with SSH (default)
#   ./clone-love-repos.sh --https            # Clone with HTTPS
#   ./clone-love-repos.sh --shallow --yes    # Quick shallow clone
#
# For more information: ./clone-love-repos.sh --help

set -e  # Exit on error

# ============================================================================
# CONFIGURATION
# ============================================================================
VERSION="1.0.0"
SCRIPT_NAME="clone-love-repos.sh"

# Repository configuration
REPOS="archive docs infra listener observer versor experience"
GITLAB_HOST="gitlab.com"
GITLAB_GROUP="l_o_v_e"
DEFAULT_PROTOCOL="ssh"
DEFAULT_BRANCH="main"

# ============================================================================
# COMMAND-LINE OPTIONS
# ============================================================================
OPT_PROTOCOL="$DEFAULT_PROTOCOL"
OPT_TARGET_DIR=""
OPT_BRANCH="$DEFAULT_BRANCH"
OPT_SHALLOW=false
OPT_DRY_RUN=false
OPT_YES=false
OPT_QUIET=false
OPT_VERBOSE=false
OPT_UPDATE=false
OPT_SKIP_REPOS=""
OPT_ONLY_REPOS=""
OPT_NO_EXIT_ON_ERROR=false

# ============================================================================
# UTILITIES
# ============================================================================

# Detect if we're running standalone (via curl | sh) or from repo
SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)" || SCRIPT_DIR="."
STANDALONE=false

# Try to source common utilities if available
if [ -f "$SCRIPT_DIR/lib/common.sh" ]; then
    . "$SCRIPT_DIR/lib/common.sh"
else
    # Standalone mode - inline minimal utilities
    STANDALONE=true
    
    # Color codes
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    NC='\033[0m'
    
    # Symbols
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
    
    # Print functions
    print_success() { printf "%b%s %s%b\n" "$GREEN" "$CHECK" "$1" "$NC"; }
    print_error() { printf "%b%s %s%b\n" "$RED" "$CROSS" "$1" "$NC"; }
    print_warning() { printf "%b%s%s%b\n" "$YELLOW" "$WARN" "$1" "$NC"; }
    print_info() { printf "%b%s%s%b\n" "$BLUE" "$INFO" "$1" "$NC"; }
    print_header() { printf "\n%b%s%b\n" "$BLUE" "$1" "$NC"; echo "----------------------------------------"; }
    print_separator() { local len="${1:-40}"; printf '%*s\n' "$len" '' | tr ' ' '='; }
    
    # Utility functions
    command_exists() { command -v "$1" >/dev/null 2>&1; }
    prompt_yes_no() {
        local question="$1"
        local answer
        printf "%s (y/n) " "$question"
        read -r answer
        case "$answer" in [Yy]|[Yy][Ee][Ss]) return 0;; *) return 1;; esac
    }
fi

# ============================================================================
# HELP TEXT
# ============================================================================

show_help() {
    cat << 'EOF'
L.O.V.E. Stack - Repository Clone Script
=========================================

Clones all seven L.O.V.E. repositories from GitLab into the correct structure.

USAGE:
    ./clone-love-repos.sh [OPTIONS]
    curl -fsSL <url> | sh

REPOSITORIES:
    archive      Project documentation archive
    docs         User-facing documentation (MkDocs)
    infra        Infrastructure and orchestration scripts
    listener     Audio transcription & semantic VAC analysis
    observer     Data persistence & vector search
    versor       Quaternion mathematics engine
    experience   Mobile 3D visualization

OPTIONS:
    -h, --help              Show this help message
    --version               Show version information
    -y, --yes               Skip confirmation prompts (non-interactive)
    
    Protocol:
    --ssh                   Use SSH protocol (default)
    --https                 Use HTTPS protocol
    
    Location:
    --target-dir DIR        Clone into DIR/l_o_v_e (default: current dir)
    
    Clone Options:
    --branch BRANCH         Clone specific branch (default: main)
    --shallow               Shallow clone (--depth 1, faster but less history)
    
    Repository Selection:
    --skip REPOS            Skip specific repos (comma-separated)
    --only REPOS            Clone only specific repos (comma-separated)
    
    Behavior:
    --update                Update existing repos instead of cloning
    --dry-run               Show what would be done without doing it
    --no-exit-on-error      Continue even if a repo fails
    -q, --quiet             Minimal output
    -v, --verbose           Detailed output

EXAMPLES:
    # Clone with SSH (default)
    ./clone-love-repos.sh
    
    # Clone with HTTPS
    ./clone-love-repos.sh --https
    
    # Clone to specific location
    ./clone-love-repos.sh --target-dir ~/projects
    
    # Quick shallow clone without prompts
    ./clone-love-repos.sh --shallow --yes
    
    # Clone only specific repos
    ./clone-love-repos.sh --only listener,observer,versor
    
    # Update existing repos
    ./clone-love-repos.sh --update
    
    # Dry run to see what would happen
    ./clone-love-repos.sh --dry-run

AFTER CLONING:
    cd l_o_v_e/infra
    ./setup-love-stack.sh    # Set up development environment
    ./run-love-stack.sh      # Start the stack

MORE INFO:
    GitLab: https://gitlab.com/l_o_v_e
    Docs: See l_o_v_e/README.md after cloning

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
            --ssh)
                OPT_PROTOCOL="ssh"
                shift
                ;;
            --https)
                OPT_PROTOCOL="https"
                shift
                ;;
            --target-dir)
                OPT_TARGET_DIR="$2"
                shift 2
                ;;
            --branch)
                OPT_BRANCH="$2"
                shift 2
                ;;
            --shallow)
                OPT_SHALLOW=true
                shift
                ;;
            --dry-run)
                OPT_DRY_RUN=true
                shift
                ;;
            --update)
                OPT_UPDATE=true
                shift
                ;;
            --skip)
                OPT_SKIP_REPOS="$2"
                shift 2
                ;;
            --only)
                OPT_ONLY_REPOS="$2"
                shift 2
                ;;
            --no-exit-on-error)
                OPT_NO_EXIT_ON_ERROR=true
                set +e  # Disable exit on error
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
    
    # Override prompt if --yes is set
    if [ "$OPT_YES" = true ]; then
        prompt_yes_no() {
            [ "$OPT_QUIET" != true ] && print_info "Auto-accepting: $1"
            return 0
        }
    fi
}

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

check_prerequisites() {
    local checks_passed=true
    
    [ "$OPT_QUIET" != true ] && print_header "🔍 Pre-flight Checks"
    
    # Check git
    if command_exists git; then
        local git_version
        git_version=$(git --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        [ "$OPT_QUIET" != true ] && print_success "Git installed (version $git_version)"
    else
        print_error "Git is not installed"
        echo "  Install git: https://git-scm.com/downloads"
        checks_passed=false
    fi
    
    # Check SSH keys if using SSH protocol
    if [ "$OPT_PROTOCOL" = "ssh" ] && [ "$OPT_UPDATE" != true ]; then
        if [ -f "$HOME/.ssh/id_rsa" ] || [ -f "$HOME/.ssh/id_ed25519" ] || [ -f "$HOME/.ssh/id_ecdsa" ]; then
            [ "$OPT_QUIET" != true ] && print_success "SSH keys configured"
            
            # Test SSH connectivity to GitLab
            if [ "$OPT_VERBOSE" = true ]; then
                print_info "Testing SSH connectivity to $GITLAB_HOST..."
            fi
            
            if ssh -T "git@$GITLAB_HOST" 2>&1 | grep -q "Welcome to GitLab"; then
                [ "$OPT_QUIET" != true ] && print_success "GitLab SSH connectivity verified"
            else
                print_warning "Could not verify SSH connectivity to GitLab"
                print_info "If you don't have SSH access, use --https flag"
            fi
        else
            print_warning "No SSH keys found in ~/.ssh/"
            print_info "Generate SSH key: ssh-keygen -t ed25519 -C 'your_email@example.com'"
            print_info "Or use HTTPS instead: $SCRIPT_NAME --https"
            if [ "$OPT_YES" != true ]; then
                if ! prompt_yes_no "Continue anyway?"; then
                    exit 1
                fi
            fi
        fi
    fi
    
    # Check target directory
    local target_base="${OPT_TARGET_DIR:-.}"
    if [ ! -d "$target_base" ]; then
        if [ "$OPT_DRY_RUN" != true ]; then
            print_warning "Target directory does not exist: $target_base"
            if [ "$OPT_YES" = true ] || prompt_yes_no "Create directory $target_base?"; then
                mkdir -p "$target_base"
                print_success "Created directory: $target_base"
            else
                exit 1
            fi
        fi
    else
        [ "$OPT_QUIET" != true ] && print_success "Target directory exists and is writable"
    fi
    
    if [ "$checks_passed" != true ]; then
        print_error "Pre-flight checks failed"
        exit 1
    fi
    
    [ "$OPT_QUIET" != true ] && echo ""
}

# ============================================================================
# REPOSITORY OPERATIONS
# ============================================================================

# Build git URL for a repository
build_repo_url() {
    local repo_name="$1"
    
    if [ "$OPT_PROTOCOL" = "https" ]; then
        echo "https://${GITLAB_HOST}/${GITLAB_GROUP}/${repo_name}.git"
    else
        echo "git@${GITLAB_HOST}:${GITLAB_GROUP}/${repo_name}.git"
    fi
}

# Check if repository should be processed
should_process_repo() {
    local repo_name="$1"
    
    # Check --only filter
    if [ -n "$OPT_ONLY_REPOS" ]; then
        case ",$OPT_ONLY_REPOS," in
            *",$repo_name,"*) ;;
            *) return 1 ;;
        esac
    fi
    
    # Check --skip filter
    if [ -n "$OPT_SKIP_REPOS" ]; then
        case ",$OPT_SKIP_REPOS," in
            *",$repo_name,"*) return 1 ;;
        esac
    fi
    
    return 0
}

# Clone a single repository
clone_repository() {
    local repo_name="$1"
    local target_dir="$2"
    local repo_path="$target_dir/$repo_name"
    local repo_url
    repo_url=$(build_repo_url "$repo_name")
    
    # Check if directory already exists
    if [ -d "$repo_path" ]; then
        if [ "$OPT_UPDATE" = true ]; then
            [ "$OPT_QUIET" != true ] && print_info "Updating $repo_name..."
            
            if [ "$OPT_DRY_RUN" = true ]; then
                echo "  [DRY RUN] Would update: $repo_path"
                return 0
            fi
            
            if [ -d "$repo_path/.git" ]; then
                cd "$repo_path"
                if [ "$OPT_VERBOSE" = true ]; then
                    git pull origin "$OPT_BRANCH"
                else
                    git pull origin "$OPT_BRANCH" >/dev/null 2>&1
                fi
                cd - >/dev/null
                print_success "$repo_name updated"
                return 0
            else
                print_error "$repo_path exists but is not a git repository"
                return 1
            fi
        else
            print_warning "$repo_name already exists (skipping)"
            return 0
        fi
    fi
    
    # Clone repository
    [ "$OPT_QUIET" != true ] && print_info "Cloning $repo_name..."
    
    if [ "$OPT_DRY_RUN" = true ]; then
        echo "  [DRY RUN] Would clone: $repo_url -> $repo_path"
        return 0
    fi
    
    # Build git clone command
    local clone_cmd="git clone"
    
    if [ "$OPT_SHALLOW" = true ]; then
        clone_cmd="$clone_cmd --depth 1"
    fi
    
    if [ "$OPT_BRANCH" != "main" ]; then
        clone_cmd="$clone_cmd --branch $OPT_BRANCH"
    fi
    
    clone_cmd="$clone_cmd $repo_url $repo_path"
    
    # Execute clone
    if [ "$OPT_VERBOSE" = true ]; then
        $clone_cmd
    else
        $clone_cmd >/dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        print_success "$repo_name cloned successfully"
        return 0
    else
        print_error "$repo_name clone failed"
        return 1
    fi
}

# ============================================================================
# MAIN LOGIC
# ============================================================================

main() {
    # Parse command-line arguments
    parse_arguments "$@"
    
    # Show banner
    if [ "$OPT_QUIET" != true ]; then
        echo ""
        echo -e "${BLUE}${ROCKET} L.O.V.E. Stack - Repository Clone Script${NC}"
        print_separator 50
        echo ""
    fi
    
    # Determine target directory
    local target_base="${OPT_TARGET_DIR:-.}"
    local target_dir="$target_base/l_o_v_e"
    
    # Create absolute path
    if [ -d "$target_base" ]; then
        target_dir="$(cd "$target_base" && pwd)/l_o_v_e"
    fi
    
    # Show configuration
    if [ "$OPT_QUIET" != true ]; then
        print_header "📋 Configuration"
        echo "  Protocol:      $OPT_PROTOCOL"
        echo "  Host:          ${GITLAB_HOST}/${GITLAB_GROUP}"
        echo "  Target:        $target_dir"
        echo "  Branch:        $OPT_BRANCH"
        [ "$OPT_SHALLOW" = true ] && echo "  Clone type:    Shallow (--depth 1)"
        [ "$OPT_DRY_RUN" = true ] && echo "  Mode:          DRY RUN (no changes will be made)"
        [ "$OPT_UPDATE" = true ] && echo "  Mode:          UPDATE (pull existing repos)"
        [ -n "$OPT_ONLY_REPOS" ] && echo "  Only repos:    $OPT_ONLY_REPOS"
        [ -n "$OPT_SKIP_REPOS" ] && echo "  Skip repos:    $OPT_SKIP_REPOS"
        echo ""
    fi
    
    # Run pre-flight checks
    check_prerequisites
    
    # Create target directory if needed
    if [ ! -d "$target_dir" ] && [ "$OPT_DRY_RUN" != true ]; then
        mkdir -p "$target_dir"
    fi
    
    # Confirm before proceeding
    if [ "$OPT_YES" != true ] && [ "$OPT_DRY_RUN" != true ]; then
        if [ "$OPT_UPDATE" = true ]; then
            if ! prompt_yes_no "Update repositories in $target_dir?"; then
                print_info "Aborted by user"
                exit 0
            fi
        else
            if ! prompt_yes_no "Clone repositories into $target_dir?"; then
                print_info "Aborted by user"
                exit 0
            fi
        fi
        echo ""
    fi
    
    # Process repositories
    [ "$OPT_QUIET" != true ] && print_header "📦 Processing Repositories"
    
    local total=0
    local success=0
    local skipped=0
    local failed=0
    local failed_repos=""
    
    for repo in $REPOS; do
        if ! should_process_repo "$repo"; then
            skipped=$((skipped + 1))
            continue
        fi
        
        total=$((total + 1))
        
        if [ "$OPT_QUIET" != true ]; then
            printf "  [%d/%d] %-12s" "$total" "$(echo $REPOS | wc -w | tr -d ' ')" "$repo"
        fi
        
        if clone_repository "$repo" "$target_dir"; then
            success=$((success + 1))
        else
            failed=$((failed + 1))
            failed_repos="$failed_repos $repo"
            if [ "$OPT_NO_EXIT_ON_ERROR" != true ]; then
                echo ""
                print_error "Repository clone failed: $repo"
                exit 1
            fi
        fi
    done
    
    # Summary
    echo ""
    [ "$OPT_QUIET" != true ] && print_header "📊 Summary"
    
    if [ "$OPT_DRY_RUN" = true ]; then
        print_info "DRY RUN completed - no changes were made"
        echo ""
        echo "Run without --dry-run to actually clone repositories"
    elif [ $failed -eq 0 ]; then
        print_success "All repositories processed successfully!"
        echo ""
        echo "  Successful: $success"
        [ $skipped -gt 0 ] && echo "  Skipped:    $skipped"
        echo ""
        
        # Next steps
        if [ "$OPT_UPDATE" != true ]; then
            print_info "Next steps:"
            echo "  cd $target_dir/infra"
            echo "  ./setup-love-stack.sh    # Set up development environment"
            echo "  ./run-love-stack.sh      # Start the stack"
        fi
    else
        print_error "Some repositories failed to process"
        echo ""
        echo "  Successful: $success"
        echo "  Failed:     $failed ($failed_repos)"
        [ $skipped -gt 0 ] && echo "  Skipped:    $skipped"
        exit 1
    fi
    
    echo ""
}

# ============================================================================
# EXECUTION
# ============================================================================

main "$@"
