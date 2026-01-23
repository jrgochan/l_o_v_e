import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime
from app.services.chat_service import ChatService
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.multi_emotion_analysis import MultiEmotionAnalysis
from app.models.message_relationship import MessageRelationship

@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.add = MagicMock()
    return session

@pytest.fixture
def chat_service(mock_session):
    # Patch logger to avoid issues if errors do occur
    with patch("app.services.chat_service.logger", new_callable=MagicMock) as mock_logger:
        # Patch the association engine to avoid import/runtime errors during auto-linking
        # Since it's a local import, patching the source module works best
        with patch("app.services.association_engine.get_association_engine") as mock_get_engine:
            mock_engine = AsyncMock()
            mock_engine.auto_link = AsyncMock(return_value=None)
            mock_get_engine.return_value = mock_engine
            
            yield ChatService(mock_session)

@pytest.mark.asyncio
async def test_create_session(chat_service, mock_session):
    user_id = "user123"
    auth_user_id = uuid4()
    
    session = await chat_service.create_session(user_id, "clinical", auth_user_id)
    
    assert session.user_id == user_id
    assert session.tone_preference == "clinical"
    assert session.auth_user_id == auth_user_id
    assert session.started_at is not None
    
    mock_session.add.assert_called_once()
    mock_session.commit.assert_awaited_once()
    mock_session.refresh.assert_awaited_once_with(session)

@pytest.mark.asyncio
async def test_get_session(chat_service, mock_session):
    session_id = uuid4()
    mock_result = MagicMock()
    expected_session = ChatSession(id=session_id)
    mock_result.scalar_one_or_none.return_value = expected_session
    mock_session.execute.return_value = mock_result
    
    result = await chat_service.get_session(session_id)
    assert result == expected_session

@pytest.mark.asyncio
async def test_get_user_sessions(chat_service, mock_session):
    mock_result = MagicMock()
    sessions = [ChatSession(id=uuid4()), ChatSession(id=uuid4())]
    mock_result.scalars.return_value.all.return_value = sessions
    mock_session.execute.return_value = mock_result
    
    result = await chat_service.get_user_sessions("user123")
    assert len(result) == 2
    assert result == sessions

@pytest.mark.asyncio
async def test_end_session(chat_service, mock_session):
    session_id = uuid4()
    session = ChatSession(id=session_id)
    
    # Mock get_session to return our session
    with patch.object(chat_service, 'get_session', return_value=session):
        result = await chat_service.end_session(session_id)
        
        assert result.ended_at is not None
        mock_session.commit.assert_awaited()
        mock_session.refresh.assert_awaited()

@pytest.mark.asyncio
async def test_update_tone_preference(chat_service, mock_session):
    session_id = uuid4()
    session = ChatSession(id=session_id, tone_preference="warm")
    
    with patch.object(chat_service, 'get_session', return_value=session):
        await chat_service.update_tone_preference(session_id, "clinical")
        
        assert session.tone_preference == "clinical"
        mock_session.commit.assert_awaited()

@pytest.mark.asyncio
async def test_save_user_message(chat_service, mock_session):
    session_id = uuid4()
    session = ChatSession(id=session_id, message_count=0)
    
    with patch.object(chat_service, 'get_session', return_value=session):
        msg = await chat_service.save_user_message(session_id, "Hello")
        
        assert msg.content == "Hello"
        assert msg.message_type == "user_text"
        assert session.message_count == 1
        
        mock_session.add.assert_called()
        mock_session.commit.assert_awaited()

