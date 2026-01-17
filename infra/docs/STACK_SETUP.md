# L.O.V.E. Stack - Complete Setup Guide

This guide helps you set up the entire L.O.V.E. stack (Listener-Observer-Versor-Experience) with consistent Python 3.11 environments across all modules.

## 🚀 Quick Start

### One-Command Setup

```bash
./setup-love-stack.sh
```

This script will:
- ✅ Check for Python 3.11+ (install if needed)
- ✅ Verify system dependencies (PostgreSQL, Redis, Ollama, ffmpeg)
- ✅ Create virtual environments for all Python modules
- ✅ Install all dependencies
- ✅ Setup configuration files
- ✅ Download Ollama LLM model

### Verify Setup

```bash
./test-love-stack.sh
```

This script will:
- ✅ Check all Python environments
- ✅ Verify services are running
- ✅ Test API endpoints
- ✅ Run test suites
- ✅ Validate the critical Connection axis test

---

## 📋 Prerequisites

### Required Software

1. **macOS** (or Linux with adjustments)
2. **Homebrew** package manager
3. **Python 3.11+** (script can install)
4. **Node.js 18+** (for Experience module)

### System Dependencies

The setup script will check and optionally install:

- **PostgreSQL 16** - Database for Observer
- **Redis** - Task queue for Listener
- **Ollama** - Local LLM runtime for Listener
- **ffmpeg** - Audio processing for Listener

---

## 🔧 Manual Setup (If Needed)

### Install Python 3.11

**Option 1: Homebrew**
```bash
brew install python@3.11
```

**Option 2: pyenv (for version management)**
```bash
brew install pyenv
pyenv install 3.11.7
pyenv global 3.11.7
```

### Install System Dependencies

```bash
# All at once
brew install postgresql@16 redis ollama ffmpeg

# Or individually
brew install postgresql@16
brew install redis
brew install ollama
brew install ffmpeg
```

### Start Services

```bash
# PostgreSQL
brew services start postgresql@16

# Redis
brew services start redis

# Ollama (or run in foreground)
ollama serve &

# Pull Ollama model (4.7GB)
ollama pull llama3.1:8b-instruct-q4_0
```

---

## 📦 Module-by-Module Setup

### Versor (Mathematical Core)

```bash
cd versor
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Test:**
```bash
pytest tests/unit/ -v
```

### Observer (Data Persistence)

```bash
cd observer
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed emotion atlas
python scripts/seed_atlas.py
```

**Test:**
```bash
pytest tests/ -v
```

### Listener (Audio & Semantic Analysis)

```bash
cd listener
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

**Test:**
```bash
# Fast tests
pytest tests/unit/ -v -m "not slow"

# Critical semantic test (requires Ollama)
pytest tests/semantic/test_connection_axis.py::TestConnectionAxis::test_pity_vs_compassion -v -s
```

### Experience (Mobile Frontend)

```bash
cd experience
npm install
```

**Test:**
```bash
npm start
```

---

## 🏥 Health Checks

### Quick Health Check

```bash
./test-love-stack.sh
```

### Manual Service Checks

**PostgreSQL:**
```bash
pg_isready
# Should output: accepting connections
```

**Redis:**
```bash
redis-cli ping
# Should output: PONG
```

**Ollama:**
```bash
curl http://localhost:11434/api/tags
# Should return JSON with installed models
```

### API Health Checks

**Versor** (port 8001):
```bash
curl http://localhost:8001/health
```

**Observer** (port 8000):
```bash
curl http://localhost:8000/health
```

**Listener** (port 8002):
```bash
curl http://localhost:8002/health
```

---

## 🚦 Starting the Stack

### Terminal 1: Versor API

```bash
cd versor
source venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

Visit: http://localhost:8001/docs

### Terminal 2: Observer API

```bash
cd observer
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Visit: http://localhost:8000/docs

### Terminal 3: Listener API

```bash
cd listener
source venv/bin/activate
uvicorn app.main:app --reload --port 8002
```

Visit: http://localhost:8002/docs

### Terminal 4: Experience App

```bash
cd experience
npm start
```

---

## 🧪 Running Tests

### All Fast Tests

```bash
# Versor
cd versor && source venv/bin/activate && pytest tests/unit/ -v

# Observer  
cd observer && source venv/bin/activate && pytest tests/ -v

# Listener
cd listener && source venv/bin/activate && pytest tests/unit/ -v -m "not slow"
```

