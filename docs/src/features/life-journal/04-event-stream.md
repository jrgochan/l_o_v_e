# Life Journal: Event Stream Architecture

## Why a Persistent Event Stream?

The existing L.O.V.E. stack processes events in-memory via the `EventBus`:

```python
# Current: In-process, ephemeral
event_bus = EventBus()  # observer/app/core/events.py
await event_bus.emit(DomainEvent(event_type="user.profile_updated", ...))
```

This works for cross-cutting concerns (audit logging, cache invalidation) but **cannot support the Life Journal** because:

| Requirement | In-Process EventBus | Persistent Stream |
|-------------|--------------------:|------------------:|
| Survives restart | ❌ | ✅ |
| Replay from any point | ❌ | ✅ |
| Cross-service consumption | ❌ | ✅ |
| Searchable history | ❌ | ✅ |
| Ordered guarantee | ✅ (single process) | ✅ (per-subject) |
| Back-pressure | ❌ | ✅ |
| At-least-once delivery | ❌ | ✅ |
| Lifetime of data | ❌ | ✅ (configurable retention) |

The Life Journal needs a stream that can hold a user's **entire emotional and life event history** — potentially decades of data — in an ordered, replayable, searchable format.

## Technology Candidates

### Option A: NATS JetStream (Recommended)

**What it is**: A lightweight, cloud-native messaging system with built-in persistence (JetStream). Single binary, zero-config, subject-based routing.

```
┌──────────────────────────────────────────────┐
│                NATS Server                    │
│                                              │
│  Stream: "JOURNAL"                           │
│  ├── journal.user123.emotion.anxiety         │
│  ├── journal.user123.event.wellness.exercise │
│  ├── journal.user123.context.sleep           │
│  └── journal.user456.emotion.joy             │
│                                              │
│  Consumers:                                  │
│  ├── persister (durable, delivers to DB)     │
│  ├── correlator (durable, runs analysis)     │
│  └── alerter (push, real-time notifications) │
└──────────────────────────────────────────────┘
```

**Why it fits**:
- **Subject hierarchy** maps perfectly: `journal.{user_id}.{type}.{subtype}`
- **20MB RAM** footprint — runs alongside Observer without resource contention
- **File-backed persistence** — no separate database needed
- **Replay by time or sequence** — can reprocess historical data
- **Python client** (`nats-py`) is async-native, works with FastAPI
- **Consumer groups** — multiple consumers process same stream independently