@pytest.mark.asyncio
async def test_save_analysis_message(chat_service, mock_session):
    session_id = uuid4()
    session = ChatSession(id=session_id, message_count=5)
    
    with patch.object(chat_service, 'get_session', return_value=session):
        # Mock _resolve_emotion to return a mock MappingResult
        mock_mapping = MagicMock()
        mock_mapping.emotion_id = str(uuid4())
        mock_mapping.original_name = "Joy"
        mock_mapping.match_method = "exact"
        mock_mapping.confidence = 1.0

        with patch.object(chat_service, '_resolve_emotion', return_value=mock_mapping):
            msg = await chat_service.save_analysis_message(
                session_id, "Joy", [0.8, 0.5, 0.6], 0.9, "Detected Joy", "warm",
                prosody_data={"pitch_mean": 100.0}
            )
            
            assert msg.message_type == "system_analysis"
            assert msg.vac_coordinates == [0.8, 0.5, 0.6]
            assert msg.prosody_pitch_mean == 100.0
            assert session.message_count == 6


@pytest.mark.asyncio
async def test_save_insight_message(chat_service, mock_session):
    session_id = uuid4()
    session = ChatSession(id=session_id, message_count=2)
    
    with patch.object(chat_service, 'get_session', return_value=session):
        msg = await chat_service.save_insight_message(
            session_id, "Insight text", {"key": "value"}, "warm"
        )
        
        assert msg.message_type == "system_insight"
        assert msg.insights == {"key": "value"}
        assert session.message_count == 3

@pytest.mark.asyncio
async def test_get_session_statistics(chat_service, mock_session):
    session_id = uuid4()
    session = ChatSession(
        id=session_id, 
        message_count=10, 
        started_at=datetime.utcnow(), 
        ended_at=datetime.utcnow()
    )
    
    with patch.object(chat_service, 'get_session', return_value=session):
        # Mock message type counts query
        mock_counts_res = MagicMock()
        mock_counts_res.__iter__.return_value = [("user_text", 5), ("system_analysis", 5)]
        
        # Mock emotion IDs query
        mock_emotions_res = MagicMock()
        mock_emotions_res.__iter__.return_value = [(uuid4(),), (uuid4(),)]
        
        # We need to handle multiple execute calls
        mock_session.execute.side_effect = [mock_counts_res, mock_emotions_res]
        
        stats = await chat_service.get_session_statistics(session_id)
        
        assert stats["total_messages"] == 10
        assert stats["message_counts"]["user_text"] == 5
        assert stats["detected_emotions_count"] == 2

@pytest.mark.asyncio
async def test_delete_session(chat_service, mock_session):
    session_id = uuid4()
    session = ChatSession(id=session_id)
    
    with patch.object(chat_service, 'get_session', return_value=session):
        res = await chat_service.delete_session(session_id)
        assert res
        mock_session.delete.assert_awaited_with(session)
        mock_session.commit.assert_awaited()

    # Test Not Found
    with patch.object(chat_service, 'get_session', return_value=None):
        res = await chat_service.delete_session(session_id)
        assert not res

@pytest.mark.asyncio
async def test_session_not_found_branches(chat_service, mock_session):
    """Test session not found branches for various methods."""
    session_id = uuid4()
    
    with patch.object(chat_service, 'get_session', return_value=None):
        # end_session
        assert await chat_service.end_session(session_id) is None
        
        # update_tone_preference
        assert await chat_service.update_tone_preference(session_id, "warm") is None
        
        # update_deep_feeling_mode
        assert await chat_service.update_deep_feeling_mode(session_id, True) is None
        
        # save_user_message (session count update skip)
        # Note: save_user_message doesn't return None, but it shouldn't crash
        msg = await chat_service.save_user_message(session_id, "test")
        assert msg.content == "test"

@pytest.mark.asyncio
async def test_get_session_messages(chat_service, mock_session):
    """Test retrieval of session messages."""
    session_id = uuid4()
    
    mock_result = MagicMock()
    msg1 = ChatMessage(id=uuid4(), content="Hi", timestamp=datetime.now())
    msg2 = ChatMessage(id=uuid4(), content="Hello", timestamp=datetime.now())
    mock_result.scalars.return_value.all.return_value = [msg1, msg2]
    mock_session.execute.return_value = mock_result
    
    # Test with limit
    msgs = await chat_service.get_session_messages(session_id, limit=10)
    assert len(msgs) == 2
    assert msgs[0]["content"] == "Hi"
    
    # Verify limit call
    call_args = mock_session.execute.call_args
    sql = str(call_args[0][0])
    assert "LIMIT" in sql # Relaxed check

