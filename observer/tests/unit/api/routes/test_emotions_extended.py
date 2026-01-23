
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from fastapi import HTTPException
from app.api.routes import emotions

@pytest.fixture(autouse=True)
def mock_logger():
    with patch("app.api.routes.emotions.logger", new_callable=MagicMock) as mock_logger:
        yield mock_logger

@pytest.fixture
def mock_db():
    session = AsyncMock()
    session.execute = AsyncMock()
    session.add = MagicMock()
    session.delete = MagicMock()
    return session

@pytest.mark.asyncio
async def test_get_all_emotions_failure(mock_db):
    """Test 500 error when fetching emotions fails."""
    mock_db.execute.side_effect = Exception("DB Error")
    
    with pytest.raises(HTTPException) as exc:
        await emotions.get_all_emotions(category=None, db=mock_db)
        
    assert exc.value.status_code == 500
    assert "DB Error" in exc.value.detail

@pytest.mark.asyncio
async def test_get_categories_failure(mock_db):
    """Test 500 error when fetching categories fails."""
    mock_db.execute.side_effect = Exception("Query Failed")
    
    with pytest.raises(HTTPException) as exc:
        await emotions.get_categories(db=mock_db)
        
    assert exc.value.status_code == 500
    assert "Query Failed" in exc.value.detail

@pytest.mark.asyncio
async def test_get_emotion_by_id_not_found(mock_db):
    """Test 404 when emotion ID does not exist."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = result
    
    with pytest.raises(HTTPException) as exc:
        await emotions.get_emotion_by_id(str(uuid4()), db=mock_db)
        
    assert exc.value.status_code == 404
    assert "Emotion not found" in exc.value.detail

@pytest.mark.asyncio
async def test_get_emotion_by_id_failure(mock_db):
    """Test 500 error when fetching emotion details fails."""
    mock_db.execute.side_effect = Exception("Lookup Error")
    
    with pytest.raises(HTTPException) as exc:
        await emotions.get_emotion_by_id(str(uuid4()), db=mock_db)
        
    assert exc.value.status_code == 500
    assert "Lookup Error" in exc.value.detail

@pytest.mark.asyncio
async def test_search_emotions_failure(mock_db):
    """Test 500 error when search fails."""
    mock_db.execute.side_effect = Exception("Search Error")
    
    with pytest.raises(HTTPException) as exc:
        await emotions.search_emotions(query="joy", db=mock_db)
        
    assert exc.value.status_code == 500
    assert "Search Error" in exc.value.detail

@pytest.mark.asyncio
async def test_compute_all_paths_batch_failure(mock_db):
    """Test 500 error when batch computation start fails."""
    # Mock PathMatrixService constructor raising exception is hard, easier to mock method
    with patch("app.api.routes.emotions.PathMatrixService") as MockService:
        service_instance = AsyncMock()
        MockService.return_value = service_instance
        service_instance.create_computation_job.side_effect = Exception("Job Creation Failed")
        
        with pytest.raises(HTTPException) as exc:
            await emotions.compute_all_paths_batch(MagicMock(), user_id=None, db=mock_db)
            
        assert exc.value.status_code == 500
        assert "Job Creation Failed" in exc.value.detail

@pytest.mark.asyncio
async def test_get_computation_status_not_found(mock_db):
    """Test 404 when job ID not found."""
    with patch("app.api.routes.emotions.PathMatrixService") as MockService:
        service_instance = AsyncMock()
        MockService.return_value = service_instance
        service_instance.get_computation_job_status.return_value = None
        
        with pytest.raises(HTTPException) as exc:
            await emotions.get_computation_status(uuid4(), db=mock_db)
            
        assert exc.value.status_code == 404
        assert "Job not found" in exc.value.detail

@pytest.mark.asyncio
async def test_get_computation_status_failure(mock_db):
    """Test 500 when getting job status fails."""
    with patch("app.api.routes.emotions.PathMatrixService") as MockService:
        service_instance = AsyncMock()
        MockService.return_value = service_instance
        service_instance.get_computation_job_status.side_effect = Exception("Status Error")
        
        with pytest.raises(HTTPException) as exc:
            await emotions.get_computation_status(uuid4(), db=mock_db)
            
        assert exc.value.status_code == 500
        assert "Status Error" in exc.value.detail

@pytest.mark.asyncio
async def test_get_all_cached_paths_failure(mock_db):
    """Test 500 when retrieving cached paths fails."""
    with patch("app.api.routes.emotions.PathMatrixService") as MockService:
        service_instance = AsyncMock()
        MockService.return_value = service_instance
        service_instance.get_all_cached_paths.side_effect = Exception("Cache Read Error")
        
        with pytest.raises(HTTPException) as exc:
            await emotions.get_all_cached_paths(
                difficulty=None, requires_bridge=None, limit=None, offset=0, db=mock_db
            )
            
        assert exc.value.status_code == 500
        assert "Cache Read Error" in exc.value.detail

@pytest.mark.asyncio
async def test_get_path_statistics_failure(mock_db):
    """Test 500 when retrieving statistics fails."""
    with patch("app.api.routes.emotions.PathMatrixService") as MockService:
        service_instance = AsyncMock()
        MockService.return_value = service_instance
        service_instance.get_cache_statistics.side_effect = Exception("Stats Error")
        
        with pytest.raises(HTTPException) as exc:
            await emotions.get_path_statistics(db=mock_db)
            
        assert exc.value.status_code == 500
        assert "Stats Error" in exc.value.detail

@pytest.mark.asyncio
async def test_clear_path_cache_failure(mock_db):
    """Test 500 when clearing cache fails."""
    with patch("app.api.routes.emotions.PathMatrixService") as MockService:
        service_instance = AsyncMock()
        MockService.return_value = service_instance
        service_instance.clear_cache.side_effect = Exception("Delete Error")
        
        with pytest.raises(HTTPException) as exc:
            await emotions.clear_path_cache(db=mock_db)
            
        assert exc.value.status_code == 500
        assert "Delete Error" in exc.value.detail

@pytest.mark.asyncio
async def test_recommendations_invalid_emotion_id(mock_db):
    """Test 400 when emotion_id is not a valid UUID."""
    with pytest.raises(HTTPException) as exc:
        await emotions.get_smart_recommendations(
            context="exploration", emotion_id="invalid-uuid", selected_ids=None, limit=5, db=mock_db
        )
        
    assert exc.value.status_code == 400
    assert "Invalid emotion_id UUID" in exc.value.detail

@pytest.mark.asyncio
async def test_recommendations_invalid_selected_ids(mock_db):
    """Test 400 when selected_ids contains invalid UUIDs."""
    with pytest.raises(HTTPException) as exc:
        await emotions.get_smart_recommendations(
            context="exploration", emotion_id=None, selected_ids="valid-uuid,invalid-one", limit=5, db=mock_db
        )
    
    assert exc.value.status_code == 400
    assert "Invalid selected_ids format" in exc.value.detail

@pytest.mark.asyncio
async def test_recommendations_failure(mock_db):
    """Test 500 when recommendation engine fails."""
    with patch("app.api.routes.emotions.RecommendationEngine") as MockEngine:
        engine_instance = AsyncMock()
        MockEngine.return_value = engine_instance
        engine_instance.get_recommendations.side_effect = Exception("Engine Failure")
        
        with pytest.raises(HTTPException) as exc:
            await emotions.get_smart_recommendations(
                context="exploration", emotion_id=None, selected_ids=None, limit=5, db=mock_db
            )
            
        assert exc.value.status_code == 500
        assert "Recommendation error" in exc.value.detail
