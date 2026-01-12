# Extending Observer

**Reading Time:** ~35 minutes  
**Audience:** Senior developers  
**Prerequisites:** All previous senior developer guides  
**Goal:** Learn how to extend Observer with new features and capabilities

---

## Overview

Observer is designed to be extensible. Common extension points:

1. Adding new emotions to the atlas
2. Creating custom therapeutic strategies
3. Implementing new API endpoints
4. Adding custom vector operations
5. Creating new insight generators
6. Extending the WebSocket protocol

---

## 1. Adding New Emotions

### Process

#### Step 1: Research the Emotion

Ensure it's:

- **Distinct** from existing 87 emotions
- **Evidence-based** (citations available)
- **Therapeutically useful**
- **Has clear VAC coordinates**

#### Step 2: Define VAC Coordinates

```python
# Example: Adding "Anticipation"
ANTICIPATION = {
    "name": "Anticipation",
    "category": "When It's Beyond Us",
    "vac": [0.5, 0.6, 0.3],  # Positive, activated, slightly connected
    "description": "Looking forward to a future event with excitement and readiness",
    "keywords": ["expectation", "looking forward", "excitement", "future"],
    "citations": [
        {
            "author": "Panksepp, J.",
            "year": 1998,
            "title": "Affective Neuroscience",
            "source": "Oxford University Press"
        }
    ]
}
```

#### Step 3: Add to Seed Data

```python
# scripts/seed_atlas.py
async def seed_new_emotion():
    # Generate embedding
    embedding = await embedding_service.generate_embedding(
        f"{ANTICIPATION['name']}. {ANTICIPATION['description']}"
    )
    
    # Convert VAC to quaternion
    quaternion = await quaternion_builder.from_vac(ANTICIPATION['vac'])
    
    # Create atlas entry
    emotion = AtlasDefinition(
        name=ANTICIPATION['name'],
        category=ANTICIPATION['category'],
        vac=ANTICIPATION['vac'],
        quaternion=quaternion,
        embedding=embedding,
        description=ANTICIPATION['description'],
        keywords=ANTICIPATION['keywords'],
        citations=ANTICIPATION['citations']
    )
    
    db.add(emotion)
    await db.commit()
```

#### Step 4: Update Category Graph

If adding to a new category or affecting transitions:

```json
// data/category_rankings.json
{
  "When It's Beyond Us": {
    "allowed_transitions": [
      "When Life Is Good",
      "When Things Are Uncertain or Too Much"
    ],
    "emotions": [
      "Awe",
      "Wonder",
      "Curiosity",
      "Anticipation"  // Add here
    ]
  }
}
```

#### Step 5: Test

```python
@pytest.mark.asyncio
async def test_anticipation_in_atlas():
    """Verify Anticipation was added correctly"""
    result = await db.execute(
        select(AtlasDefinition).where(AtlasDefinition.name == "Anticipation")
    )
    emotion = result.scalar_one()
    
    assert emotion.name == "Anticipation"
    assert emotion.category == "When It's Beyond Us"
    assert emotion.vac[0] == 0.5  # Valence
    assert emotion.vac[1] == 0.6  # Arousal
    assert emotion.vac[2] == 0.3  # Connection
```

---

## 2. Creating Custom Therapeutic Strategies

### Adding a New Strategy

```python
# data/strategies/custom.json
{
  "strategies": [
    {
      "name": "Walking in Nature",
      "category": "Somatic",
      "description": "Use natural environment to regulate emotions",
      "technique": "Take a 20-minute walk in a natural setting. Notice trees, sky, sounds. Allow nature to regulate your nervous system.",
      "evidence_base": "Bratman et al. (2015). Nature experience reduces rumination. PNAS.",
      "when_to_use": ["anxiety", "rumination", "stress", "overwhelm"],
      "contraindications": ["severe weather", "physical injury"],
      "effectiveness": 0.72,
      "duration_minutes": 20,
      "materials_needed": ["comfortable shoes", "outdoor space"],
      "adaptations": [
        "Indoor plants if outdoor not available",
        "Virtual nature videos as last resort"
      ]
    }
  ]
}
```

### Loading Custom Strategies

