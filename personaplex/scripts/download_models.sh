#!/bin/bash
# Download PersonaPlex Models
#
# Downloads the PersonaPlex 7B model from HuggingFace.
# Requires HF_TOKEN to be set in .env

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERSONAPLEX_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}📦 PersonaPlex Model Download${NC}"
echo "================================================"
echo ""

# Load environment variables
if [ -f "$PERSONAPLEX_DIR/.env" ]; then
    export $(grep -v '^#' "$PERSONAPLEX_DIR/.env" | xargs)
else
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Run setup.sh first to create .env"
    exit 1
fi

# Check HF_TOKEN
if [ -z "$HF_TOKEN" ]; then
    echo -e "${RED}❌ HF_TOKEN not set in .env${NC}"
    echo ""
    echo "Please:"
    echo "1. Get token from: https://huggingface.co/settings/tokens"
    echo "2. Accept license: https://huggingface.co/nvidia/personaplex-7b-v1"
    echo "3. Add to .env: HF_TOKEN=hf_xxx..."
    exit 1
fi

echo -e "${GREEN}✓ HuggingFace token configured${NC}"
echo ""

# Activate virtual environment
if [ -f "$PERSONAPLEX_DIR/.venv/bin/activate" ]; then
    source "$PERSONAPLEX_DIR/.venv/bin/activate"
else
    echo -e "${YELLOW}⚠️  Virtual environment not found${NC}"
    echo "Run setup.sh first"
    exit 1
fi

# Download models using PersonaPlex
echo "Downloading PersonaPlex 7B model..."
echo "This will download ~14GB and may take a while..."
echo ""

cd "$PERSONAPLEX_DIR"

# The first run of PersonaPlex will automatically download models
# We'll use the offline mode to trigger model download
python3 << 'EOF'
import os
from huggingface_hub import snapshot_download

# Set token
hf_token = os.getenv('HF_TOKEN')
if not hf_token:
    print("ERROR: HF_TOKEN not found")
    exit(1)

# Download model
print("Downloading nvidia/personaplex-7b-v1...")
snapshot_download(
    repo_id="nvidia/personaplex-7b-v1",
    token=hf_token,
    local_dir="./models",
    local_dir_use_symlinks=False
)

print("✓ Model downloaded successfully")
EOF

# Create marker file
echo "PersonaPlex models ready" > "$PERSONAPLEX_DIR/.models_ready"

echo ""
echo "================================================"
echo -e "${GREEN}✅ Models downloaded successfully!${NC}"
echo ""
echo "PersonaPlex service is ready to use."
echo "Start it with: uvicorn app.main:app --port 8003"
echo ""
