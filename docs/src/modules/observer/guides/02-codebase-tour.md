# Codebase Tour

**Reading Time:** ~20 minutes
**Audience:** New developers
**Prerequisites:** [Getting Started](01-getting-started.md) completed
**Goal:** Understand the Observer codebase structure and know where to find things

---

## Overview

The Observer follows a clean architecture pattern with clear separation of concerns. Think of it like a well-organized library where you always know which shelf to check! 📚

```text
observer/
├── app/                    # Application code
│   ├── api/               # API routes and schemas
│   ├── core/              # Factory, settings, security
│   ├── models/            # Database models
│   ├── services/          # Business logic
│   ├── repositories/      # Data access (currently minimal)
│   ├── utils/             # Helper functions
│   ├── websocket/         # WebSocket handling
│   ├── database.py        # Database connection
│   └── main.py            # Thin wrapper around factory
├── migrations/            # Alembic database migrations
├── scripts/               # Seed and utility scripts
├── tests/                 # Test suite
├── data/                  # JSON seed data
├── alembic.ini            # Alembic configuration
├── requirements.txt       # Python dependencies
└── .env                   # Environment variables
```

---

## Core Directories Explained

### 📁 `app/` - The Heart of Observer

This is where all the application code lives.

#### `app/main.py` - Application Entry Point

**What it does:** Bootstraps the FastAPI application, registers routes, sets up middleware.

```python
from app.core.factory import create_app

app = create_app()

# create_app() configures:
# - CORS middleware
# - Router registration (19 routers including):
app.include_router(emotions.router, prefix="/observer", tags=["Emotions"])
app.include_router(state.router, tags=["State"])
app.include_router(collections.router, prefix="/observer", tags=["Collections"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
# ... and more
```

**When to edit:**

- Adding new route modules
- Configuring middleware (CORS, logging, etc.)
- Application lifecycle events

---

#### `app/core/settings.py` - Configuration Management

**What it does:** Loads environment variables and provides configuration to the app.

```python
from pydantic_settings import BaseSettings

class Settings(LoveBaseSettings):
    POSTGRES_HOST: str = Field(default="localhost")
    POSTGRES_PORT: int = Field(default=5432)
    DATABASE_URL: str | None = None
    ENVIRONMENT: str = "development"
    VERSOR_URL: str = "http://localhost:8001"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

settings = Settings()
```

**When to edit:**

- Adding new environment variables
- Changing default values
- Adding validation rules

---

#### `app/database.py` - Database Connection

**What it does:** Sets up SQLAlchemy async engine and session management.

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(settings.DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession)

async def get_db():
    """Dependency for getting database sessions"""
    async with AsyncSessionLocal() as session:
        yield session
```

**Key concepts:**

- Uses async SQLAlchemy for non-blocking database operations
- Session management via dependency injection
- Connection pooling configured here

---

### 📁 `app/models/` - Database Models

Each file defines a SQLAlchemy model representing a database table.

#### Key Models

**`atlas_definition.py`** - The 87 Emotions

```python
class AtlasDefinition(Base):
    __tablename__ = "atlas_definitions"

    id = Column(UUID, primary_key=True)
    name = Column(String, unique=True)  # "Joy", "Compassion", etc.
    category = Column(String)           # "When Life Is Good"
    vac = Column(ARRAY(Float))          # [valence, arousal, connection]
    embedding = Column(Vector(384))     # Semantic embedding
    description = Column(Text)
```

**`user_trajectory.py`** - Emotional Journey

```python
class UserTrajectory(Base):
    __tablename__ = "user_trajectory"

    id = Column(UUID, primary_key=True)
    user_id = Column(String, index=True)
    session_id = Column(String, index=True)
    vac = Column(ARRAY(Float))          # VAC coordinates
    quaternion = Column(ARRAY(Float))   # [w, x, y, z]
    emotion_id = Column(UUID, ForeignKey("atlas_definitions.id"))
    transcription = Column(Text)        # Sanitized text
    embedding = Column(Vector(384))     # Semantic embedding
    timestamp = Column(DateTime, default=datetime.utcnow)
```

**`transition_strategy.py`** - Therapeutic Strategies

```python
class TransitionStrategy(Base):
    __tablename__ = "transition_strategies"

    id = Column(UUID, primary_key=True)
    name = Column(String)
    category = Column(String)          # ACT, DBT, CBT, etc.
    description = Column(Text)
    technique = Column(Text)
    evidence_base = Column(String)     # Research backing
