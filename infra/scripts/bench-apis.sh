#!/bin/bash
# L.O.V.E. Stack — API Benchmarking
# Measures response times for API health endpoints.
#
# Usage:
#   ./bench-apis.sh            # Quick benchmark (10 requests)
#   ./bench-apis.sh -n 100     # 100 requests
#   ./bench-apis.sh --warm     # Warmup + benchmark

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=../lib/common.sh
. "$PROJECT_ROOT/infra/lib/common.sh"
timer_start

# Defaults
NUM_REQUESTS=10
WARMUP=false

# Parse args
while [[ $# -gt 0 ]]; do
    case "$1" in
        -n|--num) NUM_REQUESTS="$2"; shift 2 ;;
        --warm|--warmup) WARMUP=true; shift ;;
        -h|--help)
            echo "Usage: $0 [-n <requests>] [--warm]"
            echo "  -n <num>    Number of requests per endpoint (default: 10)"
            echo "  --warm      Send warmup requests first"
            exit 0
            ;;
        *) shift ;;
    esac
done

ENDPOINTS=(
    "Versor:http://localhost:8001/health"
    "Observer:http://localhost:8000/health"
    "Listener:http://localhost:8002/health"
)

print_header "⚡ API Benchmark"
print_info "Requests per endpoint: $NUM_REQUESTS"

# ── Benchmark function ──────────────────────────────────────
bench_endpoint() {
    local name="$1"
    local url="$2"
    local times=()
    local failures=0

    # Check if endpoint is reachable
    if ! curl -sf --connect-timeout 2 --max-time 3 "$url" >/dev/null 2>&1; then
        printf "  %-12s %b%s unreachable%b\n" "$name" "$RED" "$CROSS" "$NC"
        return 1
    fi

    # Warmup
    if [ "$WARMUP" = true ]; then
        for _ in $(seq 1 3); do
            curl -sf "$url" >/dev/null 2>&1 || true
        done
    fi

    # Benchmark
    for _ in $(seq 1 "$NUM_REQUESTS"); do
        local time_ms
        time_ms=$(curl -sf -o /dev/null -w "%{time_total}" "$url" 2>/dev/null || echo "0")

        if [ "$time_ms" = "0" ]; then
            failures=$((failures + 1))
        else
            # Convert to milliseconds
            local ms
            ms=$(echo "$time_ms * 1000" | bc 2>/dev/null || echo "0")
            times+=("$ms")
        fi
    done

    if [ ${#times[@]} -eq 0 ]; then
        printf "  %-12s %b%s all requests failed%b\n" "$name" "$RED" "$CROSS" "$NC"
        return 1
    fi

    # Sort times for percentiles
    mapfile -t sorted < <(printf '%s\n' "${times[@]}" | sort -n)

    local count=${#sorted[@]}
    local p50_idx=$(( count * 50 / 100 ))
    local p95_idx=$(( count * 95 / 100 ))
    local p99_idx=$(( count * 99 / 100 ))

    # Clamp indices
    [ "$p50_idx" -ge "$count" ] && p50_idx=$((count - 1))
    [ "$p95_idx" -ge "$count" ] && p95_idx=$((count - 1))
    [ "$p99_idx" -ge "$count" ] && p99_idx=$((count - 1))

    local p50="${sorted[$p50_idx]}"
    local p95="${sorted[$p95_idx]}"
    local p99="${sorted[$p99_idx]}"
    local min="${sorted[0]}"
    local max="${sorted[$((count - 1))]}"

    # Format output
    printf "  %-12s p50: %6.1fms  p95: %6.1fms  p99: %6.1fms  min: %6.1fms  max: %6.1fms" \
        "$name" "$p50" "$p95" "$p99" "$min" "$max"

    if [ "$failures" -gt 0 ]; then
        printf "  (%d failed)" "$failures"
    fi
    echo ""
}

# ── Run benchmarks ──────────────────────────────────────────
echo ""
printf "  %-12s %-14s %-14s %-14s %-14s %-14s\n" \
    "Endpoint" "p50" "p95" "p99" "min" "max"
echo "  $(printf '%.0s─' {1..85})"

for endpoint in "${ENDPOINTS[@]}"; do
    name="${endpoint%%:*}"
    url="${endpoint#*:}"
    bench_endpoint "$name" "$url"
done

echo ""
timer_end "Benchmark"