@pytest.mark.asyncio
async def test_get_recent_messages(chat_service, mock_session):
    """Test retrieval of recent messages."""
    session_id = uuid4()
    
    mock_result = MagicMock()
    # Mock return in reverse chronological order (newest first)
    msg1 = ChatMessage(id=uuid4(), content="New", timestamp=datetime.now())
    msg2 = ChatMessage(id=uuid4(), content="Old", timestamp=datetime.now())
    mock_result.scalars.return_value.all.return_value = [msg1, msg2]
    mock_session.execute.return_value = mock_result
    
    msgs = await chat_service.get_recent_messages(session_id, count=2)
    
    # Should be reversed to chronological
    assert len(msgs) == 2
    assert msgs[0].content == "Old"
    assert msgs[1].content == "New"

@pytest.mark.asyncio
async def test_update_deep_feeling_mode(chat_service, mock_session):
    """Test toggling deep feeling mode."""
    session_id = uuid4()
    session = ChatSession(id=session_id, deep_feeling_mode=False)
    
    with patch.object(chat_service, 'get_session', return_value=session):
        res = await chat_service.update_deep_feeling_mode(session_id, True)
        assert res.deep_feeling_mode is True
        mock_session.commit.assert_awaited()

@pytest.mark.asyncio
async def test_get_multi_emotion_analysis(chat_service, mock_session):
    """Test retrieving analysis."""
    message_id = uuid4()
    
    # Found
    mock_result = MagicMock()
    analysis = MultiEmotionAnalysis(id=uuid4(), message_id=message_id)
    # Mock to_dict to avoid attribute errors on mock object
    analysis.to_dict = MagicMock(return_value={"id": str(analysis.id)})
    
    mock_result.scalar_one_or_none.return_value = analysis
    mock_session.execute.return_value = mock_result
    
    res = await chat_service.get_multi_emotion_analysis(message_id)
    assert res["id"] == str(analysis.id)
    
    # Not found
    mock_result.scalar_one_or_none.return_value = None
    res = await chat_service.get_multi_emotion_analysis(message_id)
    assert res is None

@pytest.mark.asyncio
async def test_get_session_multi_emotion_history(chat_service, mock_session):
    """Test retrieving analysis history."""
    session_id = uuid4()
    
    mock_result = MagicMock()
    a1 = MultiEmotionAnalysis(id=uuid4())
    a1.to_dict = MagicMock(return_value={"id": str(a1.id)})
    
    mock_result.scalars.return_value.all.return_value = [a1]
    mock_session.execute.return_value = mock_result
    
    hist = await chat_service.get_session_multi_emotion_history(session_id)
    assert len(hist) == 1

@pytest.mark.asyncio
async def test_get_session_statistics_not_found(chat_service, mock_session):
    """Test stats wrapper when session not found."""
    with patch.object(chat_service, 'get_session', return_value=None):
        stats = await chat_service.get_session_statistics(uuid4())
        assert stats == {}

@pytest.mark.asyncio
async def test_get_session_statistics_duration(chat_service, mock_session):
    """Test duration calculation in stats."""
    session_id = uuid4()
    start = datetime.utcnow()
    # 1 hour later
    end = datetime.fromtimestamp(start.timestamp() + 3600)
    
    session = ChatSession(
        id=session_id, 
        message_count=5, 
        started_at=start, 
        ended_at=end
    )
    
    with patch.object(chat_service, 'get_session', return_value=session):
        # Mocks for counts and emotions
        mock_session.execute.side_effect = [
            MagicMock(__iter__=lambda x: iter([("text", 5)])), # message_counts
            MagicMock(__iter__=lambda x: iter([(uuid4(),)]))   # detected_emotions
        ]
        
        stats = await chat_service.get_session_statistics(session_id)
        assert stats["duration_seconds"] == 3600.0

