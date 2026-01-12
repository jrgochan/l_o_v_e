# Common Tasks

**Reading Time:** ~30 minutes  
**Audience:** New developers  
**Prerequisites:** [Key Concepts](03-key-concepts.md) complete  
**Goal:** Learn recipes for common development tasks

---

## Introduction

This guide provides step-by-step instructions for common tasks you'll encounter when working on the Listener. Think of these as recipes you can follow!

---

## Task 1: Add a New API Endpoint

**Scenario:** You want to add a new endpoint `/listener/health-detailed` that returns more information.

### Step 1: Create the Route Function

Edit `app/api/routes/health.py`:

```python
from fastapi import APIRouter
from app.config import settings
import psutil  # pip install psutil

router = APIRouter()

@router.get("/health")
async def health_check():
    """Simple health check"""
    return {"status": "healthy", "service": "listener"}


# ADD THIS NEW ENDPOINT
@router.get("/health-detailed")
async def health_check_detailed():
    """
    Detailed health check with system metrics.
    
    Returns:
        dict: Health status with CPU, memory, and service info
    """
    return {
        "status": "healthy",
        "service": "listener",
        "version": "0.1.0",
        "environment": settings.ENVIRONMENT,
        "system": {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent
        },
        "config": {
            "ollama_url": settings.OLLAMA_BASE_URL,
            "ollama_model": settings.OLLAMA_MODEL,
            "redis_host": settings.REDIS_HOST
        }
    }
```

### Step 2: Test It

Restart the server:

```bash
# Stop: Ctrl+C
# Start: 
uvicorn app.main:app --reload --port 8002
```

Test the new endpoint:

```bash
curl http://localhost:8002/health-detailed
```

Expected response:

```json
{
  "status": "healthy",
  "service": "listener",
  "version": "0.1.0",
  "environment": "development",
  "system": {
    "cpu_percent": 12.5,
    "memory_percent": 45.2,
    "disk_percent": 58.1
  },
  "config": {
    "ollama_url": "http://localhost:11434",
    "ollama_model": "llama3.1:8b-instruct-q4_0",
    "redis_host": "localhost"
  }
}
```

### Step 3: Add a Test

Create `tests/unit/test_health.py`:

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_detailed():
    """Test detailed health endpoint"""
    response = client.get("/health-detailed")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "healthy"
    assert data["service"] == "listener"
    assert "system" in data
    assert "config" in data
```

Run the test:

```bash
pytest tests/unit/test_health.py -v
```

---

## Task 2: Modify the LLM Prompt

**Scenario:** You want to add a new example to teach the LLM about "Gratitude".

### Step 1: Find the Prompt

Open `app/services/semantic_analyzer.py` and find the `_create_prompt()` method.

### Step 2: Add Your Example

Add after the existing examples in the system message:

```python
Example 7 - GRATITUDE (positive connection):
Input: "I'm so grateful for the support I've received."
Analysis:
- Valence: Very positive (appreciation, warmth) → 0.8
- Arousal: Low to moderate (calm appreciation) → 0.3
- Connection: POSITIVE (feeling connected through gratitude) → 0.8
Output: {{"primary_emotion": "Gratitude", "category": "Places We Go When Life Is Good", "vac": {{"valence": 0.8, "arousal": 0.3, "connection": 0.8}}, "confidence": 0.92, "reasoning": "Gratitude involves appreciation and connection to others or circumstances."}}
```

### Step 3: Test the Change

Restart the Listener and test:

```bash
curl -X POST "http://localhost:8002/listener/analyze" \
  -F "text=I'm so grateful for all the help I've received" \
  -F "user_id=test" \
  -F "session_id=test"
```

Check if the LLM now better recognizes gratitude!

### Step 4: Validate

Check the `reasoning` field in the response to see if the LLM is using your new example.

---

## Task 3: Change the LLM Model

**Scenario:** You want to use a smaller/faster model for development.

### Step 1: Pull the New Model

```bash
# List available models
ollama list

