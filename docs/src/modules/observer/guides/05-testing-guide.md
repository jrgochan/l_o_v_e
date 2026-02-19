# Testing Guide

**Reading Time:** ~25 minutes
**Audience:** New developers
**Prerequisites:** [Common Tasks](04-common-tasks.md) completed
**Goal:** Learn how to write and run tests for Observer

---

## Overview

Testing ensures Observer works correctly and prevents regressions. We use:

- **pytest** - Test framework
- **pytest-asyncio** - For async tests
- **pytest-cov** - Code coverage
- **httpx** - Async HTTP client for API tests
- **Database fixtures** - Isolated test data

---

## Test Structure

```text
tests/
├── conftest.py              # Pytest configuration and fixtures
├── test_data.py             # Test data helpers
├── unit/                    # Unit tests (isolated)
│   ├── test_quaternion_builder.py
│   ├── test_metrics_calculator.py
│   └── test_emotion_mapper.py
├── integration/             # Integration tests (with DB)
│   ├── test_atlas_api.py
│   ├── test_state_storage.py
│   └── test_pathfinding.py
├── semantic/                # Semantic validation tests
│   └── test_compassion_pity.py  # ⭐ The critical test!
└── manual/                  # Manual test scripts
    ├── test_transition_api.py
    └── test_websocket.py
```

---

## Setting Up Test Environment

### Step 1: Create Test Database

```bash
# Create a separate test database
psql postgres

CREATE DATABASE observer_test;
CREATE USER observer_test WITH PASSWORD 'test_pass';
GRANT ALL PRIVILEGES ON DATABASE observer_test TO observer_test;

\c observer_test
CREATE EXTENSION IF NOT EXISTS vector;

\q
```

### Step 2: Configure Test Environment

Create `observer/.env.test`:

```bash
# Test Environment
ENVIRONMENT=test
DATABASE_URL=postgresql://observer_test:test_pass@localhost:5432/observer_test

# Use local embeddings for tests (faster)
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Disable external services
VERSOR_URL=http://localhost:8001
ENABLE_WEBSOCKET=false
```

### Step 3: Run Migrations for Test DB

```bash
# Set test environment
export DATABASE_URL=postgresql://observer_test:test_pass@localhost:5432/observer_test

# Run migrations
alembic upgrade head

# Seed atlas (required for tests)
python scripts/seed_atlas.py
```

---

## Writing Unit Tests

Unit tests test individual functions in isolation.

### Example: Testing VAC Distance Calculation

Create `tests/unit/test_emotion_mapper.py`:

```python
import pytest
from app.services.emotion_mapper import EmotionMapper

class TestEmotionMapper:
    """Unit tests for EmotionMapper service"""

    def test_vac_distance_identical(self):
        """Test VAC distance between identical coordinates is 0"""
        vac1 = [0.5, 0.6, 0.7]
        vac2 = [0.5, 0.6, 0.7]

        mapper = EmotionMapper(db=None)  # No DB needed for this test
        distance = mapper._calculate_vac_distance(vac1, vac2)

        assert distance == 0.0

    def test_vac_distance_calculation(self):
        """Test VAC distance calculation is correct"""
        vac1 = [0.0, 0.0, 0.0]
        vac2 = [1.0, 0.0, 0.0]

        mapper = EmotionMapper(db=None)
        distance = mapper._calculate_vac_distance(vac1, vac2)

        # Distance should be 1.0 (Euclidean distance)
        assert distance == pytest.approx(1.0, rel=1e-6)

    def test_vac_distance_3d(self):
        """Test VAC distance in 3D space"""
        # Points at corners of a unit cube
        vac1 = [0.0, 0.0, 0.0]
        vac2 = [1.0, 1.0, 1.0]

        mapper = EmotionMapper(db=None)
        distance = mapper._calculate_vac_distance(vac1, vac2)

        # Distance should be sqrt(3) ≈ 1.732
        import math
        expected = math.sqrt(3)
        assert distance == pytest.approx(expected, rel=1e-6)
```

### Run Unit Tests

```bash
# Run all unit tests
pytest tests/unit/ -v

# Run specific test file
pytest tests/unit/test_emotion_mapper.py -v

# Run specific test
pytest tests/unit/test_emotion_mapper.py::TestEmotionMapper::test_vac_distance_identical -v
```

---

## Writing Integration Tests

