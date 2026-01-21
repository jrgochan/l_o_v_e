
import pytest
from uuid import uuid4
from datetime import datetime
from app.models.chat_message import ChatMessage
from app.models.emotion_definition import EmotionDefinition

def test_chat_message_properties():
    """Test ChatMessage convenience properties."""
    # User Text
    msg = ChatMessage(message_type="user_text")
    assert msg.is_user_message
    assert not msg.is_system_message
    
    # User Audio
    msg = ChatMessage(message_type="user_audio")
    assert msg.is_user_message
    
    # System Insight
    msg = ChatMessage(message_type="system_insight")
    assert msg.is_system_message
    assert not msg.is_user_message
    
    # Prosody Data
    msg = ChatMessage(prosody_pitch_mean=None)
    assert not msg.has_prosody_data
    msg.prosody_pitch_mean = 150.0
    assert msg.has_prosody_data
    
    # Emotion Data
    msg = ChatMessage(emotion_id=None, vac_coordinates=None)
    assert not msg.has_emotion_data
    msg.emotion_id = uuid4()
    msg.vac_coordinates = [0.1, 0.2, 0.3]
    assert msg.has_emotion_data

def test_chat_message_to_dict():
    """Test to_dict serialization with various options."""
    u_id = uuid4()
    s_id = uuid4()
    e_id = uuid4()
    now = datetime.now()
    
    msg = ChatMessage(
        id=u_id,
        session_id=s_id,
        timestamp=now,
        message_type="system_insight",
        content="Hello",
        emotion_id=e_id,
        created_at=now,
        insights={"primary": "Test Insight"}
    )
    
    # Basic
    d = msg.to_dict()
    assert d["id"] == str(u_id)
    assert "insights" in d
    assert "emotion" not in d
    
    # With Emotion (mock relationship)
    emotion = EmotionDefinition(
        id=e_id,
        emotion_name="Joy",
        category="Happiness",
        definition="Happy",
        vac_vector=[0.8, 0.5, 0.6]
    )
    msg.emotion = emotion
    
    d_full = msg.to_dict(include_emotion=True)
    assert "emotion" in d_full
    assert d_full["emotion"]["name"] == "Joy"
    
    # With Prosody
    msg.prosody_pitch_mean = 200.0
    msg.prosody_pitch_std = 20.0
    msg.prosody_energy = 0.8
    msg.prosody_rate = 5.0
    msg.prosody_features = {"jitter": 0.1}
    
    d_prosody = msg.to_dict()
    assert "prosody" in d_prosody
    assert d_prosody["prosody"]["pitch_mean"] == 200.0

def test_chat_message_to_dict_full():
    """Test ChatMessage serialization full coverage."""
    emotion = EmotionDefinition(
        id=uuid4(),
        emotion_name="Joy",
        category="Happiness",
        definition="Happy",
        vac_vector=[0.1, 0.2, 0.3]
    )
    
    message = ChatMessage(
        id=uuid4(),
        session_id=uuid4(),
        timestamp=datetime.utcnow(),
        message_type="user_audio",
        content="Hello",
        audio_url="http://audio",
        transcription="Hello",
        emotion_id=emotion.id,
        emotion=emotion,
        vac_coordinates=[0.1, 0.2, 0.3],
        confidence=0.9,
        prosody_pitch_mean=100.0,
        prosody_pitch_std=10.0,
        prosody_energy=0.5,
        prosody_rate=150.0,
        prosody_features={"jitter": 0.1},
        insights={"key": "val"},
        tone_mode="warm",
        created_at=datetime.utcnow()
    )
    
    data = message.to_dict(include_emotion=False)
    assert data["content"] == "Hello"
    assert "emotion" not in data
    
    data_full = message.to_dict(include_emotion=True)
    assert "emotion" in data_full