```

**`chat_session.py` & `chat_message.py`** - Chat Functionality

- Manage WebSocket chat sessions
- Store conversation history
- Track tone preferences (warm/clinical)

**Other models:**

- `clinical_alert.py` - Risk detection
- `model_assignment.py` - AI model routing
- `multi_emotion_analysis.py` - Complex emotional states
- `session_analytics.py` - Session metrics

---

### 📁 `app/services/` - Business Logic

This is where the magic happens! Each service handles a specific domain.

#### Core Services

**`emotion_mapper.py`** ⭐ Most Important!

- **Purpose:** Find nearest emotion from atlas using weighted fusion
- **Algorithm:** Combines geometric (VAC) distance with semantic similarity
- **When to edit:** Changing emotion matching logic

```python
class EmotionMapper:
    async def find_nearest(self, vac, text, k=5):
        """
        Find k nearest emotions using weighted fusion:
        - Short text: 80% VAC, 20% semantic
        - Long text: 40% VAC, 60% semantic
        """
        vac_distance = self._calculate_vac_distance(...)
        semantic_distance = self._calculate_semantic_distance(...)
        return self._weighted_fusion(vac_distance, semantic_distance)
```

**`path_planner.py`** ⭐ Complex Algorithm!

- **Purpose:** A* pathfinding for emotional transitions
- **Algorithm:** Finds therapeutic paths between emotions
- **Constraints:** Respects category boundaries, uses bridge emotions
- **When to edit:** Adding new path validation rules

```python
class PathPlanner:
    async def find_transition_path(self, from_emotion, to_emotion, user_id):
        """
        Uses A* algorithm to find optimal emotional transition path.
        Considers:
        - VAC distance (g-cost)
        - Category transitions (validity)
        - Bridge emotions (for difficult transitions)
        - Therapeutic strategies
        """
        path = await self._astar_search(start, goal)
        enhanced = await self._validate_and_enhance_path(path)
        return enhanced
```

**`metrics_calculator.py`**

- **Purpose:** Calculate elasticity and rigidity
- **Formulas:**
  - Elasticity: `E = θ / Δt` (angular velocity)
  - Rigidity: `R = 1 / Variance(quaternions)` (resistance to change)

**`embedding_service.py`**

- **Purpose:** Generate semantic embeddings
- **Providers:** Local (sentence-transformers) or OpenAI
- **Dimension:** 384-dimensional vectors

**`quaternion_builder.py`**

- **Purpose:** Convert VAC → quaternion
- **Integration:** Calls Versor module or uses local math

**`atlas_mapper.py`**

- **Purpose:** Map AI-generated emotion names to atlas
- **Methods:** Exact match → Fuzzy match → VAC match

**`strategy_recommender.py`**

- **Purpose:** Recommend therapeutic strategies
- **Logic:** Pattern matching + universal strategies

**`insight_generator.py`**

- **Purpose:** Generate natural language insights
- **Modes:** Warm (empathetic) or Clinical (professional)

**`chat_service.py`**

- **Purpose:** Manage WebSocket chat sessions
- **Features:** Session lifecycle, message storage, tone preferences

**Other services:**

- `aggregate_emotion_service.py` - Multi-emotion analysis
- `ai_model_service.py` - Model assignment and metrics
- `clinical_alert_service.py` - Risk detection
- `waypoint_explainer.py` - Explain transition waypoints
- `recommendation_engine.py` - Curated journey recommendations
- `session_analytics_service.py` - Session metrics

---

### 📁 `app/api/` - API Layer

Organizes routes and request/response schemas.

#### `app/api/routes/` - Endpoint Definitions

**`emotions.py`** - Emotion Queries

```python
@router.get("/emotions")
async def get_emotions(category: Optional[str] = None):
    """Get all emotions, optionally filtered by category"""

@router.get("/emotions/{name}")
async def get_emotion(name: str):
    """Get specific emotion by name"""

@router.post("/similar")
async def find_similar(request: SimilarityRequest):
    """Find emotions similar to given VAC coordinates"""
```

**`state.py`** - User State Management

```python
@router.post("/")
async def store_state(state: StateCreate):
    """Store a new emotional state"""