**Trade-offs**:
- New infrastructure dependency (but it's a single binary)
- Less ecosystem tooling than Kafka
- Community smaller than Redis

### Option B: Redis Streams

**What it is**: Redis 5.0+ includes Streams — an append-only log data structure with consumer groups.

**Why it might fit**:
- Redis is **already a project prerequisite** (listed in README)
- No new infrastructure needed
- Consumer groups for independent processing
- `XRANGE` / `XREVRANGE` for time-based queries

**Trade-offs**:
- **Weaker durability** — AOF persistence can lose last few seconds on crash
- **No subject hierarchy** — flat stream keys, must manage routing manually
- **Memory-resident** — lifetime data would need careful memory management
- **No built-in replay** from arbitrary time (must track offsets manually)

### Option C: Kafka

**Why it's overkill**:
- 1GB+ JVM heap minimum
- Requires ZooKeeper (or KRaft)
- Designed for millions of messages/second across hundreds of services
- Operational complexity far exceeds our needs

**Verdict**: Not recommended unless L.O.V.E. scales to enterprise deployment.

## Proposed Stream Design (NATS JetStream)

### Subject Taxonomy

```
journal.{user_id}.emotion.{emotion_name}
journal.{user_id}.event.{domain}.{type}
journal.{user_id}.context.{signal}
journal.{user_id}.correlation.{correlation_type}
journal.{user_id}.insight.{insight_type}
```

**Examples**:
```
journal.abc123.emotion.anxiety
journal.abc123.event.wellness.exercise
journal.abc123.event.work.deadline
journal.abc123.context.sleep
journal.abc123.correlation.temporal_proximity
journal.abc123.insight.pattern_detected
```

**Wildcard subscriptions**:
```
journal.abc123.>            # All events for user abc123
journal.*.emotion.>         # All emotion events for all users
journal.*.event.wellness.>  # All wellness events across users
```

### Stream Configuration

```python
# Stream: JOURNAL
{
    "name": "JOURNAL",
    "subjects": ["journal.>"],           # Capture everything under journal.*
    "retention": "limits",               # Keep data up to limits
    "max_bytes": -1,                     # Unlimited (disk-backed)
    "max_age": 0,                        # No age limit (lifetime data)
    "storage": "file",                   # File-backed (not memory)
    "num_replicas": 1,                   # Single node (increase for HA)
    "discard": "old",                    # When limits hit, discard oldest
    "duplicate_window": "2m",            # Deduplicate within 2 minutes
}
```

### Consumer Definitions

```python
# Consumer 1: Persister — writes to PostgreSQL
{
    "durable_name": "persister",
    "filter_subject": "journal.>",       # Process everything
    "ack_policy": "explicit",            # Must ack after DB write
    "max_deliver": 3,                    # Retry failed writes up to 3x
    "ack_wait": "30s",                   # 30s to ack before redelivery
}

# Consumer 2: Correlator — runs correlation analysis
{
    "durable_name": "correlator",
    "filter_subject": "journal.*.event.>",  # Only life events trigger correlation
    "ack_policy": "explicit",
    "max_deliver": 2,
    "ack_wait": "60s",                   # Correlation can take longer
}

# Consumer 3: Embedder — generates semantic embeddings
{
    "durable_name": "embedder",
    "filter_subject": "journal.*.event.>",
    "ack_policy": "explicit",
    "max_deliver": 2,
    "ack_wait": "30s",
}

# Consumer 4: Alerter — real-time pattern notifications
{
    "durable_name": "alerter",
    "filter_subject": "journal.*.correlation.>",  # Only on correlation discoveries
    "ack_policy": "none",                # Fire and forget for alerts
    "deliver_policy": "new",             # Only new correlations
}
```

### Message Schema

Every message on the stream follows a common envelope:

```python
@dataclass
class JournalMessage:
    """Standard envelope for all Life Journal stream messages."""

    # Routing
    user_id: str
    message_type: str          # "emotion" | "event" | "context" | "correlation"

    # Timestamps
    event_time: datetime       # When the event actually occurred
    publish_time: datetime     # When the message was published to stream

    # Payload (varies by type)
    payload: Dict[str, Any]

    # Metadata
    source: str                # "observer_pipeline" | "life_event_api" | "integration"
    idempotency_key: str       # For deduplication
    schema_version: int        # For forward compatibility
```

**Example: Emotion event**
```json
{
    "user_id": "abc-123",
    "message_type": "emotion",
    "event_time": "2026-07-23T14:30:00Z",
    "publish_time": "2026-07-23T14:30:01Z",
    "payload": {
        "emotion_name": "Anxiety",
        "category": "When Things Are Uncertain",
        "vac": [-0.6, 0.7, -0.3],
        "confidence": 0.87,
        "trajectory_id": "traj-456"
    },
    "source": "observer_pipeline",
    "idempotency_key": "traj-456",
    "schema_version": 1
}
```

**Example: Life event**
```json
{
    "user_id": "abc-123",
    "message_type": "event",
    "event_time": "2026-07-23T07:00:00Z",
    "publish_time": "2026-07-23T14:32:00Z",
    "payload": {
        "event_type": "wellness.exercise",
        "title": "Morning run",
        "description": "5km in the park",
        "event_data": {
            "duration_minutes": 28,
            "intensity": "moderate",
            "activity_type": "running"
        },
        "life_event_id": "evt-789"
    },
    "source": "life_event_api",
    "idempotency_key": "evt-789",
    "schema_version": 1
}
```

## Code Structure

```
observer/app/services/stream/
├── __init__.py
├── client.py              # NATS connection management (singleton)
├── publisher.py           # Publish events to JetStream
├── consumer.py            # Base consumer class with ack/nack/retry
├── subjects.py            # Subject taxonomy constants
├── schemas.py             # JournalMessage dataclass + serialization
└── consumers/
    ├── __init__.py
    ├── persister.py       # Writes stream events to PostgreSQL
    ├── correlator.py      # Triggers correlation analysis on new events
    ├── embedder.py        # Generates embeddings for new life events
    └── alerter.py         # Fires real-time alerts on pattern discovery
```

## EventBus Bridge

The existing `EventBus` is preserved for backward compatibility. A bridge adapter forwards domain events to the persistent stream:

```python
class StreamBridgeAdapter:
    """Bridges the in-process EventBus to the persistent NATS stream."""

    async def handle_domain_event(self, event: DomainEvent) -> None:
        """Forward domain events to the JOURNAL stream."""
        journal_msg = JournalMessage(
            user_id=str(event.actor_id),
            message_type=self._map_event_type(event.event_type),
            event_time=event.timestamp,
            publish_time=datetime.now(timezone.utc),
            payload=event.metadata,
            source="domain_event_bridge",
            idempotency_key=f"domain-{event.event_type}-{event.timestamp.isoformat()}",
            schema_version=1,
        )
        await self.publisher.publish(journal_msg)

# Registration at app startup:
# event_bus.subscribe_all(stream_bridge.handle_domain_event)
```

## Scaling Considerations

### Storage Estimates

| Scenario | Messages/Day | Messages/Year | Storage/Year |
|----------|-------------|---------------|--------------|
| 1 user, light usage | 20 | 7,300 | ~7 MB |
| 1 user, heavy tracking | 100 | 36,500 | ~36 MB |
| 1,000 users, moderate | 50,000 | 18.25M | ~18 GB |
| Lifetime (50 years, 1 user) | — | 1.8M | ~1.8 GB |

NATS JetStream file-backed storage handles these volumes trivially. Even a lifetime of dense tracking for a single user fits in under 2GB.

### Query Patterns

| Query | Method | Latency |
|-------|--------|---------|
| "All events for user X today" | Subject filter + time range | <10ms |
| "Replay user X's last 30 days" | Consumer with deliver_by_start_time | Streaming |
| "Find all exercise events across users" | Wildcard subject | <50ms |
| "Rebuild correlations from scratch" | New consumer, deliver_all | Minutes (full replay) |
