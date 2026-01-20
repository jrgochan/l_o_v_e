# Future Roadmap: Emotional Timeline & Deep Linking

This document outlines the strategic enhancements for the Emotional Timeline architecture to support long-term scale, "associative memory" features, and deep clinical reasoning.

## 1. Semantic "Auto-Linking" (The Neurological Layer)
**Goal:** Transform the timeline from a manual log into an associative memory system that surfaces relevant past moments automatically.

### Concept
Implement an embedding-based background worker that:
1.  Vectorizes every new message (content + emotion).
2.  Searches the user's history for semantically or emotionally similar moments.
3.  Creates "Soft Links" (suggestions) or "Hard Links" (auto-connections) based on similarity thresholds.

### Use Case
If a user says "I feel trapped" today, the system surfaces a message from 6 months ago where they used that phrase or had the exact same VAC signature, enabling the AI to ask: *"This feels similar to how you felt last November—is the trigger the same?"*

## 2. Recursive Threading Efficiency
**Goal:** Enable performant retrieval of deep conversation branches (e.g., A -> B -> C -> D -> E) as the dataset grows.

### Concept
Replace iterative Eager Loading with **Recursive Common Table Expressions (CTEs)** in PostgreSQL.
-   **Current:** `selectinload` fetches 1 level deep.
-   **Future:** A single SQL query utilizing `WITH RECURSIVE` to fetch an entire discussion thread or "emotional arc" (all ancestors and descendants) in one go.

### Benefit
Guarantees consistent sub-10ms query performance even for deep therapeutic explorations that span dozens of connected messages.

## 3. Formalized Relationship Ontology
**Goal:** Move from generic links to a structured taxonomy that supports clinical reasoning.

### Concept
Define a strict `Enum` for `relationship_type` that maps to therapeutic concepts:
-   **Causal:** `precipitated_by`, `resulted_in`
-   **Pattern:** `reoccurs_in`, `cycles_with`
-   **Resolution:** `resolves`, `contradicts`
-   **Social:** `reply_to`, `mentions`

### Benefit
Enables powerful analytical queries:
-   *"Show me all patterns I have successfully resolved."*
-   *"Identify the most common precipitating event for my anxiety."*