@router.get("/{user_id}")
async def get_trajectory(user_id: str, limit: int = 100):
    """Get user's emotional trajectory"""
```

**`transitions.py`** - Pathfinding

```python
@router.post("/path")
async def find_path(request: PathRequest):
    """Find therapeutic path between two emotions"""

@router.get("/strategies")
async def get_strategies(from_id: str, to_id: str):
    """Get recommended strategies for transition"""
```

**`health.py`** - Health Checks

```python
@router.get("/health")
async def health_check():
    """Check if Observer is healthy"""
    return {
        "status": "healthy",
        "database": "connected",
        "atlas_emotions": 87
    }
```

**Other routes:**

- `bootstrap.py` - Bootstrap patterns
- `current.py` - Current state queries
- `history.py` - Historical trajectory
- `collections.py` - Emotion collections
- `matrix.py` - Path matrix
- `recommendations.py` - Smart recommendations
- `transitions.py` - Transition pathfinding
- `auth.py` - Authentication
- `users.py` - User management
- `admin.py` - Admin endpoints
- `clinician.py` - Clinician endpoints
- `consent.py` - Consent management
- `prompts.py` - AI prompt management
- `ai_settings.py` - AI model configuration
- `chat_websocket.py` - WebSocket chat

#### `app/api/schemas/` - Request/Response Models

Pydantic schemas for validation.

```python
class StateCreate(BaseModel):
    user_id: str
    session_id: str
    vac: List[float]  # [valence, arousal, connection]
    transcription: str
    emotion_name: Optional[str] = None

class EmotionResponse(BaseModel):
    id: UUID
    name: str
    category: str
    vac: List[float]
    description: str
```

---

### 📁 `app/websocket/` - Real-time Chat

**`connection_manager.py`**

- Manages WebSocket connections
- Broadcasts messages to sessions
- Handles disconnections

**`routes.py`**

- WebSocket endpoint: `/ws/{session_id}`
- Message routing logic

---

### 📁 `migrations/` - Database Migrations

Alembic migration scripts for schema evolution.

```text
migrations/
├── versions/
│   ├── 3d24332d682d_initial_schema.py
│   ├── add_transition_system_tables.sql
│   ├── add_chat_system.sql
│   └── ...
└── env.py  # Alembic environment
```

**Common commands:**

```bash
# Create new migration
alembic revision -m "add new feature"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

### 📁 `scripts/` - Utility Scripts

**`seed_atlas.py`** - Seed 87 emotions

```bash
python scripts/seed_atlas.py
```

**`seed_enhanced_strategies.py`** - Seed 69 therapeutic strategies

```bash
python scripts/seed_enhanced_strategies.py
```

**`seed_demo_data.py`** - Create test users and trajectories

```bash
python scripts/seed_demo_data.py
```

---

### 📁 `data/` - Seed Data (JSON)

Pre-defined data loaded by seed scripts:

- `bootstrap_patterns.json` - Common emotional patterns
- `bridge_emotions.json` - Emotions that help difficult transitions
- `category_rankings.json` - Category relationship graph
- `strategies/*.json` - Therapeutic strategies by type
- `patterns/*.json` - Named emotional journeys

---

### 📁 `tests/` - Test Suite

```text
tests/
├── conftest.py           # Pytest fixtures
├── test_data.py          # Test data helpers
├── unit/                 # Unit tests
│   └── test_quaternion_builder.py
├── integration/          # Integration tests
├── semantic/             # Semantic validation tests
│   └── test_compassion_pity.py  # The critical test!
└── manual/               # Manual test scripts
```

**Running tests:**

```bash
# All tests
pytest

# Specific test
pytest tests/semantic/test_compassion_pity.py -v

# With coverage
pytest --cov=app tests/
```

---

## Key Files Reference

### Files You'll Edit Often

| File | Purpose | Frequency |
|------|---------|-----------|
| `app/api/routes/*.py` | Add new endpoints | Often |
| `app/services/*.py` | Business logic | Often |
| `app/models/*.py` | Database schema | Sometimes |
| `scripts/seed_*.py` | Update seed data | Sometimes |
| `.env` | Configuration | Rarely |

### Files You'll Rarely Touch