### Critical Semantic Test (Listener)

**The most important test in the system** - validates the Connection axis:

```bash
cd listener
source venv/bin/activate
pytest tests/semantic/test_connection_axis.py::TestConnectionAxis::test_pity_vs_compassion -v -s
```

This test proves the system can distinguish:
- **Pity** (feeling FOR, separation) → Connection < 0
- **Compassion** (feeling WITH, alignment) → Connection > 0.5

---

## 🐛 Troubleshooting

### Python 3.11 Not Found

```bash
# Check what Python versions you have
which python3
python3 --version

# Install Python 3.11
brew install python@3.11

# Add to PATH (add to ~/.zshrc)
export PATH="/opt/homebrew/bin:$PATH"
```

### Virtual Environment Issues

```bash
# Remove and recreate
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### PostgreSQL Connection Issues

```bash
# Check if running
brew services list | grep postgresql

# Start service
brew services start postgresql@16

# Check logs
tail -f /opt/homebrew/var/log/postgresql@16.log
```

### Redis Connection Issues

```bash
# Check if running
redis-cli ping

# Start service
brew services start redis

# Manual start (for debugging)
redis-server
```

### Ollama Issues

```bash
# Check if running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve &

# Check downloaded models
ollama list

# Pull model if missing
ollama pull llama3.1:8b-instruct-q4_0
```

### Import Errors

```bash
# Make sure venv is activated
source venv/bin/activate

# Check Python version
python --version  # Should be 3.11.x or 3.12.x

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

---

## 📊 Verifying Setup

### Check All Modules Use Same Python

```bash
for module in versor observer listener; do
    echo "=== $module ==="
    cd $module
    source venv/bin/activate
    python --version
    deactivate
    cd ..
done
```

Should output Python 3.11.x (or 3.12.x) for all three.

### Test End-to-End Pipeline

1. **Start all services** (PostgreSQL, Redis, Ollama)
2. **Start all APIs** (Versor, Observer, Listener)
3. **Test Listener → Observer → Versor flow:**

```bash
# In listener directory
cd listener
source venv/bin/activate
python -c "
from app.services.semantic_analyzer import SemanticAnalyzer
analyzer = SemanticAnalyzer()
result = analyzer.analyze_sync('I feel overwhelmed by everything')
print(f'Emotion: {result.primary_emotion}')
print(f'VAC: V={result.vac.valence:.2f}, A={result.vac.arousal:.2f}, C={result.vac.connection:.2f}')
"
```

---

## 🎯 Common Commands

### Setup

```bash
./setup-love-stack.sh      # Initial setup
./test-love-stack.sh        # Verify setup
```

### Start Services

```bash
brew services start postgresql@16
brew services start redis
ollama serve &
```

### Activate Virtual Environments

```bash
# Versor
cd versor && source venv/bin/activate

# Observer
cd observer && source venv/bin/activate

# Listener
cd listener && source venv/bin/activate
```

### Run Tests

```bash
# Quick test (no external deps)
pytest tests/unit/ -v

# All tests
pytest tests/ -v

# Specific test
pytest tests/semantic/test_connection_axis.py -v
```

---

## 📚 Additional Resources

- **Versor**: `versor/README.md` - Quaternion mathematics
- **Observer**: `observer/README.md` - Data persistence & vector search
- **Listener**: `listener/README.md` - Audio transcription & VAC extraction
- **Experience**: `experience/README.md` - Mobile 3D visualization

---

## 🎉 Success Indicators

You'll know setup is complete when:

✅ `./test-love-stack.sh` shows 🟢 HEALTHY  
✅ All three modules use Python 3.11+  
✅ PostgreSQL, Redis, and Ollama are running  
✅ All fast tests pass  
✅ Critical semantic test validates Connection axis  

---

## 💡 Tips

1. **Always activate venv** before running Python commands
2. **Keep services running** in background or separate terminals
3. **Run health checks** after system restarts
4. **Check logs** if something doesn't work: `tail -f *.log`
5. **Update regularly**: `git pull && ./setup-love-stack.sh`

---

**Need help?** Check the module-specific README files or run `./test-love-stack.sh` for detailed diagnostics.
