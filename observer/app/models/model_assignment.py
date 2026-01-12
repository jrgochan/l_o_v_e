"""ModelAssignment Model - AI Function Configuration & Performance Tracking.

Persistent storage for Ollama model assignments to L.O.V.E.'s four AI functions with
real-time performance tracking. Enables dynamic model configuration, latency monitoring,
and usage analytics for optimizing AI model selection across the system.

Configuration Architecture:

    Four AI functions with independent model selection::

        Function-based routing:
        ──────────────────────
        1. semantic_vac → "llama3.1:8b-instruct-q4_0"
           Purpose: Real-time VAC from text (<3s target)

        2. multi_emotion → "llama3.1:70b-instruct-q4_0"
           Purpose: Complex emotion detection (accuracy priority)

        3. insight_generation → "mixtral:8x7b-instruct-v0.1"
           Purpose: Therapeutic insights (empathy + nuance)

        4. atlas_mapping → "phi-3:mini"
           Purpose: 87-emotion classification (speed + precision)

        Benefits of function-based routing:
        + Match model size to task complexity
        + Optimize speed vs accuracy per function
        + Independent optimization
        + Easy model A/B testing

Table Structure:

    Small, frequently-read configuration table::

        Schema:
        ──────
        function: VARCHAR(50) PRIMARY KEY
        - One of 4 AI function names
        - UNIQUE constraint (one assignment per function)
        - Natural primary key

        ai_model_name: VARCHAR(100) NOT NULL
        - Ollama model identifier
        - Example: "llama3.1:8b-instruct-q4_0"
        - Updated dynamically via API

        assigned_at: TIMESTAMP
        - When assignment last changed
        - Audit trail for configuration

        assigned_by: VARCHAR(100)
        - User who made assignment
        - Future: Link to admin user table

        Performance metrics:
        ───────────────────
        avg_latency_ms: FLOAT
        - Exponential moving average
        - Formula: (old_avg × 0.9) + (current × 0.1)
        - Tracks model performance

        total_invocations: INTEGER
        - Usage counter
        - Incremented on each AI call
        - Helps identify high-traffic functions

        last_used_at: TIMESTAMP
        - Most recent AI invocation
        - Idle function detection
        - Health monitoring

Performance Tracking Mechanism:

    Real-time latency monitoring::

        Exponential Moving Average (EMA):
        ────────────────────────────────

        Why EMA vs simple average?
        + Responsive to recent changes
        + Smooths outliers naturally
        + Fixed memory (no storage growth)
        + Lightweight computation

        Formula:
        new_avg = (old_avg × 0.9) + (current_latency × 0.1)

        Weight 90% old, 10% new:
        - Stable but adaptive
        - Recent values have more influence
        - Outliers don't dominate

        Example evolution:
        Initial: avg_latency_ms = 2000
        Call 1: 1800ms → avg = 1980ms
        Call 2: 1900ms → avg = 1972ms
        Call 3: 2500ms → avg = 2024ms (outlier smoothed)

        Usage counter:
        ─────────────
        total_invocations += 1

        Simple increment on each call
        Useful for:
        - Load balancing decisions
        - Cost estimation
        - Usage patterns
        - Function popularity

Model Selection Strategy:

    Default assignments by function::

        semantic_vac:
        ────────────
        Default: llama3.1:8b-instruct-q4_0
        Why: Balance of speed (2-3s) and accuracy
        Alternative: phi-3:mini (faster but less nuanced)

        multi_emotion:
        ─────────────
        Default: llama3.1:8b-instruct-q4_0
        Why: Good emotion understanding
        Alternative: llama3.1:70b (better but slower)

        insight_generation:
        ──────────────────
        Default: llama3.1:8b-instruct-q4_0
        Why: Therapeutic quality acceptable
        Alternative: llama3.1:70b (better empathy)

        atlas_mapping:
        ─────────────
        Default: llama3.1:8b-instruct-q4_0
        Why: Reliable classification
        Alternative: phi-3:mini (faster for simple task)

Dynamic Configuration:

    Runtime model changes without deployment::

        UI-driven updates:
        ─────────────────
        Admin UI → API call → Update assignment

        Benefits:
        + No server restart needed
        + Per-environment configuration
        + A/B testing enabled
        + Quick rollback on issues

        Process:
        1. Admin selects new model in UI
        2. PUT /api/ai-settings/{function}
        3. Validate model available in Ollama
        4. Update database row
        5. Next AI call uses new model

        Immediate effect:
        - No cache invalidation needed
        - Queries on each AI invocation
        - Minimal overhead (<1ms)

Example Usage:

    Query current assignments::

        from app.models.model_assignment import ModelAssignment
        from sqlalchemy import select

        stmt = select(ModelAssignment)
        result = await db.execute(stmt)
        assignments = result.scalars().all()

        for assignment in assignments:
            print(f"{assignment.function}: {assignment.ai_model_name}")
            print(f"  Latency: {assignment.avg_latency_ms}ms")
            print(f"  Invocations: {assignment.total_invocations}")

    Update assignment::

        stmt = select(ModelAssignment).where(
            ModelAssignment.function == "semantic_vac"
        )
        result = await db.execute(stmt)
        assignment = result.scalar_one_or_none()

        if assignment:
            assignment.ai_model_name = "phi-3:mini"
            assignment.assigned_at = datetime.utcnow()
            assignment.assigned_by = "admin_user"
        else:
            assignment = ModelAssignment(
                function="semantic_vac",
                ai_model_name="phi-3:mini",
                assigned_by="admin_user"
            )
            db.add(assignment)

        await db.commit()

    Update performance metrics::

        # After AI call completes
        assignment.total_invocations += 1
        assignment.last_used_at = datetime.utcnow()

        # Update exponential moving average
        if assignment.avg_latency_ms:
            assignment.avg_latency_ms = (
                assignment.avg_latency_ms * 0.9 +
                current_latency * 0.1
            )
        else:
            assignment.avg_latency_ms = current_latency

        await db.commit()

Performance Characteristics:
    - Table size: 4 rows (one per function)
    - Query latency: <1ms (tiny table, cached)
    - Update latency: 2-5ms (single row)
    - Memory footprint: Negligible
    - Queries per request: 1 (lookup for function)

Integration Points:

    Configuration layer::

        Read by:
        ───────
        - AIModelService: Get assignments
        - Listener: Query semantic_vac, multi_emotion models
        - Observer: Query insight_generation, atlas_mapping models

        Written by:
        ──────────
        - AIModelService: Update assignments
        - AIModelService: Update metrics
        - Admin API: Configuration changes

Design Decisions:

    Why function as primary key?::

        Natural key advantages:
        + One assignment per function (enforced)
        + Meaningful primary key
        + Simple queries
        + No surrogate key overhead

        Alternative (UUID primary key):
        - Need UNIQUE constraint on function anyway
        - More complex queries
        - Extra index

        Decision: Natural key on function

    Why database vs config file?::

        Database storage chosen:
        + Dynamic updates (no restart)
        + UI-editable
        + Performance tracking integrated
        + Per-environment config

        Alternative (YAML/ENV file):
        + Simple
        + Version controlled
        - Requires deployment to change
        - No performance tracking
        - Environment variables cluttered

        Decision: Database for flexibility

    Why exponential moving average?::

        EMA advantages:
        + Adapts to performance changes
        + Smooths outliers
        + Fixed storage
        + Infinite history

        Alternative (store all latencies):
        - Accurate averages
        - Unbounded growth
        - Complex queries

        Decision: EMA for efficiency

References:
    - AI model service: observer/app/services/ai_model_service.py
    - Ollama models: https://github.com/ollama/ollama/blob/main/docs/api.md
    - EMA: Investopedia - Exponential Moving Average
    - Natural keys: Fowler (2003). Patterns of Enterprise Application Architecture
    - Configuration management: 12factor.net/config
"""

# pylint: disable=not-callable

from datetime import datetime
from typing import Optional

from sqlalchemy import Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ModelAssignment(Base):
    """Model assignment for AI functions."""

    __tablename__ = "model_assignments"

    # Primary key: the function name
    function: Mapped[str] = mapped_column(String(50), primary_key=True)

    # Model assignment
    ai_model_name: Mapped[str] = mapped_column(String(100))
    assigned_at: Mapped[datetime] = mapped_column(server_default=func.now())
    assigned_by: Mapped[Optional[str]] = mapped_column(String(100))  # Future: user ID

    # Performance tracking
    avg_latency_ms: Mapped[Optional[float]] = mapped_column(Float)
    total_invocations: Mapped[int] = mapped_column(Integer, default=0)
    last_used_at: Mapped[Optional[datetime]] = mapped_column()

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return f"<ModelAssignment(function='{self.function}', model='{self.ai_model_name}')>"
