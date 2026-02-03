#!/bin/bash
# Quick start script for PersonaPlex service

# Activate virtual environment
source .venv/bin/activate

# Verify Python version
echo "Using Python: $(which python3)"
python3 --version

# Start uvicorn
echo "Starting PersonaPlex service on port 8003..."
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
