# Data Architecture

**Status**: Placeholder Stub
**Description**: Defines the data storage and schema strategies for the platform.

## Database: PostgreSQL + pgvector

The core data store is PostgreSQL 16 enabled with the `pgvector` extension.

### Key Tables

- **emotions**: The 87-point Atlas of emotions.
- **vectors**: High-dimensional embeddings of emotional states.
- **sessions**: User session records.
- **transitions**: Valid paths between emotional states.

## Vector Search

We use HNSW (Hierarchical Navigable Small World) indexing for millisecond-latency nearest neighbor searches in the high-dimensional VAC space.

## Seeding

The database is seeded with initial data for:

- 87 Emotions (Brené Brown's taxonomy)
- 107 Regulation Strategies
- Valid Transition Paths

*(This document is a stub. Full schema details to be extracted from `observer/app/models`.)*