```python
# scripts/seed_custom_strategies.py
async def seed_custom_strategies():
    with open("data/strategies/custom.json") as f:
        data = json.load(f)
    
    for strategy_data in data["strategies"]:
        # Generate embedding
        embedding = await embedding_service.generate_embedding(
            f"{strategy_data['name']}. {strategy_data['description']}"
        )
        
        strategy = TransitionStrategy(
            name=strategy_data['name'],
            category=strategy_data['category'],
            description=strategy_data['description'],
            technique=strategy_data['technique'],
            evidence_base=strategy_data.get('evidence_base'),
            when_to_use=strategy_data.get('when_to_use', []),
            contraindications=strategy_data.get('contraindications', []),
            effectiveness=strategy_data.get('effectiveness'),
            embedding=embedding
        )
        
        db.add(strategy)
    
    await db.commit()
```

---

## 3. Implementing New API Endpoints

### Example: User Statistics Endpoint

```python
# app/api/routes/statistics.py
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from app.database import get_db

router = APIRouter()

@router.get("/users/{user_id}/statistics")
async def get_user_statistics(
    user_id: str,
    days: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """
    Get statistical summary of user's emotional journey.
    
    Args:
        user_id: User identifier
        days: Number of days to analyze
        
    Returns:
        Statistical summary including:
        - Total trajectory points
        - Average VAC coordinates
        - Most common emotions
        - Elasticity/rigidity trends
        - Time spent in each category
    """
    # Time range
    since = datetime.utcnow() - timedelta(days=days)
    
    # Total points
    count_query = select(func.count(UserTrajectory.id)).where(
        UserTrajectory.user_id == user_id,
        UserTrajectory.timestamp >= since
    )
    total_points = await db.scalar(count_query)
    
    # Average VAC
    avg_query = select(
        func.avg(UserTrajectory.vac[0]).label('avg_valence'),
        func.avg(UserTrajectory.vac[1]).label('avg_arousal'),
        func.avg(UserTrajectory.vac[2]).label('avg_connection')
    ).where(
        UserTrajectory.user_id == user_id,
        UserTrajectory.timestamp >= since
    )
    avg_result = await db.execute(avg_query)
    avg_vac = avg_result.one()
    
    # Most common emotions
    emotion_query = select(
        AtlasDefinition.name,
        func.count(UserTrajectory.id).label('count')
    ).join(
        UserTrajectory, AtlasDefinition.id == UserTrajectory.emotion_id
    ).where(
        UserTrajectory.user_id == user_id,
        UserTrajectory.timestamp >= since
    ).group_by(
        AtlasDefinition.name
    ).order_by(
        func.count(UserTrajectory.id).desc()
    ).limit(5)
    
    emotion_result = await db.execute(emotion_query)
    top_emotions = [
        {"emotion": row.name, "count": row.count}
        for row in emotion_result
    ]
    
    return {
        "user_id": user_id,
        "period_days": days,
        "total_points": total_points,
        "average_vac": {
            "valence": float(avg_vac.avg_valence),
            "arousal": float(avg_vac.avg_arousal),
            "connection": float(avg_vac.avg_connection)
        },
        "top_emotions": top_emotions
    }
```

### Register the Route

```python
# app/main.py
from app.api.routes import statistics

app.include_router(
    statistics.router,
    prefix="/statistics",
    tags=["Statistics"]
)
```

---

## 4. Custom Vector Operations

### Example: Emotional Drift Detection

**Detect when user is gradually moving away from baseline:**

```python
class DriftDetector:
    """Detect emotional drift over time"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def detect_drift(
        self,
        user_id: str,
        baseline_days: int = 30,
        recent_days: int = 7
    ) -> Dict:
        """
        Compare recent emotional state to baseline.
        
        Returns drift metrics:
        - VAC drift vector
        - Category distribution changes
        - Trend direction
        """
        # Get baseline period
        baseline_start = datetime.utcnow() - timedelta(days=baseline_days)
        baseline_end = baseline_start + timedelta(days=baseline_days - recent_days)
        
        baseline_avg = await self._get_average_vac(
            user_id, baseline_start, baseline_end
        )
        
        # Get recent period
        recent_start = datetime.utcnow() - timedelta(days=recent_days)
        recent_avg = await self._get_average_vac(
            user_id, recent_start, datetime.utcnow()
        )
        
        # Calculate drift
        drift_vector = [
            recent_avg[i] - baseline_avg[i]
            for i in range(3)
        ]
        
        # Magnitude of drift
        drift_magnitude = np.linalg.norm(drift_vector)
        
        # Classify
        if drift_magnitude < 0.2:
            status = "stable"
        elif drift_magnitude < 0.5:
            status = "minor_drift"
        else:
            status = "significant_drift"
        
        return {
            "baseline_vac": baseline_avg,
            "recent_vac": recent_avg,
            "drift_vector": drift_vector,
            "drift_magnitude": float(drift_magnitude),
            "status": status,
            "interpretation": self._interpret_drift(drift_vector)
        }
    
    def _interpret_drift(self, drift: List[float]) -> str:
        """Generate human-readable interpretation"""
        interpretations = []
        
        if drift[0] > 0.3:
            interpretations.append("Moving toward more positive emotions")
        elif drift[0] < -0.3:
            interpretations.append("Moving toward more negative emotions")
        
        if drift[1] > 0.3:
            interpretations.append("Energy levels increasing")
        elif drift[1] < -0.3:
            interpretations.append("Energy levels decreasing")
        
        if drift[2] > 0.3:
            interpretations.append("Feeling more connected")
        elif drift[2] < -0.3:
            interpretations.append("Feeling more isolated")
        
        return ". ".join(interpretations) if interpretations else "Stable emotional state"
```

