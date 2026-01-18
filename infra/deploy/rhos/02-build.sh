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

    # Create BuildConfig if missing
    if ! oc get bc "love-$svc_name" &> /dev/null; then
        echo "Creating BuildConfig love-$svc_name..."
        # Use binary build with Docker strategy
        oc new-build --binary --strategy=docker --name="love-$svc_name"
        # Enable local lookup so Deployments can just use image: love-svc:latest
        oc set image-lookup "love-$svc_name"
    fi

    # Patch to use Containerfile if Dockerfile is missing (runs for existing BCs too)
    if [ -f "$ROOT_DIR/$dir/Containerfile" ]; then
         echo "Configuring build to use Containerfile..."
         oc patch bc "love-$svc_name" -p '{"spec":{"strategy":{"dockerStrategy":{"dockerfilePath":"Containerfile"}}}}'
    fi

    echo "Starting build..."
    # Prepare build args
    local oc_build_args=""
    if [ -n "$build_args" ]; then
        # Parse "--build-arg KEY=VAL" into "--build-arg KEY=VAL"
        # Since oc start-build also takes --build-arg, we pass them directly.
        # Assuming BUILD_ARGS_STR is just passed through.
        oc_build_args="$build_args"
    fi

    # Trigger build
    # We must be in the correct directory or pass --from-dir
    # oc start-build expects --from-dir to point to local source
    
    echo "Uploading source from $ROOT_DIR/$dir..."
    # We execute from ROOT_DIR context but specify the subfolder via passing the entire context?
    # Actually, Docker builds expect the build context.
    # If Containerfile is in $dir/Containerfile, but it copies `app/` from the context...
    # The Containerfile in versor copies `app/` relative to WORKDIR (which is ./).
    # versor/Containerfile says `COPY app/ app/`.
    # So the build context should be `versor/`.
    
    oc start-build "love-$svc_name" --from-dir="$ROOT_DIR/$dir" --follow $oc_build_args
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