# Pull a smaller model (faster, less accurate)
ollama pull llama3.1:8b-instruct-q8_0

# Or even smaller
ollama pull phi-3:mini
```

### Step 2: Update Configuration

Edit `.env` file:

```bash
# Change this line
OLLAMA_MODEL=llama3.1:8b-instruct-q8_0

# Or
OLLAMA_MODEL=phi-3:mini
```

### Step 3: Restart and Test

```bash
# Restart Listener
uvicorn app.main:app --reload --port 8002

# Test analysis
curl -X POST "http://localhost:8002/listener/analyze" \
  -F "text=I'm feeling happy!" \
  -F "user_id=test" \
  -F "session_id=test"
```

### Step 4: Compare Results

Keep notes on:

- **Speed:** How fast is the new model?
- **Accuracy:** Does it still distinguish pity from compassion?
- **Quality:** How good is the reasoning?

!!! tip "Model Selection"
    - **phi-3:mini** - Fastest, good for dev, less accurate
    - **llama3.1:8b-q4_0** - Balanced speed/quality (default)
    - **llama3.1:8b-q8_0** - Slower, more accurate
    - **llama3.1:70b** - Slowest, best quality (requires GPU)

---

## Task 4: Add Logging to Debug Issues

**Scenario:** Your analysis is giving unexpected results and you want to see what's happening.

### Step 1: Add Logging Imports

```python
import logging

logger = logging.getLogger(__name__)
```

### Step 2: Add Log Statements

In `app/services/semantic_analyzer.py`, add logs:

```python
async def analyze(self, text: str) -> EmotionalClassification:
    """Extract VAC and emotion classification from text."""
    
    # ADD: Log input
    logger.info(f"🔍 Analyzing text: {text[:100]}...")
    
    # ... existing code ...
    
    # ADD: Log LLM call
    logger.debug("Calling Ollama LLM...")
    response = await self.llm.ainvoke(prompt_str)
    
    # ADD: Log response
    logger.debug(f"LLM response: {response[:200]}...")
    
    # ... existing code ...
    
    # ADD: Log result
    logger.info(
        f"✅ Analysis complete: {result.primary_emotion} "
        f"(VAC: {result.vac.valence:.2f}, {result.vac.arousal:.2f}, {result.vac.connection:.2f})"
    )
    
    return result
```

### Step 3: Set Log Level

In `.env`:

```bash
LOG_LEVEL=DEBUG  # Show all logs
# or
LOG_LEVEL=INFO   # Show important logs only
```

### Step 4: Watch the Logs

Restart and watch terminal output:

```bash
uvicorn app.main:app --reload --port 8002

# You'll now see:
# 🔍 Analyzing text: I'm feeling happy...
# Calling Ollama LLM...
# LLM response: {"primary_emotion": "Joy"...
# ✅ Analysis complete: Joy (VAC: 0.8, 0.6, 0.7)
```

---

## Task 5: Fix a Bug in VAC Values

**Scenario:** The LLM is returning VAC values > 1.0, causing validation errors.

### Step 1: Identify the Problem

Check the error logs:

```text
ValidationError: valence must be between -1.0 and 1.0 (got 1.5)
```

### Step 2: Add Clamping

In `app/services/semantic_analyzer.py`, after parsing JSON:

```python
# Parse JSON
result_dict = json.loads(cleaned_response)

# ADD: Clamp VAC values to valid range
def clamp(value: float, min_val: float = -1.0, max_val: float = 1.0) -> float:
    """Ensure value is within range"""
    return max(min_val, min(max_val, value))

# Apply clamping
if "vac" in result_dict:
    result_dict["vac"]["valence"] = clamp(result_dict["vac"]["valence"])
    result_dict["vac"]["arousal"] = clamp(result_dict["vac"]["arousal"])
    result_dict["vac"]["connection"] = clamp(result_dict["vac"]["connection"])
    
