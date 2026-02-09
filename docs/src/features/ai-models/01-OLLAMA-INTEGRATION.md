# Ollama API Integration

## Technical Deep-Dive: Ollama Model Integration*

**Created**: December 7, 2025
**Purpose**: Document Ollama REST API integration for model management
**Scope**: Backend services (Listener + Observer)

---

## 🔌 Ollama REST API

Ollama provides a comprehensive REST API at `http://localhost:11434`

### Available Endpoints

#### 1. List Local Models

```http
GET /api/tags

Response:
{
  "models": [
    {
      "name": "llama3.1:8b-instruct-q4_0",
      "modified_at": "2024-12-01T10:00:00Z",
      "size": 4700000000,
      "digest": "sha256:...",
      "details": {
        "format": "gguf",
        "family": "llama",
        "families": ["llama"],
        "parameter_size": "8B",
        "quantization_level": "Q4_0"
      }
    }
  ]
}
```

#### 2. Pull Model (Download)

```http
POST /api/pull
Content-Type: application/json

{
  "name": "mixtral:8x7b-instruct-v0.1",
  "stream": true
}

Response (streaming):
{"status": "pulling manifest"}
{"status": "downloading digestname", "digest": "...", "total": 26000000, "completed": 1000000}
{"status": "downloading digestname", "digest": "...", "total": 26000000, "completed": 5000000}
...
{"status": "success"}
```

#### 3. Delete Model

```http
DELETE /api/delete
Content-Type: application/json

{
  "name": "llama3.1:70b"
}

Response:
{
  "status": "success"
}
```

#### 4. Model Info

```http
POST /api/show
Content-Type: application/json

{
  "name": "llama3.1:8b-instruct-q4_0"
}

Response:
{
  "modelfile": "...",
  "parameters": "...",
  "template": "...",
  "details": {
    "format": "gguf",
    "family": "llama",
    "parameter_size": "8B",
    "quantization_level": "Q4_0"
  }
}
```

#### 5. Generate (Already used)

```http
POST /api/generate
Content-Type: application/json

{
  "model": "llama3.1:8b-instruct-q4_0",
  "prompt": "Extract emotions from: I feel happy",
  "stream": false
}
```

---

## 🏗️ Backend Service Architecture

### New Service: OllamaManager

### File: listener/app/services/ollama_manager.py

