# Observer Module - Complete Setup Guide

> **Quick Start Guide** for getting the Observer module running locally with proper virtual environment management.

---

## 📋 Prerequisites

- **Python 3.11+** installed
- **Podman** (or Docker) installed
- **Versor module** (dependency for quaternion calculations)
- **PostgreSQL 16 with pgvector** (provided via container)

---

## 🚀 Quick Start (Copy-Paste Ready)

### 1. Start PostgreSQL Container

```bash
cd /Users/jrgochan/code/gitlab.com/l_o_v_e/observer
podman-compose up -d postgres

# Verify running
podman-compose ps
```

### 2. Check Python Version

```bash
# Try Python 3.11
python3.11 --version

# If that doesn't work, try python3
python3 --version

# Install if needed
brew install python@3.11
```

### 3. Create Virtual Environment

```bash
# Use whichever Python command worked above
python3.11 -m venv venv

# OR
python3 -m venv venv
```

### 4. Activate Virtual Environment ⚠️ **CRITICAL STEP**

```bash
source venv/bin/activate
```

**Verification:** Your prompt should now show `(venv)`:
```
(venv) user@machine observer %
```

### 5. Install Dependencies

```bash
# Upgrade pip first
pip install --upgrade pip

# Install all requirements (~400MB download on first run)
pip install -r requirements.txt
```

**What gets installed:**
- FastAPI & Uvicorn (API framework)
- SQLAlchemy & asyncpg (async database)
- pgvector (vector support)
- sentence-transformers & torch (local embeddings)
- Alembic (migrations)
- pytest (testing)
- And more...

### 6. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit if needed (defaults are fine for local dev)
# nano .env
```

### 7. Create Database Schema

```bash
# Generate migration from models
alembic revision --autogenerate -m "Initial schema with pgvector"

# Apply migration
alembic upgrade head
```

### 8. Verify Database

```bash
podman exec -it observer_postgres psql -U love_user -d love_db

# In psql:
\dt                      # List tables (should see atlas_definitions, user_trajectory)
\d atlas_definitions     # Describe atlas table
\dx                      # List extensions (should see vector)
\q                       # Quit
```

### 9. Start Versor (Dependency)

**Open a NEW terminal:**

```bash
cd /Users/jrgochan/code/gitlab.com/l_o_v_e/versor

# Activate Versor's venv
source venv/bin/activate

# Start Versor API on port 8001
uvicorn app.main:app --port 8001
```

**Test Versor is running:**
```bash
curl http://localhost:8001/health
# Should return: {"status": "healthy", ...}
```

### 10. Seed the Atlas

**Back in Observer terminal (with venv active):**

```bash
# Make sure you're in observer directory and venv is active
cd /Users/jrgochan/code/gitlab.com/l_o_v_e/observer
source venv/bin/activate  # If not already active

# Run seeding script (requires Versor running!)
python scripts/seed_atlas.py
```

**Expected Output:**
```
============================================================
ATLAS SEEDING SCRIPT - L.O.V.E. Observer Module
============================================================
Seeding 57 emotions from Atlas of the Heart
Embedding Provider: local
Versor URL: http://localhost:8001

Initializing services...
✓ Services initialized
[1/57] Processing: Stress
  ✓ Generated embedding (384 dims)
  ✓ Calculated quaternion: w=0.873
  ✓ Added to database
[2/57] Processing: Overwhelm
  ...
============================================================
✓ Successfully seeded 57/57 emotions
============================================================
Database now contains: 57 emotions
```

### 11. Start Observer API

```bash
uvicorn app.main:app --reload --port 8000
```

**You should see:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Starting Observer Module...
INFO:     Database initialized successfully
INFO:     Application startup complete.
```

### 12. Verify Installation

**Open a NEW terminal:**

```bash
# Health check
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "pgvector_version": "0.6.0",
  "atlas_emotions_count": 57,
  "timestamp": "2025-12-03T16:45:00.000Z"
}
```

### 13. Access API Documentation

Open in your browser:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Root**: http://localhost:8000/

---

## 🔧 Troubleshooting

### Issue: `command not found: python3.11`

**Solution:**
```bash
# Check available Python
python3 --version

# If 3.11+, use python3 instead
python3 -m venv venv
source venv/bin/activate
```

### Issue: `command not found: pip`

**Cause:** Virtual environment not activated