# Now validate with Pydantic
result = EmotionalClassification(**result_dict)
```

### Step 3: Log the Fix

```python
logger.warning(
    f"Clamped VAC values: "
    f"V={result_dict['vac']['valence']:.2f}, "
    f"A={result_dict['vac']['arousal']:.2f}, "
    f"C={result_dict['vac']['connection']:.2f}"
)
```

### Step 4: Test

Run the problematic input again and verify it works.

---

## Task 6: Add a New Dependency

**Scenario:** You want to use `numpy` for calculations.

### Step 1: Install Locally

```bash
# With .venv activated
pip install numpy
```

### Step 2: Add to requirements.txt

```bash
# At the end of requirements.txt
numpy>=1.24.0
```

### Step 3: Use in Code

```python
import numpy as np

def calculate_vac_distance(vac1, vac2):
    """Calculate Euclidean distance between two VAC points"""
    point1 = np.array([vac1.valence, vac1.arousal, vac1.connection])
    point2 = np.array([vac2.valence, vac2.arousal, vac2.connection])
    return np.linalg.norm(point1 - point2)
```

### Step 4: Document

Add a comment explaining why you added it:

```python
# numpy: Used for efficient VAC distance calculations
import numpy as np
```

---

## Task 7: Run Tests Before Committing

**Scenario:** You've made changes and want to ensure nothing broke.

### Step 1: Run All Tests

```bash
# From listener/ directory
pytest tests/ -v
```

### Step 2: Run Specific Test Categories

```bash
# Only unit tests
pytest tests/unit/ -v

# Only semantic tests (THE CRITICAL ONES!)
pytest tests/semantic/ -v

# Only integration tests
pytest tests/integration/ -v
```

### Step 3: Check Coverage

```bash
# Install coverage if needed
pip install pytest-cov

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Open coverage report
open htmlcov/index.html
```

### Step 4: Fix Failing Tests

If tests fail:

1. **Read the error message carefully**
2. **Check the test file** to understand what it's testing
3. **Run just that test** with more verbosity:

   ```bash
   pytest tests/semantic/test_connection_axis.py::test_pity_vs_compassion -vv
   ```

4. **Fix the issue**
5. **Re-run the test**

---

## Task 8: Debug a Slow Analysis

**Scenario:** Analysis is taking > 5 seconds.

### Step 1: Add Timing

```python
import time

async def analyze(self, text: str) -> EmotionalClassification:
    start_time = time.time()
    
    # ... existing code ...
    
    # ADD: Time each step
    t1 = time.time()
    response = await self.llm.ainvoke(prompt_str)
    llm_time = time.time() - t1
    logger.info(f"⏱️  LLM took {llm_time:.2f}s")
    
    t2 = time.time()
    result_dict = json.loads(cleaned_response)
    parse_time = time.time() - t2
    logger.info(f"⏱️  JSON parsing took {parse_time:.3f}s")
    
    total_time = time.time() - start_time
    logger.info(f"⏱️  Total analysis: {total_time:.2f}s")
    
    return result
```

### Step 2: Identify the Bottleneck

Check logs:

```text
⏱️  LLM took 4.52s
⏱️  JSON parsing took 0.003s
⏱️  Total analysis: 4.53s
```

Aha! The LLM is slow.

### Step 3: Optimize

Options:

1. **Use a smaller model** (see Task 3)
2. **Use GPU acceleration** (if available)
3. **Reduce prompt length** (fewer examples)
4. **Cache common queries** (for demo/testing)

---

## Task 9: Test with Real Audio

**Scenario:** You want to test the full pipeline with an audio file.

### Step 1: Record Audio

Use your computer's voice recorder to create `test.wav`:

- Say: "I'm feeling overwhelmed but hopeful"
- Save as WAV format

### Step 2: Upload via API

```bash
curl -X POST "http://localhost:8002/listener/analyze-audio" \
  -F "audio=@test.wav" \
  -F "user_id=test-user" \
  -F "session_id=test-session"
