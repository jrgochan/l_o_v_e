# Observer Module - Architecture

## Overview

The Observer is architected as a Python-based microservice using **FastAPI**, designed to handle high-volume writes (emotional state updates) and low-latency reads (insight generation). The architecture follows the **Observer Pattern** (coincidentally namesake) and employs **event-driven design** to trigger downstream processing in the Versor and Experience modules.

## Architectural Principles

### 1. Separation of Concerns

The Observer is divided into distinct layers:

```
┌─────────────────────────────────────────────────┐
│           API Layer (FastAPI)                   │
│  - Route handlers                               │
│  - Request/Response models (Pydantic)           │
│  - OpenAPI documentation                        │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│           Service Layer                         │
│  - ObserverService (business logic)            │
│  - EmotionMapper (nearest neighbor)            │
│  - QuaternionBuilder (VAC → quaternion)        │
│  - MetricsCalculator (elasticity/rigidity)     │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│           Data Access Layer                     │
│  - SQLAlchemy models                            │
│  - Repository pattern                           │
│  - Vector operations                            │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│           Database (PostgreSQL + pgvector)      │
│  - atlas_definitions table                     │
│  - user_trajectory table                       │
│  - HNSW indexes                                 │
└─────────────────────────────────────────────────┘
```

### 2. Asynchronous by Default

All database operations use **AsyncSession** (SQLAlchemy 2.0+) to prevent blocking:

```python
async def process_state(user_id: UUID, input_text: str, vac: VACVector):
    async with AsyncSession(engine) as session:
        # Non-blocking I/O
        result = await session.execute(query)
        await session.commit()
```

This is critical for handling concurrent user inputs without queueing delays.

### 3. Event-Driven State Updates

When a new emotional state is persisted, the Observer publishes an event to notify other modules:

```
User Input → Observer.process_state()
                ↓
         [State Persisted]
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
Versor.on_state_change()  Experience.update_visualization()
```

## Directory Structure

```
observer/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app initialization
│   ├── config.py                  # Environment variables
│   ├── dependencies.py            # Dependency injection
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── state.py          # POST /observer/state
│   │   │   ├── insight.py        # POST /observer/insight
│   │   │   ├── history.py        # GET /observer/history
│   │   │   └── health.py         # GET /health
│   │   └── schemas/
│   │       ├── __init__.py
│   │       ├── state.py          # Pydantic models
│   │       ├── insight.py
│   │       └── history.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── observer_service.py   # Core business logic
│   │   ├── emotion_mapper.py     # Nearest neighbor search
│   │   ├── quaternion_builder.py # VAC → quaternion math
│   │   ├── metrics_calculator.py # Elasticity/rigidity
│   │   ├── embedding_service.py  # OpenAI/local embeddings
│   │   └── event_publisher.py    # Event bus integration
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── atlas_definition.py   # SQLAlchemy model
│   │   └── user_trajectory.py    # SQLAlchemy model
│   │
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── base.py               # Generic repository
│   │   ├── atlas_repo.py         # Atlas operations
│   │   └── trajectory_repo.py    # User trajectory operations
│   │
│   └── utils/
│       ├── __init__.py
│       ├── vector_ops.py         # Vector distance calculations
│       ├── quaternion_math.py    # Quaternion utilities
│       └── pii_scrubber.py       # Secondary PII check
│
├── migrations/                    # Alembic migrations
│   ├── versions/
│   └── env.py
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── semantic/                  # Compassion/Pity test
│
├── scripts/
│   └── seed_atlas.py             # Load 87 emotions
│
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── pyproject.toml
└── .env.example
```

## Core Components

### 1. FastAPI Application (main.py)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import state, insight, history, health
from app.config import settings

app = FastAPI(
    title="L.O.V.E. Observer API",
    description="Emotional state persistence and context retrieval",
    version="1.0.0"
)

# CORS for Experience module (React Native)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(state.router, prefix="/observer", tags=["State"])
app.include_router(insight.router, prefix="/observer", tags=["Insight"])
app.include_router(history.router, prefix="/observer", tags=["History"])

