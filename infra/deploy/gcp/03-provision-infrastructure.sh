#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/config.sh"

echo "=================================================="
echo "Phase 3: Provision Infrastructure"
echo "=================================================="

if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project)
fi

# 1. Network
echo "Checking VPC Network..."
if ! gcloud compute networks describe "$VPC_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "Creating VPC $VPC_NAME..."
    gcloud compute networks create "$VPC_NAME" --subnet-mode=auto --project="$PROJECT_ID"
else
    echo "VPC $VPC_NAME exists."
fi

# 2. Private Service Access (for SQL/Redis)
echo "Configuring Private Service Access..."
gcloud compute addresses create google-managed-services-$VPC_NAME \
    --global \
    --purpose=VPC_PEERING \
    --prefix-length=16 \
    --description="Peering for Google managed services" \
    --network="$VPC_NAME" \
    --project="$PROJECT_ID" 2>/dev/null || echo "Address range likely exists or overlaps (skipping)"

gcloud services vpc-peerings connect \
    --service=servicenetworking.googleapis.com \
    --ranges=google-managed-services-$VPC_NAME \
    --network="$VPC_NAME" \
    --project="$PROJECT_ID" 2>/dev/null || echo "Peering likely already active (skipping)"

# 3. Serverless VPC Connector
echo "Checking VPC Connector..."
if ! gcloud compute networks vpc-access connectors describe "$CONNECTOR_NAME" --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "Creating VPC Connector $CONNECTOR_NAME..."
    gcloud compute networks vpc-access connectors create "$CONNECTOR_NAME" \
        --network="$VPC_NAME" \
        --region="$REGION" \
        --range="10.8.0.0/28" \
        --project="$PROJECT_ID"
else
    echo "Connector $CONNECTOR_NAME exists."
fi

# 4. Cloud SQL (Postgres)
echo "Checking Cloud SQL..."
if ! gcloud sql instances describe "$SQL_INSTANCE_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "Creating Cloud SQL Instance (this takes a while)..."
    # Create instance
    gcloud sql instances create "$SQL_INSTANCE_NAME" \
        --database-version=POSTGRES_15 \
        --tier="$DB_TIER" \
        --region="$REGION" \
        --network="$VPC_NAME" \
        --no-assign-ip \
        --project="$PROJECT_ID"
        
    # Set password
    DB_PASSWORD=$(openssl rand -base64 12)
    gcloud sql users set-password postgres --instance="$SQL_INSTANCE_NAME" --password="$DB_PASSWORD" --project="$PROJECT_ID"
    
    # Create DB and User
    gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE_NAME" --project="$PROJECT_ID"
    gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE_NAME" --password="$DB_PASSWORD" --project="$PROJECT_ID"
    
    # Store password in Secret Manager
    echo -n "$DB_PASSWORD" | gcloud secrets create "${APP_NAME}-db-password" --data-file=- --project="$PROJECT_ID" 2>/dev/null || \
    echo -n "$DB_PASSWORD" | gcloud secrets versions add "${APP_NAME}-db-password" --data-file=- --project="$PROJECT_ID"
    
    echo "Cloud SQL created. Password saved to Secret Manager: ${APP_NAME}-db-password"
else
    echo "Cloud SQL instance exists."
fi

# 5. Redis (Memorystore)
echo "Checking Redis..."
if ! gcloud redis instances describe "$REDIS_INSTANCE_NAME" --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "Creating Redis Instance..."
    gcloud redis instances create "$REDIS_INSTANCE_NAME" \
        --size="$REDIS_SIZE" \
        --region="$REGION" \
        --network="projects/$PROJECT_ID/global/networks/$VPC_NAME" \
        --connect-mode=PRIVATE_SERVICE_ACCESS \
        --project="$PROJECT_ID"
else
    echo "Redis instance exists."
fi

# 6. Ollama VM
echo "Checking Ollama VM..."
if ! gcloud compute instances describe "$OLLAMA_INSTANCE_NAME" --zone="$ZONE" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "Creating Ollama VM..."
    
    # Startup script to install Ollama
    cat <<EOF > startup-ollama.sh
#!/bin/bash
curl -fsSL https://ollama.com/install.sh | sh
# Enable Ollama to listen on all interfaces
mkdir -p /etc/systemd/system/ollama.service.d
echo '[Service]' > /etc/systemd/system/ollama.service.d/override.conf
echo 'Environment="OLLAMA_HOST=0.0.0.0"' >> /etc/systemd/system/ollama.service.d/override.conf
systemctl daemon-reload
systemctl restart ollama
# Pre-pull models (optional, might timeout script if huge)
# ollama pull llama3.2
EOF

    gcloud compute instances create "$OLLAMA_INSTANCE_NAME" \
        --zone="$ZONE" \
        --machine-type="$OLLAMA_MACHINE_TYPE" \
        --network="$VPC_NAME" \
        --tags="ollama-server" \
        --metadata-from-file startup-script=startup-ollama.sh \
        --project="$PROJECT_ID"
        
    # Firewall rule for internal access
    gcloud compute firewall-rules create "${APP_NAME}-allow-internal-ollama" \
        --network="$VPC_NAME" \
        --allow=tcp:11434 \
        --source-ranges="10.8.0.0/28" \
        --target-tags="ollama-server" \
        --description="Allow Cloud Run connector to access Ollama" \
        --project="$PROJECT_ID" 2>/dev/null || true
        
    rm startup-ollama.sh
else
    echo "Ollama VM exists."
fi

echo "Phase 3 Complete."
