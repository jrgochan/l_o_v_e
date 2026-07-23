# Life Journal: API Reference

## Base URL

```
/api/v1/journal
```

All endpoints require authentication and operate within the authenticated user's scope. No cross-user access is possible (row-level security).

---

## Life Events

### Create a Life Event

```
POST /api/v1/journal/events
```

Log a new life event.

**Request Body:**
```json
{
    "timestamp": "2026-07-23T07:00:00Z",
    "event_type": "wellness.exercise",
    "title": "Morning run",
    "description": "5km in the park, felt great",
    "duration_minutes": 28,
    "event_data": {
        "intensity": "moderate",
        "activity_type": "running",
        "distance_km": 5.0
    },
    "mood_before": [-0.2, 0.3, 0.0],
    "mood_after": [0.5, 0.4, 0.2],
    "tags": ["morning", "routine", "outdoor"],
    "impact": 0.4,
    "predictability": 0.9,
    "controllability": 0.8,
    "is_recurring": true,
    "recurrence_pattern": "daily"
}
```

**Response: `201 Created`**
```json
{
    "id": "evt-abc-123",
    "user_id": "usr-def-456",
    "timestamp": "2026-07-23T07:00:00Z",
    "event_type": "wellness.exercise",
    "title": "Morning run",
    "description": "5km in the park, felt great",
    "duration_minutes": 28,
    "event_data": { "..." },
    "mood_before": [-0.2, 0.3, 0.0],
    "mood_after": [0.5, 0.4, 0.2],
    "tags": ["morning", "routine", "outdoor"],
    "source": "manual",
    "created_at": "2026-07-23T14:32:00Z"
}
```

---

### List Life Events

```
GET /api/v1/journal/events
```

Retrieve life events with filtering and pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_date` | ISO datetime | 7 days ago | Start of date range |
| `end_date` | ISO datetime | now | End of date range |
| `event_type` | string | — | Filter by type (supports prefix: `wellness.*`) |
| `tags` | string[] | — | Filter by tags (AND logic) |
| `source` | string | — | Filter by source |
| `limit` | int | 50 | Max results (max 200) |
| `offset` | int | 0 | Pagination offset |
| `order` | string | `desc` | `asc` or `desc` by timestamp |

**Example:**
```
GET /api/v1/journal/events?event_type=wellness.*&start_date=2026-07-01&limit=20
```

---

### Get a Life Event

```
GET /api/v1/journal/events/{event_id}
```

Get a single event with its associated correlations and nearby emotional states.

**Response includes:**
- The event itself
- Correlated emotional states (UserTrajectory points within ±2hr window)
- Any active correlations involving this event type
- Computed VAC shift (mood_before vs mood_after if present, or nearby trajectory delta)

---

### Update a Life Event

```
PUT /api/v1/journal/events/{event_id}
```

Update event details. All fields except `id`, `user_id`, `source`, and `created_at` are updateable.

---

### Delete a Life Event

```
DELETE /api/v1/journal/events/{event_id}
```

Soft-delete an event. Associated correlations are flagged for revalidation.

---

## Search

### Semantic Search

```
POST /api/v1/journal/search
```

Find events and emotional states using natural language queries.

**Request Body:**
```json
{
    "query": "times I felt anxious after work meetings",
    "search_type": "events",
    "limit": 10,
    "start_date": "2026-01-01",
    "end_date": "2026-07-23"
}
```

**`search_type` options:**
- `events` — Search life events only
- `emotions` — Search emotional states only (UserTrajectory)
- `all` — Search both, ranked by relevance

**Response:**
```json
{
    "results": [
        {
            "type": "event",
            "id": "evt-123",
            "score": 0.92,
            "event_type": "work.meeting",
            "title": "Status review with VP",
            "timestamp": "2026-07-15T14:00:00Z",
            "nearby_emotions": [
                {
                    "trajectory_id": "traj-456",
                    "emotion": "Anxiety",
                    "vac": [-0.6, 0.7, -0.3],
                    "lag_minutes": 45
                }
            ]
        }
    ],
    "total": 23,
    "query_embedding_cached": true
}
```

### Timeline View

```
GET /api/v1/journal/timeline
```

Get an interleaved timeline of life events and emotional states.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_date` | ISO datetime | 7 days ago | Timeline start |
| `end_date` | ISO datetime | now | Timeline end |
| `include_events` | bool | true | Include life events |
| `include_emotions` | bool | true | Include emotional states |
| `include_correlations` | bool | false | Annotate with correlations |
| `resolution` | string | `raw` | `raw`, `hourly`, `daily` |

