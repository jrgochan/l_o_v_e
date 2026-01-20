import pytest
from uuid import uuid4
from app.services.chat_service import ChatService
from app.models.multi_emotion_analysis import MultiEmotionAnalysis

@pytest.mark.asyncio
async def test_deep_feeling_exposure(test_db):
    """
    Test that MultiEmotionAnalysis data is correctly exposed in get_session_messages.
    """
    db_session = test_db
    chat_service = ChatService(db_session)
    
    # 1. Setup Session
    user_id = str(uuid4())
    session = await chat_service.create_session(user_id=user_id)
    session_id = session['id'] if isinstance(session, dict) else session.id
    
    # 2. Create Message
    msg = await chat_service.save_user_message(
        session_id=session_id,
        content="Deep feeling content",
        message_type="user_text"
    )
    
    # 3. Create MultiEmotionAnalysis linked to message
    from app.models.multi_emotion_analysis import DetectedEmotion

    analysis = MultiEmotionAnalysis(
        message_id=msg.id,
        session_id=session_id,
        deep_feeling_enabled=True,
        complexity_score=0.8,
        emotional_clarity=0.7,
        aggregate_vac=[0.5, 0.6, 0.7]
    )
    
    # Add a detected emotion
    emotion = DetectedEmotion(
        confidence=0.9,
        prominence='primary',
        vac=[0.1, 0.2, 0.3],
        voice_alignment=0.85
    )
    analysis.detected_emotions.append(emotion)
    
    db_session.add(analysis)
    
    # Update message with prosody data for verification
    msg.transcription = "Deep feeling content"
    msg.prosody_pitch_mean = 120.5
    msg.prosody_features = {"jitter": 0.5}
    
    await db_session.commit()
    
    # 4. Retrieve messages
    messages = await chat_service.get_session_messages(session_id=session_id)
    
    # 5. Verify
    assert len(messages) == 1
    retrieved_msg = messages[0]
    
    # A. Transcription
    assert retrieved_msg["transcription"] == "Deep feeling content"
    
    # B. Prosody
    assert "prosody" in retrieved_msg
    assert retrieved_msg["prosody"]["pitch_mean"] == 120.5
    assert retrieved_msg["prosody"]["features"]["jitter"] == 0.5
    
    # C. Deep Feeling & Detected Emotions
    assert "multi_emotion_analysis" in retrieved_msg
    mea = retrieved_msg["multi_emotion_analysis"]
    assert mea["complexity_score"] == 0.8
    
    assert "emotions" in mea
    assert len(mea["emotions"]) == 1
    det_emotion = mea["emotions"][0]
    assert det_emotion["prominence"] == "primary"
    assert det_emotion["voice_alignment"] == 0.85