@app.on_event("startup")
async def startup_event():
    """Initialize database connection pool"""
    from app.dependencies import init_db
    await init_db()

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connections"""
    from app.dependencies import close_db
    await close_db()
```

### 2. ObserverService (Core Logic)

```python
from uuid import UUID
from datetime import datetime
from app.models.user_trajectory import UserTrajectory
from app.services.emotion_mapper import EmotionMapper
from app.services.quaternion_builder import QuaternionBuilder
from app.services.metrics_calculator import MetricsCalculator
from app.services.embedding_service import EmbeddingService
from app.services.event_publisher import EventPublisher

class ObserverService:
    """
    Core business logic for state processing.
    This is the "Subject" in the Observer pattern.
    """
    
    def __init__(
        self,
        session: AsyncSession,
        emotion_mapper: EmotionMapper,
        quaternion_builder: QuaternionBuilder,
        metrics_calculator: MetricsCalculator,
        embedding_service: EmbeddingService,
        event_publisher: EventPublisher
    ):
        self.session = session
        self.emotion_mapper = emotion_mapper
        self.quaternion_builder = quaternion_builder
        self.metrics_calculator = metrics_calculator
        self.embedding_service = embedding_service
        self.event_publisher = event_publisher
    
    async def process_state(
        self,
        user_id: UUID,
        session_id: UUID,
        input_text: str,
        vac_scalars: VACVector,
        timestamp: datetime
    ) -> ProcessedState:
        """
        Main processing pipeline:
        1. Generate semantic embedding
        2. Find nearest emotion
        3. Build quaternion
        4. Calculate metrics
        5. Persist to DB
        6. Publish event
        """
        
        # 1. Generate embedding (1536-dim vector)
        embedding = await self.embedding_service.generate_embedding(input_text)
        
        # 2. Find nearest emotion from Atlas
        dominant_emotion = await self.emotion_mapper.find_nearest(
            vac_scalars=vac_scalars,
            text_embedding=embedding,
            word_count=len(input_text.split())
        )
        
        # 3. Convert VAC to quaternion
        quaternion = self.quaternion_builder.from_vac(vac_scalars)
        
        # 4. Fetch previous state for metrics
        previous_state = await self._get_latest_state(user_id)
        
        # 5. Calculate elasticity
        elasticity = 0.0
        if previous_state:
            elasticity = self.metrics_calculator.calculate_elasticity(
                current_quat=quaternion,
                previous_quat=previous_state.quaternion_state,
                delta_time=(timestamp - previous_state.timestamp).total_seconds()
            )
        
        # 6. Calculate rigidity (rolling window)
        rigidity = await self.metrics_calculator.calculate_rigidity(
            user_id=user_id,
            window_size=10
        )
        
        # 7. Persist new state
        new_state = UserTrajectory(
            user_id=user_id,
            session_id=session_id,
            timestamp=timestamp,
            input_transcription=input_text,
            input_embedding=embedding,
            vac_values=vac_scalars,
            quaternion_state=quaternion,
            dominant_emotion_id=dominant_emotion.id,
            elasticity_metric=elasticity,
            rigidity_score=rigidity
        )
        
        self.session.add(new_state)
        await self.session.commit()
        await self.session.refresh(new_state)
        
        # 8. Publish event to Versor/Experience
        await self.event_publisher.publish_state_change(
            user_id=user_id,
            current_quaternion=quaternion,
            previous_quaternion=previous_state.quaternion_state if previous_state else None,
            elasticity=elasticity
        )
        
        return ProcessedState(
            state_id=new_state.id,
            quaternion=quaternion,
            dominant_emotion=dominant_emotion.emotion_name,
            elasticity=elasticity,
            previous_quaternion=previous_state.quaternion_state if previous_state else None
        )
```

### 3. EmotionMapper (Weighted Fusion)

```python
class EmotionMapper:
    """Finds the nearest emotion using weighted distance fusion"""
    
    async def find_nearest(
        self,
        vac_scalars: VACVector,
        text_embedding: List[float],
        word_count: int
    ) -> AtlasDefinition:
        """
        Weighted fusion of VAC distance and semantic distance.
        Short text (< 10 words): Trust VAC more (80/20).
        Long text (> 10 words): Trust semantic more (40/60).
        """
        
        # Calculate VAC distance to all Atlas emotions
        vac_distances = await self._calculate_vac_distances(vac_scalars)
        
        # Calculate semantic distance to all Atlas emotions
        semantic_distances = await self._calculate_semantic_distances(text_embedding)
        
        # Weighted fusion
        if word_count < 10:
            vac_weight = 0.8
            semantic_weight = 0.2
        else:
            vac_weight = 0.4
            semantic_weight = 0.6
        
        # Combine distances
        combined_distances = {}
        for emotion_id in vac_distances:
            combined_distances[emotion_id] = (
                vac_weight * vac_distances[emotion_id] +
                semantic_weight * semantic_distances[emotion_id]
            )
        
        # Find minimum distance
        nearest_id = min(combined_distances, key=combined_distances.get)
        
        # Fetch the emotion definition
        result = await self.session.execute(
            select(AtlasDefinition).where(AtlasDefinition.id == nearest_id)
        )
        
        return result.scalar_one()
```

### 4. Event Publisher (Decoupling)

```python
class EventPublisher:
    """
    Publishes state change events to other modules.
    Implementation options:
    - gRPC streaming (low latency, complex)
    - Redis Pub/Sub (simple, requires Redis)
    - HTTP webhooks (simple, higher latency)
    """
    
    async def publish_state_change(
        self,
        user_id: UUID,
        current_quaternion: List[float],
        previous_quaternion: Optional[List[float]],
        elasticity: float
    ):
        event = {
            "event_type": "state_change",
            "user_id": str(user_id),
            "current_quaternion": current_quaternion,
            "previous_quaternion": previous_quaternion,
            "elasticity": elasticity,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Option 1: Direct HTTP to Versor
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.VERSOR_URL}/versor/compute",
                json=event
            )
        
        # Option 2: Publish to message queue (future)
        # await self.redis.publish("love.state_changes", json.dumps(event))
```

## Database Connection Management

### Connection Pooling

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,        # Max concurrent connections
    max_overflow=10,     # Extra connections if pool exhausted
    pool_pre_ping=True,  # Verify connection health before use
    pool_recycle=3600    # Recycle connections after 1 hour
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db() -> AsyncSession:
    """Dependency injection for FastAPI routes"""
    async with AsyncSessionLocal() as session:
        yield session
```

### Read Replica Support

For scaling read-heavy "Insight Generation" queries:

```python
# Master (writes)
write_engine = create_async_engine(settings.DATABASE_URL_MASTER)

# Replica (reads)
read_engine = create_async_engine(settings.DATABASE_URL_REPLICA)

async def get_write_db():
    async with sessionmaker(write_engine, class_=AsyncSession)() as session:
        yield session

async def get_read_db():
    async with sessionmaker(read_engine, class_=AsyncSession)() as session:
        yield session
```

## Configuration Management

### Environment Variables (.env)

```bash
# Database
POSTGRES_USER=love_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=love_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

# Vector Search
HNSW_EF_SEARCH=40  # Higher = better recall, slower

# Embedding Service
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small

# External Services
VERSOR_URL=http://localhost:8001
LISTENER_URL=http://localhost:8002

# Security
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=["http://localhost:19006"]  # Expo dev server

# Performance
DEBUG=false
LOG_LEVEL=INFO
```

### Config Class (config.py)

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Vector Search
    HNSW_EF_SEARCH: int = 40
    
    # Embedding
    OPENAI_API_KEY: str
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # External Services
    VERSOR_URL: str
    LISTENER_URL: str
    
    # Security
    SECRET_KEY: str
    ALLOWED_ORIGINS: List[str]
    
    # Performance
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## Error Handling Strategy

### Custom Exceptions

```python
class ObserverException(Exception):
    """Base exception for Observer module"""
    pass

class EmotionNotFoundError(ObserverException):
    """Raised when nearest neighbor search fails"""
    pass

class QuaternionInvalidError(ObserverException):
    """Raised when quaternion is not unit length"""
    pass

class DatabaseConnectionError(ObserverException):
    """Raised when DB connection fails"""
    pass
```

### Global Exception Handler

```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(ObserverException)
async def observer_exception_handler(request: Request, exc: ObserverException):
    return JSONResponse(
        status_code=500,
        content={"error": exc.__class__.__name__, "detail": str(exc)}
    )
```

## Logging Strategy

```python
import logging
from pythonjsonlogger import jsonlogger

# Structured JSON logging for production
handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    "%(asctime)s %(name)s %(levelname)s %(message)s"
)
handler.setFormatter(formatter)

logger = logging.getLogger("observer")
logger.addHandler(handler)
logger.setLevel(settings.LOG_LEVEL)

# Usage
logger.info("State processed", extra={
    "user_id": str(user_id),
    "emotion": emotion_name,
    "elasticity": elasticity
})
```

## Next Steps

Now that you understand the architecture:
- **02-database-schema.md** - Detailed PostgreSQL schema design
- **03-vac-model-and-emotions.md** - The 87 emotions and VAC coordinates
- **04-vector-search.md** - pgvector and HNSW implementation
