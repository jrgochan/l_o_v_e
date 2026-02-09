from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.models.chat_message import ChatMessage
from app.models.multi_emotion_analysis import MultiEmotionAnalysis
from app.services.chat.analysis import AnalysisManager
from app.services.chat.types import AnalysisMessageContext, MultiEmotionAnalysisContext


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.add = MagicMock()
    return db


@pytest.fixture
def manager(mock_db):
    return AnalysisManager(mock_db)


@pytest.mark.asyncio
async def test_save_analysis_message_success(manager, mock_db):
    """Test saving an analysis message."""
    session_id = uuid4()
    content = "Analysis content"

    # Mock EmotionResolver
    message_mapping = MagicMock()
    message_mapping.emotion_id = str(uuid4())
    message_mapping.original_name = "Joy"
    message_mapping.match_method = "exact"
    message_mapping.match_confidence = 1.0

    manager._resolve_emotion = AsyncMock(return_value=message_mapping)

    # Mock SessionManager
    manager.session_manager.get_session = AsyncMock(return_value=MagicMock())

    context = AnalysisMessageContext(
        session_id=session_id,
        emotion_name="Joy",
        vac_coordinates=[0.8, 0.5, 0.6],
        confidence=0.9,
        content=content,
        tone_mode="warm",
        prosody_data={"pitch_mean": 100.0},
    )
    msg = await manager.save_analysis_message(context)

    assert isinstance(msg, ChatMessage)
    assert msg.vac_coordinates == [0.8, 0.5, 0.6]
    assert msg.prosody_pitch_mean == 100.0

    mock_db.add.assert_called()
    mock_db.commit.assert_awaited()
    mock_db.refresh.assert_awaited()


@pytest.mark.asyncio
async def test_save_insight_message_success(manager, mock_db):
    """Test saving an insight message."""
    session_id = uuid4()

    manager.session_manager.get_session = AsyncMock(return_value=MagicMock())

    msg = await manager.save_insight_message(
        session_id=session_id,
        content="Insight",
        insights={"key": "val"},
        tone_mode="clinical",
    )

    assert msg.message_type == "system_insight"
    assert msg.insights == {"key": "val"}
    mock_db.add.assert_called()
    mock_db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_save_multi_emotion_analysis(manager, mock_db):
    """Test saving multi-emotion analysis."""
    msg_id = uuid4()
    session_id = uuid4()

    # Mock resolve for emotions
    mapping = MagicMock()
    mapping.emotion_id = str(uuid4())
    mapping.original_name = "Joy"
    mapping.match_method = "exact"
    mapping.match_confidence = 1.0
    manager._resolve_emotion = AsyncMock(return_value=mapping)

    emotions = [
        {
            "emotion_name": "Joy",
            "confidence": 0.9,
            "prominence": "primary",
            "vac": {"valence": 1, "arousal": 1, "connection": 1},
        }
    ]
    relationships = []

    context = MultiEmotionAnalysisContext(
        message_id=msg_id,
        session_id=session_id,
        emotions=emotions,
        relationships=relationships,
        aggregate_vac=[0.5, 0.5, 0.5],
        complexity_score=0.8,
        emotional_clarity=0.7,
        temporal_pattern="stable",
        three_way_data={"discrepancy": {"content_voice_distance": 0.1}},
    )

    analysis = await manager.save_multi_emotion_analysis(context)

    assert isinstance(analysis, MultiEmotionAnalysis)
    assert analysis.three_way_enabled is True
    mock_db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_get_multi_emotion_analysis(manager, mock_db):
    """Test retrieval."""
    msg_id = uuid4()

    mock_result = MagicMock()
    analysis_obj = MagicMock()
    analysis_obj.to_dict.return_value = {"id": "123"}
    mock_result.scalar_one_or_none.return_value = analysis_obj
    mock_db.execute.return_value = mock_result

    res = await manager.get_multi_emotion_analysis(msg_id)
    assert res == {"id": "123"}


@pytest.mark.asyncio
async def test_get_session_multi_emotion_history(manager, mock_db):
    """Test history retrieval."""
    session_id = uuid4()

    mock_result = MagicMock()
    a1 = MagicMock()
    a1.to_dict.return_value = {"id": "1"}
    mock_result.scalars.return_value.all.return_value = [a1]
    mock_db.execute.return_value = mock_result

    res = await manager.get_session_multi_emotion_history(session_id)
    assert len(res) == 1
    assert res[0]["id"] == "1"
    res = await manager.get_session_multi_emotion_history(session_id)
    assert len(res) == 1
    assert res[0]["id"] == "1"


@pytest.mark.asyncio
async def test_save_analysis_message_edge_cases(manager, mock_db):
    """Test analysis message edge cases: No emotion map, no prosody, no session."""
    session_id = uuid4()

    # 1. Emotion not found (L43)
    mapping = MagicMock()
    mapping.emotion_id = None  # Logic: if mapping.emotion_id: ... else: warning
    manager._resolve_emotion = AsyncMock(return_value=mapping)

    # 2. No session found (L71 False branch)
    manager.session_manager.get_session = AsyncMock(return_value=None)

    context = AnalysisMessageContext(
        session_id=session_id,
        emotion_name="Unknown",
        vac_coordinates=[0, 0, 0],
        confidence=0.5,
        content="Test",
        tone_mode="warm",
        prosody_data=None,  # 3. No prosody (L60 False branch)
    )
    msg = await manager.save_analysis_message(context)

    assert msg.emotion_id is None
    # Session count logic skipped
    assert msg.message_type == "system_analysis"


