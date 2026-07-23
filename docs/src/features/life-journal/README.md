# Life Journal: Event Tracking & Emotional Correlation

The Life Journal is L.O.V.E.'s longitudinal emotional intelligence layer — transforming session-by-session emotion tracking into a **lifetime personal knowledge graph** that correlates feelings with life events, habits, routines, and contextual signals.

## Vision

> Traditional therapy relies on subjective recall: *"I think I started feeling anxious around the time I changed jobs."*
>
> The Life Journal makes this precise: *"Your anxiety scores increased 42% within 72 hours of work-deadline events, but decreased 28% on days you exercised before noon. This pattern has held across 6 months of data."*

## Documentation

| Document | Description |
|----------|-------------|
| [Overview & Architecture](./01-overview.md) | System design, data flow, and how it integrates with the existing L.O.V.E. stack |
| [Life Event Ontology](./02-ontology.md) | The event classification system, inspired by established ontologies |
| [Data Models](./03-data-models.md) | SQLAlchemy models for events, correlations, and aggregations |
| [Event Stream Architecture](./04-event-stream.md) | Persistent message queue design for real-time event processing |
| [Correlation Engine](./05-correlation-engine.md) | Statistical and semantic methods for discovering emotion-event patterns |
| [API Reference](./06-api-reference.md) | REST endpoints for event management and querying |
| [Privacy & Ethics](./07-privacy-ethics.md) | Data protection, consent, field-level RBAC, and ethical considerations |
| [Integrations](./08-integrations.md) | External data sources: calendars, wearables, environment APIs |

## Key Concepts

- **Life Events**: User-reported or system-inferred occurrences (meals, workouts, social interactions, sleep, work milestones, etc.)
- **Emotional Correlation**: Statistical and semantic links between life events and emotional state changes
- **Event Stream**: Persistent, ordered, searchable log of all emotional and life event data
- **Lifetime Architecture**: Data infrastructure designed to handle decades of personal data efficiently
