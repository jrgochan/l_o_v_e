"""Bootstrap API - Cold-Start Data for New Users.

Aggregate population-level insights solving the cold-start problem for new users without
personalized history. Provides research-backed strategy effectiveness ratings, pre-validated
path templates, context-aware recommendations, and challenge pattern solutions derived from
clinical research and anonymized user data.

The Cold-Start Challenge:

    New users lack personalized data::

        Without bootstrap data:
        - No strategy effectiveness ratings
        - No personalized recommendations
        - No path success probabilities
        - Generic, unhelpful guidance

        Result: Trial and error, frustration

        With bootstrap data:
        - Population-level effectiveness scores
        - Research-backed path templates
        - Context-aware strategy filtering
        - Challenge-specific guidance

        Result: Useful recommendations from day one

Four Bootstrap Data Types:

    Population-level intelligence::

        1. Strategy Effectiveness
           ──────────────────────
           Aggregate ratings: "Deep Breathing: 4.3/5 avg"
           Source: Anonymized user attempts + research
           Use: Recommend strategies to new users

        2. Path Templates
           ──────────────
           Pre-validated journeys: "Anxiety → Calm"
           Source: Successful user journeys + curated
           Use: Suggest proven transition paths

        3. Context Modifiers
           ─────────────────
           Situational recommendations: "Morning: energizing strategies"
           Source: Time/energy/location considerations
           Use: Filter strategies by context

        4. Challenge Patterns
           ──────────────────
           Common emotional challenges: "Anxiety regulation"
           Source: Clinical patterns + research
           Use: Structured intervention plans

Endpoint Details:

    GET /strategy-effectiveness
    ───────────────────────────
    Purpose: Global strategy ratings

    Response Structure:
    {
        "ratings": [
            {
                "strategy_id": "uuid",
                "strategy_name": "Deep Breathing",
                "avg_rating": 4.3,
                "total_attempts": 1247,
                "success_rate": 0.82,
                "evidence_level": "meta_analysis"
            },
            ...
        ]
    }

    Use: New user gets population averages

    GET /path-templates
    ───────────────────
    Purpose: Pre-validated transition paths

    Query params:
    - from_emotion: Filter by start
    - to_emotion: Filter by goal
    - max_difficulty: Filter by difficulty

    Response Structure:
    {
        "templates": [
            {
                "from_emotion": "Anxiety",
                "to_emotion": "Calm",
                "waypoints": ["Curiosity", "Acceptance"],
                "difficulty": 0.65,
                "avg_success_rate": 0.78,
                "total_attempts": 523
            },
            ...
        ]
    }

    Use: "Others succeeded with this path"

    GET /context-recommendations
    ────────────────────────────
    Purpose: Situational strategy filtering

    Query params:
    - time_of_day: morning|afternoon|evening|late_night
    - energy_level: high|moderate|low
    - location: home|work|public
    - available_time: 5|15|30|60_plus minutes
    - experience_level: beginner|intermediate|advanced

    Response:
    {
        "context": {...},
        "recommended_strategies": ["Deep Breathing", "Grounding"],
        "avoid_strategies": ["Intense Exercise"],
        "reasoning": [...]
    }

    Sample:
    - Late night + low energy → Gentle techniques
    - Morning + high energy → Active strategies
    - Public location → Subtle techniques

    GET /challenge-patterns
    ───────────────────────
    Purpose: Structured challenge solutions

    Query params:
    - challenge_name: anxiety|shame|anger|grief|etc.

    Response:
    {
        "patterns": [
            {
                "challenge_name": "anxiety_regulation",
                "description": "Managing anxiety symptoms",
                "progressive_strategies": [
                    {
                        "phase": 1,
                        "focus": "Immediate regulation",
                        "strategies": ["Deep Breathing", "Grounding"]
                    },
                    {
                        "phase": 2,
                        "focus": "Understanding triggers",
                        "strategies": ["Thought Monitoring"]
                    },
                    ...
                ]
            }
        ]
    }

    GET /all
    ────────
    Purpose: Bulk bootstrap data load

    Returns all bootstrap data types
    Client caches for offline use
    Reduces API calls

Performance Characteristics:
    - GET /strategy-effectiveness: 10-30ms
    - GET /path-templates: 15-40ms (filtering)
    - GET /context-recommendations: 20-50ms (complex logic)
    - GET /challenge-patterns: 10-30ms
    - GET /all: 50-150ms (bulk data)

Integration Points:

    Onboarding flow::

        1. New user signs up
        2. App loads bootstrap data (GET /all)
        3. User explores atlas
        4. Recommendations use bootstrap data
        5. As user provides ratings, personalization takes over
        6. Bootstrap data fades to background

Design Decisions:

    Why population-level data?::

        Cold-start solution:
        + Better than nothing
        + Research-validated
        + Continuously improved
        + Privacy-preserving (aggregated)

        Transition to personalized:
        - Start: 100% bootstrap
        - After 5 attempts: 70% bootstrap, 30% personal
        - After 20 attempts: 30% bootstrap, 70% personal
        - Long-term: 10% bootstrap, 90% personal

    Why JSONB storage?::

        Flexible bootstrap schema:
        + Easy to add new data types
        + No migration churn
        + Queryable with PostgreSQL
        + Version evolution simple

References:
    - Bootstrap data design: observer/SEEDING_SYSTEM_README.md
    - Cold-start problem: Schein et al. (2002). Methods and Metrics for Cold-Start Recommendations
    - Strategy database: docs/modules/observer/senior-developers/04-transition-system.md
"""

