# Observer Module - Testing Strategy

## Overview

The Observer handles sensitive emotional data and complex mathematical operations. A comprehensive testing strategy is essential to ensure correctness, performance, and security.

## Testing Pyramid

```
        ┌────────────┐
        │   E2E      │  (10%)
        │  Tests     │
        └────────────┘
      ┌──────────────────┐
      │  Integration     │  (30%)
      │    Tests         │
      └──────────────────┘
    ┌────────────────────────┐
    │    Unit Tests          │  (60%)
    │                        │
    └────────────────────────┘
```

## Unit Testing

### Test Coverage Goals

- **Quaternion Math**: 100% coverage (critical for correctness)
- **Vector Operations**: 100% coverage
- **Service Layer**: >90% coverage
- **API Routes**: >80% coverage

### Quaternion Builder Tests

```python
# tests/unit/test_quaternion_builder.py

import pytest
import math
from app.services.quaternion_builder import QuaternionBuilder

class TestQuaternionBuilder:
    
    def setup_method(self):
        self.builder = QuaternionBuilder()
    
    def test_neutral_state_identity(self):
        """Neutral VAC should produce identity quaternion"""
        q = self.builder.from_vac([0.0, 0.0, 0.0])
        assert q == [1.0, 0.0, 0.0, 0.0]
    
    def test_unit_length_property(self):
        """All quaternions must be unit length"""
        test_cases = [
            [0.9, 0.7, 0.8],    # Joy
            [-0.9, -0.1, -1.0],  # Shame
            [0.5, -0.7, 0.4],    # Calm
            [-0.5, 0.8, -0.2]    # Anger
        ]
        
        for vac in test_cases:
            q = self.builder.from_vac(vac)
            length = math.sqrt(sum(c**2 for c in q))
            assert abs(length - 1.0) < 1e-6, f"Failed for VAC {vac}"
    
    def test_opposite_vac_opposite_quaternions(self):
        """Opposite VAC vectors should produce opposite rotations"""
        q1 = self.builder.from_vac([0.9, 0.7, 0.8])
        q2 = self.builder.from_vac([-0.9, -0.7, -0.8])
        
        dot = sum(a * b for a, b in zip(q1, q2))
        assert dot < 0, "Opposite VAC should produce opposite quaternions"
    
    def test_compassion_pity_different(self):
        """Critical: Compassion and Pity must be distinguishable"""
        compassion = self.builder.from_vac([0.5, 0.2, 0.9])
        pity = self.builder.from_vac([-0.3, -0.1, -0.7])
        
        distance = sum((a - b)**2 for a, b in zip(compassion, pity))
        assert distance > 1.0
```

### Metrics Calculator Tests

```python
# tests/unit/test_metrics_calculator.py

from app.services.metrics_calculator import MetricsCalculator

class TestMetricsCalculator:
    
    def test_elasticity_zero_for_identical_states(self):
        """Elasticity should be 0 for identical quaternions"""
        calc = MetricsCalculator()
        q = [1.0, 0.0, 0.0, 0.0]
        
        elasticity = calc.calculate_elasticity(q, q, delta_time=1.0)
        assert elasticity == 0.0
    
    def test_elasticity_high_for_opposite_states(self):
        """Elasticity should be π for 180° rotation in 1 second"""
        calc = MetricsCalculator()
        q1 = [1.0, 0.0, 0.0, 0.0]
        q2 = [0.0, 1.0, 0.0, 0.0]
        
        elasticity = calc.calculate_elasticity(q1, q2, delta_time=1.0)
        assert abs(elasticity - math.pi) < 0.01
    
    def test_flooding_detection(self):
        """High elasticity + high arousal = flooding"""
        from app.services.metrics_calculator import detect_flooding
        
        assert detect_flooding(elasticity=3.5, arousal=0.9) == True
        assert detect_flooding(elasticity=0.5, arousal=0.9) == False
        assert detect_flooding(elasticity=3.5, arousal=0.3) == False
```

### Property-Based Testing

```python
from hypothesis import given, strategies as st

@given(
    valence=st.floats(min_value=-1.0, max_value=1.0),
    arousal=st.floats(min_value=-1.0, max_value=1.0),
    connection=st.floats(min_value=-1.0, max_value=1.0)
)
def test_all_valid_vac_produce_unit_quaternions(valence, arousal, connection):
    """Property: ANY valid VAC must produce unit quaternion"""
    builder = QuaternionBuilder()
    q = builder.from_vac([valence, arousal, connection])
    
    length = math.sqrt(sum(c**2 for c in q))
    assert abs(length - 1.0) < 1e-5
```

## Integration Testing

### Database Integration Tests

