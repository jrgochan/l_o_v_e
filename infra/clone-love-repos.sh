#!/bin/sh
# L.O.V.E. Stack - Repository Clone Script
# POSIX-compliant script to clone the L.O.V.E. repository
#
# This script clones the L.O.V.E. stack.
# By default, it clones the GitHub monorepo (jrgochan/l_o_v_e).
# It can also clone the legacy multi-repo structure from GitLab.
#
# Usage:
#   ./clone-love-repos.sh [OPTIONS]
#   curl -fsSL <url> | sh
#
# Examples:
#   ./clone-love-repos.sh                    # Clone from GitHub (default)
#   ./clone-love-repos.sh --gitlab           # Clone from GitLab (legacy multi-repo)
#   ./clone-love-repos.sh --https            # Clone with HTTPS
#   ./clone-love-repos.sh --shallow --yes    # Quick shallow clone
#
# For more information: ./clone-love-repos.sh --help

set -e  # Exit on error

# ============================================================================
# CONFIGURATION
# ============================================================================
VERSION="2.0.0"
SCRIPT_NAME="clone-love-repos.sh"

# Default Provider
DEFAULT_PROVIDER="github"
DEFAULT_PROTOCOL="ssh"
DEFAULT_BRANCH="main"

# GitHub Configuration (Monorepo)
GITHUB_HOST="github.com"
GITHUB_USER="jrgochan"
GITHUB_REPO="l_o_v_e"

# GitLab Configuration (Polyrepo - Legacy)
GITLAB_HOST="gitlab.com"
GITLAB_GROUP="l_o_v_e"
GITLAB_REPOS="archive docs infra listener observer versor experience"

# ============================================================================
# COMMAND-LINE OPTIONS
# ============================================================================
OPT_PROVIDER="$DEFAULT_PROVIDER"
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

Clones the L.O.V.E. stack. Supports both the GitHub monorepo (default)
and the legacy GitLab multi-repo structure.

USAGE:
    ./clone-love-repos.sh [OPTIONS]
    curl -fsSL <url> | sh

PROVIDERS:
    github       Monorepo at jrgochan/l_o_v_e (Default)
    gitlab       Polyrepo at gitlab.com/l_o_v_e (Legacy)

OPTIONS:
    -h, --help              Show this help message
    --version               Show version information
    -y, --yes               Skip confirmation prompts (non-interactive)
    
    Provider Selection:
    --github                Use GitHub (default)
    --gitlab                Use GitLab
    
    Protocol:
    --ssh                   Use SSH protocol (default)
    --https                 Use HTTPS protocol
    
    Location:
    --target-dir DIR        Clone into DIR/l_o_v_e (default: current dir)
    
    Clone Options:
    --branch BRANCH         Clone specific branch (default: main)
    --shallow               Shallow clone (--depth 1, faster but less history)
    
    Legacy Options (GitLab only):
    --skip REPOS            Skip specific repos (comma-separated)
    --only REPOS            Clone only specific repos (comma-separated)
    
    Behavior:
    --update                Update existing repos instead of cloning
    --dry-run               Show what would be done without doing it
    --no-exit-on-error      Continue even if a repo fails
    -q, --quiet             Minimal output
    -v, --verbose           Detailed output

EXAMPLES:
    # Clone from GitHub (default, monorepo)
    ./clone-love-repos.sh
    
    # Clone from GitLab (legacy multi-repo)
    ./clone-love-repos.sh --gitlab
    
    # Clone with HTTPS
    ./clone-love-repos.sh --https
    
    # Clone to specific location
    ./clone-love-repos.sh --target-dir ~/projects
    
    # Quick shallow clone without prompts
    ./clone-love-repos.sh --shallow --yes

AFTER CLONING:
    cd l_o_v_e/infra
    ./setup-love-stack.sh    # Set up development environment
    ./run-love-stack.sh      # Start the stack

