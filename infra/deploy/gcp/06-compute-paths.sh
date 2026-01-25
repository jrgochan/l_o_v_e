#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$DIR/config.sh"

echo "=================================================="
echo "Phase 6: Compute Path Matrix (Remote Execution)"
echo "=================================================="

# Check if feature is enabled
if [ "${COMPUTE_PATHS:-false}" != "true" ]; then
    echo "Skipping path computation (Enable with --compute-paths)"
    exit 0
fi

if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project)
fi

JOB_NAME="${APP_NAME}-compute-paths"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
IMAGE="${REGISTRY}/observer:latest"

# 1. Retrieve Infrastructure Info (Same as 04-deploy-services.sh)
echo "Retrieving Connection Info..."
DB_IP=$(gcloud sql instances describe "$SQL_INSTANCE_NAME" --project="$PROJECT_ID" --format='value(ipAddresses[0].ipAddress)')
DB_SECRET_VERSION="${APP_NAME}-db-password:latest"

# Redis
REDIS_HOST=$(gcloud redis instances describe "$REDIS_INSTANCE_NAME" --region="$REGION" --project="$PROJECT_ID" --format='value(host)')
REDIS_PORT=$(gcloud redis instances describe "$REDIS_INSTANCE_NAME" --region="$REGION" --project="$PROJECT_ID" --format='value(port)')

echo "  Target DB: $DB_IP"
echo "  Target Image: $IMAGE"

# 2. Deploy/Update Cloud Run Job
echo "Deploying Cloud Run Job: $JOB_NAME..."

# Note: We override the entrypoint to run our specific script
# We pass environment variables identical to the main service so it can connect
# shellcheck disable=SC2153
gcloud run jobs deploy "$JOB_NAME" \
    --image "$IMAGE" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --vpc-connector "$CONNECTOR_NAME" \
    --cpu "1" \
    --memory "2Gi" \
    --task-timeout "3600s" \
    --max-retries 0 \
    --set-env-vars "POSTGRES_HOST=$DB_IP,POSTGRES_PORT=5432,POSTGRES_DB=$DB_NAME,POSTGRES_USER=$DB_USER" \
    --set-env-vars "REDIS_HOST=$REDIS_HOST,REDIS_PORT=$REDIS_PORT" \
    --set-env-vars "HF_TOKEN=$HF_TOKEN" \
    --set-secrets "POSTGRES_PASSWORD=${DB_SECRET_VERSION}" \
    --command "python3" \
    --args "scripts/compute_path_matrix.py"

# 3. Execute Job
echo "Executing Job for Dataset(s): $DATASET..."

run_job() {
    local dataset_alias=$1
    local dataset_arg=""
    
    # Map alias to actual collection name (Must match seed_all.py)
    case "$(echo "$dataset_alias" | tr '[:upper:]' '[:lower:]')" in
        "goemotions")
            dataset_arg="GoEmotions"
            ;;
        "brene_brown"|"atlas")
            dataset_arg="Atlas of the Heart"
            ;;
        "plutchik")
            dataset_arg="Plutchik Wheel"
            ;;
        "ual")
            dataset_arg="Unified Affective Lexicon"
            ;;
        "all")
            dataset_arg="" # Compute all
            ;;
        "")
            dataset_arg="" # Compute all
            ;;
        *)
            dataset_arg="$dataset_alias" # Fallback to passed value
            ;;
    esac
    
    local args_params=()
    
    if [ -n "$dataset_arg" ]; then
        # Override args (replaces the default args set in deploy)
        # We use an array to handle spaces in dataset names (e.g. "Unified Affective Lexicon") correctly
        args_params=("--args" "scripts/compute_path_matrix.py,--collection,$dataset_arg")
        echo "  - Running for collection: $dataset_arg (alias: $dataset_alias)"
    else
        # Use default args (compute all)
        echo "  - Running for ALL paths"
    fi

    # Execute and wait
    # We purposefully do not capture output here to let gcloud stream status
    gcloud run jobs execute "$JOB_NAME" \
        --region "$REGION" \
        --project "$PROJECT_ID" \
        --wait \
        "${args_params[@]}"
}

if [ "$DATASET" == "all" ]; then
    run_job ""
else
    IFS=',' read -ra ADDR <<< "$DATASET"
    for ds in "${ADDR[@]}"; do
        run_job "$ds"
    done
fi

echo "Path computation complete!"
echo "=================================================="
