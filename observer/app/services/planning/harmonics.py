"""Module documentation."""

import logging
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition
from app.services.planning.rules.definitions import (
    ArousalRegulationRule,
    VulnerabilityBridgeRule,
)

logger = logging.getLogger(__name__)


class PathHarmonizer:
    """Ensures paths meet psychological safety and validation requirements."""

    def __init__(self, session: AsyncSession):
        """Initialize PathHarmonizer."""
        self.session = session

        # Initialize rules
        self.rules = [
            VulnerabilityBridgeRule(session),
            ArousalRegulationRule(session),
        ]

    async def validate_and_enhance_path(
        self,
        path: List[EmotionDefinition],
        start: EmotionDefinition,
        goal: EmotionDefinition,
    ) -> List[EmotionDefinition]:
        """Validate path meets psychological requirements."""
        current_path = path[:]

        for rule in self.rules:
            current_path, modified = await rule.check_and_fix(current_path, start, goal)
            if modified:
                logger.debug("Path modified by rule: %s", rule.__class__.__name__)

        return current_path