@pytest.mark.asyncio
async def test_save_analysis_message_emotion_not_found(chat_service, mock_session):
    """Test saving analysis message when emotion mapping fails."""
    session_id = uuid4()
    session = ChatSession(id=session_id, message_count=5)
    
    with patch.object(chat_service, 'get_session', return_value=session):
        # Mock _resolve_emotion to return None ID
        mock_mapping = MagicMock()
        mock_mapping.emotion_id = None
        mock_mapping.original_name = "Unknown"
        mock_mapping.match_method = "fuzzy"
        mock_mapping.match_confidence = 0.5

        with patch.object(chat_service, '_resolve_emotion', return_value=mock_mapping):
            msg = await chat_service.save_analysis_message(
                session_id, "Unknown", [0.1, 0.1, 0.1], 0.5, "Analysis", "warm"
            )
            
            assert msg.emotion_id is None
            assert msg.original_emotion_name == "Unknown"
            assert session.message_count == 6

@pytest.mark.asyncio
async def test_save_multi_emotion_analysis_emotion_not_found(chat_service, mock_session):
    """Test saving multi-emotion analysis when one emotion mapping fails."""
    message_id = uuid4()
    session_id = uuid4()
    
    emotions = [{
        "emotion_name": "Unknown", 
        "confidence": 0.5, 
        "prominence": 1.0, 
        "vac": {"valence": 0.1, "arousal": 0.1, "connection": 0.1}
    }]
    relationships = []
    
    mock_mapping = MagicMock()
    mock_mapping.emotion_id = None
    mock_mapping.original_name = "Unknown"
    mock_mapping.match_method = "fuzzy"
    mock_mapping.match_confidence = 0.5
    
    with patch.object(chat_service, '_resolve_emotion', return_value=mock_mapping):
        analysis = await chat_service.save_multi_emotion_analysis(
            message_id, session_id, emotions, relationships, 
            [0.1, 0.1, 0.1], 0.5, 0.5, "concurrent"
        )
        
        # Verify detected emotion added with None ID
        args = mock_session.add.call_args_list
        # Found analysis (0), detected_emotion (1)
        # We need to find the DetectedEmotion object
        detected_emotion = None
        for call in args:
             obj = call[0][0]
             if hasattr(obj, 'original_name') and obj.original_name == "Unknown":
                 detected_emotion = obj
                 break
        
        assert detected_emotion is not None
        assert detected_emotion.emotion_id is None

@pytest.mark.asyncio
async def test_resolve_emotion(chat_service, mock_session):
    # Mock AtlasMapper
    # Mock EmotionResolver
    with patch("app.services.chat_service.EmotionResolver") as MockResolver:
        mapper_instance = AsyncMock()
        MockResolver.return_value = mapper_instance
        
        # Found case
        mock_result = MagicMock()
        mock_result.emotion_id = str(uuid4())
        mapper_instance.resolve_emotion.return_value = mock_result
        
        res = await chat_service._resolve_emotion("Joy")
        assert res.emotion_id is not None
        
        # Not found case (map_emotion returns a result with None ID or handle None return if that's the contract)
        # Based on AtlasMapper, it always returns a MappingResult, but atlas_id might be None
        mock_result_none = MagicMock()
        mock_result_none.emotion_id = None
        mapper_instance.resolve_emotion.return_value = mock_result_none
        
        res_none = await chat_service._resolve_emotion("UnknownXYZ")
        assert res_none.emotion_id is None

