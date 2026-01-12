# Getting Started with the Observer

**Reading Time:** ~30 minutes  
**Audience:** New developers, interns, bootcamp graduates  
**Prerequisites:** Basic Python, SQL knowledge, understanding of APIs  
**Goal:** Set up Observer locally and run your first emotion query

---

## What Does the Observer Do?

Imagine you have a detailed map of 87 different emotional states, and you want to:

1. 🗺️ **Store** where someone has been emotionally over time
2. 🔍 **Find** similar past moments ("You felt this way before...")
3. 🎯 **Navigate** from one emotion to another with therapeutic guidance
4. 📊 **Calculate** how quickly someone is changing emotionally

That's the **Observer**! It's like a GPS for emotional journeys. 🧭

### Real Example

When the Listener analyzes text and produces:

```json
{
  "emotion": "Overwhelm",
  "vac": {"valence": -0.3, "arousal": 0.7, "connection": 0.4}
}
```

The Observer:

1. Stores this in the database with a timestamp
2. Finds the nearest matching emotion from the 87-emotion atlas
3. Searches for similar past moments using vector similarity
4. Calculates how fast the emotion is changing (elasticity)
5. Can suggest therapeutic paths to better emotional states

Pretty powerful, right? 😎

---

## Prerequisites Checklist

Before we start, make sure you have these installed:

### ✅ Required

- [ ] **Python 3.11 or higher**

  ```bash
  python3 --version
  # Should show: Python 3.11.x or higher
  ```

- [ ] **PostgreSQL 16+**

  ```bash
  # macOS
  brew install postgresql@16
  brew services start postgresql@16
  
  # Linux
  sudo apt install postgresql-16
  sudo systemctl start postgresql
  
  # Check version
  psql --version
  # Should show: psql (PostgreSQL) 16.x
  ```

- [ ] **pgvector Extension**

  ```bash
  # macOS
  brew install pgvector
  
  # Linux (from source)
  cd /tmp
  git clone --branch v0.6.0 https://github.com/pgvector/pgvector.git
  cd pgvector
  make
  sudo make install
  ```

### 🔧 Optional (but helpful)

- [ ] **pgAdmin or DBeaver** - GUI for database management
- [ ] **Postman or Insomnia** - For testing API endpoints
- [ ] **VS Code** with Python extension

---

## Step 1: Clone and Navigate

If you haven't already:

```bash
# Clone the repo
cd ~/code  # Or wherever you keep your projects
git clone https://gitlab.com/l_o_v_e/platform.git
cd platform

# Navigate to Observer
cd observer
```

---

## Step 2: Database Setup

### Create the Database

```bash
# Connect to PostgreSQL
psql postgres

# In the psql shell:
CREATE DATABASE observer_dev;
CREATE USER observer_user WITH PASSWORD 'observer_pass';
GRANT ALL PRIVILEGES ON DATABASE observer_dev TO observer_user;

# Connect to the new database
\c observer_dev

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify it's installed
\dx
# You should see "vector" in the list

# Exit psql
\q
```

!!! warning "Production Credentials"
    These are development credentials only! Never use these in production.

---

## Step 3: Set Up Python Virtual Environment

Virtual environments keep dependencies isolated:

```bash
# Make sure you're in observer/ directory
cd observer  # if not already there

# Create virtual environment
python3 -m .venv .venv

# Activate it
source .venv/bin/activate  # On macOS/Linux
# OR
.venv\Scripts\activate     # On Windows

# Your prompt should now show (.venv)
```

---

## Step 4: Install Dependencies

```bash
# Make sure .venv is activated
pip install --upgrade pip
pip install -r requirements.txt
```

This installs:

- **FastAPI** - Web framework
- **SQLAlchemy** - Database ORM
- **pgvector** - Python client for vector operations
- **Alembic** - Database migrations
- **Pydantic** - Data validation
- And more...

!!! info "This might take a few minutes ☕"
    Some packages compile from source. Grab a coffee!

---

## Step 5: Configure Environment Variables

Create a `.env` file in the `observer/` directory:

```bash
# Copy the example
cp .env.example .env

# Edit it
nano .env  # or your favorite editor
```

Update these settings:

```bash
# Environment
ENVIRONMENT=development
LOG_LEVEL=INFO

# Database Configuration
DATABASE_URL=postgresql://observer_user:observer_pass@localhost:5432/observer_dev

# Versor Integration (optional for now)
VERSOR_URL=http://localhost:8001

# Embedding Service
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Feature Flags
ENABLE_WEBSOCKET=true
ENABLE_CHAT=true
```

---

## Step 6: Run Database Migrations

Alembic manages database schema changes:

```bash
# Check current status
alembic current

# Run all migrations
alembic upgrade head
```

You should see output like:

```text
INFO  [alembic.runtime.migration] Running upgrade  -> 3d24332d682d, initial schema with pgvector
INFO  [alembic.runtime.migration] Running upgrade 3d24332d682d -> ..., add transition system tables
```

### Verify Tables Were Created

```bash
psql observer_dev -U observer_user

# List all tables
\dt

# You should see:
# - atlas_definitions
# - user_trajectory
# - transition_strategies
# - chat_sessions
# - chat_messages
# And more...

\q
```

---

## Step 7: Seed the Database

The Observer needs the 87-emotion atlas to function:

```bash
# Seed the atlas (87 emotions)
python scripts/seed_atlas.py

# Seed therapeutic strategies
python scripts/seed_enhanced_strategies.py

# Seed demo data (optional)
python scripts/seed_demo_data.py
```

Expected output:

```text
✅ Seeded 87 emotions to atlas_definitions
✅ Seeded 107 therapeutic strategies
✅ Created 5 demo users with trajectory data
```

---

## Step 8: Start the Observer! 🚀

Time to run it:

```bash
# Make sure you're in observer/ with .venv activated
uvicorn app.main:app --reload --port 8000
```

You should see:

```text
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     🔭 Observer API starting up...
INFO:     Database: observer_dev
INFO:     Atlas: 87 emotions loaded
INFO:     Observer ready to store and retrieve emotional states
INFO:     Application startup complete.
```

🎉 **Congratulations! The Observer is running!**

---

## Step 9: Your First Query

### Method 1: Interactive API Docs

Open your browser:

```text
http://localhost:8000/docs
```

You'll see FastAPI's interactive Swagger UI.

#### Try: Get All Emotions

1. Find `GET /atlas/emotions`
2. Click **"Try it out"**
3. Click **"Execute"**

You should see all 87 emotions:

```json
{
  "emotions": [
    {
      "id": "uuid-here",
      "name": "Joy",
      "category": "When Life Is Good",
      "vac": [0.8, 0.6, 0.7],
      "description": "A feeling of great pleasure..."
    },
    ...
  ],
  "total": 87
}
```

#### Try: Find Similar Emotions

1. Find `POST /atlas/similar`
2. Click **"Try it out"**
3. Enter VAC coordinates:

   ```json
   {
     "valence": 0.8,
     "arousal": 0.6,
     "connection": 0.7
   }
   ```

4. Click **"Execute"**

You should get emotions similar to those coordinates (likely "Joy", "Gratitude", "Happiness"):

```json
{
  "results": [
    {
      "emotion": "Joy",
      "distance": 0.12,
      "vac": [0.8, 0.6, 0.7],
      "category": "When Life Is Good"
    },
    ...
  ]
}
```

### Method 2: Using curl

Open a new terminal:

```bash
# Get all emotions
curl http://localhost:8000/atlas/emotions | jq

# Get a specific emotion by name
curl http://localhost:8000/atlas/emotions/Joy | jq

# Find similar emotions
curl -X POST http://localhost:8000/atlas/similar \
  -H "Content-Type: application/json" \
  -d '{"valence": 0.8, "arousal": 0.6, "connection": 0.7}' | jq
```

---

## Understanding the Response

Let's break down what you're seeing:

### Emotion Object

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Joy",
  "category": "When Life Is Good",
  "vac": [0.8, 0.6, 0.7],  // [valence, arousal, connection]
  "description": "A feeling of great pleasure and happiness",
  "embedding": [0.12, -0.45, ...],  // 384-dimensional vector
  "created_at": "2026-01-02T21:00:00Z"
}
```

### VAC Coordinates

- **Valence (X)**: -1.0 (very negative) to +1.0 (very positive)
- **Arousal (Y)**: -1.0 (very calm) to +1.0 (very energized)
- **Connection (Z)**: -1.0 (disconnected) to +1.0 (deeply connected)

---

## Try Different Queries

### High Positive State (Joy)

```json
{"valence": 0.9, "arousal": 0.7, "connection": 0.8}
```

Expected: Joy, Gratitude, Happiness

### Low Negative State (Despair)

```json
{"valence": -0.9, "arousal": -0.5, "connection": -0.7}
```

Expected: Despair, Hopelessness, Anguish

### The Critical Test: Compassion vs. Pity

This validates the Connection axis innovation!

**Compassion (positive connection):**

```json
{"valence": -0.3, "arousal": 0.2, "connection": 0.7}
```

Expected: Compassion, Empathy

**Pity (negative connection):**

```json
{"valence": -0.3, "arousal": 0.2, "connection": -0.5}
```

Expected: Pity, Sympathy (with separation)

---

## Common Issues & Solutions

### Issue: "Connection refused" on port 8000

**Solution:** Make sure Observer is running:

```bash
cd observer
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Issue: "relation 'atlas_definitions' does not exist"

**Solution:** Run migrations:

```bash
alembic upgrade head
python scripts/seed_atlas.py
```

### Issue: "pgvector extension not found"

**Solution:** Install pgvector and enable it:

```bash
# Install pgvector (see Prerequisites section)
# Then in psql:
psql observer_dev -U observer_user
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

### Issue: "Authentication failed for user observer_user"

**Solution:** Check your `.env` DATABASE_URL matches the credentials you created:

```bash
# In .env:
DATABASE_URL=postgresql://observer_user:observer_pass@localhost:5432/observer_dev
```

### Issue: Database migrations fail

**Solution:** Drop and recreate the database:

```bash
psql postgres
DROP DATABASE observer_dev;
CREATE DATABASE observer_dev;
GRANT ALL PRIVILEGES ON DATABASE observer_dev TO observer_user;
\c observer_dev
CREATE EXTENSION vector;
\q

# Then re-run migrations
alembic upgrade head
```

---

## Next Steps

🎉 **You did it!** The Observer is running and responding to queries.

### What to Learn Next

1. **[Codebase Tour](02-codebase-tour.md)** - Understand the file structure
2. **[Key Concepts](03-key-concepts.md)** - Deep dive into VAC model, vector search, and pathfinding
3. **[Common Tasks](04-common-tasks.md)** - How to add emotions and features
4. **[Testing Guide](05-testing-guide.md)** - Write your first test

### Explore the Atlas

Try querying different emotions:

```bash
# Get emotions by category
curl "http://localhost:8000/atlas/emotions?category=When%20Life%20Is%20Good" | jq

# Search for emotions by name
curl "http://localhost:8000/atlas/emotions?search=anger" | jq
```

---

## Quick Reference

### Start Everything

```bash
# Terminal 1: PostgreSQL (if not running as service)
brew services start postgresql@16  # macOS
# OR
sudo systemctl start postgresql    # Linux

# Terminal 2: Observer
cd observer
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Stop Everything

```bash
# In Observer terminal: Ctrl+C
```

### Check Health

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "observer",
  "version": "0.1.0",
  "database": "connected",
  "atlas_emotions": 87
}
```

### Reset Database (if needed)

```bash
# Drop and recreate
psql postgres
DROP DATABASE observer_dev;
CREATE DATABASE observer_dev;
GRANT ALL PRIVILEGES ON DATABASE observer_dev TO observer_user;
\c observer_dev
CREATE EXTENSION vector;
\q

# Re-run migrations and seeding
alembic upgrade head
python scripts/seed_atlas.py
python scripts/seed_enhanced_strategies.py
```

---

## Understanding the Tech Stack

### Why PostgreSQL?

- ACID compliance (data integrity)
- Built-in vector support with pgvector
- Excellent performance for complex queries
- Row-level security for multi-tenancy

### Why pgvector?

- Native vector operations in SQL
- Sub-50ms similarity searches
- HNSW indexing for speed
- No need for separate vector database

### Why FastAPI?

- Async support (fast!)
- Automatic API documentation
- Type safety with Pydantic
- Modern Python patterns

---

**Questions?** Check the [Troubleshooting Guide](../architecture/08-troubleshooting.md) or ask in Slack!

**Ready to dive deeper?** Continue to [Codebase Tour →](02-codebase-tour.md)