@pytest.mark.asyncio
async def test_save_insight_message_no_session(manager, mock_db):
    """Test insight message with no session (L97 False branch)."""
    manager.session_manager.get_session = AsyncMock(return_value=None)
    await manager.save_insight_message(uuid4(), "C", {}, "warm")
    # Should not crash


@pytest.mark.asyncio
async def test_save_multi_emotion_analysis_edges(manager, mock_db):
    """Test: No 3-way data, Relationship mapping failures."""
    msg_id = uuid4()
    sid = uuid4()

    # Mock resolve
    mapping = MagicMock()
    mapping.emotion_id = str(uuid4())
    manager._resolve_emotion = AsyncMock(return_value=mapping)

    emotions = [
        {
            "emotion_name": "E1",
            "confidence": 1,
            "prominence": "P",
            "vac": {"valence": 0, "arousal": 0, "connection": 0},
        }
    ]

    # Relationships referencing unknown query (not in emotions list)
    # L180-194 logic
    relationships = [{"emotion_a": "E1", "emotion_b": "Unknown", "type": "rel"}]

    context = MultiEmotionAnalysisContext(
        message_id=msg_id,
        session_id=sid,
        emotions=emotions,
        relationships=relationships,
        aggregate_vac=[0, 0, 0],
        complexity_score=0,
        emotional_clarity=0,
        temporal_pattern="p",
        three_way_data=None,  # L132 False branch
    )

    await manager.save_multi_emotion_analysis(context)

    # Verify relationship NOT added
    # We can check calls to db.add.
    # 1 call for analysis, 1 call for detected emotion E1. 0 for relationships.
    # Total 2.
    assert mock_db.add.call_count == 2


@pytest.mark.asyncio
async def test_get_multi_emotion_analysis_not_found(manager, mock_db):
    """Test retrieval returning None (L213)."""
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res

    res = await manager.get_multi_emotion_analysis(uuid4())
    assert res is None


@pytest.mark.asyncio
async def test_resolve_emotion_real(manager, mock_db):
    """Test the real _resolve_emotion method."""
    # Unmock _resolve_emotion if it was mocked on manager instance?
    # Actually we just made a new manager instance in fixture,
    # but some tests overwrite it. Each test gets fresh fixture.

    with patch("app.services.chat.analysis.EmotionResolver") as MockResolver:
        mock_instance = AsyncMock()
        MockResolver.return_value = mock_instance
        mock_instance.resolve_emotion.return_value = "Result"

        res = await manager._resolve_emotion("Joy")
        assert res == "Result"
        mock_instance.resolve_emotion.assert_called_with("Joy")


@pytest.mark.asyncio
async def test_save_multi_emotion_analysis_with_relationships(manager, mock_db):
    """Test saving multi-emotion analysis WITH valid relationships (L183 True branch)."""
    msg_id = uuid4()
    sid = uuid4()

    # Mock resolve
    mapping = MagicMock()
    mapping.emotion_id = str(uuid4())
    manager._resolve_emotion = AsyncMock(return_value=mapping)

    emotions = [
        {
            "emotion_name": "E1",
            "confidence": 1,
            "prominence": "P",
            "vac": {"valence": 0, "arousal": 0, "connection": 0},
        },
        {
            "emotion_name": "E2",
            "confidence": 1,
            "prominence": "P",
            "vac": {"valence": 0, "arousal": 0, "connection": 0},
        },
    ]

    relationships = [{"emotion_a": "E1", "emotion_b": "E2", "type": "rel"}]

    context = MultiEmotionAnalysisContext(
        message_id=msg_id,
        session_id=sid,
        emotions=emotions,
        relationships=relationships,
        aggregate_vac=[0, 0, 0],
        complexity_score=0,
        emotional_clarity=0,
        temporal_pattern="p",
    )

    await manager.save_multi_emotion_analysis(context)

    # db.add called for analysis(1) + 2 emotions + 1 relationship = 4
    assert mock_db.add.call_count == 4


@pytest.mark.asyncio
async def test_save_multi_emotion_analysis_no_id(manager, mock_db):
    """Test L153 false branch (emotion ID not found)."""
    msg_id = uuid4()
    sid = uuid4()

    mapping = MagicMock()
    mapping.emotion_id = None
    manager._resolve_emotion = AsyncMock(return_value=mapping)

    emotions = [
        {
            "emotion_name": "E1",
            "confidence": 1,
            "prominence": "P",
            "vac": {"valence": 0, "arousal": 0, "connection": 0},
        }
    ]

    context = MultiEmotionAnalysisContext(
        message_id=msg_id,
        session_id=sid,
        emotions=emotions,
        relationships=[],
        aggregate_vac=[0, 0, 0],
        complexity_score=0,
        emotional_clarity=0,
        temporal_pattern="p",
    )

    await manager.save_multi_emotion_analysis(context)
    # calls add
    assert mock_db.add.called