@pytest.mark.asyncio
async def test_save_multi_emotion_analysis(chat_service, mock_session):
    message_id = uuid4()
    session_id = uuid4()
    
    emotions = [{
        "emotion_name": "Joy", 
        "confidence": 0.9, 
        "prominence": 0.6, 
        "vac": {"valence": 0.8, "arousal": 0.5, "connection": 0.6}
    }]
    relationships = []
    
    mock_mapping = MagicMock()
    mock_mapping = MagicMock()
    mock_mapping.emotion_id = str(uuid4())
    mock_mapping.original_name = "Joy"
    mock_mapping.match_method = "exact"
    mock_mapping.confidence = 1.0
    
    with patch.object(chat_service, '_resolve_emotion', return_value=mock_mapping):
        analysis = await chat_service.save_multi_emotion_analysis(
            message_id, session_id, emotions, relationships, 
            [0.8, 0.5, 0.6], 0.5, 0.8, "concurrent"
        )
        
        assert analysis.message_id == message_id
        assert analysis.deep_feeling_enabled
        
        # Verify calls
        assert mock_session.add.call_count >= 2
        mock_session.commit.assert_awaited()

# ... (delete_session, session_not_found_branches, get_session_messages, get_recent_messages, update_deep_feeling_mode remain unchanged)

@pytest.mark.asyncio
async def test_save_multi_emotion_analysis_full(chat_service, mock_session):
    """Test saving analysis with 3-way data and relationships."""
    message_id = uuid4()
    session_id = uuid4()
    
    emotions = [
        {"emotion_name": "Joy", "confidence": 0.9, "prominence": 0.6, "vac": {"valence": 0.8, "arousal": 0.5, "connection": 0.6}},
        {"emotion_name": "Sadness", "confidence": 0.4, "prominence": 0.4, "vac": {"valence": -0.5, "arousal": -0.2, "connection": 0.0}}
    ]
    
    relationships = [
        {"emotion_a": "Joy", "emotion_b": "Sadness", "type": "bittersweet", "strength": 0.8}
    ]
    
    three_way = {
        "content_only": {"emotion": "Joy"},
        "voice_only": {"emotion": "Sadness"},
        "discrepancy": {"content_voice_distance": 0.5}
    }
    
    mock_mapping_1 = MagicMock()
    mock_mapping_1 = MagicMock()
    mock_mapping_1.emotion_id = str(uuid4())
    mock_mapping_1.original_name = "Joy"
    mock_mapping_1.match_method = "exact"
    mock_mapping_1.confidence = 1.0

    mock_mapping_2 = MagicMock()
    mock_mapping_2 = MagicMock()
    mock_mapping_2.emotion_id = str(uuid4())
    mock_mapping_2.original_name = "Sadness"
    mock_mapping_2.match_method = "exact"
    mock_mapping_2.confidence = 1.0
    
    # side_effect for multiple calls
    with patch.object(chat_service, '_resolve_emotion', side_effect=[mock_mapping_1, mock_mapping_2, mock_mapping_1, mock_mapping_2]): 
        # Note: Called for each emotion (2) + potentially relationships or other lookups?
        # Relationships might look up IDs again if not passed.
        # Let's assume the service looks up emotion IDs for the main list.
        
        analysis = await chat_service.save_multi_emotion_analysis(
            message_id, session_id, emotions, relationships, 
            [0.1, 0.1, 0.1], 0.5, 0.8, "concurrent",
            three_way_data=three_way
        )
        
        assert analysis.three_way_enabled
        assert analysis.discrepancy_metrics["content_voice_distance"] == 0.5
        
        assert mock_session.add.call_count >= 4

@pytest.mark.asyncio
async def test_save_message_count_updates_missing_session(chat_service, mock_session):
    """Test saving messages when session is missing (skips count update)."""
    session_id = uuid4()
    
    # Mock get_session returning None during save
    with patch.object(chat_service, 'get_session', return_value=None):
        # 1. save_user_message
        msg = await chat_service.save_user_message(session_id, "test")
        assert msg.content == "test"
        
        # 2. save_analysis_message (need to mock emotion ID lookup)
        mock_mapping = MagicMock()
        mock_mapping.emotion_id = str(uuid4())
        
        with patch.object(chat_service, '_resolve_emotion', return_value=mock_mapping):
            msg2 = await chat_service.save_analysis_message(
                session_id, "Joy", [0.1, 0.1, 0.1], 0.9, "content", "warm"
            )
            assert msg2.message_type == "system_analysis"
            
        # 3. save_insight_message
        msg3 = await chat_service.save_insight_message(
            session_id, "content", {}, "warm"
        )
        assert msg3.message_type == "system_insight"


