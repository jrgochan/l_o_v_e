# Versor Module - Setup and Installation

## Overview

This guide walks through setting up the Versor module development environment from scratch.

## Prerequisites

### System Requirements

- **Python**: 3.11 or later
- **pip**: Latest version
- **Git**: For version control
- **curl**: For API testing

### macOS Installation

```bash
# Install Python 3.11+
brew install python@3.11

# Verify installation
python3.11 --version
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip
```

## Project Setup

### Step 1: Clone Repository

```bash
git clone git@gitlab.com:l_o_v_e/versor.git
cd versor
```

### Step 2: Create Virtual Environment

```bash
# Create venv
python3.11 -m venv venv

# Activate
source venv/bin/activate  # macOS/Linux

# Verify
python --version  # Should show 3.11+
```

### Step 3: Install Dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

**requirements.txt**:
```text
# FastAPI Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
pydantic-settings==2.1.0

# Scientific Computing
numpy==1.26.3
scipy==1.12.0

# Utilities
python-dotenv==1.0.0

# Testing
pytest==7.4.4
pytest-cov==4.1.0
pytest-benchmark==4.0.0
hypothesis==6.98.0

# Development
black==23.12.1
flake8==7.0.0
mypy==1.8.0
```

### Step 4: Configure Environment

```bash
# Copy example
cp .env.example .env

# Edit
nano .env
```

**.env**:
```bash
# Mathematical Constants
EPSILON=1e-6
FLOODING_THRESHOLD=2.0
DEFAULT_SLERP_STEPS=60
SMOOTHING_ALPHA=0.1

# API Settings
API_VERSION=v1
CORS_ORIGINS=["http://localhost:3000","http://localhost:19006"]

# Performance
MAX_REQUEST_SIZE=1048576  # 1MB
LOG_LEVEL=INFO
DEBUG=false
```

## Running the Application

### Development Server

```bash
# Start with hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Server starts at:
# http://localhost:8001
```

### Test the API

```bash
# Health check
curl http://localhost:8001/health

# Expected:
# {"status":"healthy","version":"1.0.0"}
```

### Access API Documentation

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

### Test Calculation Endpoint

```bash
curl -X POST http://localhost:8001/versor/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "current_vac": {
      "valence": 0.9,
      "arousal": 0.7,
      "connection": 0.8
    },
    "previous_state": null,
    "time_delta_seconds": 1.0
  }'
```

## Docker Setup

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8001

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Build and Run

```bash
# Build image
docker build -t versor:latest .

# Run container
docker run -p 8001:8001 versor:latest

# Test
curl http://localhost:8001/health
```

## Development Tools

### Code Formatting

```bash
# Format with Black
black app/ tests/

# Check linting
flake8 app/ tests/

# Type checking
mypy app/
```

### Running Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/unit/test_quaternion.py

# Verbose
pytest -v

# Benchmarks
pytest tests/benchmarks/ --benchmark-only
```

## Troubleshooting

### Issue: NumPy/SciPy import fails

```bash
# Reinstall scientific stack
pip uninstall numpy scipy
pip install numpy==1.26.3 scipy==1.12.0
```

### Issue: FastAPI not found

```bash
pip install fastapi uvicorn
```

### Issue: Tests fail with import errors

```bash
# Install in editable mode
pip install -e .
```

## Next Steps

Now that your environment is set up:
- **10-deployment.md** - Deploy to production
- **11-testing-strategy.md** - Write comprehensive tests
- **12-performance-optimization.md** - Optimize for < 50ms latency
