# Observer Module - Insight Generation

## Overview

The **Insight Generation** feature is one of the Observer's most powerful capabilities. It allows users to discover patterns in their emotional journey by finding semantically similar past moments—the "You felt this way before..." feature.

This leverages pgvector's HNSW index to perform high-speed cosine similarity searches across potentially millions of historical states.

## Core Concept

When a user records a new emotional state, the system can:
1. Find similar past states (semantic similarity)
2. Identify recurring patterns (e.g., "Work stress every Monday")
3. Show emotional growth (e.g., "You handled this better than last time")
4. Provide context (e.g., "You felt joy like this 30 days ago")

## Similarity Search Algorithm

### Cosine Similarity

The system uses **cosine distance** to measure semantic similarity between embeddings:

```
similarity = 1 - cosine_distance
cosine_distance = 1 - (A · B) / (||A|| × ||B||)
```

**Range**: 0 (completely different) to 1 (identical)

### SQL Query

```sql
SELECT
    id,
    timestamp,
    input_transcription,
    vac_values,
    dominant_emotion_id,
    1 - (input_embedding <=> :query_embedding) AS similarity_score
FROM user_trajectory
WHERE user_id = :user_id
    AND id != :current_state_id  -- Exclude current state
ORDER BY input_embedding <=> :query_embedding
LIMIT :limit;
```

**Note**: The `<=>` operator triggers the HNSW index for fast retrieval.

## Implementation

### InsightService

```python
# app/services/insight_service.py

from typing import List
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.models.user_trajectory import UserTrajectory
from app.models.atlas_definition import AtlasDefinition
from app.services.embedding_service import EmbeddingService

class InsightService:
    """Generates insights by finding similar past moments"""

    def __init__(self, session: AsyncSession, embedding_service: EmbeddingService):
        self.session = session
        self.embedding_service = embedding_service

    async def find_similar_moments(
        self,
        user_id: UUID,
        current_text: str,
        limit: int = 5,
        min_similarity: float = 0.7
    ) -> List[SimilarMoment]:
        """
        Find semantically similar past emotional states.

        Args:
            user_id: User ID
            current_text: Current input text
            limit: Maximum number of results
            min_similarity: Minimum similarity threshold (0-1)

        Returns:
            List of similar moments with metadata
        """

        # Generate embedding for current text
        query_embedding = await self.embedding_service.generate_embedding(current_text)

        # Query for similar moments
        stmt = (
            select(
                UserTrajectory,
                AtlasDefinition,
                (1 - UserTrajectory.input_embedding.cosine_distance(query_embedding))
                    .label('similarity_score')
            )
            .join(
                AtlasDefinition,
                UserTrajectory.dominant_emotion_id == AtlasDefinition.id
            )
            .where(UserTrajectory.user_id == user_id)
            .order_by(UserTrajectory.input_embedding.cosine_distance(query_embedding))
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        rows = result.all()

        # Filter by minimum similarity
        similar_moments = []
        now = datetime.utcnow()

        for trajectory, emotion, similarity in rows:
            if similarity < min_similarity:
                continue

            days_ago = (now - trajectory.timestamp).days

            similar_moments.append(SimilarMoment(
                state_id=trajectory.id,
                timestamp=trajectory.timestamp,
                input_text=trajectory.input_transcription,
                emotion=emotion.emotion_name,
                category=emotion.category,
                vac=trajectory.vac_values,
                similarity_score=round(similarity, 3),
                days_ago=days_ago
            ))

        return similar_moments

    async def generate_insight_text(
        self,
        similar_moments: List[SimilarMoment]
    ) -> str:
        """
        Generate human-readable insight from similar moments.

        Examples:
        - "You've felt this way 3 times in the past month."
        - "This is similar to how you felt on November 15th."
        - "You've been here before, and you got through it."
        """

        if not similar_moments:
            return "This is a new experience for you."

        # Count occurrences in time windows
        past_week = sum(1 for m in similar_moments if m.days_ago <= 7)
        past_month = sum(1 for m in similar_moments if m.days_ago <= 30)
        past_year = sum(1 for m in similar_moments if m.days_ago <= 365)

        # Determine dominant emotion
        emotions = [m.emotion for m in similar_moments]
        dominant = max(set(emotions), key=emotions.count)

        # Generate insight
        if past_week > 0:
            return f"You've experienced similar {dominant.lower()} {past_week} time(s) this week."
        elif past_month > 0:
            return f"You've felt {dominant.lower()} like this {past_month} time(s) this month."
        elif past_year > 0:
            most_recent = similar_moments[0]
            return f"You last felt this way {most_recent.days_ago} days ago."
        else:
            return "This emotional experience is unique for you."
```

## Advanced Pattern Detection

### Recurring Patterns

Detect if similar emotions occur at regular intervals:

```python
async def detect_recurring_patterns(
    self,
    user_id: UUID,
    emotion_name: str,
    lookback_days: int = 90
) -> Optional[Pattern]:
    """
    Detect recurring emotional patterns (e.g., weekly anxiety).

    Returns pattern if detected, None otherwise.
    """

    # Get all instances of this emotion in timeframe
    start_date = datetime.utcnow() - timedelta(days=lookback_days)

    stmt = (
        select(UserTrajectory.timestamp)
        .join(AtlasDefinition)
        .where(
            and_(
                UserTrajectory.user_id == user_id,
                AtlasDefinition.emotion_name == emotion_name,
                UserTrajectory.timestamp >= start_date
            )
        )
        .order_by(UserTrajectory.timestamp)
    )

    result = await self.session.execute(stmt)
    timestamps = [row[0] for row in result.all()]

    if len(timestamps) < 3:
        return None

    # Calculate intervals
    intervals = [
        (timestamps[i+1] - timestamps[i]).total_seconds() / 86400  # Days
        for i in range(len(timestamps) - 1)
    ]

    # Check for recurring pattern (e.g., ~7 days, ~30 days)
    mean_interval = np.mean(intervals)
    std_interval = np.std(intervals)

    # Pattern detected if variance is low
    if std_interval / mean_interval < 0.3:  # Coefficient of variation < 30%
        frequency = "weekly" if 6 <= mean_interval <= 8 else \
                   "monthly" if 28 <= mean_interval <= 32 else \
                   f"every {int(mean_interval)} days"

        return Pattern(
            emotion=emotion_name,
            frequency=frequency,
            confidence=1 - (std_interval / mean_interval),
            occurrences=len(timestamps)
        )

    return None
```

### Emotional Growth Tracking

Compare current response to past similar situations:

```python
async def compare_to_past(
    self,
    user_id: UUID,
    current_state: UserTrajectory,
    similar_moment: UserTrajectory
) -> Comparison:
    """
    Compare current emotional response to a past similar situation.

    Detects growth/regression in emotional regulation.
    """

    # Extract VAC values
    current_vac = current_state.vac_values
    past_vac = similar_moment.vac_values

    # Calculate changes
    valence_change = current_vac[0] - past_vac[0]
    arousal_change = current_vac[1] - past_vac[1]
    connection_change = current_vac[2] - past_vac[2]

    # Determine growth
    insights = []

    if valence_change > 0.3:
        insights.append("You're responding more positively than before.")

    if arousal_change < -0.3:
        insights.append("You're staying calmer this time.")

    if connection_change > 0.3:
        insights.append("You're more connected than you were.")

    # Compare elasticity (resilience)
    if current_state.elasticity_metric < similar_moment.elasticity_metric:
        insights.append("You're handling this more steadily.")

    growth_detected = len(insights) > 0

    return Comparison(
        past_date=similar_moment.timestamp,
        growth_detected=growth_detected,
        insights=insights,
        vac_delta=[valence_change, arousal_change, connection_change]
    )
```

## API Endpoint

### POST /observer/insight

```python
# app/api/routes/insight.py

from app.api.schemas.insight import InsightRequest, InsightResponse

@router.post("/insight", response_model=InsightResponse)
async def get_insight(
    request: InsightRequest,
    session: AsyncSession = Depends(get_db),
    insight_service: InsightService = Depends()
):
    """
    Find similar past emotional moments.

    This powers the "You felt this way before..." feature.
    """

    # Find similar moments
    similar_moments = await insight_service.find_similar_moments(
        user_id=request.user_id,
        current_text=request.current_text,
        limit=request.limit
    )

    # Generate natural language insight
    insight_text = await insight_service.generate_insight_text(similar_moments)

    # Detect recurring patterns (optional enhancement)
    patterns = []
    if len(similar_moments) >= 3:
        dominant_emotion = similar_moments[0].emotion
        pattern = await insight_service.detect_recurring_patterns(
            user_id=request.user_id,
            emotion_name=dominant_emotion,
            lookback_days=90
        )
        if pattern:
            patterns.append(pattern)

    return InsightResponse(
        similar_moments=similar_moments,
        insight=insight_text,
        patterns=patterns
    )
```

## Testing Insight Generation

### Unit Tests

```python
@pytest.mark.asyncio
async def test_finds_similar_moments(session, seed_user_data):
    """Test that similar moments are retrieved correctly"""

    service = InsightService(session, embedding_service)

    # Query similar to past "stress" entries
    results = await service.find_similar_moments(
        user_id=test_user_id,
        current_text="I'm stressed about the deadline",
        limit=5
    )

    assert len(results) > 0
    assert all(r.similarity_score >= 0.7 for r in results)
    assert any("stress" in r.emotion.lower() for r in results)

@pytest.mark.asyncio
async def test_detects_recurring_weekly_pattern(session, seed_weekly_anxiety):
    """Test detection of weekly recurring emotions"""

    service = InsightService(session, embedding_service)

    pattern = await service.detect_recurring_patterns(
        user_id=test_user_id,
        emotion_name="Anxiety",
        lookback_days=60
    )

    assert pattern is not None
    assert pattern.frequency == "weekly"
    assert pattern.confidence > 0.7
```

## Performance Considerations

### Caching

Cache embeddings to avoid regenerating:

```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def cached_embedding(text: str) -> List[float]:
    return embedding_service.generate_embedding(text)
```

### Pagination

For large result sets:

```python
async def find_similar_moments_paginated(
    self,
    user_id: UUID,
    query_embedding: List[float],
    page: int = 1,
    page_size: int = 10
) -> PaginatedResults:
    """Paginate similar moments for large datasets"""

    offset = (page - 1) * page_size

    stmt = (
        select(UserTrajectory)
        .where(UserTrajectory.user_id == user_id)
        .order_by(UserTrajectory.input_embedding.cosine_distance(query_embedding))
        .limit(page_size)
        .offset(offset)
    )

    # ... execute and return
```

## Next Steps

Now that you understand insight generation:
- **09-setup-and-installation.md** - Set up development environment
- **10-deployment.md** - Deploy to production
- **11-testing-strategy.md** - Comprehensive testing approach