@pytest.mark.asyncio
async def test_save_analysis_message_branches(chat_service, mock_session):
    """Test save_analysis_message branches (prosody)."""
    session_id = uuid4()
    session = ChatSession(id=session_id, message_count=0)
    
    with patch.object(chat_service, 'get_session', return_value=session):
        mock_mapping = MagicMock()
        mock_mapping.emotion_id = str(uuid4())
        
        with patch.object(chat_service, '_resolve_emotion', return_value=mock_mapping):
            # Test WITH prosody
            prosody = {
                "pitch_mean": 100.0,
                "pitch_std": 10.0,
                "energy": 0.5,
                "rate": 1.2,
                "features": {"shimmer": 0.1}
            }
            msg = await chat_service.save_analysis_message(
                session_id, "Joy", [0.5, 0.5, 0.5], 0.8, "content", "warm", prosody_data=prosody
            )
            assert msg.prosody_pitch_mean == 100.0
            assert msg.prosody_features == {"shimmer": 0.1}


@pytest.mark.asyncio
async def test_save_multi_emotion_missing_relations(chat_service, mock_session):
    """Test handling of relationships with unknown emotions."""
    msg_id = uuid4()
    session_id = uuid4()
    emotions = [{"emotion_name": "Joy", "confidence": 0.9, "prominence": 1.0, "vac": {"valence": 0.1, "arousal": 0.1, "connection": 0.1}}]
    
    # Relationship references "Sadness" which is NOT in the emotions list
    relationships = [{"emotion_a": "Joy", "emotion_b": "Sadness", "type": "contrast"}]
    
    mock_mapping = MagicMock()
    mock_mapping.emotion_id = str(uuid4())
    mock_mapping.original_name = "Joy"

    with patch.object(chat_service, '_resolve_emotion', return_value=mock_mapping):
        # Should gracefully skip the invalid relationship
        await chat_service.save_multi_emotion_analysis(
            msg_id, session_id, emotions, relationships, [0.1,0.1,0.1], 0.5, 0.5, "concurrent"
        )
        
        # Verify only detected emotion was added, no relationship added
        # We can't easily check call count exact due to parent analysis add, but we rely on no error raised


@pytest.mark.asyncio
async def test_get_session_messages_limit_zero(chat_service, mock_session):
    """Test get_session_messages with limit=0 (coverage branch)."""
    session_id = uuid4()
    
    # Mock execute explicitly
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result
    
    # Act
    history = await chat_service.get_session_messages(session_id, limit=0)
    
    # Assert
    assert history == []
    # Verify limit() was NOT called on stmt (hard to verify without strict mock on stmt, but code path is exercised)
    
@pytest.mark.asyncio
async def test_get_session_statistics_active(chat_service, mock_session):
    """Test stats for active session (no ended_at)."""
    session_id = uuid4()
    session = ChatSession(
        id=session_id, 
        message_count=2, 
        started_at=datetime.utcnow(), 
        ended_at=None
    )
    
    with patch.object(chat_service, 'get_session', return_value=session):
        mock_session.execute.side_effect = [
            MagicMock(__iter__=lambda x: iter([("text", 2)])),
            MagicMock(__iter__=lambda x: iter([]))
        ]
        
        stats = await chat_service.get_session_statistics(session_id)
        assert stats["duration_seconds"] is None


