# Common Tasks

**Reading Time:** ~30 minutes
**Audience:** New developers
**Prerequisites:** [Key Concepts](03-key-concepts.md) understood
**Goal:** Learn how to perform common development tasks

---

## Overview

This guide covers the most common tasks you'll perform when working with Observer:

1. Adding a new emotion to the atlas
2. Modifying a therapeutic strategy
3. Creating a database migration
4. Updating seed data
5. Testing vector search
6. Adding a new API endpoint

---

## Task 1: Adding a New Emotion

### Scenario

You want to add "Anticipation" to the atlas.

### Step 1: Research the Emotion

Before adding, understand:

- **Definition:** What does "Anticipation" mean?
- **VAC Coordinates:** Where does it sit in emotional space?
- **Category:** Which of the 13 categories does it belong to?
- **Research:** Any academic papers defining it?

**Example Research:**

```text
Anticipation:
- Definition: Looking forward to a future event with excitement
- Valence: +0.5 (positive, but not as strong as Joy)
- Arousal: +0.6 (energized, activated)
- Connection: +0.3 (slightly connected, social expectation)
- Category: "When It's Beyond Us" (future-oriented)
```

### Step 2: Add to Seed Data

Edit `observer/data/atlas_emotions.json` (or create if doesn't exist):

```json
{
  "emotions": [
    {
      "name": "Anticipation",
      "category": "When It's Beyond Us",
      "vac": [0.5, 0.6, 0.3],
      "description": "Looking forward to a future event with a sense of excitement and readiness. Involves both hope and preparedness.",
      "keywords": ["expectation", "looking forward", "excitement", "future", "hope"],
      "citations": [
        {
          "author": "Panksepp, J.",
          "year": 1998,
          "title": "Affective Neuroscience",
          "source": "Oxford University Press"
        }
      ]
    }
  ]
}
```

### Step 3: Update Seed Script

Edit `observer/scripts/seed_atlas.py`:

```python
# If using JSON file, the script should automatically pick it up
# Otherwise, add manually:

emotions_to_add = [
    {
        "name": "Anticipation",
        "category": "When It's Beyond Us",
        "vac": [0.5, 0.6, 0.3],
        "description": "Looking forward to a future event with a sense of excitement and readiness.",
        # ... rest of fields
    }
]
```

### Step 4: Run Seed Script

```bash
cd observer
source .venv/bin/activate

# Run the seed script
python scripts/seed_atlas.py
```

Expected output:

```text
✅ Added: Anticipation
✅ Total emotions in atlas: 88
```

### Step 5: Verify in Database

```bash
psql observer_dev -U observer_user

SELECT name, category, vac FROM atlas_definitions
WHERE name = 'Anticipation';

# Should show:
#   name      |    category       |      vac
# ------------+-------------------+-----------------
# Anticipation| When It's Beyond Us| {0.5,0.6,0.3}

\q
```

### Step 6: Test via API

```bash
# Get the new emotion
curl http://localhost:8000/observer/emotions/Anticipation | jq

# Test similarity search
curl -X POST http://localhost:8000/observer/similar \
  -H "Content-Type: application/json" \
  -d '{"valence": 0.5, "arousal": 0.6, "connection": 0.3}' | jq
```

---

## Task 2: Modifying a Therapeutic Strategy

### Scenario

You want to update the "Deep Breathing" strategy to include a new technique.

### Step 1: Find the Strategy File

Strategies are in `observer/data/strategies/`:

```bash
cd observer/data/strategies
ls
# Shows:
# - somatic.json
# - mindfulness.json
# - dbt_skills.json
# - etc.

# Deep Breathing is likely in somatic.json
```

### Step 2: Edit the Strategy

Open `somatic.json`:

```json
{
  "strategies": [
    {
      "name": "Deep Breathing",
      "category": "Somatic",
      "description": "Use breath to regulate nervous system",
      "technique": "Breathe in for 4, hold for 4, out for 6, hold for 2",
      "evidence_base": "Porges, S. (2011). Polyvagal Theory",
      "when_to_use": ["anxiety", "anger", "overwhelm", "panic"],
      "effectiveness": 0.78,
      "duration_minutes": 3,

      // Add new field:
      "variations": [
        "Box Breathing (4-4-4-4)",
        "Physiological Sigh (2 inhales, long exhale)",
        "4-7-8 Breathing (in 4, hold 7, out 8)"
      ]
    }
  ]
}
```

### Step 3: Update the Seed Script

If the script already loads from JSON, no changes needed. Otherwise:

```python
# In scripts/seed_enhanced_strategies.py
# Make sure it re-reads the JSON
```

### Step 4: Re-seed Strategies

```bash
python scripts/seed_enhanced_strategies.py --update
```

Expected output:

```text
✅ Updated: Deep Breathing
✅ Total strategies: 69
```

### Step 5: Verify

```bash
# Query the strategy
psql observer_dev -U observer_user

SELECT name, category, technique FROM transition_strategies
WHERE name = 'Deep Breathing';

\q
```

---

## Task 3: Creating a Database Migration

### Scenario

You want to add a `user_preference` column to the `chat_sessions` table.

### Step 1: Create Migration

```bash
cd observer

# Create a new migration
alembic revision -m "add_user_preference_to_chat_sessions"
```

This creates a file like:

```text
migrations/versions/abc123_add_user_preference_to_chat_sessions.py
```

### Step 2: Edit the Migration

Open the new file:

```python
"""add_user_preference_to_chat_sessions

Revision ID: abc123
Revises: def456
Create Date: 2026-01-02 21:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'abc123'
down_revision = 'def456'  # Previous migration ID
branch_labels = None
depends_on = None


def upgrade():
    """Add user_preference column to chat_sessions"""
    op.add_column(
        'chat_sessions',
        sa.Column(
            'user_preference',
            postgresql.JSONB,
            nullable=True,
            comment='User preferences for this session'
        )
    )


def downgrade():
    """Remove user_preference column from chat_sessions"""
    op.drop_column('chat_sessions', 'user_preference')
```

### Step 3: Test the Migration

```bash
# Check current migration state
alembic current

# Run the migration
alembic upgrade head

# Should see:
# INFO  [alembic.runtime.migration] Running upgrade def456 -> abc123, add_user_preference_to_chat_sessions
```

### Step 4: Verify

```bash
psql observer_dev -U observer_user

\d chat_sessions

# Should show new column:
# Column         | Type   | ...
# ---------------+--------+-----
# user_preference| jsonb  | ...

\q
```

### Step 5: Test Rollback (Optional)

```bash
# Roll back one version
alembic downgrade -1

# Verify column is gone
psql observer_dev -U observer_user
\d chat_sessions

# Re-apply
alembic upgrade head
```

---

## Task 4: Updating Seed Data

### Scenario

You want to add a new bootstrap pattern for "Anxiety to Calm".

### Step 1: Edit the JSON

Open `observer/data/bootstrap_patterns.json`:

```json
{
  "patterns": [
    {
      "name": "anxiety_regulation",
      "from_category": "When Things Are Uncertain or Too Much",
      "to_category": "When Life Is Good",
      "description": "Moving from anxiety to calm state",
      "waypoints": [
        "Anxiety",
        "Worry",
        "Concern",
        "Curiosity",
        "Interest",
        "Calm"
      ],
      "strategies": [
        "Grounding (5-4-3-2-1)",
        "Deep Breathing",
        "Progressive Muscle Relaxation",
        "Mindful Walking"
      ],
      "typical_duration_days": 7
    }
  ]
}
```

### Step 2: Run the Seed Script

```bash
python scripts/seed_bootstrap_data.py
```

Expected output:

```text
✅ Loaded pattern: anxiety_regulation
✅ Total patterns: 12
```

### Step 3: Test via API

```bash
curl http://localhost:8000/bootstrap/patterns | jq

# Should include your new pattern
```

---

## Task 5: Testing Vector Search

### Scenario

You want to ensure vector similarity search is working correctly.

### Step 1: Create Test Data

```bash
psql observer_dev -U observer_user

-- Insert test trajectory point
INSERT INTO user_trajectory (
  id, user_id, session_id, vac, quaternion,
  transcription, embedding, emotion_id
) VALUES (
  gen_random_uuid(),
  'test-user',
  'test-session',
  ARRAY[0.7, 0.5, 0.6],
  ARRAY[0.8, 0.3, 0.4, 0.3],
  'I feel really joyful today',
  '[0.1, 0.2, ...]'::vector,  -- 384-dimensional
  (SELECT id FROM atlas_definitions WHERE name = 'Joy')
);

\q
```

### Step 2: Test Similarity Query

```python
# Create test script: test_vector_search.py

import asyncio
from sqlalchemy import select, text
from app.database import AsyncSessionLocal
from app.models.user_trajectory import UserTrajectory
from app.services.embedding_service import get_embedding_service

async def test_similarity():
    async with AsyncSessionLocal() as db:
        # Generate query embedding
        emb_service = get_embedding_service()
        query_text = "I'm feeling happy and connected"
        query_emb = await emb_service.generate_embedding(query_text)

        # Find similar trajectories
        query = text("""
            SELECT
                user_id,
                transcription,
                vac,
                embedding <=> :query_emb as distance
            FROM user_trajectory
            WHERE user_id = 'test-user'
            ORDER BY embedding <=> :query_emb
            LIMIT 5
        """)

        result = await db.execute(
            query,
            {"query_emb": str(query_emb)}
        )

        print("Similar moments:")
        for row in result:
            print(f"  - {row.transcription}")
            print(f"    Distance: {row.distance:.4f}")
            print(f"    VAC: {row.vac}")

if __name__ == "__main__":
    asyncio.run(test_similarity())
```

### Step 3: Run the Test

```bash
python test_vector_search.py
```

Expected output:

```text
Similar moments:
  - I feel really joyful today
    Distance: 0.0234
    VAC: [0.7, 0.5, 0.6]
```

### Step 4: Verify HNSW Index

```bash
psql observer_dev -U observer_user

-- Check if HNSW index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_trajectory'
  AND indexdef LIKE '%hnsw%';

-- If not, create it:
CREATE INDEX ON user_trajectory
USING hnsw (embedding vector_cosine_ops);

\q
```

---

## Task 6: Adding a New API Endpoint

### Scenario

You want to add an endpoint to get emotion statistics by category.

### Step 1: Create the Route

Create or edit `observer/app/api/routes/atlas.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.atlas_definition import AtlasDefinition

router = APIRouter()

@router.get("/statistics")
async def get_atlas_statistics(
    db: AsyncSession = Depends(get_db)
):
    """
    Get statistics about emotions by category.

    Returns:
        dict: Count of emotions per category
    """
    # Query emotion counts by category
    query = select(
        AtlasDefinition.category,
        func.count(AtlasDefinition.id).label('count')
    ).group_by(AtlasDefinition.category)

    result = await db.execute(query)
    rows = result.all()

    # Format response
    stats = {
        "total_emotions": sum(row.count for row in rows),
        "by_category": {
            row.category: row.count
            for row in rows
        }
    }

    return stats
```

### Step 2: Register the Route (if new file)

If you created a new file, register it in `app/main.py`:

```python
from app.api.routes import atlas

app.include_router(
    atlas.router,
    prefix="/atlas",
    tags=["Atlas"]
)
```

### Step 3: Test the Endpoint

```bash
# Restart Observer
# Ctrl+C, then:
uvicorn app.main:app --reload --port 8000

# Test the new endpoint
curl http://localhost:8000/observer/statistics | jq
```

Expected output:

```json
{
  "total_emotions": 87,
  "by_category": {
    "When Life Is Good": 9,
    "When We Feel Wronged": 7,
    "When Things Are Uncertain or Too Much": 8,
    ...
  }
}
```

### Step 4: Add to API Documentation

FastAPI automatically updates the Swagger docs!

Visit: `http://localhost:8000/docs`

You should see your new endpoint listed.

### Step 5: Write a Test

Create `tests/unit/test_atlas_statistics.py`:

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_atlas_statistics():
    """Test the atlas statistics endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/observer/statistics")

    assert response.status_code == 200
    data = response.json()

    assert "total_emotions" in data
    assert "by_category" in data
    assert data["total_emotions"] > 0
    assert len(data["by_category"]) > 0
```

Run the test:

```bash
pytest tests/unit/test_atlas_statistics.py -v
```

---

## Quick Reference Guide

### Common Commands

```bash
# Start Observer
cd observer
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Database migrations
alembic revision -m "description"
alembic upgrade head
alembic downgrade -1
alembic current

# Seed data
python scripts/seed_atlas.py
python scripts/seed_enhanced_strategies.py
python scripts/seed_demo_data.py

# Testing
pytest                          # All tests
pytest tests/unit/ -v          # Unit tests only
pytest --cov=app tests/        # With coverage

# Database access
psql observer_dev -U observer_user
```

### File Locations Cheat Sheet

| Task | File to Edit |
|------|--------------|
| Add emotion | `data/atlas_emotions.json` |
| Modify strategy | `data/strategies/*.json` |
| Add API route | `app/api/routes/*.py` |
| Database schema | `alembic revision` |
| Seed scripts | `scripts/seed_*.py` |
| Tests | `tests/` |
| Configuration | `.env` |

---

## Troubleshooting Common Issues

### Issue: Seed script fails

**Error:** `IntegrityError: duplicate key value`

**Solution:** Emotion already exists. Either:

```bash
# Clear and re-seed
python scripts/seed_atlas.py --force

# Or update instead of insert
python scripts/seed_atlas.py --update
```

### Issue: Migration fails

**Error:** `Target database is not up to date`

**Solution:**

```bash
# Check current state
alembic current

# Upgrade to head first
alembic upgrade head

# Then run your migration
```

### Issue: Vector search is slow

**Problem:** Queries taking > 500ms

**Solution:** Check HNSW index:

```sql
-- Check if index exists
SELECT * FROM pg_indexes WHERE tablename = 'user_trajectory';

-- Create if missing
CREATE INDEX ON user_trajectory USING hnsw (embedding vector_cosine_ops);

-- Analyze table
ANALYZE user_trajectory;
```

### Issue: API endpoint not found

**Error:** `404 Not Found`

**Solutions:**

1. Check route is registered in `app/main.py`
2. Verify FastAPI app reloaded (check console)
3. Check URL path matches route definition
4. Verify `@router` decorator is present

---

## Best Practices

### When Adding Emotions

- ✅ Research the emotion thoroughly
- ✅ Ensure VAC coordinates make sense
- ✅ Add citations/references
- ✅ Test similarity search after adding
- ❌ Don't add without understanding category placement

### When Modifying Strategies

- ✅ Verify evidence base is still current
- ✅ Test that strategy still makes therapeutic sense
- ✅ Update any related patterns/bootstrap data
- ❌ Don't change without understanding impact

### When Creating Migrations

- ✅ Test both upgrade AND downgrade
- ✅ Add comments explaining why
- ✅ Consider data migrations (not just schema)
- ❌ Don't deploy without testing on staging first

### When Adding Endpoints

- ✅ Follow existing patterns
- ✅ Add proper error handling
- ✅ Write tests
- ✅ Document with docstrings
- ❌ Don't add business logic in routes (use services)

---

## Next Steps

Now you know how to perform common tasks! Time to learn testing:

**Continue to:** [Testing Guide →](05-testing-guide.md)

You'll learn:

- Setting up test databases
- Writing unit tests
- Integration testing
- The critical Compassion vs. Pity test
- Test fixtures and helpers

---

**Need help?** Ask in Slack #observer-module or check the [Senior Developer Guides](../architecture/01-deep-dive.md) for deeper technical details!
