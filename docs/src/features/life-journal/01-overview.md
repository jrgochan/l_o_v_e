# Life Journal: Overview & Architecture

## The Problem

L.O.V.E. currently tracks emotions at **session granularity** — each chat session captures VAC coordinates, prosody data, and semantic embeddings. But emotional life doesn't happen in isolated sessions. Feelings are shaped by what's happening in a person's actual life: what they ate, how they slept, who they talked to, what happened at work, whether they exercised.

The existing stack has the **raw infrastructure** for this:
- `UserTrajectory` stores every emotional state with a `context_metadata` JSONB field designed for exactly this kind of enrichment
- The `AssociationEngine` auto-links semantically similar moments across sessions
- `MessageRelationship` supports typed edges including `PRECIPITATED_BY` (causal link)
- The `EventBus` provides in-process pub/sub with audit logging

What's missing is the **data model, ingestion pipeline, and correlation intelligence** to connect emotional states with the fabric of daily life.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                             │
├─────────────┬──────────────┬───────────────┬───────────────────┤
│ Manual      │ Chat-Derived │ Integrations  │ Inferred          │
│ Journal API │ Pipeline     │ (Future)      │ Pattern Engine    │
│             │              │ Calendar      │                   │
│ "Ran 5km"   │ "Trigger:    │ Wearable HR   │ "You tend to log  │
│ "Bad sleep" │  work mtg"   │ Weather API   │  anxiety on       │
│ "Date night"│              │               │  Mondays"         │
└──────┬──────┴──────┬───────┴───────┬───────┴────────┬──────────┘
       │             │               │                │
       ▼             ▼               ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT STREAM (Phase 2)                        │
│  Persistent, ordered, replayable message log                    │
│                                                                 │
│  Subjects:                                                      │
│    journal.{user}.emotion.{name}    Emotional state changes     │
│    journal.{user}.event.{type}      Life events                 │
│    journal.{user}.context.{signal}  Contextual signals          │
│    journal.{user}.correlation.*     Discovered patterns         │
└───────────────────────┬─────────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
    ┌───────────┐ ┌───────────┐ ┌───────────┐
    │ Persister │ │ Correlator│ │ Embedder  │
    │ Consumer  │ │ Consumer  │ │ Consumer  │
    └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
          │             │             │
          ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STORAGE LAYER                              │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ life_events  │  │ correlations │  │ user_trajectory      │  │
│  │ (new)        │  │ (new)        │  │ (existing, enriched) │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ time_aggs    │  │ pgvector     │                            │
│  │ (mat. views) │  │ (embeddings) │                            │
│  └──────────────┘  └──────────────┘                            │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INTELLIGENCE LAYER                            │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Correlation  │  │ Semantic     │  │ Insight Generator v2 │  │
│  │ Engine       │  │ Search       │  │ (longitudinal)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXPERIENCE LAYER                              │
│                                                                 │
│  Life Timeline  │  Correlation Dashboard  │  Pattern Alerts     │
└─────────────────────────────────────────────────────────────────┘
```

## Integration with Existing Stack

The Life Journal is designed to **augment, not replace** the existing L.O.V.E. architecture:

| Existing Component | How Life Journal Integrates |
|--------------------|-----------------------------|
| `UserTrajectory` | Existing trajectory points gain `associated_event_ids` linking to life events. The `context_metadata` JSONB gets a formalized schema. |
| `StateProcessingPipeline` | After persisting a state, the pipeline publishes to the event stream. Consumers handle correlation asynchronously. |
| `EventBus` / `DomainEvent` | Bridge adapter: existing domain events are forwarded to the persistent stream. Backward compatible. |
| `AssociationEngine` | Extended to also find associations between life events and emotional states (not just message-to-message). |
| `InsightGenerator` | Gains access to longitudinal correlation data for richer, life-contextualized insights. |
| `SessionAnalytics` | A new `UserAnalytics` model aggregates across sessions for weekly/monthly/yearly views. |

## Phasing

### Phase 1: Foundation (No New Infrastructure)
- `LifeEvent` data model + Alembic migration
- `EmotionEventCorrelation` data model
- CRUD API for life events
- Basic temporal proximity correlation
- Enriched `context_metadata` schema

### Phase 2: Event Stream
- Persistent message queue (NATS JetStream or Redis Streams)
- Stream consumers for persistence, correlation, embedding
- `EventBus` bridge adapter
- Replay and searchability

### Phase 3: Correlation Intelligence
- Statistical correlation engine
- Pattern recurrence detection (daily/weekly cycles)
- Trajectory shift analysis (before/after)
- Semantic clustering across events and emotions

### Phase 4: Time-Series at Scale
- Table partitioning for `UserTrajectory` and `life_events`
- Materialized views / continuous aggregates
- Retention policies and archival
- Load testing for lifetime-scale data
