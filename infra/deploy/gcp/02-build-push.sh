#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/config.sh"
ROOT_DIR="$DIR/../../.."

echo "=================================================="
echo "Phase 2: Build & Push Images"
echo "=================================================="

if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project)
fi

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

# Determine container tool
if command -v podman >/dev/null 2>&1; then
    CONTAINER_CMD="podman"
    # Podman Login to Artifact Registry
    echo "Logging into Artifact Registry with Podman..."
    gcloud auth print-access-token | podman login -u oauth2accesstoken --password-stdin "https://${REGION}-docker.pkg.dev"
    
    # Podman default build flags
    BUILD_FLAGS="--format docker"
elif command -v docker >/dev/null 2>&1; then
    CONTAINER_CMD="docker"
    # Authenticate Docker
    echo "Configuring Docker authentication..."
    gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
    BUILD_FLAGS=""
else
    echo "Error: Neither podman nor docker found."
    exit 1
fi

build_and_push() {
    local service=$1
    local dir=$2
    local image_name="${REGISTRY}/${service}:latest"
    local build_args_str=$3 # Optional build arguments
    local use_root_context=$4 # Optional: "true" to use root context

    echo "Building $service using $CONTAINER_CMD..."
    
    local build_context="."
    local dockerfile="Containerfile"

    if [ "$use_root_context" == "true" ]; then
        cd "$ROOT_DIR"
        build_context="."
        dockerfile="$dir/Containerfile"
        echo "  Using Root Context"
    else 
        # Check context
        if [ ! -d "$ROOT_DIR/$dir" ]; then
            echo "Error: Directory $dir not found"
            return 1
        fi
        cd "$ROOT_DIR/$dir"
    fi
    
    # Construct build command
    local cmd="$CONTAINER_CMD build $BUILD_FLAGS --platform linux/amd64 -t $image_name -f $dockerfile"
    
    # Add any build arguments
    if [ -n "$build_args_str" ]; then
        cmd="$cmd $build_args_str"
    fi
    
    # Execute build
    echo "Executing: $cmd $build_context"
    $cmd $build_context
    
    echo "Pushing $service..."
    $CONTAINER_CMD push "$image_name"
    
    # Return to script dir (approximate, since we cd'd around)
    cd "$DIR" >/dev/null
}

# Parse command line arguments
TARGET=""
API_URL=""
EXTRA_ARGS=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --api-url)
      API_URL="$2"
      shift # past argument
      shift # past value
      ;;
    *)
      if [ -z "$TARGET" ]; then
        TARGET="$1"
      else
        EXTRA_ARGS="$EXTRA_ARGS $1"
      fi
      shift # past argument
      ;;
  esac
done

# If API_URL is set, format it as a build argument
if [ -n "$API_URL" ]; then
    echo "Files injected with API URL: $API_URL"
    EXTRA_ARGS="$EXTRA_ARGS --build-arg NEXT_PUBLIC_API_URL=$API_URL"
fi

if [ -n "$HF_TOKEN" ]; then
    echo "Files injected with HF_TOKEN (Hidden)"
    EXTRA_ARGS="$EXTRA_ARGS --build-arg HF_TOKEN=$HF_TOKEN"
fi

case "$TARGET" in
    "backend")
        echo "Building Backend Services..."
        build_and_push "versor" "versor" "$EXTRA_ARGS"
        build_and_push "observer" "observer" "$EXTRA_ARGS"
        build_and_push "listener" "listener" "$EXTRA_ARGS"
        ;;
    "frontend")
        echo "Building Frontend (Experience)..."
        # EXTRA_ARGS should contain --build-arg flags
        # Use experience directory as context
        build_and_push "experience" "experience" "$EXTRA_ARGS" "false"
        ;;
    *)
        echo "Building All Services (Default)..."
        build_and_push "versor" "versor" "$EXTRA_ARGS"
        build_and_push "observer" "observer" "$EXTRA_ARGS"
        build_and_push "listener" "listener" "$EXTRA_ARGS"
        # Use experience directory as context
        build_and_push "experience" "experience" "" "false"
        ;;
esac

echo "Phase 2 Complete. Images are in ${REGISTRY}"