```

### Step 3: Check Results

Response should include:

```json
{
  "status": "success",
  "transcription": "I'm feeling overwhelmed but hopeful",
  "emotion": "Overwhelm",
  "vac": {...},
  "prosody": {...},
  "processing_time_seconds": 3.2
}
```

### Step 4: Debug Transcription Issues

If transcription is wrong:

1. **Check audio quality:** Is it clear? No background noise?
2. **Check format:** Whisper prefers 16kHz mono WAV
3. **Try different Whisper model:**

   ```bash
   # In .env
   WHISPER_MODEL=small.en  # More accurate, slower
   ```

---

## Task 10: Add a Custom Emotion

**Scenario:** You want to add "Awe" as a trackable emotion.

### Step 1: Update the Prompt

In `semantic_analyzer.py`, add an example:

```python
Example 8 - AWE (transcendence):
Input: "The universe is so vast and beautiful. I feel small but connected."
Analysis:
- Valence: Positive (wonder, beauty) → 0.7
- Arousal: Moderate (awakened, alert) → 0.5
- Connection: VERY POSITIVE (transcendent connection) → 0.9
Output: {{"primary_emotion": "Awe", "category": "Places We Go When We Seek Transcendence", "vac": {{"valence": 0.7, "arousal": 0.5, "connection": 0.9}}, "confidence": 0.88, "reasoning": "Awe involves wonder and a sense of connection to something greater."}}
```

### Step 2: Test

```bash
curl -X POST "http://localhost:8002/listener/analyze" \
  -F "text=Looking at the stars makes me feel so small but connected to everything" \
  -F "user_id=test" \
  -F "session_id=test"
```

Check if `primary_emotion` is now "Awe"!

---

## Quick Reference: Common Commands

### Development

```bash
# Start Listener
uvicorn app.main:app --reload --port 8002

# Check health
curl http://localhost:8002/health

# Analyze text
curl -X POST http://localhost:8002/listener/analyze \
  -F "text=Your text here" \
  -F "user_id=test" \
  -F "session_id=test"
```

### Testing

```bash
# All tests
pytest tests/ -v

# Specific file
pytest tests/semantic/test_connection_axis.py -v

# With coverage
pytest tests/ --cov=app

# Watch mode (re-run on changes)
pytest tests/ --watch
```

### Ollama

```bash
# List models
ollama list

# Pull model
ollama pull llama3.1:8b-instruct-q4_0

# Delete model
ollama rm llama3.1:8b-instruct-q4_0

# Check Ollama health
curl http://localhost:11434/api/tags
```

### Debugging

```bash
# Check logs in real-time
tail -f logs/listener.log

# Check Redis connection
redis-cli ping

# Check if port is in use
lsof -i :8002
```

---

## Troubleshooting Common Issues

### Issue: "Address already in use"

**Solution:**

```bash
# Find process on port 8002
lsof -i :8002

# Kill it
kill -9 <PID>

# Or use different port
uvicorn app.main:app --port 8003
```

### Issue: "Module not found"

**Solution:**

```bash
# Make sure .venv is activated
source .venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue: Changes not taking effect

**Solution:**

```bash
# Restart with --reload flag
uvicorn app.main:app --reload --port 8002

# Or manually restart: Ctrl+C then re-run
```

---

## Next Steps

You now know how to handle common development tasks!

1. **[Testing Guide](05-testing-guide.md)** - Write comprehensive tests
2. **[First Contribution](06-first-contribution.md)** - Make your first PR

Or explore advanced topics:

- **[Prompt Engineering](../architecture/03-prompt-engineering.md)** - Master LLM prompts
- **[Performance Optimization](../architecture/04-performance-optimization.md)** - Make it faster

---

**Have a task not covered here?** Check the [Troubleshooting Guide](../architecture/06-troubleshooting.md) or ask in Slack!
