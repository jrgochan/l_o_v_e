"""Transitions Framework API.

This package implements the Emotional Transition Framework, allowing users to:
- Plan emotional journeys from current state to desired state (`planning.py`).
- Execute and track progress along these journeys (`execution.py`).
- Access a library of therapeutic strategies (`library.py`).
- Analyze journey history and strategy effectiveness (`analysis.py`).
"""

from app.api.routes.transitions.analysis import (
    get_user_effective_strategies,
    get_user_journey_history,
)
from app.api.routes.transitions.execution import (
    get_journey_status,
    mark_waypoint_reached,
    start_journey,
)
from app.api.routes.transitions.library import get_strategy_details, search_strategies
from app.api.routes.transitions.planning import (
    _estimate_difficulty,
    _estimate_waypoint_time,
    _generate_waypoint_reasoning,
    explain_transition_path,
    find_alternative_paths,
    generate_transition_path,
    get_step_alternatives,
)
from app.api.routes.transitions.router import router

__all__ = [
    "router",
    "generate_transition_path",
    "explain_transition_path",
    "find_alternative_paths",
    "get_step_alternatives",
    "_estimate_waypoint_time",
    "_estimate_difficulty",
    "_generate_waypoint_reasoning",
    "start_journey",
    "mark_waypoint_reached",
    "get_journey_status",
    "search_strategies",
    "get_strategy_details",
    "get_user_journey_history",
    "get_user_journey_history",
    "get_user_effective_strategies",
    "PathPlanner",
    "UserJourney",
    "StrategyRecommender",
]

from app.models.transition_strategy import UserJourney

# Expose classes for tests that import them from here
from app.services.planning.core import PathPlanner
from app.services.recommendation.strategies import StrategyRecommender
