#!/bin/bash
# L.O.V.E. Stack — Dependency Graph Generator
# Generates a Mermaid diagram showing module dependencies.
#
# Usage:
#   ./dep-graph.sh              # Print to stdout
#   ./dep-graph.sh -o graph.md  # Save to file

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# shellcheck source=../../lib/common.sh
. "$PROJECT_ROOT/infra/lib/common.sh"

OUTPUT=""

# Parse args
while [[ $# -gt 0 ]]; do
    case "$1" in
        -o|--output) OUTPUT="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 [-o <output_file>]"
            exit 0
            ;;
        *) shift ;;
    esac
done

generate_graph() {
    echo '```mermaid'
    echo 'graph TD'
    echo '    classDef backend fill:#4A90D9,stroke:#333,color:#fff'
    echo '    classDef frontend fill:#50C878,stroke:#333,color:#fff'
    echo '    classDef infra fill:#FF8C42,stroke:#333,color:#fff'
    echo '    classDef external fill:#888,stroke:#333,color:#fff'
    echo ''
    echo '    %% Modules'
    echo '    L["🎧 Listener<br/>Audio & Semantic Analysis"]:::backend'
    echo '    O["👁 Observer<br/>Data Persistence & Search"]:::backend'
    echo '    V["🧭 Versor<br/>Quaternion Mathematics"]:::backend'
    echo '    E["✨ Experience<br/>Web Visualization"]:::frontend'
    echo '    I["⚙️ Infra<br/>Orchestration"]:::infra'
    echo '    D["📚 Docs<br/>Documentation"]:::infra'
    echo ''
    echo '    %% External Services'
    echo '    PG["🗄 PostgreSQL + pgvector"]:::external'
    echo '    RD["⚡ Redis"]:::external'
    echo '    OL["🤖 Ollama"]:::external'
    echo ''
    echo '    %% Module Dependencies'

    # Listener → Observer (stores analysis results)
    if grep -q "observer\|OBSERVER" "$PROJECT_ROOT/listener/app/"*.py "$PROJECT_ROOT/listener/app/"**/*.py 2>/dev/null; then
        echo '    L -->|"stores results"| O'
    else
        echo '    L -.->|"stores results"| O'
    fi

    # Listener → Versor (quaternion calculations)
    echo '    L -->|"VAC coordinates"| V'

    # Observer → Versor (vector math)
    echo '    O -->|"vector search"| V'

    # Experience → APIs
    echo '    E -->|"REST API"| O'
    echo '    E -->|"REST API"| V'
    echo '    E -->|"REST API"| L'

    echo ''
    echo '    %% Infrastructure Dependencies'

    # Observer → PostgreSQL
    echo '    O -->|"SQL + vectors"| PG'

    # Observer/Listener → Redis
    if grep -q "redis\|Redis" "$PROJECT_ROOT/observer/app/"**/*.py 2>/dev/null; then
        echo '    O -->|"caching"| RD'
    fi
    if grep -q "redis\|Redis\|celery" "$PROJECT_ROOT/listener/app/"**/*.py 2>/dev/null; then
        echo '    L -->|"job queue"| RD'
    fi

    # Listener → Ollama
    echo '    L -->|"LLM inference"| OL'

    echo ''
    echo '    %% Infra manages everything'
    echo '    I -.->|"orchestrates"| L'
    echo '    I -.->|"orchestrates"| O'
    echo '    I -.->|"orchestrates"| V'
    echo '    I -.->|"orchestrates"| E'

    echo '```'
    echo ''

    # Also generate a text summary
    echo '## Module Communication'
    echo ''
    echo '| From | To | Protocol | Purpose |'
    echo '|------|----|----------|---------|'
    echo '| Experience | Observer | REST | Data persistence, library browsing |'
    echo '| Experience | Versor | REST | Quaternion visualization |'
    echo '| Experience | Listener | REST | Audio upload, analysis status |'
    echo '| Listener | Observer | REST | Store analysis results |'
    echo '| Listener | Versor | Internal | VAC → quaternion mapping |'
    echo '| Listener | Ollama | HTTP | LLM semantic analysis |'
    echo '| Observer | PostgreSQL | SQL | Persistent storage, vector search |'
    echo '| Observer | Redis | TCP | Caching, sessions |'
    echo '| Listener | Redis | TCP | Background job queue |'
}

if [ -n "$OUTPUT" ]; then
    {
        echo "# L.O.V.E. Stack — Dependency Graph"
        echo ""
        echo "_Generated: $(date '+%Y-%m-%d')_"
        echo ""
        generate_graph
    } > "$OUTPUT"
    print_success "Dependency graph written to $OUTPUT"
else
    generate_graph
fi
