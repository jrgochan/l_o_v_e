import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from app.api.routes.health import health_check

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.mark.asyncio
async def test_health_check_healthy(mock_db):
    """Test health check when everything is healthy."""
    mock_res_conn = MagicMock()
    mock_res_conn.scalar.return_value = 1
    
    mock_res_vector = MagicMock()
    mock_res_vector.scalar.return_value = "0.6.0"
    
    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 87
    
    mock_db.execute = AsyncMock(side_effect=[mock_res_conn, mock_res_vector, mock_res_count])
    
    response = await health_check(mock_db)
    
    assert response.status == "healthy"
    assert response.database == "connected"
    assert response.pgvector_version == "0.6.0"
    assert response.atlas_emotions_count == 87

@pytest.mark.asyncio
async def test_health_check_degraded(mock_db):
    """Test health check when atlas is partially seeded."""
    mock_res_conn = MagicMock()
    mock_res_vector = MagicMock()
    mock_res_vector.scalar.return_value = "0.6.0"
    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 60
    
    mock_db.execute = AsyncMock(side_effect=[mock_res_conn, mock_res_vector, mock_res_count])
    
    response = await health_check(mock_db)
    assert response.status == "degraded"

@pytest.mark.asyncio
async def test_health_check_initializing(mock_db):
    """Test health check when atlas is initializing."""
    mock_res_conn = MagicMock()
    mock_res_vector = MagicMock()
    mock_res_vector.scalar.return_value = "0.6.0"
    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 10
    
    mock_db.execute = AsyncMock(side_effect=[mock_res_conn, mock_res_vector, mock_res_count])
    
    response = await health_check(mock_db)
    assert response.status == "initializing"

@pytest.mark.asyncio
async def test_health_check_missing_pgvector(mock_db):
    """Test health check when pgvector is missing."""
    mock_res_conn = MagicMock()
    mock_res_vector = MagicMock()
    mock_res_vector.scalar.return_value = None
    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 87
    
    mock_db.execute = AsyncMock(side_effect=[mock_res_conn, mock_res_vector, mock_res_count])
    
    response = await health_check(mock_db)
    assert response.pgvector_version == "not installed"
    # Logic check: status logic falls through.
    # if emotion_count == 87 and pgvector_version != "not installed": -> False
    # elif emotion_count >= 50: -> True (87 >= 50)
    # So status is degraded.
    assert response.status == "degraded"

@pytest.mark.asyncio
async def test_health_check_db_failure(mock_db):
    """Test health check when DB is down."""
    mock_db.execute = AsyncMock(side_effect=Exception("DB Down"))
    
    with pytest.raises(HTTPException) as exc:
        await health_check(mock_db)
    
    assert exc.value.status_code == 503
    assert "Service unavailable" in exc.value.detail

@pytest.mark.asyncio
async def test_health_check_initializing_zero_emotions():
    """Test health check when emotion count is strictly zero (initializing)."""
    mock_db = AsyncMock()
    mock_db.execute.return_value.scalar.return_value = "0.6.0"
    mock_result_count = MagicMock()
    mock_result_count.scalar.return_value = 0
    async def execute_side_effect(stmt, *args, **kwargs):
        str_stmt = str(stmt).strip()
        if "SELECT 1" in str_stmt: return MagicMock()
        if "SELECT extversion" in str_stmt:
            m = MagicMock()
            m.scalar.return_value = "0.6.0"
            return m
        if "count" in str_stmt.lower(): return mock_result_count
        return MagicMock()
    mock_db.execute.side_effect = execute_side_effect
    response = await health_check(db=mock_db)
    assert response.status == "initializing"
    assert response.atlas_emotions_count == 0