```python
"""
Ollama Model Management Service

Handles:
- Discovering available models
- Pulling/downloading models
- Deleting models
- Getting model information
- Managing model assignments
"""

import httpx
import asyncio
from typing import List, Dict, AsyncIterator
from pydantic import BaseModel

class ModelInfo(BaseModel):
    name: str
    size: int  # bytes
    modified_at: str
    digest: str
    parameter_size: str  # e.g., "8B"
    quantization: str  # e.g., "Q4_0"
    family: str  # e.g., "llama"

class ModelDetails(BaseModel):
    name: str
    size: int
    parameters: str
    template: str
    format: str
    family: str
    parameter_size: str
    quantization_level: str

    # Derived/estimated
    estimated_ram_gb: float
    estimated_speed_tokens_per_sec: float
    recommended_for: List[str]  # Functions this model is good for

class PullProgress(BaseModel):
    status: str  # "pulling manifest", "downloading", "success", "error"
    digest: str | None = None
    total: int | None = None
    completed: int | None = None
    percent: float | None = None

class OllamaManager:
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(base_url=base_url, timeout=300.0)

    async def list_local_models(self) -> List[ModelInfo]:
        """Get all models currently installed locally"""
        response = await self.client.get("/api/tags")
        data = response.json()

        models = []
        for model in data.get("models", []):
            models.append(ModelInfo(
                name=model["name"],
                size=model["size"],
                modified_at=model["modified_at"],
                digest=model["digest"],
                parameter_size=model["details"]["parameter_size"],
                quantization=model["details"]["quantization_level"],
                family=model["details"]["family"]
            ))

        return models

    async def pull_model(self, model_name: str) -> AsyncIterator[PullProgress]:
        """
        Pull (download) a model from Ollama registry
        Yields progress updates
        """
        async with self.client.stream(
            "POST",
            "/api/pull",
            json={"name": model_name, "stream": True}
        ) as response:
            async for line in response.aiter_lines():
                if line:
                    data = json.loads(line)

                    # Calculate percentage if available
                    percent = None
                    if data.get("total") and data.get("completed"):
                        percent = (data["completed"] / data["total"]) * 100

                    yield PullProgress(
                        status=data["status"],
                        digest=data.get("digest"),
                        total=data.get("total"),
                        completed=data.get("completed"),
                        percent=percent
                    )

    async def delete_model(self, model_name: str):
        """Delete a model from local storage"""
        response = await self.client.request(
            "DELETE",
            "/api/delete",
            json={"name": model_name}
        )
        return response.json()

    async def get_model_details(self, model_name: str) -> ModelDetails:
        """Get detailed information about a model"""
        response = await self.client.post(
            "/api/show",
            json={"name": model_name}
        )
        data = response.json()

        # Estimate RAM requirements based on parameter size
        param_size = data["details"]["parameter_size"]
        estimated_ram = estimate_ram_requirement(param_size)

        # Estimate speed based on size and quantization
        estimated_speed = estimate_speed(param_size, data["details"]["quantization_level"])

        # Recommend for functions
        recommendations = recommend_for_functions(param_size, data["details"]["family"])

        return ModelDetails(
            name=model_name,
            size=data["details"].get("size", 0),
            parameters=data["parameters"],
            template=data["template"],
            format=data["details"]["format"],
            family=data["details"]["family"],
            parameter_size=param_size,
            quantization_level=data["details"]["quantization_level"],
            estimated_ram_gb=estimated_ram,
            estimated_speed_tokens_per_sec=estimated_speed,
            recommended_for=recommendations
        )

    async def health_check(self) -> bool:
        """Check if Ollama is running"""
        try:
            response = await self.client.get("/")
            return response.status_code == 200
        except:
            return False

# Helper functions
def estimate_ram_requirement(parameter_size: str) -> float:
    """Estimate RAM needed based on parameter count"""
    size_map = {
        "3B": 6.0,
        "7B": 8.0,
        "8B": 10.0,
        "13B": 16.0,
        "47B": 32.0,  # Mixtral 8x7B
        "70B": 48.0
    }
    return size_map.get(parameter_size, 8.0)

def estimate_speed(parameter_size: str, quantization: str) -> float:
    """Estimate tokens per second"""
    # Rough estimates based on M1 Mac
    base_speeds = {
        "3B": 50.0,
        "7B": 25.0,
        "8B": 20.0,
        "13B": 12.0,
        "47B": 5.0,
        "70B": 3.0
    }

    # Quantization affects speed slightly
    quant_mult = {
        "Q4_0": 1.0,
        "Q5_0": 0.9,
        "Q8_0": 0.8,
        "F16": 0.7
    }

    base = base_speeds.get(parameter_size, 20.0)
    mult = quant_mult.get(quantization, 1.0)
    return base * mult

def recommend_for_functions(parameter_size: str, family: str) -> List[str]:
    """Recommend which functions this model is good for"""
    recommendations = []

    # Fast models good for real-time
    if parameter_size in ["3B", "7B", "8B"]:
        recommendations.append("semantic_vac")
        recommendations.append("atlas_mapping")

    # Medium models good for everything
    if parameter_size in ["8B", "13B"]:
        recommendations.append("multi_emotion")
        recommendations.append("insight_generation")

    # Large models best for complex tasks
    if parameter_size in ["47B", "70B"]:
        recommendations.append("insight_generation")
        recommendations.append("multi_emotion")

    # Mixtral good for nuance
    if family == "mixtral":
        recommendations.append("multi_emotion")

    return recommendations
```

---

## 🔄 Model Assignment Management

### New Observer Service

### File: observer/app/services/ai_model_service.py