Integration tests test multiple components working together (with database).

### Example: Testing Atlas API

Create `tests/integration/test_atlas_api.py`:

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_get_all_emotions():
    """Test getting all emotions from atlas"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/observer/emotions")

    assert response.status_code == 200
    data = response.json()

    assert "emotions" in data
    assert "total" in data
    assert data["total"] == 87  # Should have 87 emotions
    assert len(data["emotions"]) == 87

@pytest.mark.asyncio
async def test_get_emotion_by_name():
    """Test getting a specific emotion"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/observer/emotions/Joy")

    assert response.status_code == 200
    emotion = response.json()

    assert emotion["name"] == "Joy"
    assert emotion["category"] == "When Life Is Good"
    assert len(emotion["vac"]) == 3
    assert emotion["vac"][0] > 0.5  # Positive valence

@pytest.mark.asyncio
async def test_find_similar_emotions():
    """Test similarity search"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/observer/similar",
            json={"valence": 0.8, "arousal": 0.6, "connection": 0.7}
        )

    assert response.status_code == 200
    data = response.json()

    assert "results" in data
    assert len(data["results"]) > 0

    # First result should be close to Joy
    first = data["results"][0]
    assert first["emotion"] in ["Joy", "Happiness", "Gratitude"]
    assert first["distance"] < 0.3  # Close distance
```

### Run Integration Tests

```bash
# Run all integration tests
pytest tests/integration/ -v

# With database output
pytest tests/integration/ -v -s
```

---

## The Critical Test: Compassion vs. Pity

This test validates the Connection axis innovation!

Create `tests/semantic/test_compassion_pity.py`:

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_compassion_has_positive_connection():
    """
    Critical Test: Compassion should have POSITIVE connection.
    This validates our VAC model's key innovation.
    """
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/observer/emotions/Compassion")

    assert response.status_code == 200
    emotion = response.json()

    # Compassion MUST have positive connection
    assert emotion["vac"][2] > 0.3, \
        f"Compassion should have positive connection, got {emotion['vac'][2]}"

    print(f"✅ Compassion connection: {emotion['vac'][2]} (positive)")

@pytest.mark.asyncio
async def test_pity_has_negative_connection():
    """
    Critical Test: Pity should have NEGATIVE connection.
    This distinguishes it from Compassion.
    """
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/observer/emotions/Pity")

    assert response.status_code == 200
    emotion = response.json()

    # Pity MUST have negative connection (separation)
    assert emotion["vac"][2] < 0, \
        f"Pity should have negative connection, got {emotion['vac'][2]}"

    print(f"✅ Pity connection: {emotion['vac'][2]} (negative)")

@pytest.mark.asyncio
async def test_compassion_pity_distinction():
    """
    Critical Test: System must distinguish Compassion from Pity.
    This is THE test that validates our VAC model.
    """
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Get both emotions
        compassion_resp = await client.get("/observer/emotions/Compassion")
        pity_resp = await client.get("/observer/emotions/Pity")

    compassion = compassion_resp.json()
    pity = pity_resp.json()

    # Extract connection values
    compassion_connection = compassion["vac"][2]
    pity_connection = pity["vac"][2]

    # CRITICAL: Connection values must be on opposite sides
    assert compassion_connection > 0, "Compassion must have positive connection"
    assert pity_connection < 0, "Pity must have negative connection"

    # They should be sufficiently different
    connection_diff = abs(compassion_connection - pity_connection)
    assert connection_diff > 0.5, \
        f"Compassion and Pity should be clearly distinguished (diff: {connection_diff})"

    print(f"\n✅ CRITICAL TEST PASSED!")
    print(f"   Compassion connection: {compassion_connection:+.2f}")
    print(f"   Pity connection: {pity_connection:+.2f}")
    print(f"   Difference: {connection_diff:.2f}")

@pytest.mark.asyncio
async def test_similar_compassion_returns_compassion():
    """Test that compassion-like VAC coordinates return Compassion"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Get Compassion's actual VAC
        compassion_resp = await client.get("/observer/emotions/Compassion")
        compassion = compassion_resp.json()
        compassion_vac = compassion["vac"]

        # Search for similar emotions
        response = await client.post(
            "/observer/similar",
            json={
                "valence": compassion_vac[0],
                "arousal": compassion_vac[1],
                "connection": compassion_vac[2]
            }
        )

    results = response.json()["results"]

    # First result should be Compassion
    assert results[0]["emotion"] == "Compassion"
    assert results[0]["distance"] < 0.1  # Very close
