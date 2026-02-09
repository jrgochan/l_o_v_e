"""Module documentation."""

import logging
import time
from queue import PriorityQueue
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

import numpy as np

from app.models.emotion_definition import EmotionDefinition
from app.services.planning.graph import TransitionGraph
from app.services.planning.types import PathFindingContext

logger = logging.getLogger(__name__)


class AStarSearcher:
    """Implements A* search algorithm over the TransitionGraph."""

    def __init__(self, graph: TransitionGraph):
        """Docstring."""
        self.graph = graph

    async def find_path(
        self,
        start: EmotionDefinition,
        goal: EmotionDefinition,
        context: PathFindingContext,
    ) -> Tuple[List[List[EmotionDefinition]], Dict[str, Any]]:
        """Run A* pathfinding."""
        # Priority queue structure: (f_cost, counter, emotion, path)
        open_set: PriorityQueue[Tuple[float, int, EmotionDefinition, List[EmotionDefinition]]] = (
            PriorityQueue()
        )
        counter = 0
        open_set.put((0.0, counter, start, [start]))
        counter += 1

        metrics = {
            "nodes_explored": 0,
            "max_queue_size": 1,
            "pruned_paths": 0,
            "search_depth": 0,
            "execution_time_ms": 0.0,
        }
        start_time = time.perf_counter()

        visited = set()
        best_paths: List[List[EmotionDefinition]] = []

        while not open_set.empty() and len(best_paths) < 3:
            metrics["max_queue_size"] = max(metrics["max_queue_size"], open_set.qsize())
            _, _, current, path = open_set.get()

            metrics["nodes_explored"] += 1
            metrics["search_depth"] = max(metrics["search_depth"], len(path))

            if current.id in visited:
                metrics["pruned_paths"] += 1
                continue

            visited.add(current.id)

            # Goal check
            if current.category == goal.category:
                if current.id != goal.id:
                    refined_path = path + [goal]
                else:
                    refined_path = path
                best_paths.append(refined_path)
                continue

            # Pruning
            if len(path) > context.max_waypoints + 1:
                metrics["pruned_paths"] += 1
                continue

            # Expansion
            counter = await self._expand_neighbors(
                current, goal, context, (path, visited, open_set, counter)
            )

        metrics["execution_time_ms"] = round((time.perf_counter() - start_time) * 1000, 2)

        return best_paths, metrics

    async def _expand_neighbors(
        self,
        current: EmotionDefinition,
        goal: EmotionDefinition,
        context: PathFindingContext,
        search_state: Tuple[
            List[EmotionDefinition],
            set[UUID],
            PriorityQueue[Tuple[float, int, EmotionDefinition, List[EmotionDefinition]]],
            int,
        ],
    ) -> int:
        """Expand neighbors and add to open set."""
        path, visited, open_set, counter = search_state
        neighbors = await self.graph.get_valid_neighbors(current, goal, context.collection_id)

        for neighbor in neighbors:
            if neighbor.id not in visited:
                g_cost = self._calculate_g_cost(path, neighbor, context.user_history)
                h_cost = self._heuristic_cost(neighbor, goal)
                f_cost = g_cost + h_cost

                new_path = path + [neighbor]
                open_set.put((f_cost, counter, neighbor, new_path))
                counter += 1
        return counter

    def _calculate_g_cost(
        self,
        path: List[EmotionDefinition],
        next_emotion: EmotionDefinition,
        user_history: Optional[Dict[str, Any]],
    ) -> float:
        """Calculate G cost (path cost so far)."""
        current = path[-1]

        # 1. Base VAC Distance
        vac_distance = self.graph.vac_distance(
            list(current.vac_vector), list(next_emotion.vac_vector)
        )

        # 2. Category Penalty
        category_penalty = self.graph.get_category_difficulty(
            current.category, next_emotion.category
        )

        # 3. User History Bonus
        history_bonus = 0.0
        if user_history:
            transition_key = (current.emotion_name, next_emotion.emotion_name)
            successful_transitions = user_history.get("successful_transitions", {})
            if transition_key in successful_transitions:
                success_rate = successful_transitions[transition_key]
                history_bonus = -0.3 * success_rate

        # 4. Arousal Ceiling Penalty
        arousal_penalty = 0.0
        current_arousal = current.vac_vector[1]
        next_arousal = next_emotion.vac_vector[1]
        if next_arousal > 0.5 and abs(next_arousal) > abs(current_arousal):
            arousal_penalty = 0.5

        # 5. Path Length Penalty
        length_penalty = len(path) * 0.1

        return vac_distance + category_penalty + history_bonus + arousal_penalty + length_penalty

    def _heuristic_cost(self, current: EmotionDefinition, goal: EmotionDefinition) -> float:
        """Euclidean distance heuristic (admissible)."""
        return float(
            np.linalg.norm(np.array(list(current.vac_vector)) - np.array(list(goal.vac_vector)))
        )
