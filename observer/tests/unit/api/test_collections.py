
import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from datetime import datetime, timezone

from app.api.routes.collections import router
from app.models.emotion_definition import EmotionCollection

@pytest.fixture
def app():
    app = FastAPI()
    app.include_router(router)
    return app

@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session

@pytest.fixture
def collection_factory():
    def create(name, is_default=False, is_active=True):
        return EmotionCollection(
            id=uuid4(),
            name=name,
            description=f"Desc for {name}",
            is_active=is_active,
            is_default=is_default,
            created_at=datetime.now(timezone.utc)
        )
    return create

@pytest.mark.asyncio
async def test_get_collections_success(mock_session, collection_factory):
    """Test standard GET /collections success."""
    c1 = collection_factory("Atlas", is_default=True)
    c2 = collection_factory("Hume", is_default=False)
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [c1, c2]
    mock_session.execute.return_value = mock_result
    
    from app.database import get_db
    
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: mock_session
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/collections")
        
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 2
    assert len(data["collections"]) == 2
    assert data["collections"][0]["name"] == "Atlas"
    assert data["collections"][0]["is_default"] is True

@pytest.mark.asyncio
async def test_get_collections_empty(mock_session):
    """Test GET /collections with no data."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result
    
    from app.database import get_db
    
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: mock_session
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/collections")
        
    assert response.status_code == 200
    assert response.json()["total_count"] == 0

@pytest.mark.asyncio
async def test_get_collections_error(mock_session):
    """Test GET /collections handling DB error."""
    mock_session.execute.side_effect = Exception("DB Fail")
    
    from app.database import get_db
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: mock_session
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/collections")
        
    assert response.status_code == 500
    assert "DB Fail" in response.json()["detail"]

@pytest.mark.asyncio
async def test_set_active_collection_success(mock_session, collection_factory):
    """Test POST /collections/{id}/activate success."""
    target_id = uuid4()
    target_collection = collection_factory("Target", is_default=False)
    target_collection.id = target_id
    
    # Mock finding collection
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = target_collection
    mock_session.execute.return_value = mock_result
    
    from app.database import get_db
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: mock_session
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(f"/collections/{target_id}/activate")
        
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # Verify transaction: update all false, update target true, commit
    assert mock_session.commit.called
    assert mock_session.execute.call_count >= 3 # Select, Update All, Update Target

@pytest.mark.asyncio
async def test_set_active_collection_not_found(mock_session):
    """Test POST /collections/{id}/activate 404."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result
    
    from app.database import get_db
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: mock_session
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(f"/collections/{uuid4()}/activate")
        
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_set_active_collection_db_error(mock_session):
    """Test POST /collections/{id}/activate rollback on error."""
    # Fail on commit
    mock_session.commit.side_effect = Exception("Commit Fail")
    
    # Find active needs to succeed first
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = MagicMock(id=uuid4(), name="Test")
    mock_session.execute.return_value = mock_result
    
    from app.database import get_db
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: mock_session
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(f"/collections/{uuid4()}/activate")
        
    assert response.status_code == 500
    assert mock_session.rollback.called