```

### Run the Critical Test

```bash
# Run the critical test
pytest tests/semantic/test_compassion_pity.py -v -s

# Should output:
# ✅ CRITICAL TEST PASSED!
#    Compassion connection: +0.70
#    Pity connection: -0.50
#    Difference: 1.20
```

---

## Database Fixtures

Use fixtures to provide clean test data.

### Example: Basic Database Fixture

In `tests/conftest.py`:

```python
import pytest
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.config import settings

# Test database URL
TEST_DATABASE_URL = "postgresql://observer_test:test_pass@localhost:5432/observer_test"

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    yield engine
    await engine.dispose()

@pytest.fixture(scope="session")
async def test_db(test_engine):
    """Create test database session"""
    async_session = sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        yield session

@pytest.fixture(autouse=True)
async def clean_db(test_db):
    """Clean database before each test"""
    # This runs before each test
    yield
    # Cleanup after test
    await test_db.rollback()
```

### Using Fixtures in Tests

```python
import pytest
from app.models.atlas_definition import AtlasDefinition

@pytest.mark.asyncio
async def test_create_emotion(test_db):
    """Test creating an emotion in database"""
    # Create emotion
    emotion = AtlasDefinition(
        name="TestEmotion",
        category="Test Category",
        vac=[0.5, 0.5, 0.5],
        description="A test emotion"
    )

    test_db.add(emotion)
    await test_db.commit()
    await test_db.refresh(emotion)

    # Verify it was created
    assert emotion.id is not None
    assert emotion.name == "TestEmotion"
```

---

## Testing Async Code

### Example: Testing Path Planner

```python
import pytest
from app.services.path_planner import PathPlanner
from app.models.atlas_definition import AtlasDefinition

@pytest.mark.asyncio
async def test_find_transition_path(test_db):
    """Test A* pathfinding between emotions"""
    # Get start and goal emotions
    from sqlalchemy import select

    anger_query = select(AtlasDefinition).where(
        AtlasDefinition.name == "Anger"
    )
    anger_result = await test_db.execute(anger_query)
    anger = anger_result.scalar_one()

    calm_query = select(AtlasDefinition).where(
        AtlasDefinition.name == "Calm"
    )
    calm_result = await test_db.execute(calm_query)
    calm = calm_result.scalar_one()

    # Find path
    planner = PathPlanner(test_db)
    path = await planner.find_transition_path(
        from_emotion=anger,
        to_emotion=calm,
        user_id="test-user"
    )

    # Verify path
    assert path is not None
    assert len(path.waypoints) > 0
    assert path.waypoints[0].name == "Anger"
    assert path.waypoints[-1].name == "Calm"

    # Path should include intermediate emotions
    assert len(path.waypoints) > 2

    print(f"Path: {' → '.join(w.name for w in path.waypoints)}")
```

---

## Coverage Reports

### Generate Coverage Report

```bash
# Run tests with coverage
pytest --cov=app --cov-report=html --cov-report=term tests/

# Open HTML report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
```

### Coverage Goals

- **Overall:** Aim for > 80% coverage
- **Services:** > 90% coverage
- **Models:** > 70% coverage
- **API Routes:** > 85% coverage

### Viewing Coverage

```bash
# Terminal output shows:
---------- coverage: platform darwin, python 3.11.0 -----------
Name                              Stmts   Miss  Cover
-----------------------------------------------------
app/services/emotion_mapper.py      45      3    93%
app/services/path_planner.py        78      8    90%
app/services/metrics_calculator.py  32      5    84%
app/models/atlas_definition.py      15      1    93%
-----------------------------------------------------
TOTAL                              450     45    90%
```

---

## Testing Best Practices

### ✅ Do This

#### 1. Isolate Tests

```python
# Good: Each test is independent
def test_vac_distance():
    mapper = EmotionMapper(db=None)
    result = mapper._calculate_vac_distance([0,0,0], [1,0,0])
    assert result == 1.0

def test_vac_distance_3d():
    mapper = EmotionMapper(db=None)
    result = mapper._calculate_vac_distance([0,0,0], [1,1,1])
    assert result == pytest.approx(1.732, rel=0.01)
