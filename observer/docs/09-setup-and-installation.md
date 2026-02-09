# Observer Module - Setup and Installation

## Overview

This guide walks through setting up the Observer module development environment from scratch.

## Prerequisites

### System Requirements

- **Python**: 3.11 or later
- **PostgreSQL**: 16.2 or later
- **Docker**: 20.10+ (optional, for containerized development)
- **Git**: For version control

### macOS Installation

```bash
# Install Python 3.11+ via Homebrew
brew install python@3.11

# Install PostgreSQL 16
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Install Docker Desktop (optional)
brew install --cask docker
```

### Linux (Ubuntu/Debian)

```bash
# Install Python 3.11
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip

# Install PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install postgresql-16
```

## Project Setup

### Step 1: Clone Repository

```bash
# Clone the repo
git clone git@gitlab.com:l_o_v_e/observer.git
cd observer
```

### Step 2: Create Virtual Environment

```bash
# Create venv
python3.11 -m venv venv

# Activate
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate  # Windows

# Verify Python version
python --version  # Should show 3.11+
```

### Step 3: Install Dependencies

```bash
# Install core dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Or use pyproject.toml with Poetry (recommended)
pip install poetry
poetry install
```

**requirements.txt**:
```text
# FastAPI Framework
fastapi[all]==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Database
sqlalchemy[asyncio]==2.0.25
asyncpg==0.29.0
psycopg2-binary==2.9.9
alembic==1.13.1

# Vector Operations
pgvector==0.2.4
numpy==1.26.3
scipy==1.11.4

# Embedding Service
openai==1.10.0
httpx==0.26.0

# Validation
pydantic==2.5.3
pydantic-settings==2.1.0

# Utilities
python-dotenv==1.0.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-json-logger==2.0.7

# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
httpx==0.26.0  # For TestClient
hypothesis==6.98.0  # Property-based testing

# Development
black==23.12.1
flake8==7.0.0
mypy==1.8.0
```

### Step 4: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env
```

**.env**:
```bash
# Database
POSTGRES_USER=love_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=love_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-your-key-here
EMBEDDING_MODEL=text-embedding-3-small

# External Services
VERSOR_URL=http://localhost:8001
LISTENER_URL=http://localhost:8002

# Security
SECRET_KEY=generate-a-secure-random-key-here
ALLOWED_ORIGINS=["http://localhost:3000", "http://localhost:19006"]

# Performance
HNSW_EF_SEARCH=40
DEBUG=true
LOG_LEVEL=DEBUG
```

## Database Setup

### Step 1: Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create user and database
CREATE USER love_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE love_db OWNER love_user;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE love_db TO love_user;

# Exit psql
\q
```

### Step 2: Install pgvector Extension

```bash
# Connect to your database
psql -U love_user -d love_db

# Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
SELECT * FROM pg_extension WHERE extname IN ('uuid-ossp', 'vector');

# Should show both extensions
\q
```

### Step 3: Run Migrations

```bash
# Initialize Alembic (first time only)
alembic init migrations

# Generate migration from models
alembic revision --autogenerate -m "Initial schema"

# Apply migrations
alembic upgrade head

# Verify tables created
psql -U love_user -d love_db -c "\dt"
# Should show: atlas_definitions, user_trajectory, users, sessions
```

### Step 4: Seed Atlas Data

```bash
# Run seeding script
python scripts/seed_atlas.py

# Verify
psql -U love_user -d love_db -c "SELECT COUNT(*) FROM atlas_definitions;"
# Should return: 87
```

## Running the Application

### Development Server

```bash
# Start with hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Server will start at:
# http://localhost:8000
```

### Access API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

### Testing the API

```bash
# Health check
curl http://localhost:8000/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "pgvector_version": "0.6.0",
#   "atlas_emotions_count": 87
# }
```

## Docker Setup (Alternative)

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: love_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: love_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U love_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  observer:
    build: .
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://love_user:secure_password@postgres:5432/love_db
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    volumes:
      - .:/app
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

### Running with Docker

```bash
# Build and start
docker-compose up --build

# Run migrations
docker-compose exec observer alembic upgrade head

# Seed data
docker-compose exec observer python scripts/seed_atlas.py

# View logs
docker-compose logs -f observer
```

## Development Tools

### Code Formatting

```bash
# Format code with Black
black app/ tests/

# Check linting
flake8 app/ tests/

# Type checking
mypy app/
```

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Set up hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

**.pre-commit-config.yaml**:
```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black

  - repo: https://github.com/pycqa/flake8
    rev: 7.0.0
    hooks:
      - id: flake8

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]
```

## Running Tests

```bash
# Run all tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/unit/test_quaternion_builder.py

# Run with verbose output
pytest -v

# Run only integration tests
pytest tests/integration/
```

## Troubleshooting

### Issue: pgvector extension not found

```bash
# Install pgvector from source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Restart PostgreSQL
brew services restart postgresql@16
```

### Issue: asyncpg connection fails

```bash
# Verify PostgreSQL is running
pg_isready

# Check connection
psql -U love_user -d love_db

# If password fails, reset it
psql postgres
ALTER USER love_user WITH PASSWORD 'new_password';
```

### Issue: OpenAI API key invalid

```bash
# Verify key is set
echo $OPENAI_API_KEY

# Test key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

## Next Steps

Now that your environment is set up:
- **10-deployment.md** - Deploy to production
- **11-testing-strategy.md** - Write comprehensive tests
- **12-performance-optimization.md** - Optimize database performance
