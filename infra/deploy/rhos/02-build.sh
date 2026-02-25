#!/bin/bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$DIR/../../.."
source "$DIR/config.sh"

SERVICE=$1
BUILD_ARGS_STR=$2

build_service() {
    local svc_name=$1
    local dir=$2
    local build_args=$3

    echo "------------------------------------------------"
    echo "Building $svc_name..."
    echo "------------------------------------------------"

    echo "Preparing sparse build context..."
    local build_context=""
    local dockerfile_path=""

    if [[ "$svc_name" == "versor" || "$svc_name" == "observer" || "$svc_name" == "listener" ]]; then
        build_context=$(mktemp -d "/tmp/love-build-ctx-$svc_name-XXXXXX")

        echo "Copying minimal dependencies to $build_context..."
        cp -p "$ROOT_DIR/pyproject.toml" "$build_context/" || true
        cp -p "$ROOT_DIR/uv.lock" "$build_context/" || true

        mkdir -p "$build_context/infra/lib"
        cp -R "$ROOT_DIR/infra/lib/python" "$build_context/infra/lib/python"

        cp -R "$ROOT_DIR/$dir" "$build_context/$dir"

        # Strip cache directories and local environment variables that might have accidentally been copied
        rm -rf "$build_context/$dir/.venv" "$build_context/$dir/htmlcov" "$build_context/$dir/.mypy_cache" "$build_context/$dir/.pytest_cache" "$build_context/$dir/.env"

        dockerfile_path="$dir/Containerfile"
    else
        build_context="$ROOT_DIR/$dir"
        dockerfile_path="Containerfile"
    fi

    echo "Configuring build to use Containerfile..."
    oc patch bc "love-$svc_name" -p '{"spec":{"strategy":{"dockerStrategy":{"dockerfilePath":"'"$dockerfile_path"'"}}}}'

    echo "Starting OpenShift build from sparse directory..."
    if [ -n "$build_args" ]; then
        # shellcheck disable=SC2086
        oc start-build "love-$svc_name" --from-dir="$build_context" --follow $build_args
    else
        oc start-build "love-$svc_name" --from-dir="$build_context" --follow
    fi

    if [[ "$svc_name" == "versor" || "$svc_name" == "observer" || "$svc_name" == "listener" ]]; then
        echo "Cleaning up temporary build context..."
        rm -rf "$build_context"
    fi

}

if [ -z "$SERVICE" ]; then
    echo "Building ALL services..."
    SERVICES="versor observer listener experience"
else
    if [ "$SERVICE" == "backend" ]; then
         SERVICES="versor observer listener"
    else
         SERVICES="$SERVICE"
    fi
fi

for s in $SERVICES; do
    case $s in
        "versor") build_service "versor" "versor" ;;
        "observer") build_service "observer" "observer" ;;
        "listener") build_service "listener" "listener" ;;
        "experience") build_service "experience" "experience" "$BUILD_ARGS_STR" ;;
    esac
done