```

#### 2. Use Descriptive Names

```python
# Good: Clear what's being tested
def test_compassion_has_positive_connection():
    ...

# Bad: Vague
def test_emotion():
    ...
```

#### 3. Test Edge Cases

```python
def test_vac_distance_with_negative_values():
    """Test that negative VAC values are handled correctly"""
    mapper = EmotionMapper(db=None)
    result = mapper._calculate_vac_distance([-1, -1, -1], [1, 1, 1])
    assert result > 0  # Distance should always be positive
```

#### 4. Use Fixtures

```python
@pytest.fixture
def sample_emotion():
    return {
        "name": "Joy",
        "vac": [0.8, 0.6, 0.7],
        "category": "When Life Is Good"
    }

def test_emotion_validation(sample_emotion):
    assert sample_emotion["name"] == "Joy"
```

### ❌ Don't Do This

#### 1. Tests That Depend on Order

```python
# Bad: test_b depends on test_a running first
def test_a():
    create_emotion("Test")

def test_b():
    emotion = get_emotion("Test")  # Fails if test_a didn't run
```

#### 2. Tests With Hard-Coded IDs

```python
# Bad: Assumes specific UUID
def test_get_emotion():
    emotion = get_emotion("3fa85f64-5717-4562-b3fc-2c963f66afa6")
    # This UUID might not exist in test DB!
```

#### 3. Tests Without Assertions

```python
# Bad: No assertion
def test_create_emotion():
    create_emotion("Test")
    # Did it work? Who knows!

# Good: Assert the result
def test_create_emotion():
    emotion = create_emotion("Test")
    assert emotion.name == "Test"
```

---

## Common Testing Patterns

### Pattern 1: Arrange-Act-Assert

```python
def test_vac_distance():
    # Arrange: Set up test data
    vac1 = [0.0, 0.0, 0.0]
    vac2 = [1.0, 0.0, 0.0]
    mapper = EmotionMapper(db=None)

    # Act: Perform the action
    distance = mapper._calculate_vac_distance(vac1, vac2)

    # Assert: Check the result
    assert distance == 1.0
```

### Pattern 2: Parametrized Tests

```python
@pytest.mark.parametrize("vac1,vac2,expected", [
    ([0, 0, 0], [1, 0, 0], 1.0),
    ([0, 0, 0], [0, 1, 0], 1.0),
    ([0, 0, 0], [0, 0, 1], 1.0),
    ([0, 0, 0], [1, 1, 1], 1.732),
])
def test_vac_distance_multiple(vac1, vac2, expected):
    mapper = EmotionMapper(db=None)
    distance = mapper._calculate_vac_distance(vac1, vac2)
    assert distance == pytest.approx(expected, rel=0.01)
```

### Pattern 3: Mocking External Services

```python
from unittest.mock import Mock, patch

@pytest.mark.asyncio
@patch('app.services.quaternion_builder.httpx.AsyncClient')
async def test_quaternion_builder_with_mock(mock_client):
    """Test quaternion builder without calling Versor"""
    # Mock the HTTP response
    mock_response = Mock()
    mock_response.json.return_value = {
        "quaternion": [0.8, 0.3, 0.4, 0.3]
    }
    mock_client.return_value.__aenter__.return_value.post.return_value = mock_response

    # Test
    builder = QuaternionBuilder(use_http=True)
    q = await builder.from_vac([0.5, 0.6, 0.7])

    assert len(q) == 4
    assert q[0] == 0.8  # w component
```

---

## Quick Testing Commands

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/unit/test_emotion_mapper.py

# Run specific test
pytest tests/unit/test_emotion_mapper.py::test_vac_distance

# Run tests matching pattern
pytest -k "compassion"

# Run with output (print statements)
pytest -v -s

# Run with coverage
pytest --cov=app tests/

# Stop on first failure
pytest -x

# Run only failed tests from last run
pytest --lf

# Run in parallel (faster)
pytest -n auto
```

---

## Next Steps

You now know how to test Observer! Time for your first contribution:

**Continue to:** [First Contribution →](06-first-contribution.md)

You'll learn:

- Git workflow
- Branch naming conventions
- PR process
- Code review expectations
- Making your first merge!

---

**Questions about testing?** Ask in Slack #observer-module or check the [Senior Developer Testing docs](../architecture/08-troubleshooting.md) for advanced debugging techniques!
