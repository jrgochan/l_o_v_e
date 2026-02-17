from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import typer

from app.commands.matrix import compute, compute_matrix_logic
from app.models.emotion_definition import EmotionCollection


@pytest.fixture
def mock_session():
    session = AsyncMock()
    # default scalar one or none return
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result
    return session


@pytest.fixture
def mock_session_ctx(mock_session):
    mock_cls = MagicMock()
    mock_cls.return_value.__aenter__.return_value = mock_session
    mock_cls.return_value.__aexit__.return_value = None
    return mock_cls


@pytest.fixture
def mock_service():
    service = AsyncMock()
    service.compute_all_paths_batch.return_value = {
        "completed_paths": 10,
        "failed_paths": 0,
        "total_paths": 10,
    }
    return service


@pytest.mark.asyncio
async def test_compute_matrix_logic_collection_not_found(mock_session_ctx, mock_session):
    """Test when collection is not found."""
    # mock_session already returns None for scalar_one_or_none

    with patch("app.commands.matrix.AsyncSessionLocal", mock_session_ctx):
        result = await compute_matrix_logic(collection_name="Missing")

    assert result is False
    # Check query was executed
    mock_session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_compute_matrix_logic_success(mock_session_ctx, mock_session, mock_service):
    """Test successful computation."""
    # Mock collection found
    collection = MagicMock(spec=EmotionCollection)
    collection.id = "coll-id"
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = collection
    mock_session.execute.return_value = mock_result

    with patch("app.commands.matrix.AsyncSessionLocal", mock_session_ctx):
        with patch("app.commands.matrix.PathMatrixService", return_value=mock_service):
            result = await compute_matrix_logic(collection_name="Found")

    assert result is True
    mock_service.compute_all_paths_batch.assert_awaited_once()


@pytest.mark.asyncio
async def test_compute_matrix_logic_no_collection(mock_session_ctx, mock_service):
    """Test computation without collection filter."""
    with patch("app.commands.matrix.AsyncSessionLocal", mock_session_ctx):
        with patch("app.commands.matrix.PathMatrixService", return_value=mock_service):
            result = await compute_matrix_logic(collection_name=None)

    assert result is True
    # Verify call with None
    mock_service.compute_all_paths_batch.assert_awaited_once()
    args, kwargs = mock_service.compute_all_paths_batch.call_args
    assert kwargs["collection_id"] is None


@pytest.mark.asyncio
async def test_compute_matrix_logic_partial_failure(mock_session_ctx, mock_service):
    """Test computation with failed paths."""
    mock_service.compute_all_paths_batch.return_value = {
        "completed_paths": 5,
        "failed_paths": 5,
        "total_paths": 10,
    }

    with patch("app.commands.matrix.AsyncSessionLocal", mock_session_ctx):
        with patch("app.commands.matrix.PathMatrixService", return_value=mock_service):
            result = await compute_matrix_logic(collection_name=None)

    assert result is False


@pytest.mark.asyncio
async def test_compute_matrix_logic_exception(mock_session_ctx):
    """Test exception handling."""
    with patch("app.commands.matrix.AsyncSessionLocal", mock_session_ctx):
        with patch(
            "app.commands.matrix.PathMatrixService",
            side_effect=Exception("Service Fail"),
        ):
            result = await compute_matrix_logic(collection_name=None)

    assert result is False


def test_compute_command():
    """Test compute command wrapper."""

    def mock_run_success(coro):
        coro.close()
        return True

    with patch("app.commands.matrix.asyncio.run", side_effect=mock_run_success) as mock_run:
        compute(collection="test")
        mock_run.assert_called_once()

    # Check exit code on failure
    def mock_run_fail(coro):
        coro.close()
        return False

    with patch("app.commands.matrix.asyncio.run", side_effect=mock_run_fail):
        with pytest.raises(typer.Exit):
            compute()
