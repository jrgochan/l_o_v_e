"""Shim for backward compatibility. Use app.services.insights.InsightGenerator."""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.emotion_resolver import EmotionResolver
from app.services.insights import InsightGenerator
from app.services.session_analytics_service import SessionAnalyticsService

logger = logging.getLogger(__name__)

__all__ = ["InsightGenerator", "AsyncSession", "EmotionResolver", "SessionAnalyticsService"]