MORE INFO:
    GitHub: https://github.com/jrgochan/l_o_v_e
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
            --github)
                OPT_PROVIDER="github"
                shift
                ;;
            --gitlab)
                OPT_PROVIDER="gitlab"
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
            
            # Test connectivity
            local host="$GITHUB_HOST"
            local user="git"
            [ "$OPT_PROVIDER" = "gitlab" ] && host="$GITLAB_HOST"
            
            if [ "$OPT_VERBOSE" = true ]; then
                print_info "Testing SSH connectivity to $host..."
            fi
            
            # SSH test usually returns status 1 for GitHub even on success (auth success, no shell access)
            # So we check the stderr/stdout output message
            if ssh -T "$user@$host" 2>&1 | grep -E "successfully authenticated|Welcome to GitLab"; then
                [ "$OPT_QUIET" != true ] && print_success "SSH connection to $host verified"
            else
                print_warning "Could not verify SSH connectivity to $host"
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

# Build git URL
build_repo_url() {
    local repo_identifier="$1"
    
    if [ "$OPT_PROVIDER" = "github" ]; then
        if [ "$OPT_PROTOCOL" = "https" ]; then
            echo "https://${GITHUB_HOST}/${GITHUB_USER}/${repo_identifier}.git"
        else
            echo "git@${GITHUB_HOST}:${GITHUB_USER}/${repo_identifier}.git"
        fi
    else
        # GitLab
        if [ "$OPT_PROTOCOL" = "https" ]; then
            echo "https://${GITLAB_HOST}/${GITLAB_GROUP}/${repo_identifier}.git"
        else
            echo "git@${GITLAB_HOST}:${GITLAB_GROUP}/${repo_identifier}.git"
        fi
    fi
}

# Check if repository should be processed (GitLab polyrepo only)
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