---

## 5. Custom Insight Generators

### Example: Pattern Recognition Insights

```python
class PatternInsightGenerator:
    """Generate insights from trajectory patterns"""
    
    async def detect_cycles(
        self,
        user_id: str,
        lookback_days: int = 90
    ) -> Dict:
        """
        Detect cyclical emotional patterns.
        
        Example: Weekly anxiety spikes, monthly mood cycles
        """
        # Get trajectory
        since = datetime.utcnow() - timedelta(days=lookback_days)
        result = await self.db.execute(
            select(UserTrajectory)
            .where(
                UserTrajectory.user_id == user_id,
                UserTrajectory.timestamp >= since
            )
            .order_by(UserTrajectory.timestamp)
        )
        trajectory = result.scalars().all()
        
        # Extract valence time series
        timestamps = [t.timestamp for t in trajectory]
        valence_series = [t.vac[0] for t in trajectory]
        
        # Detect cycles using FFT
        from scipy import signal
        
        # Detrend
        detrended = signal.detrend(valence_series)
        
        # Find periodicities
        frequencies, power = signal.periodogram(detrended)
        
        # Identify peaks
        peaks, _ = signal.find_peaks(power, height=np.mean(power) * 2)
        
        if len(peaks) > 0:
            # Convert frequency to period (days)
            dominant_freq = frequencies[peaks[0]]
            period_days = 1 / (dominant_freq * len(trajectory) / lookback_days)
            
            return {
                "cycle_detected": True,
                "period_days": float(period_days),
                "interpretation": self._interpret_cycle(period_days)
            }
        
        return {
            "cycle_detected": False,
            "interpretation": "No clear cyclical patterns detected"
        }
    
    def _interpret_cycle(self, period_days: float) -> str:
        """Interpret cycle period"""
        if 6 <= period_days <= 8:
            return "Weekly pattern detected (possibly work-related stress)"
        elif 28 <= period_days <= 32:
            return "Monthly pattern detected (possibly hormonal cycles)"
        elif 13 <= period_days <= 15:
            return "Bi-weekly pattern detected"
        else:
            return f"Pattern with {period_days:.1f}-day cycle detected"
```

---

## 6. Extending WebSocket Protocol

### Adding New Message Types

```python
# app/websocket/message_handlers.py

@message_handler("request_historical_insight")
async def handle_historical_insight(
    session_id: str,
    data: dict,
    chat_service: ChatService
):
    """
    New message type: Find similar past moments.
    
    Client sends:
    {
        "type": "request_historical_insight",
        "current_emotion": "Anxiety",
        "limit": 5
    }
    """
    # Get current emotion's embedding
    emotion = await chat_service.get_emotion(data["current_emotion"])
    
    # Find similar past moments
    similar_moments = await chat_service.find_similar_trajectory_moments(
        session_id=session_id,
        query_embedding=emotion.embedding,
        limit=data.get("limit", 5)
    )
    
    # Send response
    await manager.broadcast_to_session(
        session_id,
        {
            "type": "historical_insight",
            "similar_moments": [
                {
                    "transcription": m.transcription,
                    "emotion": m.emotion.name,
                    "timestamp": m.timestamp.isoformat(),
                    "similarity": m.similarity_score
                }
                for m in similar_moments
            ]
        }
    )


# Register handler
MESSAGE_HANDLERS = {
    "user_message": handle_user_message,
    "request_insight": handle_insight_request,
    "toggle_deep_feeling": handle_toggle_deep_feeling,
    "request_historical_insight": handle_historical_insight,  # New!
}

# In websocket endpoint
@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    
    try:
        async for message in websocket.iter_json():
            handler = MESSAGE_HANDLERS.get(message["type"])
            if handler:
                await handler(session_id, message, chat_service)
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {message['type']}"
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
```