```python
"""
AI Model Assignment Service

Stores which model is used for which function.
Provides configuration to Listener/Observer services.
"""

from sqlalchemy.orm import Session
from typing import Dict

class AIModelService:

    FUNCTIONS = [
        "semantic_vac",
        "multi_emotion",
        "insight_generation",
        "atlas_mapping"
    ]

    def __init__(self, db: Session):
        self.db = db

    async def get_model_assignments(self) -> Dict[str, str]:
        """Get current model assigned to each function"""
        # Query from database or return defaults
        assignments = await self.db.query(ModelAssignment).all()

        return {
            assignment.function: assignment.model_name
            for assignment in assignments
        }

    async def assign_model(self, function: str, model_name: str):
        """Assign a model to a function"""
        if function not in self.FUNCTIONS:
            raise ValueError(f"Unknown function: {function}")

        # Validate model exists in Ollama
        ollama = OllamaManager()
        local_models = await ollama.list_local_models()
        if model_name not in [m.name for m in local_models]:
            raise ValueError(f"Model {model_name} not found locally. Pull it first.")

        # Update database
        assignment = await self.db.query(ModelAssignment).filter_by(function=function).first()
        if assignment:
            assignment.model_name = model_name
        else:
            assignment = ModelAssignment(function=function, model_name=model_name)
            self.db.add(assignment)

        await self.db.commit()

        return {"function": function, "model": model_name, "status": "assigned"}

    async def get_assignment_for_function(self, function: str) -> str:
        """Get model name for a specific function"""
        assignment = await self.db.query(ModelAssignment).filter_by(function=function).first()
        if assignment:
            return assignment.model_name

        # Default fallback
        return "llama3.1:8b-instruct-q4_0"
```

### Database Model

### File: observer/app/models/model_assignment.py

```python
from sqlalchemy import Column, String, DateTime, Enum
from datetime import datetime
from app.database import Base

class ModelAssignment(Base):
    __tablename__ = "model_assignments"

    function = Column(String, primary_key=True)  # semantic_vac, multi_emotion, etc.
    model_name = Column(String, nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    assigned_by = Column(String, nullable=True)  # Future: user ID

    # Performance tracking
    avg_latency_ms = Column(Float, nullable=True)
    total_invocations = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
```

---

## 🌐 API Endpoints

### Listener Endpoints (Model Management)

#### GET /listener/ai/models/local

```python
@router.get("/ai/models/local")
async def list_local_models():
    """List all locally installed Ollama models"""
    ollama = OllamaManager()
    models = await ollama.list_local_models()
    return {"models": models}
```

#### POST /listener/ai/models/pull

```python
@router.post("/ai/models/pull")
async def pull_model(model_name: str):
    """
    Pull (download) a model from Ollama registry
    Returns WebSocket URL for progress updates
    """
    # Start pull in background task
    task_id = start_pull_task(model_name)

    return {
        "task_id": task_id,
        "websocket_url": f"ws://localhost:8002/listener/ai/models/pull/{task_id}"
    }

@router.websocket("/ai/models/pull/{task_id}")
async def pull_model_progress(websocket: WebSocket, task_id: str):
    """Stream pull progress updates"""
    await websocket.accept()

    ollama = OllamaManager()
    async for progress in ollama.pull_model(model_name):
        await websocket.send_json({
            "task_id": task_id,
            "progress": progress.dict()
        })

    await websocket.close()
```

#### DELETE /listener/ai/models/{model_name}

```python
@router.delete("/ai/models/{model_name}")
async def delete_model(model_name: str):
    """Delete a model from local storage"""
    ollama = OllamaManager()
    result = await ollama.delete_model(model_name)
    return result
```

#### GET /listener/ai/models/{model_name}/details

```python
@router.get("/ai/models/{model_name}/details")
async def get_model_details(model_name: str):
    """Get detailed information about a model"""
    ollama = OllamaManager()
    details = await ollama.get_model_details(model_name)
    return details
```

### Observer Endpoints (Model Assignment)

#### GET /observer/ai/assignments

