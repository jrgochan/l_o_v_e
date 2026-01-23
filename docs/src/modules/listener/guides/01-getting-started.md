# Getting Started with the Listener

**Reading Time:** ~30 minutes  
**Audience:** New developers, interns, bootcamp graduates  
**Prerequisites:** Basic Python, understanding of APIs  
**Goal:** Set up Listener locally and run your first emotion analysis

---

## What Does the Listener Do?

Imagine you're having a conversation with someone about their feelings. The **Listener** is like a really good therapist who:

1. 🎤 **Listens** to what you say (or reads what you type)
2. 🤔 **Thinks** about the emotions in your words
3. 📊 **Measures** those emotions using three numbers:
   - **Valence:** Are you feeling good or bad? (-1 to +1)
   - **Arousal:** Are you energized or calm? (-1 to +1)  
   - **Connection:** Do you feel connected or isolated? (-1 to +1)

That third number (**Connection**) is special—it's something L.O.V.E. invented! 🎉

### Real Example

Let's say someone says: *"I'm feeling overwhelmed but hopeful"*

The Listener will analyze this and output:

```json
{
  "emotion": "Overwhelm",
  "vac": {
    "valence": -0.3,    // Slightly negative (overwhelmed)
    "arousal": 0.7,     // High energy (activated)
    "connection": 0.4   // Somewhat connected (hopeful)
  },
  "confidence": 0.88
}
```

Pretty cool, right? 😎

---

## Prerequisites Checklist

Before we start, make sure you have these installed:

### ✅ Required

- [ ] **Python 3.12 or higher**

  ```bash
  python3 --version
  # Should show: Python 3.11.x or higher
  ```

- [ ] **Ollama** (for running local LLMs)

  ```bash
  # macOS
  brew install ollama
  
  # Linux
  curl https://ollama.ai/install.sh | sh
  
  # Check installation
  ollama --version
  ```

- [ ] **Redis** (for async job processing)

  ```bash
  # macOS
  brew install redis
  brew services start redis
  
  # Linux
  sudo apt install redis-server
  sudo systemctl start redis
  
  # Check it's running
  redis-cli ping
  # Should return: PONG
  ```

### 🔧 Optional (but helpful)

- [ ] **ffmpeg** (for audio processing)

  ```bash
  # macOS
  brew install ffmpeg
  
  # Linux
  sudo apt install ffmpeg
  ```

- [ ] **VS Code** or your favorite code editor

---

## Step 1: Clone and Navigate

If you haven't already:

```bash
# Clone the repo
cd ~/code  # Or wherever you keep your projects
git clone https://gitlab.com/l_o_v_e/platform.git
cd platform

# Navigate to Listener
cd listener
```

---

## Step 2: Set Up Python Virtual Environment

Virtual environments keep your dependencies separate from other projects. This is a best practice!

```bash
# Create a virtual environment
python3 -m .venv .venv

# Activate it
source .venv/bin/activate  # On macOS/Linux
# OR
.venv\Scripts\activate     # On Windows

# Your prompt should now show (.venv)
```

!!! tip "Pro Tip"
    Add this to your `.bashrc` or `.zshrc` for a shortcut:
    ```bash
   poetry install
   alias activate='source .venv/bin/activate'
    ```

---

## Step 3: Install Dependencies

Now install all the Python packages the Listener needs:

```bash
pip install -r requirements.txt
```

This will install:

- **FastAPI** - Web framework for the API
- **Ollama** - LLM client
- **OpenAI Whisper** - Audio transcription
- **Spacy** - Natural language processing
- **Pydantic** - Data validation
- **Arq** - Async job queue
- And more...

!!! info "This might take a few minutes ☕"
    Grab a coffee while it installs. Some packages (like numpy) compile from source.

### Download the Spacy Model

Spacy needs a language model for PII detection:

```bash
python -m spacy download en_core_web_sm
```

---

## Step 4: Start Ollama and Download the LLM

The Listener uses a local LLM (no API keys needed!). Let's set it up:

### Start Ollama Server

```bash
# In a new terminal window
ollama serve
```

You should see output like:

```text
Ollama server listening on http://127.0.0.1:11434
```

### Download the Model

In your original terminal (with .venv activated):

```bash
ollama pull llama3.1:8b-instruct-q4_0
```

<!-- markdownlint-disable MD046 -->
!!! warning "Large Download"
    This is ~4.7GB. It will take a while depending on your internet speed.

    The model runs locally on your machine—no data sent to external servers!
<!-- markdownlint-enable MD046 -->

---

## Step 5: Configure Environment Variables

Create a `.env` file in the `listener/` directory:

```bash
# Copy the example
cp .env.example .env

# Edit it (use your favorite editor)
nano .env
```

Make sure these settings are correct:

```bash
# Listener Configuration
ENVIRONMENT=development
LOG_LEVEL=INFO

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b-instruct-q4_0
LLM_TEMPERATURE=0.0

# Whisper Configuration
WHISPER_MODEL=base.en
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Observer Integration
OBSERVER_URL=http://localhost:8000
```

!!! tip "Don't have Observer running yet?"
    That's okay! The Listener will work fine on its own. Observer integration is optional.

---

## Step 6: Start the Listener! 🚀

Time to run it!

```bash
# Make sure you're in listener/ directory with .venv activated
uvicorn app.main:app --reload --port 8002
```

You should see output like:

```text
INFO:     Uvicorn running on http://127.0.0.1:8002 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     🎧 Listener API starting up...
INFO:     Environment: development
INFO:     Ollama: http://localhost:11434
INFO:     Listener API ready to receive audio/text input
INFO:     Application startup complete.
```

🎉 **Congratulations! The Listener is running!**

---

## Step 7: Test It! Your First Analysis

### Open the Interactive Docs

Open your browser and go to:

```text
http://localhost:8002/docs
```

You'll see FastAPI's interactive documentation (Swagger UI). This is super useful for testing!

### Method 1: Using the Browser UI

1. Find the `POST /listener/analyze` endpoint
2. Click **"Try it out"**
3. Fill in the form:

   ```text
   text: I'm feeling overwhelmed but hopeful
   user_id: demo-user
   session_id: demo-session
   ```

4. Click **"Execute"**

You should see a response like:

```json
{
  "user_id": "demo-user",
  "session_id": "demo-session",
  "transcription": "I'm feeling overwhelmed but hopeful",
  "emotion": "Overwhelm",
  "category": "Places We Go When Things Are Uncertain",
  "vac": {
    "valence": -0.3,
    "arousal": 0.7,
    "connection": 0.4
  },
  "confidence": 0.88,
  "reasoning": "High arousal from feeling overwhelmed, slightly negative valence, but positive connection from hope.",
  "processing_time_ms": 1847
}
```

### Method 2: Using curl (Command Line)

Open a new terminal and try:

```bash
curl -X POST "http://localhost:8002/listener/analyze" \
  -H "Content-Type: multipart/form-data" \
  -F "text=I'm feeling overwhelmed but hopeful" \
  -F "user_id=demo-user" \
  -F "session_id=demo-session"
```

---

## Understanding the Response

Let's break down what each field means:

```json
{
  "emotion": "Overwhelm",              // The primary emotion detected
  "category": "Places We Go...",       // Brené Brown's Atlas category
  "vac": {
    "valence": -0.3,                   // Slightly unpleasant
    "arousal": 0.7,                    // High energy, activated
    "connection": 0.4                  // Somewhat connected (hopeful)
  },
  "confidence": 0.88,                  // 88% confident in this analysis
  "reasoning": "...",                  // Why the LLM chose these values
  "processing_time_ms": 1847           // Took ~1.8 seconds
}
```

---

## Try Different Emotions

Experiment with different inputs to see how the Listener responds:

### High Valence, High Connection

```text
text: I feel so connected to everyone around me. Life is beautiful!
```

Expected: Joy or Gratitude (positive valence, high connection)

### Low Valence, Low Connection  

```text
text: I feel so alone. Nobody understands me.
```

Expected: Loneliness (negative valence, very low connection)

### The Critical Test: Pity vs. Compassion

This is THE most important test—it validates the Connection axis innovation!

**Pity (negative connection):**

```text
text: I feel sorry for them, they're really struggling.
```

Expected: Connection < 0 (separation, condescension)

**Compassion (positive connection):**

```text
text: I understand their pain. I'm here with them.
```

Expected: Connection > 0.5 (shared humanity, alignment)

---

## Common Issues & Solutions

### Issue: "Connection refused" on port 8002

**Solution:** Make sure you started the Listener:

```bash
cd listener
source .venv/bin/activate
uvicorn app.main:app --reload --port 8002
```

### Issue: "Ollama not found"

**Solution:** Start Ollama in a separate terminal:

```bash
ollama serve
```

### Issue: "Model not found: llama3.1:8b-instruct-q4_0"

**Solution:** Download the model:

```bash
ollama pull llama3.1:8b-instruct-q4_0
```

### Issue: Analysis is slow (> 5 seconds)

**Possible causes:**

1. First run? Models need to load into memory (~10s first time)
2. CPU-bound? Consider using a smaller model or GPU acceleration
3. Check Ollama logs: `ollama list` to see loaded models

### Issue: "Module not found" errors

**Solution:** Make sure .venv is activated and dependencies installed:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Next Steps

🎉 **You did it!** The Listener is running and analyzing emotions.

### What to Learn Next

1. **[Codebase Tour](02-codebase-tour.md)** - Understand the file structure
2. **[Key Concepts](03-key-concepts.md)** - Deep dive into VAC model
3. **[Common Tasks](04-common-tasks.md)** - How to add features
4. **[Testing Guide](05-testing-guide.md)** - Write your first test

### Join the Community

- **GitLab Issues:** [Report bugs or ask questions](https://gitlab.com/l_o_v_e/platform/-/issues)
- **Slack:** #listener-module (ask for invite)

---

## Quick Reference

### Start Everything

```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: Redis (if not running as service)
redis-server

# Terminal 3: Listener
cd listener
source .venv/bin/activate
uvicorn app.main:app --reload --port 8002
```

### Stop Everything

```bash
# In Listener terminal: Ctrl+C
# In Redis terminal: Ctrl+C
# In Ollama terminal: Ctrl+C
```

### Check Health

```bash
curl http://localhost:8002/health
```

Expected response:

```json
{"status": "healthy", "service": "listener", "version": "0.1.0"}
```

---

**Questions?** Check the [Troubleshooting Guide](../architecture/06-troubleshooting.md) or ask in Slack!

**Ready to dive deeper?** Continue to [Codebase Tour →](02-codebase-tour.md)
