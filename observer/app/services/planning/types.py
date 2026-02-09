"""Type definitions for Planning Service."""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class StrategySearchCriteria:
    """Criteria for searching therapeutic strategies."""

    strategy_type: Optional[str] = None
    evidence_level: Optional[str] = None
    difficulty_min: Optional[int] = None
    difficulty_max: Optional[int] = None
    search: Optional[str] = None
    limit: int = 20
    offset: int = 0


@dataclass
class PathFindingContext:
    """Context for finding an emotional transition path.

    Encapsulates all necessary parameters for pathfinding, reducing
    argument count in service methods.
    """

    current_vac: List[float]
    goal_vac: List[float]
    max_waypoints: int = 3
    user_id: Optional[str] = None
    collection_id: Optional[str] = None
    user_history: Optional[Dict[str, Any]] = None