| File | Purpose | Why Rarely |
|------|---------|------------|
| `app/database.py` | DB connection | Stable config |
| `app/main.py` | App bootstrap | Just route registration |
| `alembic.ini` | Migration config | Set once |
| `requirements.txt` | Dependencies | Only when adding packages |

---

## Architecture Patterns

### 1. **Dependency Injection**

FastAPI's dependency system for clean code:

```python
from fastapi import Depends
from app.database import get_db

@router.get("/emotions")
async def get_emotions(db: AsyncSession = Depends(get_db)):
    # db is automatically injected
    result = await db.execute(select(AtlasDefinition))
    return result.scalars().all()
```

### 2. **Async/Await**

All database operations are async:

```python
async def find_emotion(db: AsyncSession, name: str):
    result = await db.execute(
        select(AtlasDefinition).where(AtlasDefinition.name == name)
    )
    return result.scalar_one_or_none()
```

### 3. **Service Layer Pattern**

Controllers (routes) stay thin, services handle logic:

```python
# ❌ Bad: Logic in route
@router.post("/path")
async def find_path(request: PathRequest, db: AsyncSession = Depends(get_db)):
    # 100 lines of A* algorithm here...

# ✅ Good: Logic in service
@router.post("/path")
async def find_path(request: PathRequest, db: AsyncSession = Depends(get_db)):
    planner = PathPlanner(db)
    path = await planner.find_transition_path(
        request.from_emotion,
        request.to_emotion,
        request.user_id
    )
    return path
```

---

## Data Flow Example

Let's trace a request from start to finish:

**Request:** Store a new emotional state

```text
1. HTTP POST /state
   └─> app/api/routes/state.py

2. store_state(state: StateCreate, db: AsyncSession)
   └─> Validates request with Pydantic

3. emotion_mapper = EmotionMapper(db)
   emotion = await emotion_mapper.find_nearest(state.vac, state.text)
   └─> app/services/emotion_mapper.py
       └─> Queries atlas_definitions table
       └─> Calculates weighted fusion

4. quaternion_builder = QuaternionBuilder()
   q = await quaternion_builder.from_vac(state.vac)
   └─> app/services/quaternion_builder.py
       └─> Calls Versor module (or local math)

5. Create UserTrajectory record
   trajectory = UserTrajectory(
       user_id=state.user_id,
       vac=state.vac,
       quaternion=q,
       emotion_id=emotion.id,
       ...
   )
   db.add(trajectory)
   await db.commit()
   └─> app/models/user_trajectory.py
       └─> Inserts into user_trajectory table

6. Return response
   └─> 201 Created with trajectory data
```

---

## Finding Your Way

### "I want to..."

**Add a new emotion to the atlas**
→ Edit `data/` JSON, run `scripts/seed_atlas.py`

**Change how emotions are matched**
→ `app/services/emotion_mapper.py`

**Add a new API endpoint**
→ Create/edit file in `app/api/routes/`, register in `app/main.py`

**Modify the A* pathfinding**
→ `app/services/path_planner.py`

**Change the database schema**
→ Create migration: `alembic revision -m "description"`

**Add a new therapeutic strategy**
→ Edit `data/strategies/*.json`, run `scripts/seed_enhanced_strategies.py`

**Change VAC → quaternion conversion**
→ `app/services/quaternion_builder.py`

**Debug vector similarity search**
→ `app/services/emotion_mapper.py` (look at `_calculate_semantic_distance`)

---

## Next Steps

Now that you know where everything is, let's understand **what** it does:

**Continue to:** [Key Concepts →](03-key-concepts.md)

This will teach you:

- The 87-emotion atlas in detail
- How the VAC model works
- Vector similarity search mechanics
- A* pathfinding for emotional transitions
- And more!

---

## Quick Navigation Cheat Sheet

```text
Need to...                          → Check...
═══════════════════════════════════════════════════════════
Add API endpoint                    → app/api/routes/
Change business logic               → app/services/
Modify database schema              → app/models/ + migrations/
Update seed data                    → data/ + scripts/
Write tests                         → tests/
Configure environment               → .env
Check health endpoint               → app/api/routes/health.py
Debug vector search                 → app/services/emotion_mapper.py
Modify A* pathfinding               → app/services/path_planner.py
Change VAC→quaternion conversion    → app/services/quaternion_builder.py
```

---

**Questions about the codebase?** Ask in Slack #observer-module or create an issue!