---

## Correlations

### Get Active Correlations

```
GET /api/v1/journal/correlations
```

Get all active correlations for the authenticated user.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `active` | Filter by status |
| `min_strength` | float | 0.3 | Minimum correlation strength |
| `event_type` | string | — | Filter by event type |
| `emotion_name` | string | — | Filter by emotion |

**Response:**
```json
{
    "correlations": [
        {
            "id": "corr-789",
            "event_type": "wellness.substance",
            "event_pattern": "Caffeine consumption",
            "emotion_name": "Anxiety",
            "correlation_type": "temporal_proximity",
            "strength": 0.67,
            "direction": "negative",
            "lag_seconds": 5400,
            "confidence": 0.92,
            "sample_size": 45,
            "status": "active",
            "human_readable": "Your anxiety tends to increase within 90 minutes of caffeine intake (67% correlation, based on 45 observations)",
            "first_detected": "2026-05-15",
            "last_validated": "2026-07-20"
        }
    ],
    "total": 8
}
```

### Confirm/Dismiss a Correlation

```
POST /api/v1/journal/correlations/{correlation_id}/feedback
```

**Request Body:**
```json
{
    "feedback": "confirmed"
}
```

`feedback` options: `"confirmed"` | `"dismissed"`

Confirmed correlations get boosted weight in the insight generator. Dismissed correlations are suppressed from future insights.

### Trigger Reanalysis

```
POST /api/v1/journal/correlations/reanalyze
```

Trigger a full reanalysis of all correlations for the user. This is a background job — returns immediately with a job ID.

**Response: `202 Accepted`**
```json
{
    "job_id": "job-abc-123",
    "status": "queued",
    "estimated_duration_seconds": 30
}
```

---

## Aggregations

### Daily Summary

```
GET /api/v1/journal/summary/daily
```

Get aggregated daily summaries combining events and emotional data.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_date` | date | 7 days ago | Start date |
| `end_date` | date | today | End date |

**Response:**
```json
{
    "days": [
        {
            "date": "2026-07-23",
            "event_count": 5,
            "event_types": ["wellness.exercise", "work.meeting", "relationship.quality_time"],
            "emotion_count": 12,
            "dominant_emotion": "Contentment",
            "vac_summary": {
                "valence_avg": 0.35,
                "arousal_avg": 0.42,
                "connection_avg": 0.28
            },
            "alert_count": 0,
            "correlations_triggered": 1
        }
    ]
}
```

### Weekly / Monthly Trends

```
GET /api/v1/journal/summary/weekly
GET /api/v1/journal/summary/monthly
```

Same structure as daily, aggregated at the respective granularity.

---

## Event Types Registry

### List Available Event Types

```
GET /api/v1/journal/event-types
```

Returns the full ontology of event types with their metadata.

**Response:**
```json
{
    "domains": [
        {
            "domain": "wellness",
            "label": "Body & Health",
            "types": [
                {
                    "event_type": "wellness.exercise",
                    "label": "Exercise",
                    "default_impact": 0.3,
                    "typical_recurrence": "daily",
                    "suggested_fields": ["duration_minutes", "intensity", "activity_type"]
                }
            ]
        }
    ]
}
```

### Create Custom Event Type

```
POST /api/v1/journal/event-types/custom
```

**Request Body:**
```json
{
    "event_type": "custom.dog_walk",
    "label": "Dog Walk",
    "description": "Taking the dog for a walk",
    "default_impact": 0.3,
    "typical_recurrence": "daily",
    "suggested_fields": ["duration_minutes", "location"]
}
```