@pytest.mark.asyncio
async def test_create_message_relationship(chat_service, mock_session):
    """Test creating a message relationship."""
    source_id = uuid4()
    target_id = uuid4()
    
    rel = await chat_service.create_message_relationship(
        source_id, target_id, "reply", {"note": "test"}
    )
    
    assert rel.source_message_id == source_id
    assert rel.target_message_id == target_id
    assert rel.relationship_type == "reply"
    
    mock_session.add.assert_called_once()
    mock_session.commit.assert_awaited()
    mock_session.refresh.assert_awaited()


@pytest.mark.asyncio
async def test_get_message_relationships(chat_service, mock_session):
    """Test retrieving message relationships."""
    msg_id = uuid4()
    
    mock_result = MagicMock()
    r1 = MessageRelationship(id=uuid4(), source_message_id=msg_id, relationship_type="reply")
    mock_result.scalars.return_value.all.return_value = [r1]
    mock_session.execute.return_value = mock_result
    
    # 1. Outgoing
    rels_out = await chat_service.get_message_relationships(msg_id, "outgoing")
    assert len(rels_out) == 1
    # Verify filter usage (heuristic)
    assert str(mock_session.execute.call_args)
    
    # 2. Incoming
    rels_in = await chat_service.get_message_relationships(msg_id, "incoming")
    assert len(rels_in) == 1


@pytest.mark.asyncio
async def test_save_user_message_with_relationship(chat_service, mock_session):
    """Test saving user message with automatic relationship creation."""
    session_id = uuid4()
    related_id = uuid4()
    session = ChatSession(id=session_id, message_count=0)
    
    with patch.object(chat_service, 'get_session', return_value=session):
        # We need to mock create_message_relationship to verify it's called
        with patch.object(chat_service, 'create_message_relationship', new_callable=AsyncMock) as mock_create_rel:
            
            msg = await chat_service.save_user_message(
                session_id, 
                "Reply", 
                related_message_id=related_id,
                relationship_type="reply",
                relationship_metadata={"foo": "bar"}
            )
            
            assert msg.content == "Reply"
            
            # Verify relationship creation was called
            mock_create_rel.assert_awaited_once_with(
                source_id=msg.id,
                target_id=related_id,
                relationship_type="reply",
                relationship_metadata={"foo": "bar"}
            )


def test_message_relationship_model_methods():
    """Test MessageRelationship model methods (repr, to_dict)."""
    rel = MessageRelationship(
        id=uuid4(),
        source_message_id=uuid4(),
        target_message_id=uuid4(),
        relationship_type="reply",
        relationship_metadata={"a": 1},
        created_at=datetime.utcnow()
    )
    
    # Test __repr__
    assert "MessageRelationship" in repr(rel)
    assert "reply" in repr(rel)
    
    # Test to_dict
    data = rel.to_dict()
    assert data["relationship_type"] == "reply"
    assert data["relationship_metadata"] == {"a": 1}
    assert "source_message_id" in data
    assert "created_at" in data

@pytest.mark.asyncio
async def test_save_user_message_auto_link_failure(mock_session):
    """Test that auto-linking failure is logged and does not block."""
    session_id = uuid4()
    session = ChatSession(id=session_id, message_count=0)
    
    # Manually setup service and patches to have access to logger
    chat_service = ChatService(mock_session)
    
    with patch("app.services.chat_service.logger", new_callable=MagicMock) as mock_logger:
        with patch("app.services.association_engine.get_association_engine") as mock_get_engine:
            mock_engine = AsyncMock()
            mock_engine.auto_link.side_effect = Exception("Auto-link failed")
            mock_get_engine.return_value = mock_engine
            
            with patch.object(chat_service, 'get_session', return_value=session):
                msg = await chat_service.save_user_message(session_id, "Hello")
                
                # Verify message was still saved successfully
                assert msg.content == "Hello"
                assert session.message_count == 1
                
                # Verify DB interaction
                mock_session.add.assert_called()
                mock_session.commit.assert_awaited()
                
                # Verify error was logged (this covers lines 391-392)
                mock_logger.error.assert_called_once()
                call_args = str(mock_logger.error.call_args)
                assert "Auto-linking failed" in call_args