```python
@router.get("/ai/assignments")
async def get_model_assignments(db: Session = Depends(get_db)):
    """Get current model assigned to each AI function"""
    service = AIModelService(db)
    assignments = await service.get_model_assignments()
    return {"assignments": assignments}
```

#### POST /observer/ai/assignments

```python
@router.post("/ai/assignments")
async def assign_model(
    function: str,
    model_name: str,
    db: Session = Depends(get_db)
):
    """Assign a model to a specific function"""
    service = AIModelService(db)
    result = await service.assign_model(function, model_name)
    return result
```

#### GET /observer/ai/recommendations

```python
@router.get("/ai/recommendations")
async def get_model_recommendations():
    """
    Get recommended models for each function
    Based on performance benchmarks and use case analysis
    """
    return {
        "semantic_vac": {
            "recommended": ["llama3.1:8b", "phi-3:mini"],
            "not_recommended": ["llama3.1:70b"],
            "reasoning": "Real-time analysis needs speed < 3s"
        },
        "multi_emotion": {
            "recommended": ["llama3.1:8b", "mixtral:8x7b", "llama3.1:70b"],
            "not_recommended": ["phi-3:mini"],
            "reasoning": "Complex task benefits from larger models"
        },
        # ... etc
    }
```

---

## 🔧 Integration with Existing Services

### Listener: Semantic Analyzer

**Current**:

```python
# Hard-coded model
model = "llama3.1:8b-instruct-q4_0"
```

**Updated**:

```python
# Get model from Observer
model_service = AIModelService()
model = await model_service.get_assignment_for_function("semantic_vac")

# Use assigned model
response = await ollama.generate(model=model, prompt=prompt)
```

### Listener: Multi-Emotion Analyzer

**Updated**:

```python
model = await model_service.get_assignment_for_function("multi_emotion")
```

### Observer: Insight Generator

**Updated**:

```python
model = await model_service.get_assignment_for_function("insight_generation")
```

---

## 📊 Model Registry (Curated List)

### Curated List of Recommended Models

```python
# listener/app/data/recommended_models.json
{
  "models": [
    {
      "name": "llama3.1:8b-instruct-q4_0",
      "display_name": "Llama 3.1 8B (Q4)",
      "family": "llama",
      "parameter_size": "8B",
      "quantization": "Q4_0",
      "size_gb": 4.7,
      "ram_gb": 8,
      "speed_rating": 4,
      "quality_rating": 4,
      "description": "Balanced performance and quality. Good all-around choice.",
      "recommended_for": ["semantic_vac", "multi_emotion", "insight_generation", "atlas_mapping"],
      "tags": ["default", "balanced", "recommended"]
    },
    {
      "name": "llama3.1:70b-instruct-q4_0",
      "display_name": "Llama 3.1 70B (Q4)",
      "family": "llama",
      "parameter_size": "70B",
      "quantization": "Q4_0",
      "size_gb": 40,
      "ram_gb": 48,
      "speed_rating": 2,
      "quality_rating": 5,
      "description": "Highest quality insights and analysis. Requires powerful hardware.",
      "recommended_for": ["insight_generation", "multi_emotion"],
      "tags": ["premium", "slow", "best-quality"]
    },
    {
      "name": "phi-3:mini",
      "display_name": "Phi-3 Mini",
      "family": "phi",
      "parameter_size": "3.8B",
      "quantization": "Q4_0",
      "size_gb": 2.3,
      "ram_gb": 4,
      "speed_rating": 5,
      "quality_rating": 3,
      "description": "Fast and efficient. Best for classification tasks.",
      "recommended_for": ["atlas_mapping", "semantic_vac"],
      "tags": ["fast", "lightweight", "classification"]
    },
    {
      "name": "mixtral:8x7b-instruct-v0.1",
      "display_name": "Mixtral 8x7B",
      "family": "mixtral",
      "parameter_size": "47B",
      "quantization": "Q4_0",
      "size_gb": 26,
      "ram_gb": 32,
      "speed_rating": 3,
      "quality_rating": 5,
      "description": "Excellent at nuanced, complex emotional analysis.",
      "recommended_for": ["multi_emotion", "insight_generation"],
      "tags": ["nuanced", "complex", "moe"]
    }
  ]
}
```

