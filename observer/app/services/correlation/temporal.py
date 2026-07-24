"""Temporal Proximity Analyzer — Algorithm 1 of the Correlation Engine.

Discovers correlations by looking for emotional shifts that occur near
specific life event types. Uses window-based co-occurrence analysis
with chi-squared significance testing.

See ``docs/src/features/life-journal/05-correlation-engine.md`` for the
full algorithm specification.

Example output:
    "Coffee → Anxiety within 2 hours (strength=0.67, p<0.003)"
"""

import logging
import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.life_event import LifeEvent
from app.models.user_trajectory import UserTrajectory

logger = logging.getLogger(__name__)

# Analysis windows (in seconds)
WINDOWS = [
    (1800, "30min"),  # 30 minutes — acute reactions
    (7200, "2hr"),  # 2 hours — short-term effects
    (21600, "6hr"),  # 6 hours — medium-term effects
    (86400, "24hr"),  # 24 hours — next-day effects
]

# Minimum thresholds
MIN_EVENTS = 3  # Need at least 3 events of a type
MIN_TRAJECTORY_POINTS = 5  # Need at least 5 trajectory points
MIN_STRENGTH = 0.25  # Minimum correlation strength to report
MIN_CONFIDENCE = 0.5  # Minimum confidence to persist


@dataclass
class TemporalCorrelation:
    """A discovered temporal correlation before persistence."""

    event_type: str
    emotion_name: str
    emotion_category: Optional[str]
    strength: float
    direction: str  # "positive", "negative", "neutral"
    confidence: float
    lag_seconds: int
    sample_size: int
    window_label: str
    evidence: Dict[str, Any]