**Solution:**
```bash
# Activate venv
source venv/bin/activate

# Verify (prompt should show (venv))
which pip
# Should output: /path/to/observer/venv/bin/pip
```

### Issue: `ModuleNotFoundError` when running scripts

**Cause:** Wrong Python or venv not active

**Solution:**
```bash
# Make sure venv is active
source venv/bin/activate

# Verify Python
which python
# Should output: /path/to/observer/venv/bin/python

# Reinstall if needed
pip install -r requirements.txt
```

### Issue: Versor connection error during seeding

**Symptom:**
```
✗ Failed to initialize services: Connection refused
```

**Cause:** Versor not running

**Solution:**
```bash
# In separate terminal
cd /Users/jrgochan/code/gitlab.com/l_o_v_e/versor
source venv/bin/activate
uvicorn app.main:app --port 8001

# Verify
curl http://localhost:8001/health
```

### Issue: Database connection error

**Symptom:**
```
ERROR: Connection refused (localhost:5432)
```

**Cause:** PostgreSQL container not running

**Solution:**
```bash
# Check container status
podman-compose ps

# Start if stopped
podman-compose up -d postgres

# Verify
podman exec -it observer_postgres psql -U love_user -d love_db -c "SELECT 1;"
```

### Issue: pgvector extension not found

**Symptom:**
```
ERROR: extension "vector" is not available
```

**Solution:**
```bash
# Enter container
podman exec -it observer_postgres psql -U love_user -d love_db

# Create extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
\dx
# Should show "vector" in list
```

### Issue: Slow first run (downloading model)

**Cause:** sentence-transformers downloading model (~400MB)

**This is normal!** First run will download the embedding model. Subsequent runs will be fast.

---

## 🗂️ Directory Structure After Setup

```
observer/
├── venv/                    # Virtual environment (gitignored)
├── .env                     # Your local config (gitignored)
├── migrations/
│   └── versions/
│       └── xxx_initial_schema.py  # Generated migration
├── app/
├── tests/
├── scripts/
└── ...
```

---

## 📝 Daily Development Workflow

### Starting Fresh Each Day

```bash
# 1. Navigate to observer
cd /Users/jrgochan/code/gitlab.com/l_o_v_e/observer

# 2. Start PostgreSQL (if not running)
podman-compose up -d postgres

# 3. Activate venv
source venv/bin/activate

# 4. Start Versor (separate terminal)
cd ../versor && source venv/bin/activate && uvicorn app.main:app --port 8001

# 5. Start Observer
cd ../observer && uvicorn app.main:app --reload --port 8000
```

### Running Tests (When Available)

```bash
# Activate venv first!
source venv/bin/activate

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/unit/test_emotion_mapper.py -v
```

### Updating Dependencies

```bash
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt --upgrade
```

---

## 🎯 Verification Checklist

After setup, verify these all work:

- [ ] `podman-compose ps` shows postgres running
- [ ] `source venv/bin/activate` shows (venv) in prompt
- [ ] `which python` shows venv Python
- [ ] `which pip` shows venv pip
- [ ] `alembic current` shows migration hash
- [ ] `podman exec -it observer_postgres psql -U love_user -d love_db -c "\dt"` shows tables
- [ ] `curl http://localhost:8001/health` returns Versor health
- [ ] `curl http://localhost:8000/health` returns Observer health with 57 emotions
- [ ] http://localhost:8000/docs opens Swagger UI

---

## 🔐 Important Notes

### What's Gitignored

These are **not** tracked in git:
- `venv/` - Your virtual environment
- `.env` - Your local configuration
- `__pycache__/` - Python bytecode
- `.pytest_cache/` - Test cache
- `*.log` - Log files

### What's Tracked

These **are** tracked in git:
- `.env.example` - Template for .env
- `requirements.txt` - Dependency list
- `migrations/` - Database migrations
- All application code

---

## 📚 Additional Resources

- [Observer README.md](README.md) - Full documentation
- [Versor Setup](../versor/README.md) - Dependency module
- [Architecture Docs](docs/01-architecture.md) - System design
- [API Specification](docs/05-api-specification.md) - Endpoint details

---

## 🆘 Getting Help

If you encounter issues not covered here:

1. Check the main [README.md](README.md)
2. Review error logs carefully
3. Verify venv is active (`(venv)` in prompt)
4. Ensure Versor is running
5. Check PostgreSQL container status

---

**Setup complete! You're ready to develop on the Observer module.** 🎉