---

## 7. Custom Repositories

### Example: Specialized Query Repository

```python
# app/repositories/trajectory_repository.py
class TrajectoryRepository:
    """Specialized queries for user trajectories"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_emotional_velocity(
        self,
        user_id: str,
        window_hours: int = 24
    ) -> List[Dict]:
        """
        Calculate emotional velocity over sliding windows.
        
        Velocity = distance traveled / time
        """
        since = datetime.utcnow() - timedelta(hours=window_hours)
        
        # Get trajectory points
        result = await self.db.execute(
            select(UserTrajectory)
            .where(
                UserTrajectory.user_id == user_id,
                UserTrajectory.timestamp >= since
            )
            .order_by(UserTrajectory.timestamp)
        )
        points = result.scalars().all()
        
        # Calculate velocities
        velocities = []
        for i in range(len(points) - 1):
            p1 = points[i]
            p2 = points[i + 1]
            
            # Angular distance (quaternion)
            theta = self._angular_distance(p1.quaternion, p2.quaternion)
            
            # Time delta (seconds)
            dt = (p2.timestamp - p1.timestamp).total_seconds()
            
            # Velocity (radians/second)
            velocity = theta / dt if dt > 0 else 0
            
            velocities.append({
                "timestamp": p2.timestamp,
                "velocity": velocity,
                "from_emotion": p1.emotion.name,
                "to_emotion": p2.emotion.name
            })
        
        return velocities
    
    async def get_category_distribution(
        self,
        user_id: str,
        days: int = 30
    ) -> Dict[str, float]:
        """Get percentage of time in each category"""
        since = datetime.utcnow() - timedelta(days=days)
        
        query = select(
            AtlasDefinition.category,
            func.count(UserTrajectory.id).label('count')
        ).join(
            UserTrajectory, AtlasDefinition.id == UserTrajectory.emotion_id
        ).where(
            UserTrajectory.user_id == user_id,
            UserTrajectory.timestamp >= since
        ).group_by(
            AtlasDefinition.category
        )
        
        result = await self.db.execute(query)
        rows = result.all()
        
        total = sum(row.count for row in rows)
        
        return {
            row.category: (row.count / total) * 100
            for row in rows
        }
```

---

## 8. Adding Custom Metrics

### Example: Emotional Coherence

**Measure alignment between VAC dimensions:**

```python
class CoherenceCalculator:
    """Calculate emotional coherence metrics"""
    
    async def calculate_coherence(
        self,
        user_id: str,
        window_days: int = 7
    ) -> float:
        """
        Coherence: How aligned are emotional dimensions?
        
        High coherence: All dimensions moving together
        Low coherence: Dimensions moving independently
        
        Formula: Correlation between VAC dimension changes
        """
        # Get recent trajectory
        since = datetime.utcnow() - timedelta(days=window_days)
        result = await self.db.execute(
            select(UserTrajectory)
            .where(
                UserTrajectory.user_id == user_id,
                UserTrajectory.timestamp >= since
            )
            .order_by(UserTrajectory.timestamp)
        )
        points = result.scalars().all()
        
        if len(points) < 10:
            return None  # Insufficient data
        
        # Extract time series
        valence_series = [p.vac[0] for p in points]
        arousal_series = [p.vac[1] for p in points]
        connection_series = [p.vac[2] for p in points]
        
        # Calculate correlations
        import numpy as np
        
        corr_va = np.corrcoef(valence_series, arousal_series)[0, 1]
        corr_vc = np.corrcoef(valence_series, connection_series)[0, 1]
        corr_ac = np.corrcoef(arousal_series, connection_series)[0, 1]
        
        # Average absolute correlation
        coherence = (abs(corr_va) + abs(corr_vc) + abs(corr_ac)) / 3
        
        return float(coherence)
```

---

## 9. Plugin Architecture

### Creating a Plugin System

