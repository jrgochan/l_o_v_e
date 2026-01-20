# Future-Proofing Emotional Timeline Architecture

**Status:** Implementation Complete  
**Date:** 2026-01-20  
**Version:** 1.0

## Overview
This document details the architectural enhancements implemented to future-proof the Observer's Emotional Timeline. These changes enable scalable deep conversation retrieval, automatic semantic associations between messages, and a formalized ontology for emotional reasoning.

## 1. Semantic Auto-Linking (Associative Memory)
**Objective:** Mimic human associative memory by automatically linking messages that share semantic meaning, regardless of temporal distance.

### Implementation
- **Vector Embeddings**: Added `semantic_embedding` (1536 dim) to `chat_messages` table using `pgvector`.
- **Association Engine**: Created `app/services/association_engine.py` to:
    - Generate embeddings for new messages.
    - Query the vector store for top-k similar past messages (cosine distance).
    - Create `MessageRelationship` records with type `semantic_similarity` if threshold (>0.85) is met.
- **Integration**: Triggered asynchronously in `ChatService.save_user_message`.

### Benefits
- **Contextual Recall**: The system "remembers" relevant past context without explicit search.
- **Pattern Recognition**: Identifies recurring emotional themes across sessions.

## 2. Recursive Threading (Deep Graph Retrieval)
**Objective:** Efficiently fetch entire conversation trees of arbitrary depth in a single database round-trip.

### Implementation
- **Recursive CTEs**: Implemented in `ChatService.get_message_thread`.
- **Logic**:
    - **Anchor**: Selects relationships where `target_message_id` matches the root.
    - **Recursion**: Joins `message_relationships` to the previous CTE result to traverse down the tree.
    - **O(1) Querying**: Retrieves a thread of 100+ messages as efficiently as 1, avoiding N+1 query problems.

## 3. Formalized Relationship Ontology
**Objective:** Standardize the types of connections between emotional moments for clinical reasoning.

### Implementation
- **Enum Definition**: Created `RelationshipType` in `app/models/enums.py`.
- **Types**:
    - `reply`: Standard conversational flow.
    - `precipitated_by`: Causal link (Event -> Emotion).
    - `resolves`: Resolution link (Intervention -> Relief).
    - `reoccurs_in`: Pattern matching (Recurring Shame).
    - `semantic_similarity`: Auto-generated vector link.
    - `contradicts` / `references`: Logical connections.
- **Schema Enforcement**: Updated `MessageRelationship` model to enforce these types.

## 4. Future Roadmap & Planned Enhancements

### A. Temporal-Semantic Clustering
**Goal**: Group messages not just by direct similarity but by "emotional episodes."
- **Plan**: Implement a clustering algorithm (e.g., HDBSCAN) on the message embeddings to identify distinct "chapters" in a user's journey.

### B. Graph-RAG (Retrieval Augmented Generation)
**Goal**: Use the relationship graph to enhance LLM prompts.
- **Plan**: When answering distinct questions, traverse the `semantic_similarity` and `precipitated_by` edges to construct a "reasoning path" context, rather than just fetching recent messages.

### C. Clinical Pattern Detection
**Goal**: Auto-detect pathological patterns (e.g., "Spiral of Silence").
- **Plan**: complex event processing (CEP) rules that listen for specific sequences of `RelationshipType` (e.g., `reoccurs_in` repeated > 5 times with `arousal` increasing).

## References
- [Alembic Migrations](../migrations/versions)
- [PostgreSQL pgvector Documentation](https://github.com/pgvector/pgvector)
