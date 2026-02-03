#!/bin/bash
# PersonaPlex Service Setup Script
#
# This script sets up the PersonaPlex service for the L.O.V.E. stack.
# It clones the NVIDIA PersonaPlex repository, installs dependencies,
# and prepares the environment for voice mode.

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERSONAPLEX_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$PERSONAPLEX_DIR")"

echo -e "${BLUE}🎙️  PersonaPlex Service Setup${NC}"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "$PERSONAPLEX_DIR/requirements.txt" ]; then
    echo -e "${RED}❌ Error: Not in PersonaPlex directory${NC}"
    echo "Please run this script from: personaplex/scripts/setup.sh"
    exit 1
fi

# Step 1: Check Python version
echo -e "${BLUE}1/6 Checking Python version...${NC}"

# Try to find a suitable python executable
PYTHON_CMD=""
for cmd in python3.12 python3.11 python3.10 python3; do
    if command -v "$cmd" &> /dev/null; then
        VERSION=$($cmd --version 2>&1 | awk '{print $2}')
        # Check if version >= 3.10
        if [ "$(printf '%s\n' "3.10" "$VERSION" | sort -V | head -n1)" = "3.10" ]; then
            PYTHON_CMD="$cmd"
            PYTHON_VERSION="$VERSION"
            break
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo -e "${RED}❌ Python 3.10+ required (found none or too old)${NC}"
    echo "Please install Python 3.12: https://www.python.org/downloads/"
    exit 1
fi

echo -e "${GREEN}✓ Found $PYTHON_CMD (version $PYTHON_VERSION)${NC}"
echo ""
echo -e "${GREEN}✓ Python version OK${NC}"
echo ""

# Step 2: Check if Git is installed
echo -e "${BLUE}2/6 Checking Git...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git not found. Please install Git first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git installed${NC}"
echo ""

# Step 3: Clone PersonaPlex repository as submodule
echo -e "${BLUE}3/6 Setting up PersonaPlex repository...${NC}"
cd "$ROOT_DIR"

if [ -d "personaplex/moshi" ]; then
    echo -e "${YELLOW}⚠️  PersonaPlex repository already exists${NC}"
    read -p "Reinstall? [y/N]: " REINSTALL
    if [[ "$REINSTALL" =~ ^[Yy]$ ]]; then
        echo "Removing existing installation..."
        git submodule deinit -f personaplex/moshi 2>/dev/null || true
        rm -rf .git/modules/personaplex/moshi
        rm -rf personaplex/moshi
    else
        echo "Skipping clone"
    fi
fi

if [ ! -d "personaplex/moshi" ]; then
    echo "Cloning NVIDIA PersonaPlex repository..."
    git submodule add https://github.com/NVIDIA/personaplex.git personaplex/moshi
    git submodule update --init --recursive
    echo -e "${GREEN}✓ PersonaPlex repository cloned${NC}"
else
    echo -e "${GREEN}✓ PersonaPlex repository present${NC}"
fi
echo ""

# Step 4: Check Opus codec library
echo -e "${BLUE}4/6 Checking Opus codec library...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if ! brew list opus &>/dev/null; then
        echo "Installing Opus codec via Homebrew..."
        brew install opus
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if ! dpkg -l | grep -q libopus-dev; then
        echo "Installing Opus codec (requires sudo)..."
        sudo apt-get update
        sudo apt-get install -y libopus-dev
    fi
fi
echo -e "${GREEN}✓ Opus codec available${NC}"
echo ""

# Step 5: Create virtual environment and install dependencies
echo -e "${BLUE}5/6 Installing Python dependencies...${NC}"
cd "$PERSONAPLEX_DIR"

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment using $PYTHON_CMD..."
    $PYTHON_CMD -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install PersonaPlex service requirements
echo "Installing PersonaPlex service dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Install PersonaPlex/Moshi dependencies
echo "Installing PersonaPlex (Moshi) package..."
if [ -d "moshi/moshi" ]; then
    pip install -e moshi/moshi
elif [ -d "moshi" ]; then
     # Fallback if structure is different (e.g. if root is package)
     if [ -f "moshi/pyproject.toml" ]; then
        pip install -e moshi
     else
        echo -e "${YELLOW}⚠️  Could not find pyproject.toml in moshi or moshi/moshi${NC}"
     fi
else
    echo -e "${YELLOW}⚠️  PersonaPlex repository not found/empty${NC}"
    echo "You'll need to run this setup again after cloning PersonaPlex"
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 6: Check GPU availability
echo -e "${BLUE}6/6 Checking GPU availability...${NC}"
if command -v nvidia-smi &> /dev/null; then
    echo "NVIDIA GPU detected:"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
    echo -e "${GREEN}✓ GPU available for PersonaPlex${NC}"
    echo ""
    echo -e "${GREEN}You can run PersonaPlex with GPU acceleration${NC}"
else
    echo -e "${YELLOW}⚠️  No NVIDIA GPU detected${NC}"
    echo "PersonaPlex will use CPU offload mode (slower latency)"
    echo "To enable CPU mode, set PERSONAPLEX_CPU_OFFLOAD=true in .env"
fi
echo ""

# Step 7: Environment configuration
echo -e "${BLUE}Environment Setup${NC}"
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and add your HuggingFace token${NC}"
    echo ""
    echo "Steps:"
    echo "1. Go to: https://huggingface.co/settings/tokens"
    echo "2. Create a token (read permission is sufficient)"
    echo "3. Accept model license: https://huggingface.co/nvidia/personaplex-7b-v1"
    echo "4. Add token to personaplex/.env: HF_TOKEN=hf_xxx..."
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi
echo ""

# Step 8: Create marker file for completion
echo "Setup complete!" > "$PERSONAPLEX_DIR/.setup_complete"

echo "================================================"
echo -e "${GREEN}✅ PersonaPlex Service Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure HuggingFace token in: personaplex/.env"
echo "2. Download models: ./personaplex/scripts/download_models.sh"
echo "3. Start service: ./infra/bin/run-love-stack.sh"
echo ""
echo "Or test PersonaPlex directly:"
echo "  cd personaplex"
echo "  source .venv/bin/activate"
echo "  uvicorn app.main:app --port 8003 --reload"
echo ""