---

## 🎯 Performance Tracking

### Track Model Performance

```python
# After each AI invocation, track:
- Latency (ms)
- Success/failure
- Model used
- Function

# Store in database:
class ModelPerformanceMetric(Base):
    __tablename__ = "model_performance_metrics"

    id = Column(Integer, primary_key=True)
    function = Column(String)
    model_name = Column(String)
    latency_ms = Column(Float)
    success = Column(Boolean)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Optional: track quality
    user_rating = Column(Integer, nullable=True)  # 1-5 stars
```

**Benefits**:

- Show real-world performance per model
- Help users choose optimal models
- Identify performance regressions
- Research: which models work best for emotions

---

## 🚀 Advanced Features

### 1. Automatic Model Selection

```python
async def auto_select_model(function: str, hardware_profile: HardwareProfile) -> str:
    """
    Automatically select best model for function based on:
    - Available hardware (RAM, CPU)
    - User's speed/quality preference
    - Historical performance data
    """

    if hardware_profile.ram_gb < 8:
        # Low RAM: use smallest model
        return "phi-3:mini"
    elif hardware_profile.ram_gb < 16:
        # Medium RAM: use 8B models
        return "llama3.1:8b-instruct-q4_0"
    else:
        # High RAM: can use large models for quality
        if function == "insight_generation":
            return "llama3.1:70b-instruct-q4_0"  # Best quality for insights
        else:
            return "llama3.1:8b-instruct-q4_0"  # Fast enough for others
```

### 2. Model Preloading

```python
# Preload frequently-used models on startup
async def preload_models():
    """Load models into RAM on Listener startup"""
    assignments = await get_model_assignments()
    unique_models = set(assignments.values())

    for model in unique_models:
        # Ollama loads model on first use
        # We can "warm up" by sending a dummy request
        await ollama.generate(model=model, prompt="warm up", max_tokens=1)
```

### 3. Fallback Strategy

```python
async def generate_with_fallback(function: str, prompt: str):
    """
    Try assigned model, fall back to default if it fails
    """
    assigned_model = await get_assignment_for_function(function)

    try:
        return await ollama.generate(model=assigned_model, prompt=prompt)
    except Exception as e:
        logger.warning(f"Model {assigned_model} failed, falling back to default")
        return await ollama.generate(model="llama3.1:8b-instruct-q4_0", prompt=prompt)
```

---

## 📋 Migration Database

**File**: `observer/migrations/versions/add_model_management.sql`

```sql
-- Model Assignments table
CREATE TABLE model_assignments (
    function VARCHAR(50) PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(100),
    avg_latency_ms FLOAT,
    total_invocations INTEGER DEFAULT 0,
    last_used_at TIMESTAMP
);

-- Seed default assignments
INSERT INTO model_assignments (function, model_name) VALUES
    ('semantic_vac', 'llama3.1:8b-instruct-q4_0'),
    ('multi_emotion', 'llama3.1:8b-instruct-q4_0'),
    ('insight_generation', 'llama3.1:8b-instruct-q4_0'),
    ('atlas_mapping', 'llama3.1:8b-instruct-q4_0');

-- Model Performance Metrics table
CREATE TABLE model_performance_metrics (
    id SERIAL PRIMARY KEY,
    function VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    latency_ms FLOAT NOT NULL,
    success BOOLEAN NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    error_message TEXT,

    INDEX idx_function_model (function, model_name),
    INDEX idx_timestamp (timestamp)
);
```

---

## 🎯 Success Criteria

**Ollama integration succeeds when:**

1. ✅ Can list local models programmatically
2. ✅ Can pull new models with progress
3. ✅ Can delete models
4. ✅ Can assign models to functions
5. ✅ Assignments persist in database
6. ✅ Services use assigned models
7. ✅ Fallback works if model fails
8. ✅ Performance is tracked

---

**Next**: See `02-SETTINGS-UI.md` for frontend design