```python
# app/plugins/base.py
from abc import ABC, abstractmethod

class ObserverPlugin(ABC):
    """Base class for Observer plugins"""
    
    @abstractmethod
    async def on_state_stored(
        self,
        trajectory: UserTrajectory,
        context: Dict
    ):
        """Called after new state is stored"""
        pass
    
    @abstractmethod
    async def on_path_computed(
        self,
        path: TransitionPath,
        context: Dict
    ):
        """Called after path is computed"""
        pass
    
    @abstractmethod
    def get_api_routes(self) -> Optional[APIRouter]:
        """Return additional API routes"""
        pass


# Example plugin
class EmotionalJournalPlugin(ObserverPlugin):
    """Auto-generate journal prompts based on emotions"""
    
    async def on_state_stored(
        self,
        trajectory: UserTrajectory,
        context: Dict
    ):
        # Generate journal prompt
        if trajectory.emotion.category == "When We're Hurting":
            prompt = self._generate_grief_prompt(trajectory)
            await self._send_to_user(trajectory.user_id, prompt)
    
    async def on_path_computed(self, path: TransitionPath, context: Dict):
        # Log path for analysis
        pass
    
    def get_api_routes(self) -> APIRouter:
        router = APIRouter()
        
        @router.get("/journal/prompts/{user_id}")
        async def get_prompts(user_id: str):
            return await self._get_user_prompts(user_id)
        
        return router


# Plugin manager
class PluginManager:
    def __init__(self):
        self.plugins: List[ObserverPlugin] = []
    
    def register(self, plugin: ObserverPlugin):
        """Register a plugin"""
        self.plugins.append(plugin)
        
        # Add plugin routes to app
        routes = plugin.get_api_routes()
        if routes:
            app.include_router(routes, prefix="/plugins")
    
    async def trigger_state_stored(self, trajectory, context):
        """Trigger all plugins"""
        for plugin in self.plugins:
            try:
                await plugin.on_state_stored(trajectory, context)
            except Exception as e:
                logger.error(f"Plugin error: {e}")

# Global instance
plugin_manager = PluginManager()

# Register plugins
plugin_manager.register(EmotionalJournalPlugin())
```

---

## Best Practices

### Do This ✅

#### 1. Maintain Backward Compatibility

```python
# When adding fields, make them optional
class EmotionResponse(BaseModel):
    name: str
    vac: List[float]
    new_field: Optional[str] = None  # Optional for compatibility
```

#### 2. Version Your APIs

```python
# app/api/routes/v2/emotions.py
router = APIRouter()

@router.get("/emotions")
async def get_emotions_v2():
    # New version with enhanced response
    pass

# Register both versions
app.include_router(v1.router, prefix="/v1")
app.include_router(v2.router, prefix="/v2")
```

#### 3. Document Extensions

```python
def add_custom_emotion(
    name: str,
    vac: List[float],
    category: str
) -> AtlasDefinition:
    """
    Add custom emotion to atlas.
    
    **Extension Point:** Use this to add domain-specific emotions.
    
    Args:
        name: Emotion name (must be unique)
        vac: VAC coordinates (validated)
        category: One of the 13 standard categories
        
    Returns:
        Created AtlasDefinition
        
    Example:
        >>> emotion = add_custom_emotion(
        ...     name="Flow State",
        ...     vac=[0.7, 0.5, 0.6],
        ...     category="When Life Is Good"
        ... )
    """
```

### Don't Do This ❌

#### 1. Modifying Core Algorithms Without Tests

```python
# ❌ BAD: Change weighted fusion without validation
def _weighted_fusion(self, vac_dist, sem_dist, text):
    # Changed weights with no testing!
    return 0.5 * vac_dist + 0.5 * sem_dist
```

#### 2. Breaking Database Constraint*

```python
# ❌ BAD: Emotion with invalid VAC
emotion = AtlasDefinition(
    name="Invalid",
    vac=[2.0, 0.5, 0.3]  # Valence > 1.0!
)
```

#### 3. Blocking the Event Loop

```python
# ❌ BAD: Synchronous call in async function
async def process_state():
    result = expensive_sync_function()  # Blocks!
    
# ✅ GOOD: Run in thread pool
async def process_state():
    result = await asyncio.to_thread(expensive_sync_function)
```

---

## Extension Checklist

Before deploying a new extension:

- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Backward compatible (or versioned)
- [ ] Performance impact assessed
- [ ] Database migrations (if needed) tested
- [ ] Seed scripts updated (if needed)
- [ ] Error handling implemented
- [ ] Logging added
- [ ] Code reviewed

---

## Next Steps

**Related guides:**

- [Troubleshooting](08-troubleshooting.md) - Debug extensions
- [Architecture Decisions](09-architecture-decisions.md) - Design philosophy
- [Performance Optimization](06-performance-optimization.md) - Scale extensions

**Testing:**

- [Junior Dev: Testing Guide](../guides/05-testing-guide.md)
