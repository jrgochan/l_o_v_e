from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.emotions.resolver import EmotionResolver


@pytest.fixture
def mock_db():
    session = AsyncMock()
    # Mock execute result scalars
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result
    return session


@pytest.mark.asyncio
async def test_ensure_loaded_exception(mock_db):
    """Test exception handling in ensure_loaded (Lines 143-144)."""
    resolver = EmotionResolver(mock_db)

    # Mock db.execute to raise Exception
    mock_db.execute.side_effect = Exception("DB Error")

    await resolver.ensure_loaded()

    # Should catch exception and log error (no crash)
    # self._loaded should remain False
    assert resolver._loaded is False


@pytest.mark.asyncio
async def test_resolve_emotion_retry_load(mock_db):
    """Test resolve_emotion retries loading if not loaded (Line 227)."""
    resolver = EmotionResolver(mock_db)

    # Mock db.execute to raise Exception always
    mock_db.execute.side_effect = Exception("DB Error")

    # Call resolve_emotion
    # 1. Calls ensure_loaded() -> catches exception, _loaded=False
    # 2. Skips matches (empty cache)
    # 3. Checks if not _loaded -> checks True
    # 4. Calls ensure_loaded() again -> catches exception
    await resolver.resolve_emotion("happy", vac=None)

    # Verify execute called at least twice (once per ensure_loaded attempt)
    assert mock_db.execute.call_count >= 2


@pytest.mark.asyncio
async def test_parse_vac_vector_branches(mock_db):
    """Test _parse_vac_vector branches (Line 329)."""
    resolver = EmotionResolver(mock_db)

    # Test valid list
    assert resolver._parse_vac_vector([0.1, 0.2, 0.3]) == [0.1, 0.2, 0.3]

    # Test empty list (Line 328-329)
    assert resolver._parse_vac_vector([]) is None

    # Test valid JSON string
    assert resolver._parse_vac_vector("[0.1, 0.2, 0.3]") == [0.1, 0.2, 0.3]

    # Test empty JSON array
    assert resolver._parse_vac_vector("[]") is None

    # Test None
    assert resolver._parse_vac_vector(None) is None
