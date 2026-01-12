
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from app.api.routes import ai_settings
from app.api.routes.ai_settings import AssignModelRequest

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.mark.asyncio
async def test_get_model_assignments_failure(mock_db):
    """Test 500 when getting assignments fails."""
    with patch("app.api.routes.ai_settings.AIModelService") as MockService:
        service_instance = AsyncMock()
        MockService.return_value = service_instance
        service_instance.get_model_assignments.side_effect = Exception("Service Down")
        
        with pytest.raises(HTTPException) as exc:
            await ai_settings.get_model_assignments(mock_db)
            
        assert exc.value.status_code == 500
        assert "Service Down" in exc.value.detail

@pytest.mark.asyncio
async def test_assign_model_failure(mock_db):
    """Test 500 when assigning model fails."""
    request = AssignModelRequest(function="semantic_vac", ai_model_name="test-model")
    
    with patch("app.api.routes.ai_settings.AIModelService") as MockService:
        service_instance = AsyncMock()
        MockService.return_value = service_instance
        service_instance.assign_model.side_effect = Exception("DB Error")
        
        with pytest.raises(HTTPException) as exc:
            await ai_settings.assign_model(request, mock_db)
            
        assert exc.value.status_code == 500
        assert "DB Error" in exc.value.detail

@pytest.mark.asyncio
async def test_assign_model_value_error(mock_db):
    """Test 400 when invalid function name is provided."""
    request = AssignModelRequest(function="invalid_func", ai_model_name="test-model")
    
    with patch("app.api.routes.ai_settings.AIModelService") as MockService:
        service_instance = AsyncMock()
        MockService.return_value = service_instance
        service_instance.assign_model.side_effect = ValueError("Invalid function")
        
        with pytest.raises(HTTPException) as exc:
            await ai_settings.assign_model(request, mock_db)
            
        assert exc.value.status_code == 400
        assert "Invalid function" in exc.value.detail

@pytest.mark.asyncio
async def test_get_recommendations_failure(mock_db):
    """Test 500 when getting recommendations fails."""
    with patch("app.api.routes.ai_settings.AIModelService") as MockService:
        service_instance = AsyncMock()
        MockService.return_value = service_instance
        service_instance.get_recommendations.side_effect = Exception("Analysis Failed")
        
        with pytest.raises(HTTPException) as exc:
            await ai_settings.get_model_recommendations(mock_db)
            
        assert exc.value.status_code == 500
        assert "Analysis Failed" in exc.value.detail

@pytest.mark.asyncio
async def test_get_performance_stats_failure(mock_db):
    """Test 500 when getting performance stats fails."""
    with patch("app.api.routes.ai_settings.AIModelService") as MockService:
        service_instance = AsyncMock()
        MockService.return_value = service_instance
        service_instance.get_performance_stats.side_effect = Exception("Metrics Error")
        
        with pytest.raises(HTTPException) as exc:
            await ai_settings.get_performance_stats(mock_db)
            
        assert exc.value.status_code == 500
        assert "Metrics Error" in exc.value.detail
