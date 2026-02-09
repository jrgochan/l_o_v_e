"""Vector Math Utilities.

Centralized math operations for emotional vectors (VAC).
"""

from typing import List

import numpy as np


def euclidean_distance(v1: List[float], v2: List[float]) -> float:
    """Calculate Euclidean distance between two vectors."""
    return float(np.linalg.norm(np.array(v1) - np.array(v2)))


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)

    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0

    return float(np.dot(v1, v2) / (norm_v1 * norm_v2))


def cosine_distance(v1: List[float], v2: List[float]) -> float:
    """Calculate cosine distance (1 - similarity).

    Range: [0, 2]
    0 = Identical
    1 = Orthogonal (unrelated)
    2 = Opposite
    """
    sim = cosine_similarity(v1, v2)
    # Handles floating point errors potentially pushing > 1.0 or < -1.0
    dist = 1.0 - sim
    return max(0.0, min(2.0, dist))


def magnitude(v: List[float]) -> float:
    """Calculate vector magnitude."""
    return float(np.linalg.norm(v))


def update_running_average(current_avg: float, count: int, new_value: float) -> float:
    """Update a running average with a new value.

    Args:
        current_avg: The current average.
        count: The total count INCLUDING the new value.
        new_value: The new value to add.

    Returns:
        The updated average.
    """
    if count <= 1:
        return new_value
    return ((current_avg * (count - 1)) + new_value) / count
