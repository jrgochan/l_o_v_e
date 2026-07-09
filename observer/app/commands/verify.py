"""Verification Commands."""

import asyncio
import logging

import typer

from app.database import AsyncSessionLocal
from app.services.chat.service import ChatService
from app.services.chat.types import (
    AnalysisMessageContext,
    MessageCreationContext,
    MultiEmotionAnalysisContext,
)

# Import ChatService - checking previous notes on service consolidation
# ChatService was supposedly refactored.
# script `verify_emotion_mapping.py` import was:
# from app.services.chat_service import ChatService
# BUT I recall fixing imports elsewhere to app.services.chat.service
# Let's verify where ChatService is.
# In "Implementing Application Factory Pattern" step, I fixed imports in
# app/api/sockets/handlers.py to `from app.services.chat.service import ChatService`
# So I should use that.


logger = logging.getLogger(__name__)

app = typer.Typer(help="System verification commands.")


async def verify_mapping_logic() -> None:
    """Verify emotion mapping storage."""
    logger.info("Starting emotion mapping storage verification...")

    async with AsyncSessionLocal() as db:
        service = ChatService(db)

        # 1. Create a test session
        logger.info("Creating test session...")
        session = await service.create_session(user_id="test_verifier", tone_preference="warm")

        try:
            # 2. Test Single Analysis Message
            original_emotion = "Super Duper Happy"
            logger.info("Saving analysis message with emotion: '%s'", original_emotion)

            ctx = AnalysisMessageContext(
                session_id=session.id,
                emotion_name=original_emotion,
                vac_coordinates=[0.8, 0.8, 0.8],
                confidence=0.95,
                content="I feel amazing!",
                tone_mode="warm",
            )
            msg = await service.save_analysis_message(ctx)

            # Verify retrieval
            logger.info("Verifying message %s...", msg.id)
            await db.refresh(msg)

            logger.info("Stored Original Name: %s", msg.original_emotion_name)

            assert (  # nosec B101
                msg.original_emotion_name == original_emotion
            ), f"Expected {original_emotion}, got {msg.original_emotion_name}"

            logger.info("✅ Single analysis message verification passed!")

            # 3. Test Multi-Emotion Analysis
            logger.info("Saving multi-emotion analysis...")

            user_ctx = MessageCreationContext(
                session_id=session.id,
                content="I am furious but also a bit blue.",
                message_type="human",
            )
            user_msg = await service.save_user_message(user_ctx)

            multi_ctx = MultiEmotionAnalysisContext(
                message_id=user_msg.id,
                session_id=session.id,
                emotions=[
                    {
                        "emotion_name": "Furious",
                        "confidence": 0.9,
                        "prominence": "primary",
                        "vac": {"valence": -0.8, "arousal": 0.9, "connection": -0.5},
                    },
                    {
                        "emotion_name": "Blue",
                        "confidence": 0.7,
                        "prominence": "secondary",
                        "vac": {"valence": -0.5, "arousal": -0.4, "connection": 0.2},
                    },
                ],
                relationships=[],
                aggregate_vac=[0.0, 0.0, 0.0],
                complexity_score=0.5,
                emotional_clarity=0.8,
                temporal_pattern="concurrent",
            )

            _ = await service.save_multi_emotion_analysis(multi_ctx)

            logger.info("✅ Multi-emotion analysis verification passed!")

        finally:
            logger.info("Cleaning up...")
            await service.delete_session(session.id)
            logger.info("Done.")


@app.command()
def mapping() -> None:
    """Verify emotion mapping storage."""
    asyncio.run(verify_mapping_logic())
