# Listener Module - Setup Guide

## Overview

The Listener Module provides audio transcription and semantic VAC extraction using a fully **local-first** architecture. No external API keys required!

## Architecture

- **Transcription**: faster-whisper (local Whisper model)
- **Semantic Analysis**: Ollama (local LLM - Llama 3.1)
- **Task Queue**: Redis + Arq
- **API**: FastAPI

## Prerequisites

### System Requirements

- **OS**: macOS, Linux, or Windows (with WSL)
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 10GB free space (for models)
- **Python**: 3.11+
- **Optional**: GPU with 6GB+ VRAM (for faster processing)

### Software Dependencies

#### 1. Ollama (Local LLM Runtime)

**macOS**:
```bash
brew install ollama
```

**Linux**:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Verify Installation**:
```bash
ollama --version
```

#### 2. Redis (Task Queue)

**macOS**:
```bash
brew install redis
brew services start redis
```

**Linux**:
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

**Verify Installation**:
```bash
redis-cli ping
# Should return: PONG
```

#### 3. ffmpeg (Audio Processing)

**macOS**:
```bash
brew install ffmpeg
```

**Linux**:
```bash
sudo apt install ffmpeg
```

**Verify Installation**:
```bash
ffmpeg -version
```

## Installation

### Step 1: Create Python Virtual Environment

```bash
cd listener
python3.12 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### Step 2: Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```



### Step 4: Download Ollama Model

Start Ollama service (if not already running):
```bash
ollama serve &
```

Pull the Llama 3.1 8B model:
```bash
ollama pull llama3.1:8b-instruct-q4_0
```

**Alternative models**:
- **Faster** (less accurate): `ollama pull mistral:7b-instruct`
- **Better** (slower): `ollama pull llama3.1:70b-instruct` (requires 40GB+ RAM)

### Step 5: Download Whisper Model

The faster-whisper model will be downloaded automatically on first use.

**Available models**:
- `tiny.en` (39MB) - Fastest, lowest accuracy
- `base.en` (74MB) - **Recommended** for development
- `small.en` (244MB) - Good balance
- `medium.en` (769MB) - High accuracy
- `large-v3` (1.5GB) - Best accuracy

Set your preferred model in `.env` (default is `base.en`).

### Step 6: Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` to match your setup (defaults should work for most cases).

## Running the System

### Terminal 1: Start Ollama (if not running as service)

```bash
ollama serve
```

### Terminal 2: Start Redis (if not running as service)

```bash
redis-server
```

### Terminal 3: Start Listener API

```bash
cd listener
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

API will be available at: `http://localhost:8002`

### Terminal 4: Start Worker (for async processing)

```bash
cd listener
source .venv/bin/activate
arq app.workers.audio_processor.WorkerSettings
```

## Verification

### 1. Check API Health

```bash
curl http://localhost:8002/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "0.1.0"
}
```

### 2. Check Ollama

```bash
curl http://localhost:11434/api/tags
```

Should list your installed models.

### 3. Run Tests

```bash
pytest tests/ -v
```

## Performance Expectations

### With base.en model on CPU (M1/M2 Mac or modern Intel):
- **Transcription**: ~500ms for 10s audio
- **Semantic Analysis**: ~1-2s
- **Total Pipeline**: ~2-3s ✅

### With GPU acceleration:
- **Transcription**: ~200ms for 10s audio
- **Semantic Analysis**: ~500ms
- **Total Pipeline**: ~1s 🚀

## Troubleshooting

### Ollama not responding

```bash
# Check if service is running
ps aux | grep ollama

# Restart service
pkill ollama
ollama serve &
```

### Redis connection refused

```bash
# Check if Redis is running
redis-cli ping

# Start Redis
redis-server
```

### faster-whisper model download fails

```bash
# Check internet connection
# Models download automatically from Hugging Face
# If behind proxy, set:
export HF_ENDPOINT=https://huggingface.co
```

### Import errors

```bash
# Make sure .venv is activated
source .venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

## Next Steps

1. **Run the test suite**: `pytest tests/ -v`
2. **Test transcription**: See `tests/unit/test_transcription.py`
3. **Test semantic analysis**: See `tests/semantic/test_connection_axis.py`
4. **Integration with Observer**: See `docs/` for API specifications

## Development

### Running specific test categories

```bash
# Unit tests only
pytest tests/unit/ -v

# Semantic tests only
pytest tests/semantic/ -v -m semantic

# Integration tests
pytest tests/integration/ -v -m integration
```

### Code coverage

```bash
pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html
```

## Architecture Decision: Why Local-First?

1. **Privacy**: Audio never leaves your machine
2. **Cost**: No API fees
3. **Speed**: No network latency
4. **Reliability**: Works offline
5. **Development**: Faster iteration cycles

## Resources

- [faster-whisper Documentation](https://github.com/guillaumekln/faster-whisper)
- [Ollama Documentation](https://ollama.com/docs)
- [LangChain Documentation](https://python.langchain.com/)
- [Arq Documentation](https://arq-docs.helpmanual.io/)
