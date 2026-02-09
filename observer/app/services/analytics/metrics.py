"""Metrics Calculator Service.

Encapsulates logic for updating session statistics and calculating
temporal emotional metrics (Elasticity, Rigidity).
"""

import math
from typing import Dict, List, Optional
from uuid import UUID

import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clinical_alert import AlertLevel, ClinicalAlert
from app.models.session_analytics import SessionAnalytics
from app.models.user_trajectory import UserTrajectory
from app.types.emotions import EmotionAnalysisResult
from app.utils.math.vector import update_running_average


class MetricsCalculator:
    """Calculates and updates session metrics and temporal dynamics."""

    def __init__(self, session: Optional[AsyncSession] = None):
        """Initialize with optional database session.

        Args:
            session: AsyncSession for accessing history (required for rigidity)
        """
        self.session = session

    # -------------------------------------------------------------------------
    # Temporal Metrics (Elasticity & Rigidity)
    # -------------------------------------------------------------------------

    def calculate_elasticity(
        self,
        current_quat: List[float],
        previous_quat: Optional[List[float]],
        delta_time: float,
    ) -> float:
        """Calculate elasticity (velocity of change).

        E = theta / dt

        Args:
            current_quat: Current quaternion [w, x, y, z]
            previous_quat: Previous quaternion [w, x, y, z]
            delta_time: Time elapsed in seconds

        Returns:
            Elasticity in radians/second
        """
        if not previous_quat or delta_time <= 0:
            return 0.0

        # Calculate angular distance
        theta = self.angular_distance(current_quat, previous_quat)

        # Elasticity = distance / time
        return theta / delta_time

    async def calculate_rigidity(
        self,
        user_id: str,
        window_size: int = 10,
    ) -> float:
        """Calculate rigidity over a rolling window of recent states.

        R = 1 / Variance(quaternions)

        Args:
            user_id: User ID (string or UUID)
            window_size: Number of recent states to analyze

        Returns:
            Rigidity score [0, inf)
        """
        if not self.session:
            return 0.0

        # Fetch last N quaternions
        stmt = (
            select(UserTrajectory.quaternion_state)
            .where(UserTrajectory.user_id == UUID(str(user_id)))
            .order_by(UserTrajectory.timestamp.desc())
            .limit(window_size)
        )

        result = await self.session.execute(stmt)
        # Convert PGVector/List to list of lists of floats
        rows = result.all()
        quaternions: List[List[float]] = []
        for row in rows:
            val = row[0]
            if val is not None:
                if hasattr(val, "tolist"):  # numpy or similar
                    quaternions.append(val.tolist())
                else:
                    quaternions.append(list(val))

        if len(quaternions) < 2:
            return 0.0

        # Calculate variance
        variance = self._quaternion_variance(quaternions)

        # Rigidity = inverse variance
        # Add small epsilon to prevent division by zero
        if variance == 0:
            return float("inf")

        return 1.0 / variance

    def detect_flooding(self, elasticity: float) -> bool:
        """Detect if user is in 'flooding' state (high velocity)."""
        # Threshold from docs/07-metrics-engine.md
        return elasticity > 2.0

    def detect_stuckness(self, rigidity: float, valence: float) -> bool:
        """Detect if user is stuck in a negative state."""
        # Thresholds: High rigidity + Negative valence
        return rigidity > 3.0 and valence < -0.2

    @staticmethod
    def angular_distance(q1: List[float], q2: List[float]) -> float:
        """Calculate angular distance between two quaternions.

        Formula: 2 * arccos(|q1 . q2|)
        Range: [0, pi]
        """
        # Dot product
        # q1 and q2 should be unit quaternions
        dot = abs(sum(a * b for a, b in zip(q1, q2)))
        # Clamp to handle float errors
        dot = min(1.0, max(-1.0, dot))
        return 2.0 * math.acos(dot)

    def _quaternion_variance(self, quaternions: List[List[float]]) -> float:
        """Calculate variance of a set of quaternions."""
        if len(quaternions) < 2:
            return 0.0

        # Convert to numpy array for efficiency
        # Convert to numpy array for efficiency
        quat_matrix = np.array(quaternions)

        # Calculate mean quaternion (eigenvector method)
        # cov_matrix = quat_matrix.T @ quat_matrix
        cov_matrix = np.dot(quat_matrix.T, quat_matrix)
        _, eigenvectors = np.linalg.eigh(cov_matrix)
        mean_quat = eigenvectors[:, -1]

        # Calculate angular distances from mean
        distances = []
        for q in quaternions:
            dot = np.dot(q, mean_quat)
            # Clamp dot product
            dot = np.clip(dot, -1.0, 1.0)
            angle = 2 * np.arccos(np.abs(dot))
            distances.append(angle)

        # Variance of distances
        return float(np.var(distances))

    # -------------------------------------------------------------------------
    # Session Analytics (Static Updates)
    # -------------------------------------------------------------------------

    @staticmethod
    def update_metrics(
        analytics: SessionAnalytics,
        analysis_result: EmotionAnalysisResult,
    ) -> None:
        """Update analytics object with new analysis results."""
        # Update emotion count
        analytics.emotion_count = (analytics.emotion_count or 0) + 1

        # Update average confidence
        analytics.average_confidence = update_running_average(
            analytics.average_confidence,
            analytics.emotion_count,
            analysis_result.confidence,
        )

        # Update dominant category
        analytics.dominant_category = analysis_result.category

        # Update alert counts
        MetricsCalculator._update_alert_counts(analytics, analysis_result.alerts)

        # Update category counts
        category_counts = analytics.category_counts or {}
        category = analysis_result.category
        category_counts[category] = category_counts.get(category, 0) + 1
        analytics.category_counts = category_counts

        # Update VAC statistics
        MetricsCalculator._update_vac_stats(analytics, analysis_result.vac_data)

    @staticmethod
    def _update_alert_counts(analytics: SessionAnalytics, alerts: List[ClinicalAlert]) -> None:
        """Update alert counts in analytics object."""
        for alert in alerts:
            if alert.level == AlertLevel.CRITICAL.value:
                analytics.critical_alert_count += 1
            elif alert.level == AlertLevel.WARNING.value:
                analytics.warning_alert_count += 1
            elif alert.level == AlertLevel.ATTENTION.value:
                analytics.attention_alert_count += 1

    @staticmethod
    def _update_vac_stats(analytics: SessionAnalytics, vac_data: Dict[str, float]) -> None:
        """Update VAC statistics using running averages."""
        vac_stats = analytics.vac_stats or {}
        n = analytics.emotion_count

        for dim in ["valence", "arousal", "connection"]:
            current_value = vac_data.get(dim, 0.0)
            avg_key = f"{dim}_avg"
            min_key = f"{dim}_min"
            max_key = f"{dim}_max"

            # Update average
            current_avg = vac_stats.get(avg_key, current_value)
            if avg_key in vac_stats:
                new_avg = update_running_average(current_avg, n, current_value)
                vac_stats[avg_key] = round(new_avg, 3)
            else:
                vac_stats[avg_key] = round(current_value, 3)

            # Update min/max
            current_min = vac_stats.get(min_key, current_value)
            current_max = vac_stats.get(max_key, current_value)

            vac_stats[min_key] = round(min(current_min, current_value), 3)
            vac_stats[max_key] = round(max(current_max, current_value), 3)

        analytics.vac_stats = vac_stats
