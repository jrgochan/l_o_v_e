import asyncio
import logging
import sys
import os

from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import AsyncSessionLocal
from app.services.chat_service import ChatService
from app.models.chat_message import ChatMessage
from app.models.multi_emotion_analysis import MultiEmotionAnalysis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def verify_mapping_storage():
    logger.info("Starting emotion mapping storage verification...")
    
    async with AsyncSessionLocal() as db:
        service = ChatService(db)
        
        # 1. Create a test session
        logger.info("Creating test session...")
        session = await service.create_session(user_id="test_verifier", tone_preference="warm")
        
        try:
            # 2. Test Single Analysis Message
            # "Super Happy" should map to "Joy" or similar
            original_emotion = "Super Duper Happy"
            logger.info(f"Saving analysis message with emotion: '{original_emotion}'")
            
            msg = await service.save_analysis_message(
                session_id=session.id,
                emotion_name=original_emotion,
                vac_coordinates=[0.8, 0.8, 0.8],
                confidence=0.95,
                content="I feel amazing!",
                tone_mode="warm"
            )
            
            # Verify retrieval
            logger.info(f"Verifying message {msg.id}...")
            # Refresh to ensure we read from DB
            await db.refresh(msg)
            
            logger.info(f"Stored Original Name: {msg.original_emotion_name}")
            logger.info(f"Stored Match Method: {msg.match_method}")
            logger.info(f"Stored Match Confidence: {msg.match_confidence}")
            
            assert msg.original_emotion_name == original_emotion, f"Expected {original_emotion}, got {msg.original_emotion_name}"
            assert msg.match_method is not None, "Match method should not be None"
            assert msg.match_confidence is not None, "Match confidence should not be None"
            
            logger.info("✅ Single analysis message verification passed!")
            
            # 3. Test Multi-Emotion Analysis
            # "Furious" -> Anger
            # "Blue" -> Sadness
            logger.info("Saving multi-emotion analysis...")
            
            user_msg = await service.save_user_message(session.id, "I am furious but also a bit blue.")
            
            analysis = await service.save_multi_emotion_analysis(
                message_id=user_msg.id,
                session_id=session.id,
                emotions=[
                    {
                        "emotion_name": "Furious",
                        "confidence": 0.9,
                        "prominence": "primary",
                        "vac": {"valence": -0.8, "arousal": 0.9, "connection": -0.5}
                    },
                    {
                        "emotion_name": "Blue",
                        "confidence": 0.7,
                        "prominence": "secondary",
                        "vac": {"valence": -0.5, "arousal": -0.4, "connection": 0.2}
                    }
                ],
                relationships=[],
                aggregate_vac=[0,0,0],
                complexity_score=0.5,
                emotional_clarity=0.8,
                temporal_pattern="concurrent"
            )
            
            # Verify retrieval
            logger.info("Verifying multi-emotion analysis...")
            # We need to query it back to get the detected emotions loaded with new fields?
            # ideally the relationships are loaded but let's check the DetectedEmotion objects directly
            # The service returns the analysis object which should have them populated
            
            # But let's fetch fresh from DB to be sure
            from sqlalchemy import select
            stmt = select(MultiEmotionAnalysis).where(MultiEmotionAnalysis.id == analysis.id)
            result = await db.execute(stmt)
            fetched_analysis = result.scalar_one()
            
            # Access emotions (trigger lazy load or await if async)
            # In async code accessing related attributes usually needs eager loading or awaitable access
            # But for this test, let's assume session is still open and we can access or use joinedload strategy in the service query if we used a getter method.
            # wait, service.get_multi_emotion_analysis does eager loading.
            
            full_analysis_dict = await service.get_multi_emotion_analysis(user_msg.id)
            
            found_furious = False
            found_blue = False
            
            for detected in full_analysis_dict['emotions']:
                logger.info(f"Detected: {detected['original_name']} -> ID: {detected['emotion_id']} via {detected['match_method']}")
                
                if detected['original_name'] == "Furious":
                    found_furious = True
                if detected['original_name'] == "Blue":
                    found_blue = True
                    
            assert found_furious, "Did not find 'Furious' in detected emotions"
            assert found_blue, "Did not find 'Blue' in detected emotions"
            
            logger.info("✅ Multi-emotion analysis verification passed!")
            
        finally:
            logger.info("Cleaning up...")
            await service.delete_session(session.id)
            logger.info("Done.")

if __name__ == "__main__":
    asyncio.run(verify_mapping_storage())
