#!/bin/bash
# L.O.V.E. Stack — Shell Completions
# Provides tab completion for Makefile targets and infra/bin scripts.
#
# Installation (add to ~/.bashrc or ~/.zshrc):
#   source /path/to/l_o_v_e/infra/lib/completions.sh
#
# Or for project-scoped activation:
#   eval "$(cat infra/lib/completions.sh)"

# ── Makefile tab completion ─────────────────────────────────
# Completes `make <TAB>` with all .PHONY targets
_love_make_completions() {
    local cur="${COMP_WORDS[COMP_CWORD]}"
    local makefile

    # Find Makefile in current or parent dirs
    if [ -f "Makefile" ]; then
        makefile="Makefile"
    elif [ -f "../Makefile" ]; then
        makefile="../Makefile"
    else
        return
    fi

    local targets
    targets=$(grep -E '^[a-zA-Z_-]+:' "$makefile" | cut -d: -f1 | sort -u)

    mapfile -t COMPREPLY < <(compgen -W "$targets" -- "$cur")
}

# Register for make
if [ -n "${BASH_VERSION:-}" ]; then
    complete -F _love_make_completions make
fi

# ── love CLI wrapper ────────────────────────────────────────
# Provides `love <command>` as a convenient wrapper

_love_find_root() {
    local dir
    dir="$(pwd)"
    while [ "$dir" != "/" ]; do
        if [ -f "$dir/Makefile" ] && [ -d "$dir/infra" ]; then
            echo "$dir"
            return 0
        fi
        dir=$(dirname "$dir")
    done
    return 1
}

love() {
    local root
    root=$(_love_find_root) || {
        echo "Error: Not in a L.O.V.E. project" >&2
        return 1
    }

    local cmd="${1:-help}"
    shift 2>/dev/null || true

    case "$cmd" in
        # Direct make targets
        help|setup|setup-dev|sync|lint|lint-fix|lint-python|lint-typescript| \
        lint-shell|lint-swift|lint-versor|lint-observer|lint-listener| \
        fmt|test|test-ci|test-versor|test-observer|test-listener|test-experience| \
        run|dev|stop|build|deploy|clean|clean-full|clean-logs|deps|versions|verify| \
        docs|docs-build|status|changelog|env-examples| \
        db-migrate|db-upgrade|db-status|db-reset|backup|restore| \
        bench|dep-graph|release|install-hooks)
            make -C "$root" "$cmd" "$@"
            ;;
        *)
            echo "Unknown command: $cmd"
            echo "Run 'love help' for available commands."
            return 1
            ;;
    esac
}

# Tab completion for love command
_love_completions() {
    local cur="${COMP_WORDS[COMP_CWORD]}"
    local commands="help setup setup-dev sync lint lint-fix lint-python lint-typescript \
        lint-shell lint-swift lint-versor lint-observer lint-listener \
        fmt test test-ci test-versor test-observer test-listener test-experience \
        run dev stop build deploy clean clean-full clean-logs deps versions verify \
        docs docs-build status changelog env-examples \
        db-migrate db-upgrade db-status db-reset backup restore \
        bench dep-graph release install-hooks"

    mapfile -t COMPREPLY < <(compgen -W "$commands" -- "$cur")
}

if [ -n "${BASH_VERSION:-}" ]; then
    complete -F _love_completions love
fi

# ── Zsh compatibility ───────────────────────────────────────
if [ -n "${ZSH_VERSION:-}" ]; then
    # Enable bash-style completion in zsh
    autoload -U +X bashcompinit 2>/dev/null && bashcompinit
    complete -F _love_make_completions make
    complete -F _love_completions love
fi
