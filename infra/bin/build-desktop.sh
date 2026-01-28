#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Building L.O.V.E. Native Desktop App ===${NC}"

# 1. Check Prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Error: Rust is not installed. Please install Rust via rustup.rs${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    exit 1
fi

# 2. Build Web Assets (Static Export)
echo -e "${BLUE}Building Web Assets (Static Export)...${NC}"
export APP_MODE=desktop

# Change to experience directory for npm commands
cd experience || exit 1

# Run the build in the web workspace
npm run build --workspace=web

# Verify output exists (relative to experience dir)
if [ ! -d "web/out" ]; then
    echo -e "${RED}Error: Web build failed. experience/web/out directory not found.${NC}"
    exit 1
fi

# 3. Build Tauri App
echo -e "${BLUE}Building Native App (Tauri)...${NC}"
# Run the build in the desktop workspace
npm run build --workspace=desktop

echo -e "${GREEN}=== Build Complete! ===${NC}"
echo -e "${GREEN}App bundle location:${NC}"
echo "experience/desktop/src-tauri/target/release/bundle/macos/L.O.V.E. Experience.app"