import json
import logging
from dataclasses import dataclass
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/strategy-effectiveness", tags=["Bootstrap"])
async def get_strategy_effectiveness(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Dict[str, Any]:
    """Get global strategy effectiveness ratings from bootstrap data.

    Returns aggregate success rates and ratings for strategies,
    useful for new users without personalized data.
    """
    try:
        query = text(
            """
            SELECT content
            FROM bootstrap_data
            WHERE data_type = 'strategy_effectiveness'
            ORDER BY created_at DESC
            LIMIT 1
        """
        )
        result = await db.execute(query)
        row = result.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="No strategy effectiveness data found")

        content = row[0]

        # Parse JSON if it's stored as string
        if isinstance(content, str):
            content = json.loads(content)

        return {
            "success": True,
            "data_type": "strategy_effectiveness",
            "ratings": (content.get("ratings", []) if isinstance(content, dict) else content),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get strategy effectiveness: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/path-templates", tags=["Bootstrap"])
async def get_path_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
    from_emotion: Annotated[Optional[str], Query(description="Filter by starting emotion")] = None,
    to_emotion: Annotated[Optional[str], Query(description="Filter by goal emotion")] = None,
    max_difficulty: Annotated[
        Optional[float], Query(description="Maximum difficulty (0-1)")
    ] = None,
) -> Dict[str, Any]:  # pylint: disable=too-many-positional-arguments
    """Get pre-computed optimal path templates for common emotional transitions.

    These templates provide starting points for path planning based on
    aggregate user data and research-backed sequences.
    """
    try:
        query = text(
            """
            SELECT content
            FROM bootstrap_data
            WHERE data_type = 'path_template'
            ORDER BY created_at DESC
        """
        )
        result = await db.execute(query)
        rows = result.fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail="No path templates found")

        # Collect all templates
        templates = []
        for row in rows:
            content = row[0]
            if isinstance(content, str):
                content = json.loads(content)
            templates.append(content)

        # Apply filters
        filtered = templates

        if from_emotion:
            filtered = [
                t for t in filtered if t.get("from_emotion", "").lower() == from_emotion.lower()
            ]

        if to_emotion:
            filtered = [
                t for t in filtered if t.get("to_emotion", "").lower() == to_emotion.lower()
            ]

        if max_difficulty is not None:
            filtered = [t for t in filtered if t.get("difficulty", 1.0) <= max_difficulty]

        return {
            "success": True,
            "data_type": "path_template",
            "total_count": len(templates),
            "filtered_count": len(filtered),
            "templates": filtered,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get path templates: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


def _apply_context_filter(
    modifier: Any,
    modifier_type_name: str,
    context_value: Optional[str],
    recommendations: dict[str, Any],
) -> None:
    """Apply a single context filter to recommendations.

    Args:
        modifier: The modifier data from database.
        modifier_type_name: Type of modifier (e.g., 'time_of_day').
        context_value: User's context value (e.g., 'morning').
        recommendations: Dict[str, Any] to update with strategies.
    """
    if not context_value:
        return

    if modifier.get("modifier_type") != modifier_type_name:
        return

    context_data = modifier.get("modifier_value", {}).get(context_value, {})
    if context_data:
        recommendations["recommended_strategies"].extend(
            context_data.get("recommended_strategies", [])
        )
        if "avoid_strategies" in context_data:
            recommendations["avoid_strategies"].extend(context_data.get("avoid_strategies", []))


def _fetch_context_modifiers(db_rows: Any) -> list[Any]:
    """Parse context modifiers from database rows."""
    modifiers = []
    for row in db_rows:
        content = row[0]
        if isinstance(content, str):
            content = json.loads(content)
        modifiers.append(content)
    return modifiers


def _build_recommendations_dict(
    time_of_day: Optional[str],
    energy_level: Optional[str],
    location: Optional[str],
    available_time: Optional[str],
    experience_level: Optional[str],
) -> dict[str, Any]:
    """Build initial recommendations dictionary with context."""
    return {
        "context": {
            "time_of_day": time_of_day,
            "energy_level": energy_level,
            "location": location,
            "available_time": available_time,
            "experience_level": experience_level,
        },
        "recommended_strategies": [],
        "avoid_strategies": [],
        "reasoning": [],
    }


@dataclass
class ContextRecommendationsParams:
    """Dependency class for context recommendation parameters."""

    time_of_day: Annotated[
        Optional[str],
        Query(description="Time: morning, afternoon, evening, late_night"),
    ] = None
    energy_level: Annotated[Optional[str], Query(description="Energy: high, moderate, low")] = None
    location: Annotated[Optional[str], Query(description="Location: home, work, public")] = None
    available_time: Annotated[
        Optional[str],
        Query(description="Time: 5_minutes, 15_minutes, 30_minutes, 60_plus_minutes"),
    ] = None
    experience_level: Annotated[
        Optional[str], Query(description="Level: beginner, intermediate, advanced")
    ] = None


@router.get("/context-recommendations", tags=["Bootstrap"])
async def get_context_recommendations(
    db: Annotated[AsyncSession, Depends(get_db)],
    params: Annotated[ContextRecommendationsParams, Depends()],
) -> Dict[str, Any]:
    """Get context-aware strategy recommendations based on situational factors.

    Filters strategies by time of day, energy level, location, available time,
    and user experience level to provide maximally relevant suggestions.
    """
    try:
        query = text(
            """
            SELECT content
            FROM bootstrap_data
            WHERE data_type = 'context_modifier'
            ORDER BY created_at DESC
        """
        )
        result = await db.execute(query)
        rows = result.fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail="No context modifier data found")

        # Parse modifiers
        modifiers = _fetch_context_modifiers(rows)

        # Build recommendations structure
        recommendations = _build_recommendations_dict(
            params.time_of_day,
            params.energy_level,
            params.location,
            params.available_time,
            params.experience_level,
        )

        # Apply each context filter
        for modifier in modifiers:
            _apply_context_filter(modifier, "time_of_day", params.time_of_day, recommendations)
            _apply_context_filter(modifier, "energy_level", params.energy_level, recommendations)
            _apply_context_filter(modifier, "location", params.location, recommendations)
            _apply_context_filter(
                modifier, "available_time", params.available_time, recommendations
            )
            _apply_context_filter(
                modifier, "experience_level", params.experience_level, recommendations
            )

        # Deduplicate
        recommendations["recommended_strategies"] = list(
            set(recommendations["recommended_strategies"])
        )
        recommendations["avoid_strategies"] = list(set(recommendations["avoid_strategies"]))

        return {
            "success": True,
            "data_type": "context_recommendation",
            "recommendations": recommendations,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get context recommendations: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/challenge-patterns", tags=["Bootstrap"])
async def get_challenge_patterns(
    db: Annotated[AsyncSession, Depends(get_db)],
    challenge_name: Annotated[
        Optional[str], Query(description="Specific challenge pattern")
    ] = None,
) -> Dict[str, Any]:
    """Get common challenge patterns with recommended strategy progressions.

    Returns structured approaches for common emotional challenges
    (e.g., anxiety, shame, anger) with progressive difficulty strategies.
    """
    try:
        query = text(
            """
            SELECT content
            FROM bootstrap_data
            WHERE data_type = 'challenge_pattern'
            ORDER BY created_at DESC
        """
        )
        result = await db.execute(query)
        rows = result.fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail="No challenge patterns found")

        # Collect all patterns
        patterns = []
        for row in rows:
            content = row[0]
            if isinstance(content, str):
                content = json.loads(content)
            patterns.append(content)

        # Filter if specific challenge requested
        if challenge_name:
            patterns = [
                p for p in patterns if p.get("challenge_name", "").lower() == challenge_name.lower()
            ]

        return {
            "success": True,
            "data_type": "challenge_pattern",
            "total_count": len(patterns),
            "patterns": patterns,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get challenge patterns: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/all", tags=["Bootstrap"])
async def get_all_bootstrap_data(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Dict[str, Any]:
    """Get all bootstrap data in one call.

    Useful for initial app load to cache bootstrap data on the client.
    """
    try:
        query = text(
            """
            SELECT data_type, data_category, content, created_at
            FROM bootstrap_data
            ORDER BY data_type, data_category, created_at DESC
        """
        )
        result = await db.execute(query)
        rows = result.fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail="No bootstrap data found")

        # Organize by type
        data: Dict[str, List[Any]] = {
            "strategy_effectiveness": [],
            "path_templates": [],
            "context_modifiers": [],
            "challenge_patterns": [],
        }

        for row in rows:
            data_type, data_category, content, created_at = row

            if isinstance(content, str):
                content = json.loads(content)

            item = {
                "data_type": data_type,
                "data_category": data_category,
                "content": content,
                "created_at": created_at.isoformat() if created_at else None,
            }

            if data_type == "strategy_effectiveness":
                data["strategy_effectiveness"].append(item)
            elif data_type == "path_template":
                data["path_templates"].append(item)
            elif data_type == "context_modifier":
                data["context_modifiers"].append(item)
            elif data_type == "challenge_pattern":
                data["challenge_patterns"].append(item)

        return {"success": True, "total_records": len(rows), "data": data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get all bootstrap data: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e
