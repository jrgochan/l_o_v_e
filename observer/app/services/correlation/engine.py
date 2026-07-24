"""Correlation Engine — Orchestrates correlation analysis.

Runs all enabled correlation algorithms for a user, persists results
as EmotionEventCorrelation records, and publishes findings to NATS.

Usage:
    engine = CorrelationEngine(db)
    results = await engine.run_analysis(user_id)
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import DomainEvent, event_bus
from app.models.emotion_event_correlation import EmotionEventCorrelation
from app.services.correlation.temporal import (
    TemporalCorrelation,
    TemporalProximityAnalyzer,
)
from app.services.stream.publisher import journal_publisher

logger = logging.getLogger(__name__)


class CorrelationEngine:
    """Orchestrates correlation analysis across all algorithms.

    Currently implements:
    - Temporal Proximity (Algorithm 1)

    Future algorithms:
    - Pattern Recurrence (Algorithm 2)
    - Trajectory Shift (Algorithm 3)
    - Semantic Clustering (Algorithm 4)
    """

    def __init__(self, db: AsyncSession) -> None:
        """Initialize with a database session."""
        self.db = db

    async def run_analysis(
        self,
        user_id: UUID,
        *,
        ip_address: str | None = None,
    ) -> Dict[str, Any]:
        """Run all enabled correlation algorithms for a user.

        Returns a summary of results.
        """
        results: Dict[str, Any] = {
            "user_id": str(user_id),
            "algorithms_run": [],
            "correlations_found": 0,
            "correlations_created": 0,
            "correlations_updated": 0,
        }

        # Algorithm 1: Temporal Proximity
        temporal = TemporalProximityAnalyzer(self.db)
        temporal_results = await temporal.analyze(user_id)
        results["algorithms_run"].append("temporal_proximity")

        # Persist results
        created, updated = await self._persist_correlations(user_id, temporal_results)
        results["correlations_found"] += len(temporal_results)
        results["correlations_created"] += created
        results["correlations_updated"] += updated

        # Emit domain event
        await event_bus.emit(
            DomainEvent(
                event_type="journal.correlation_analysis_complete",
                actor_id=user_id,
                metadata=results,
                ip_address=ip_address,
            )
        )

        logger.info(
            "Correlation analysis complete",
            extra={
                "user_id": str(user_id),
                "found": results["correlations_found"],
                "created": results["correlations_created"],
                "updated": results["correlations_updated"],
            },
        )

        return results

    async def _persist_correlations(
        self,
        user_id: UUID,
        correlations: List[TemporalCorrelation],
    ) -> tuple[int, int]:
        """Persist correlation results with upsert logic.

        If a matching correlation already exists (same user, event_type,
        emotion, and correlation_type), update it. Otherwise create new.

        Returns (created_count, updated_count).
        """
        created = 0
        updated = 0

        for corr in correlations:
            # Check for existing correlation
            stmt = select(EmotionEventCorrelation).where(
                and_(
                    EmotionEventCorrelation.user_id == user_id,
                    EmotionEventCorrelation.event_type == corr.event_type,
                    EmotionEventCorrelation.emotion_name == corr.emotion_name,
                    EmotionEventCorrelation.correlation_type == "temporal_proximity",
                )
            )
            result = await self.db.execute(stmt)
            existing = result.scalars().first()

            if existing:
                # Update existing correlation
                existing.strength = corr.strength
                existing.direction = corr.direction
                existing.confidence = corr.confidence
                existing.lag_seconds = corr.lag_seconds
                existing.sample_size = corr.sample_size
                existing.evidence = corr.evidence
                existing.last_validated = datetime.now(timezone.utc)

                # Update status based on strength change
                if corr.strength >= 0.3:
                    existing.status = "active"
                elif existing.status == "active":
                    existing.status = "weakening"

                updated += 1
            else:
                # Create new correlation
                new_corr = EmotionEventCorrelation(
                    user_id=user_id,
                    emotion_name=corr.emotion_name,
                    emotion_category=corr.emotion_category,
                    event_type=corr.event_type,
                    event_pattern=f"{corr.event_type} → {corr.emotion_name} ({corr.window_label})",
                    correlation_type="temporal_proximity",
                    strength=corr.strength,
                    direction=corr.direction,
                    confidence=corr.confidence,
                    lag_seconds=corr.lag_seconds,
                    sample_size=corr.sample_size,
                    evidence=corr.evidence,
                    status="discovered",
                )
                self.db.add(new_corr)
                created += 1

                # Publish to NATS stream
                await self.db.flush()
                await journal_publisher.publish_correlation(
                    user_id=user_id,
                    correlation_id=new_corr.id,
                    correlation_type="temporal_proximity",
                    emotion_name=corr.emotion_name,
                    event_type=corr.event_type,
                    strength=corr.strength,
                )

        await self.db.flush()

        return created, updated