class TemporalProximityAnalyzer:
    """Analyzes temporal proximity between life events and emotional states.

    For each (event_type, emotion) pair, counts how often the emotion
    appears within a time window around event occurrences, and compares
    to the baseline rate to determine statistical significance.
    """

    def __init__(self, db: AsyncSession) -> None:
        """Initialize with a database session."""
        self.db = db

    async def analyze(self, user_id: UUID) -> List[TemporalCorrelation]:
        """Run temporal proximity analysis for a user.

        Returns a list of statistically significant correlations.
        """
        # 1. Get user's event types and counts
        event_types = await self._get_event_type_counts(user_id)
        if not event_types:
            logger.info("No life events found for user %s", user_id)
            return []

        # 2. Get unique emotions from trajectory
        emotions = await self._get_emotion_distribution(user_id)
        if not emotions:
            logger.info("No trajectory data found for user %s", user_id)
            return []

        # 3. Get total trajectory point count for baseline
        total_points = sum(emotions.values())

        # 4. Analyze each (event_type, emotion) pair across windows
        correlations: List[TemporalCorrelation] = []

        for event_type, event_count in event_types.items():
            if event_count < MIN_EVENTS:
                continue

            # Get timestamps of all events of this type
            event_times = await self._get_event_timestamps(user_id, event_type)

            for emotion_name, emotion_total in emotions.items():
                baseline_rate = emotion_total / total_points

                best_correlation = await self._test_windows(
                    user_id=user_id,
                    event_type=event_type,
                    event_times=event_times,
                    emotion_name=emotion_name,
                    baseline_rate=baseline_rate,
                    total_points=total_points,
                )

                if best_correlation is not None:
                    correlations.append(best_correlation)

        logger.info(
            "Temporal analysis complete",
            extra={
                "user_id": str(user_id),
                "event_types": len(event_types),
                "emotions": len(emotions),
                "correlations_found": len(correlations),
            },
        )

        return correlations

    async def _test_windows(
        self,
        user_id: UUID,
        event_type: str,
        event_times: List[datetime],
        emotion_name: str,
        baseline_rate: float,
        total_points: int,
    ) -> Optional[TemporalCorrelation]:
        """Test all windows and return the strongest correlation, if any."""
        best: Optional[TemporalCorrelation] = None

        for window_secs, window_label in WINDOWS:
            result = await self._compute_cooccurrence(
                user_id=user_id,
                event_times=event_times,
                event_type=event_type,
                emotion_name=emotion_name,
                window_secs=window_secs,
                window_label=window_label,
                baseline_rate=baseline_rate,
                total_points=total_points,
            )

            if result is not None:
                if best is None or result.strength > best.strength:
                    best = result

        return best

    async def _compute_cooccurrence(
        self,
        user_id: UUID,
        event_times: List[datetime],
        event_type: str,
        emotion_name: str,
        window_secs: int,
        window_label: str,
        baseline_rate: float,
        total_points: int,
    ) -> Optional[TemporalCorrelation]:
        """Compute co-occurrence rate for one (event_type, emotion, window) triple."""
        hits = 0
        total_lags: List[int] = []
        sample_size = len(event_times)

        for event_time in event_times:
            window_start = event_time - timedelta(seconds=window_secs // 2)
            window_end = event_time + timedelta(seconds=window_secs)

            # Count trajectory points with this emotion in the window
            stmt = select(func.count(UserTrajectory.id)).where(
                and_(
                    UserTrajectory.user_id == user_id,
                    (
                        UserTrajectory.dominant_emotion.has_name == emotion_name
                        if hasattr(UserTrajectory, "dominant_emotion")
                        else UserTrajectory.context_metadata["detected_emotion"].astext
                        == emotion_name
                    ),
                    UserTrajectory.timestamp >= window_start,
                    UserTrajectory.timestamp <= window_end,
                )
            )

            # Simplified: look for the emotion in context_metadata
            stmt = select(func.count(UserTrajectory.id)).where(
                and_(
                    UserTrajectory.user_id == user_id,
                    UserTrajectory.timestamp >= window_start,
                    UserTrajectory.timestamp <= window_end,
                    UserTrajectory.context_metadata["detected_emotion"].astext == emotion_name,
                )
            )

            count = (await self.db.execute(stmt)).scalar() or 0

            if count > 0:
                hits += 1
                # Estimate average lag (center of window)
                total_lags.append(window_secs // 2)

        if sample_size == 0:
            return None

        observed_rate = hits / sample_size

        # Skip if no co-occurrences or below threshold
        if hits < 2 or observed_rate <= baseline_rate:
            return None

        # Chi-squared test: observed vs expected
        expected_hits = baseline_rate * sample_size
        strength, confidence, chi_sq = self._chi_squared(
            observed=hits,
            expected=expected_hits,
            sample_size=sample_size,
        )

        if strength < MIN_STRENGTH or confidence < MIN_CONFIDENCE:
            return None

        # Determine direction from VAC valence shift
        direction = "negative" if observed_rate > baseline_rate else "positive"

        avg_lag = int(sum(total_lags) / len(total_lags)) if total_lags else window_secs // 2

        return TemporalCorrelation(
            event_type=event_type,
            emotion_name=emotion_name,
            emotion_category=None,  # Will be resolved during persistence
            strength=round(strength, 3),
            direction=direction,
            confidence=round(confidence, 3),
            lag_seconds=avg_lag,
            sample_size=sample_size,
            window_label=window_label,
            evidence={
                "p_value": round(1.0 - confidence, 6),
                "chi_squared": round(chi_sq, 3),
                "baseline_rate": round(baseline_rate, 4),
                "observed_rate": round(observed_rate, 4),
                "window_seconds": window_secs,
                "window_label": window_label,
                "hits": hits,
                "misses": sample_size - hits,
            },
        )

    @staticmethod
    def _chi_squared(
        observed: int, expected: float, sample_size: int
    ) -> Tuple[float, float, float]:
        """Compute chi-squared statistic and derive strength + confidence.

        Returns:
            (strength, confidence, chi_squared_value)
        """
        if expected == 0 or sample_size == 0:
            return 0.0, 0.0, 0.0

        chi_sq = ((observed - expected) ** 2) / expected

        # Strength: normalized effect size (0-1)
        # Using Cramér's V for 2x2 contingency
        strength = min(math.sqrt(chi_sq / sample_size), 1.0)

        # Confidence: approximate p-value from chi-squared with df=1
        # Using a simple approximation
        if chi_sq < 3.84:
            confidence = chi_sq / 3.84 * 0.95
        elif chi_sq < 6.63:
            confidence = 0.95 + (chi_sq - 3.84) / (6.63 - 3.84) * 0.04
        else:
            confidence = min(0.99 + (chi_sq - 6.63) / 100, 1.0)

        return strength, confidence, chi_sq

    # ------------------------------------------------------------------
    # Data queries
    # ------------------------------------------------------------------

    async def _get_event_type_counts(self, user_id: UUID) -> Dict[str, int]:
        """Get counts of each event type for a user."""
        stmt = (
            select(LifeEvent.event_type, func.count(LifeEvent.id))
            .where(LifeEvent.user_id == user_id)
            .group_by(LifeEvent.event_type)
        )
        result = await self.db.execute(stmt)
        return {row[0]: row[1] for row in result.all()}

    async def _get_emotion_distribution(self, user_id: UUID) -> Dict[str, int]:
        """Get the distribution of emotions for a user from trajectory data.

        Extracts emotion names from context_metadata['detected_emotion'].
        """
        stmt = (
            select(
                UserTrajectory.context_metadata["detected_emotion"].astext,
                func.count(UserTrajectory.id),
            )
            .where(
                and_(
                    UserTrajectory.user_id == user_id,
                    UserTrajectory.context_metadata["detected_emotion"].isnot(None),
                )
            )
            .group_by(UserTrajectory.context_metadata["detected_emotion"].astext)
        )
        result = await self.db.execute(stmt)
        return {row[0]: row[1] for row in result.all() if row[0]}

    async def _get_event_timestamps(self, user_id: UUID, event_type: str) -> List[datetime]:
        """Get all timestamps for events of a specific type."""
        stmt = (
            select(LifeEvent.timestamp)
            .where(
                and_(
                    LifeEvent.user_id == user_id,
                    LifeEvent.event_type == event_type,
                )
            )
            .order_by(LifeEvent.timestamp)
        )
        result = await self.db.execute(stmt)
        return [row[0] for row in result.all()]