```python
# tests/integration/test_observer_service.py

import pytest
from uuid import uuid4
from datetime import datetime
from app.services.observer_service import ObserverService
from app.dependencies import AsyncSessionLocal

@pytest.mark.asyncio
async def test_process_state_end_to_end():
    """Test complete state processing pipeline"""
    
    async with AsyncSessionLocal() as session:
        service = ObserverService(session)
        
        result = await service.process_state(
            user_id=uuid4(),
            session_id=uuid4(),
            input_text="I'm feeling wonderful today!",
            vac_scalars=[0.8, 0.6, 0.7],
            timestamp=datetime.utcnow()
        )
        
        # Verify result
        assert result.state_id is not None
        assert result.dominant_emotion in ["Joy", "Happiness", "Contentment"]
        assert len(result.quaternion) == 4
        assert result.elasticity >= 0.0

@pytest.mark.asyncio
async def test_insight_generation():
    """Test finding similar past moments"""
    
    async with AsyncSessionLocal() as session:
        # Seed test data
        await seed_test_user_states(session, user_id=test_user_id)
        
        service = ObserverService(session)
        insights = await service.find_similar_moments(
            user_id=test_user_id,
            current_text="I'm stressed about work",
            limit=5
        )
        
        assert len(insights) > 0
        assert all(i.similarity_score > 0.7 for i in insights)
```

## Semantic Validation Testing

### The Compassion/Pity Test (Critical)

This is the **primary acceptance test** for the VAC model.

```python
# tests/semantic/test_compassion_pity.py

import pytest
from app.services.emotion_mapper import EmotionMapper
from app.services.embedding_service import EmbeddingService

@pytest.mark.asyncio
async def test_compassion_vs_pity_distinction(session):
    """
    Critical test: System MUST distinguish Compassion from Pity.
    
    If this test fails, the VAC model is broken.
    """
    
    mapper = EmotionMapper(session)
    embedding_service = EmbeddingService()
    
    # Case A: Pity (feeling FOR, separation)
    pity_text = "I feel sorry for them, they're struggling."
    pity_vac = [-0.3, -0.1, -0.7]  # Negative Connection
    pity_embedding = await embedding_service.generate_embedding(pity_text)
    
    result_pity = await mapper.find_nearest(
        vac_scalars=pity_vac,
        text_embedding=pity_embedding,
        word_count=len(pity_text.split())
    )
    
    assert result_pity.emotion_name == "Pity", \
        f"Expected Pity, got {result_pity.emotion_name}"
    assert result_pity.vac_vector[2] < 0, \
        "Pity must have negative Connection"
    
    # Case B: Compassion (feeling WITH, connection)
    compassion_text = "I understand their pain. I'm here for them."
    compassion_vac = [0.5, 0.2, 0.9]  # Positive Connection
    compassion_embedding = await embedding_service.generate_embedding(compassion_text)
    
    result_compassion = await mapper.find_nearest(
        vac_scalars=compassion_vac,
        text_embedding=compassion_embedding,
        word_count=len(compassion_text.split())
    )
    
    assert result_compassion.emotion_name == "Compassion", \
        f"Expected Compassion, got {result_compassion.emotion_name}"
    assert result_compassion.vac_vector[2] > 0.5, \
        "Compassion must have positive Connection"
```

### Additional Semantic Tests

```python
@pytest.mark.asyncio
async def test_grief_has_positive_connection():
    """Grief should have negative Valence but positive Connection"""
    
    result = await get_emotion_by_name(session, "Grief")
    
    assert result.vac_vector[0] < -0.5, "Grief has negative Valence"
    assert result.vac_vector[2] > 0.0, "Grief has positive Connection (love)"

@pytest.mark.asyncio
async def test_belonging_vs_fitting_in():
    """Belonging and Fitting In must differ on Connection axis"""
    
    belonging = await get_emotion_by_name(session, "Belonging")
    fitting_in = await get_emotion_by_name(session, "Fitting In")
    
    assert belonging.vac_vector[2] > 0.5, "Belonging = positive Connection"
    assert fitting_in.vac_vector[2] < 0.0, "Fitting In = negative Connection"
```

## Performance Testing

### Load Testing

```python
import asyncio
from locust import HttpUser, task, between

class ObserverUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def record_state(self):
        self.client.post(
            "/observer/state",
            json={
                "user_id": str(uuid4()),
                "session_id": str(uuid4()),
                "input_text": "Test input",
                "vac_scalars": {
                    "valence": 0.5,
                    "arousal": 0.3,
                    "connection": 0.6
                }
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(2)  # 2x more frequent
    def get_insight(self):
        self.client.post(
            "/observer/insight",
            json={
                "user_id": str(self.user_id),
                "current_text": "How am I feeling?"
            }
        )
```

Run load test:
```bash
locust -f tests/load/test_observer.py --host=http://localhost:8000
```

### Benchmark Tests

```python
@pytest.mark.benchmark
async def test_vector_search_performance(benchmark, session):
    """Benchmark vector similarity search"""
    
    query_embedding = [0.1] * 1536
    
    async def search():
        return await find_similar_moments(session, test_user_id, query_embedding)
    
    result = benchmark(lambda: asyncio.run(search()))
    
    assert benchmark.stats['mean'] < 0.05  # <50ms average
```

## Test Fixtures

### pytest conftest.py

```python
# tests/conftest.py

import pytest
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.base import Base
from app.config import settings

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine"""
    engine = create_async_engine(
        settings.TEST_DATABASE_URL,
        echo=True
    )
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()

@pytest.fixture
async def session(test_engine):
    """Create test session"""
    async_session = sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def seed_atlas(session):
    """Seed Atlas definitions for testing"""
    from scripts.seed_atlas import seed_atlas
    await seed_atlas(session)
```

## Next Steps

Now that you understand testing:
- **12-performance-optimization.md** - Database tuning and optimization
- **13-security-and-privacy.md** - Security hardening and privacy