# Clone functionality
perform_clone() {
    local repo_url="$1"
    local target_path="$2"
    local name="$3"
    
    # Check if directory already exists
    if [ -d "$target_path" ]; then
        if [ "$OPT_UPDATE" = true ]; then
            [ "$OPT_QUIET" != true ] && print_info "Updating $name..."
            
            if [ "$OPT_DRY_RUN" = true ]; then
                echo "  [DRY RUN] Would update: $target_path"
                return 0
            fi
            
            if [ -d "$target_path/.git" ]; then
                cd "$target_path"
                if [ "$OPT_VERBOSE" = true ]; then
                    git pull origin "$OPT_BRANCH"
                else
                    git pull origin "$OPT_BRANCH" >/dev/null 2>&1
                fi
                cd - >/dev/null
                print_success "$name updated"
                return 0
            else
                print_error "$target_path exists but is not a git repository"
                return 1
            fi
        else
            print_warning "$name already exists (skipping)"
            return 0
        fi
    fi
    
    # Clone repository
    [ "$OPT_QUIET" != true ] && print_info "Cloning $name..."
    
    if [ "$OPT_DRY_RUN" = true ]; then
        echo "  [DRY RUN] Would clone: $repo_url -> $target_path"
        return 0
    fi
    
    # Build git clone command
    local clone_cmd="git clone"
    
    if [ "$OPT_SHALLOW" = true ]; then
        clone_cmd="$clone_cmd --depth 1"
    fi
    
    if [ "$OPT_BRANCH" != "main" ] && [ -n "$OPT_BRANCH" ]; then
        clone_cmd="$clone_cmd --branch $OPT_BRANCH"
    fi
    
    clone_cmd="$clone_cmd $repo_url $target_path"
    
    # Execute clone
    if [ "$OPT_VERBOSE" = true ]; then
        $clone_cmd
    else
        $clone_cmd >/dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        print_success "$name cloned successfully"
        return 0
    else
        print_error "$name clone failed"
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
    
    # Determine base directory
    local target_base="${OPT_TARGET_DIR:-.}"
    if [ -d "$target_base" ]; then
        target_base="$(cd "$target_base" && pwd)"
    fi
    local root_target_dir="$target_base/l_o_v_e"
    
    # Show configuration
    if [ "$OPT_QUIET" != true ]; then
        print_header "📋 Configuration"
        echo "  Provider:      $OPT_PROVIDER"
        echo "  Protocol:      $OPT_PROTOCOL"
        if [ "$OPT_PROVIDER" = "github" ]; then
            echo "  Repo:          ${GITHUB_USER}/${GITHUB_REPO}"
        else
            echo "  Group:         ${GITLAB_HOST}/${GITLAB_GROUP}"
        fi
        echo "  Target:        $root_target_dir"
        echo "  Branch:        $OPT_BRANCH"
        [ "$OPT_SHALLOW" = true ] && echo "  Clone type:    Shallow (--depth 1)"
        [ "$OPT_DRY_RUN" = true ] && echo "  Mode:          DRY RUN (no changes will be made)"
        [ "$OPT_UPDATE" = true ] && echo "  Mode:          UPDATE"
        if [ "$OPT_PROVIDER" = "gitlab" ]; then
            [ -n "$OPT_ONLY_REPOS" ] && echo "  Only repos:    $OPT_ONLY_REPOS"
            [ -n "$OPT_SKIP_REPOS" ] && echo "  Skip repos:    $OPT_SKIP_REPOS"
        fi
        echo ""
    fi
    
    # Run pre-flight checks
    check_prerequisites
    
    # Confirm before proceeding
    if [ "$OPT_YES" != true ] && [ "$OPT_DRY_RUN" != true ]; then
        if [ "$OPT_UPDATE" = true ]; then
            if ! prompt_yes_no "Update repositories in $root_target_dir?"; then
                print_info "Aborted by user"
                exit 0
            fi
        else
            if ! prompt_yes_no "Clone into $root_target_dir?"; then
                print_info "Aborted by user"
                exit 0
            fi
        fi
        echo ""
    fi
    
    # Process repositories
    [ "$OPT_QUIET" != true ] && print_header "📦 Processing"
    
    local success=0
    local failed=0
    local skipped=0
    
    if [ "$OPT_PROVIDER" = "github" ]; then
        # Monorepo Clone
        local repo_url
        repo_url=$(build_repo_url "$GITHUB_REPO")
        
        if perform_clone "$repo_url" "$root_target_dir" "$GITHUB_REPO"; then
            success=1
        else
            failed=1
        fi
        
    else
        # GitLab Polyrepo Clone
        # Create root directory first
        if [ ! -d "$root_target_dir" ] && [ "$OPT_DRY_RUN" != true ]; then
            mkdir -p "$root_target_dir"
        fi
        
        local total_repos=0
        for r in $GITLAB_REPOS; do total_repos=$((total_repos + 1)); done
        
        local current=0
        for repo in $GITLAB_REPOS; do
            if ! should_process_repo "$repo"; then
                skipped=$((skipped + 1))
                continue
            fi
            
            current=$((current + 1))
            if [ "$OPT_QUIET" != true ]; then
                printf "  [%d/%d] %-12s" "$current" "$total_repos" "$repo"
            fi
            
            local repo_url
            repo_url=$(build_repo_url "$repo")
            
            if perform_clone "$repo_url" "$root_target_dir/$repo" "$repo"; then
                success=$((success + 1))
            else
                failed=$((failed + 1))
                if [ "$OPT_NO_EXIT_ON_ERROR" != true ]; then
                    exit 1
                fi
            fi
        done
    fi
    
    # Summary
    echo ""
    [ "$OPT_QUIET" != true ] && print_header "📊 Summary"
    
    if [ "$OPT_DRY_RUN" = true ]; then
        print_info "DRY RUN completed"
    elif [ $failed -eq 0 ]; then
        print_success "Operation successful!"
        
         # Next steps
        if [ "$OPT_UPDATE" != true ]; then
            print_info "Next steps:"
            echo "  cd $root_target_dir/infra"
            echo "  ./setup-love-stack.sh    # Set up development environment"
            echo "  ./run-love-stack.sh      # Start the stack"
        fi
    else
        print_error "Operation failed with $failed errors"
        exit 1
    fi
    
    echo ""
}

# ============================================================================
# EXECUTION
# ============================================================================

main "$@"
