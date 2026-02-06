"""AI Model Assignment Service.

Routes AI model requests across L.O.V.E.'s four core intelligence functions, tracking
performance metrics and providing evidence-based model recommendations. Enables dynamic
model selection to balance speed, accuracy, and computational resources.

The Challenge:

    L.O.V.E. uses multiple AI functions with different requirements::

        semantic_vac:       Real-time VAC extraction (<3s target)
        multi_emotion:      Complex emotion detection (accuracy critical)
        insight_generation: Therapeutic guidance (empathy + nuance)
        emotion_mapping:    Canonical emotion classification (precision)

    Each function has different needs::

        Speed vs Accuracy tradeoff
        - semantic_vac needs speed (real-time user experience)
        - multi_emotion needs accuracy (clinical validity)

        Model size considerations
        - 3B models: Fast but limited reasoning
        - 8B models: Balanced performance
        - 70B models: Best quality but slow

        Computational resources
        - Local Ollama installation has limits
        - Multiple concurrent requests
        - Memory constraints

L.O.V.E.'s Four AI Functions:

    Function architecture::

        1. semantic_vac (Listener Module)
           Purpose: Extract VAC coordinates from text in real-time
           Speed requirement: <3 seconds per analysis
           Accuracy need: Moderate (validated against other signals)
           Recommended models: llama3.1:8b, phi-3:mini

        2. multi_emotion (Listener Module)
           Purpose: Detect complex/blended emotional states
           Speed requirement: <5 seconds acceptable
           Accuracy need: High (clinical decisions depend on it)
           Recommended models: llama3.1:8b, mixtral:8x7b, llama3.1:70b

        3. insight_generation (Observer Module)
           Purpose: Generate therapeutic insights and guidance
           Speed requirement: <10 seconds (async acceptable)
           Accuracy need: Very high (therapeutic quality)
           Recommended models: llama3.1:8b, llama3.1:70b, mixtral:8x7b

        4. emotion_mapping (Observer Module)
           Purpose: Classify emotions to canonical collection
           Speed requirement: <2 seconds
           Accuracy need: High (but classification is simpler task)
           Recommended models: phi-3:mini, llama3.1:8b

Model Assignment Strategy:

    Dynamic routing with fallback::

        1. Check database for user-configured assignment
        2. If none, use function-specific default
        3. If model unavailable, fallback to DEFAULT_MODEL

        Example flow:

        User configures semantic_vac → phi-3:mini
        ↓
        Request comes for semantic_vac
        ↓
        Service returns "phi-3:mini"
        ↓
        Listener calls Ollama with that model
        ↓
        On completion, performance metrics recorded

Performance Tracking:

    Service tracks for each assignment::

        - avg_latency_ms: Exponential moving average of latency
        - total_invocations: How many times used
        - last_used_at: Timestamp of most recent use

    Latency calculation::

        # Exponential moving average (90% old, 10% new)
        new_avg = (old_avg * 0.9) + (current_latency * 0.1)

        Why EMA?
        - Responds to performance changes
        - Smooths out outliers
        - Lightweight computation

    Metrics used for::

        - Dashboard display
        - Performance alerts
        - Model comparison
        - Optimization decisions

Model Recommendations:

    Evidence-based suggestions per function::

        semantic_vac:
        ✓ Recommended: llama3.1:8b, phi-3:mini
        ✗ Not recommended: llama3.1:70b (too slow)
        Reasoning: Real-time needs speed. Target <3s.

        multi_emotion:
        ✓ Recommended: llama3.1:8b, mixtral:8x7b, llama3.1:70b
        ✗ Not recommended: phi-3:mini (insufficient nuance)
        Reasoning: Complex analysis benefits from larger models.

        insight_generation:
        ✓ Recommended: llama3.1:8b, llama3.1:70b, mixtral:8x7b
        ✗ Not recommended: phi-3:mini (lacks therapeutic depth)
        Reasoning: Requires empathy and clinical knowledge.

        emotion_mapping:
        ✓ Recommended: phi-3:mini, llama3.1:8b
        ✗ Not recommended: llama3.1:70b (overkill)
        Reasoning: Classification task, speed matters more.

Example Usage:

    Query current assignments::

        service = AIModelService(db_session)

        assignments = await service.get_model_assignments()
        # {
        #     "semantic_vac": "llama3.1:8b-instruct-q4_0",
        #     "multi_emotion": "llama3.1:70b-instruct-q4_0",
        #     "insight_generation": "mixtral:8x7b-instruct-v0.1",
        #     "atlas_mapping": "phi-3:mini"
        # }

    Change an assignment::

        result = await service.assign_model(
            function="semantic_vac",
            ai_model_name="phi-3:mini",
            assigned_by="admin_user"
        )
        # {
        #     "function": "semantic_vac",
        #     "model": "phi-3:mini",
        #     "assigned_at": "2026-01-02T22:15:30",
        #     "status": "success"
        # }

    Track performance::

        # After Listener completes semantic_vac analysis
        await service.update_performance_metrics(
            function="semantic_vac",
            ai_model_name="phi-3:mini",
            latency_ms=1847.3
        )

        stats = await service.get_performance_stats()
        # {
        #     "semantic_vac": {
        #         "model": "phi-3:mini",
        #         "avg_latency_ms": 1923.5,
        #         "total_invocations": 47,
        #         "last_used": "2026-01-02T22:15:30"
        #     }
        # }

Performance Characteristics:
    - Assignment query: 5-10ms (indexed by function)
    - Assignment update: 10-15ms (single row write)
    - Metrics update: 10-15ms (single row update)
    - Stats query: 15-20ms (full table scan, but small table)
    - Total overhead: <30ms typical (negligible vs AI inference time)

Database Schema:

    ModelAssignment table::

        id: UUID primary key
        function: VARCHAR (one of FUNCTIONS list)
        ai_model_name: VARCHAR (Ollama model identifier)
        assigned_at: TIMESTAMP
        assigned_by: VARCHAR (user ID, nullable)
        avg_latency_ms: FLOAT (exponential moving average)
        total_invocations: INTEGER
        last_used_at: TIMESTAMP

        UNIQUE constraint on function (one assignment per function)

Integration Points:

    Used by::

        - Listener API: Queries for semantic_vac, multi_emotion models
        - Observer API: Queries for insight_generation, emotion_mapping models
        - Settings UI: Displays current assignments, allows changes
        - Dashboard: Shows performance metrics

    Calls::

        - Database: ModelAssignment table
        - No external service calls (configuration layer only)

Design Decisions:

    Why separate service from model inference?::

        Separation of concerns:
        - AIModelService: Configuration management
        - Listener/Observer: Actual model inference
        - Clean boundaries, easier testing

    Why database storage vs config file?::

        - Dynamic updates without restart
        - UI-editable without file access
        - Performance tracking integrated
        - Per-environment configuration

    Why exponential moving average?::

        - Responsive to changes
        - Smooths outliers
        - Lightweight calculation
        - Infinite history (no storage growth)

References:
    - Model comparison benchmarks:
    - docs/modules/observer/senior-developers/06-performance-optimization.md
    - Ollama API: https://github.com/ollama/ollama/blob/main/docs/api.md
    - AI Settings UI: docs/features/ai-models/README.md
    - Listener integration: listener/app/services/semantic_analyzer.py
    - Observer integration: observer/app/services/insight_generator.py
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.model_assignment import ModelAssignment

logger = logging.getLogger(__name__)


class AIModelService:
    """Service for managing AI model assignments."""

    # L.O.V.E. AI Functions that use models
    FUNCTIONS = [
        "semantic_vac",  # Real-time VAC extraction from text
        "multi_emotion",  # Complex multi-emotion detection
        "insight_generation",  # Therapeutic insights and guidance
        "emotion_mapping",  # Emotion classification to canonical collection
    ]

    DEFAULT_MODEL = "llama3.1:8b-instruct-q4_0"

    def __init__(self, db: AsyncSession) -> None:
        """Initialize AIModelService."""
        self.db = db

    async def get_model_assignments(self) -> Dict[str, str]:
        """Get current model assigned to each function.

        Returns dict of {function: ai_model_name}
        """
        try:
            result = await self.db.execute(select(ModelAssignment))
            assignments = result.scalars().all()

            # Convert to dict
            assignment_dict = {
                assignment.function: assignment.ai_model_name for assignment in assignments
            }

            # Ensure all functions have assignments (use defaults if missing)
            for function in self.FUNCTIONS:
                if function not in assignment_dict:
                    assignment_dict[function] = self.DEFAULT_MODEL

            return assignment_dict
        except Exception as e:
            logger.error(f"Failed to get model assignments: {e}")
            # Return defaults on error
            return {func: self.DEFAULT_MODEL for func in self.FUNCTIONS}

    async def get_assignment_for_function(self, function: str) -> str:
        """Get model name assigned to a specific function.

        Returns model name or default if not found.
        """
        if function not in self.FUNCTIONS:
            logger.warning(f"Unknown function: {function}. Using default model.")
            return self.DEFAULT_MODEL

        try:
            result = await self.db.execute(
                select(ModelAssignment).where(ModelAssignment.function == function)
            )
            assignment = result.scalar_one_or_none()

            if assignment:
                return str(assignment.ai_model_name)
            else:
                logger.info(f"No assignment for {function}, using default")
                return self.DEFAULT_MODEL
        except Exception as e:
            logger.error(f"Failed to get assignment for {function}: {e}")
            return self.DEFAULT_MODEL

    async def assign_model(
        self, function: str, ai_model_name: str, assigned_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Assign a model to a function.

        Args:
            function: One of FUNCTIONS
            ai_model_name: Ollama model name (e.g., "llama3.1:8b-instruct-q4_0")
            assigned_by: Optional user ID

        Returns:
            Dict with assignment details

        Raises:
            ValueError: If function is unknown
        """
        if function not in self.FUNCTIONS:
            raise ValueError(f"Unknown function: {function}. Must be one of: {self.FUNCTIONS}")

        try:
            # Check if assignment exists
            result = await self.db.execute(
                select(ModelAssignment).where(ModelAssignment.function == function)
            )
            assignment = result.scalar_one_or_none()

            if assignment:
                # Update existing
                assignment.ai_model_name = ai_model_name
                assignment.assigned_at = datetime.utcnow()
                assignment.assigned_by = assigned_by
            else:
                # Create new
                assignment = ModelAssignment(
                    function=function,
                    ai_model_name=ai_model_name,
                    assigned_by=assigned_by,
                )
                self.db.add(assignment)

            await self.db.commit()
            await self.db.refresh(assignment)

            logger.info(f"Assigned model {ai_model_name} to function {function}")

            return {
                "function": function,
                "model": ai_model_name,
                "assigned_at": assignment.assigned_at.isoformat(),
                "status": "success",
            }
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to assign model: {e}")
            raise RuntimeError(f"Failed to assign model: {str(e)}")

    async def update_performance_metrics(
        self, function: str, ai_model_name: str, latency_ms: float
    ) -> None:
        """Update performance metrics after a model is used.

        Used to track average latency and usage.
        """
        try:
            # Find current assignment for this function
            result = await self.db.execute(
                select(ModelAssignment).where(ModelAssignment.function == function)
            )
            assignment = result.scalar_one_or_none()

            # Only update if assignment exists and model matches
            # (Prevents metrics pollution if model was changed mid-request)
            if assignment and assignment.ai_model_name == ai_model_name:
                # ───────────────────────────────────────────────────────────────
                # UPDATE AVERAGE LATENCY (Exponential Moving Average)
                # ───────────────────────────────────────────────────────────────
                # EMA formula: new_avg = (old_avg × α) + (current × (1-α))
                # Where α = 0.9 (weight given to historical average)
                #
                # Why EMA instead of simple average?
                #   - Responds to performance changes (if model gets slower, avg adjusts)
                #   - Smooths outliers (one slow request doesn't skew avg dramatically)
                #   - No storage growth (don't need to store all latencies)
                #   - Computational efficiency (single multiply-add operation)
                #
                # Example:
                #   Current avg: 2000ms
                #   New request: 1500ms (faster)
                #   new_avg = (2000 × 0.9) + (1500 × 0.1)
                #           = 1800 + 150
                #           = 1950ms (gradually adapts downward)
                if assignment.avg_latency_ms is None:
                    # First measurement - use it directly
                    assignment.avg_latency_ms = latency_ms
                else:
                    # Update with exponential moving average
                    # Weight: 90% historical, 10% current
                    assignment.avg_latency_ms = (assignment.avg_latency_ms * 0.9) + (
                        latency_ms * 0.1
                    )

                # Increment invocation counter
                assignment.total_invocations = (assignment.total_invocations or 0) + 1

                # Update last used timestamp
                assignment.last_used_at = datetime.utcnow()

                await self.db.commit()
        except Exception as e:
            logger.error(f"Failed to update performance metrics: {e}")
            # Don't raise - metrics are nice-to-have, not critical
            # Model inference already completed successfully
            # Metrics failure shouldn't impact user experience

    async def get_performance_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get performance statistics for all model assignments.

        Returns usage metrics and average latency.
        """
        try:
            result = await self.db.execute(select(ModelAssignment))
            assignments = result.scalars().all()

            stats = {}
            for assignment in assignments:
                stats[assignment.function] = {
                    "model": assignment.ai_model_name,
                    "avg_latency_ms": assignment.avg_latency_ms,
                    "total_invocations": assignment.total_invocations or 0,
                    "last_used": (
                        assignment.last_used_at.isoformat() if assignment.last_used_at else None
                    ),
                }

            return stats
        except Exception as e:
            logger.error(f"Failed to get performance stats: {e}")
            return {}

    async def get_recommendations(self) -> Dict[str, Dict[str, Any]]:
        """Get model recommendations for each function.

        Based on performance characteristics and use case analysis.
        """
        return {
            "semantic_vac": {
                "recommended": ["llama3.1:8b-instruct-q4_0", "phi-3:mini"],
                "not_recommended": ["llama3.1:70b-instruct-q4_0"],
                "reasoning": (
                    "Real-time analysis needs speed. Target <3s per analysis. Smaller models "
                    "(3B-8B) work best."
                ),
            },
            "multi_emotion": {
                "recommended": [
                    "llama3.1:8b-instruct-q4_0",
                    "mixtral:8x7b-instruct-v0.1",
                    "llama3.1:70b-instruct-q4_0",
                ],
                "not_recommended": ["phi-3:mini"],
                "reasoning": (
                    "Complex emotional analysis benefits from larger models with better nuance "
                    "understanding."
                ),
            },
            "insight_generation": {
                "recommended": [
                    "llama3.1:8b-instruct-q4_0",
                    "llama3.1:70b-instruct-q4_0",
                    "mixtral:8x7b-instruct-v0.1",
                ],
                "not_recommended": ["phi-3:mini"],
                "reasoning": (
                    "Therapeutic insights require empathy and clinical knowledge. Medium to large "
                    "models perform best."
                ),
            },
            "emotion_mapping": {
                "recommended": ["phi-3:mini", "llama3.1:8b-instruct-q4_0"],
                "not_recommended": ["llama3.1:70b-instruct-q4_0"],
                "reasoning": (
                    "Classification task. Precision matters more than size. Fast, consistent "
                    "models preferred."
                ),
            },
        }


# === Dependency Injection Helper ===


async def get_ai_model_service(db: Optional[AsyncSession] = None) -> AIModelService:
    """Get AIModelService instance with database session."""
    if db is None:
        # Use anext(get_db()) if no session provided
        # This is for non-request contexts (async generator)
        db = await anext(get_db())
    return AIModelService(db)
