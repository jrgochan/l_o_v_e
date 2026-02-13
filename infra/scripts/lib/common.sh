#!/bin/bash
# Compatibility shim — all common functions now live in infra/lib/common.sh
# This file exists so scripts that source this location continue to work.
# Please update your scripts to source infra/lib/common.sh directly.

# Determine project root from this file's location (infra/scripts/lib/)
_COMMON_SHIM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

# Compute PROJECT_ROOT if not already set
if [ -z "$PROJECT_ROOT" ]; then
    PROJECT_ROOT="$(cd "$_COMMON_SHIM_DIR/../../.." && pwd)"
    export PROJECT_ROOT
fi

# shellcheck source=../../lib/common.sh
. "$_COMMON_SHIM_DIR/../../lib/common.sh"
