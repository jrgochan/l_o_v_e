
"""
Integration tests for Transition Routes.
"""
import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from tests.test_data import COMPASSION_VAC, PITY_VAC

@pytest.mark.integration
@pytest.mark.asyncio
async def test_find_transition_path(test_db: AsyncSession, seeded_test_atlas):
    """Test finding a path between two emotions."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Use random user ID
        user_id = str(uuid.uuid4())
        
        payload = {
            "user_id": user_id,
            "current_vac": COMPASSION_VAC,
            "goal_vac": PITY_VAC,
            "max_waypoints": 3
        }
        
        response = await client.post("/observer/transition-path", json=payload)
        
        # Depending on implementation, might need to mock auth or user injection
        # Assuming open access for now or that test client handles it if dependency overrides used
        
        if response.status_code == 404:
            pytest.fail(f"Endpoint not found or resource missing: {response.json()}")
            
        assert response.status_code == 200
        data = response.json()
        assert response.status_code == 200
        data = response.json()
        assert "waypoints" in data
        assert len(data["waypoints"]) >= 0  # Could be 0 if direct path
        assert data["current_state"]["emotion"] == "Compassion"
        assert data["goal_state"]["emotion"] == "Pity"

@pytest.mark.integration
@pytest.mark.asyncio
async def test_start_journey(test_db: AsyncSession, seeded_test_atlas, seeded_test_user, test_user_id):
    """Test starting a therapeutic journey."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "user_id": str(test_user_id),
            "path_id": str(uuid.uuid4()),
            "context": {"source": "test"}
        }
        
        response = await client.post("/observer/journey/start", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "journey_id" in data
        assert data["status"] == "in_progress"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_mark_waypoint_reached(test_db: AsyncSession, seeded_test_user, test_user_id, seeded_test_atlas):
    """Test marking a waypoint as reached."""
    from app.models.transition_strategy import UserJourney, JourneyWaypoint
    from datetime import datetime
    
    # 1. Manually create a journey and waypoint
    journey_id = uuid.uuid4()
    journey = UserJourney(
        id=journey_id,
        user_id=test_user_id,
        path_id=str(uuid.uuid4()),
        start_vac=[0, 0, 0],
        goal_vac=[1, 1, 1],
        status="in_progress",
        waypoints={},
        current_waypoint=0
    )
    test_db.add(journey)
    await test_db.flush()
    
    waypoint = JourneyWaypoint(
        id=uuid.uuid4(),
        journey_id=journey_id,
        waypoint_index=0,
        emotion_id=seeded_test_atlas[0].id,  # Valid emotion from fixture
        emotion_name="Test Emotion",
        vac_target={"v": 0.5, "a": 0.5, "c": 0.5},
        category="Test Category",
        reached=False
    )
    test_db.add(waypoint)
    await test_db.commit()
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "waypoint_index": 0,
            "self_assessment": {"confidence": 0.8},
            "strategies_tried": []
        }
        
        response = await client.post(f"/observer/journey/{journey_id}/waypoint-reached", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["validated"] is True
        assert data["message"] == "Journey complete! 🎉"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_journey_status(test_db: AsyncSession, seeded_test_user, test_user_id):
    """Test getting journey status."""
    from app.models.transition_strategy import UserJourney
    
    journey_id = uuid.uuid4()
    journey = UserJourney(
        id=journey_id,
        user_id=test_user_id,
        path_id=str(uuid.uuid4()),
        start_vac=[0, 0, 0],
        goal_vac=[1, 1, 1],
        status="in_progress",
        waypoints={},
        current_waypoint=0
    )
    test_db.add(journey)
    await test_db.commit()
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"/observer/journey/{journey_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["journey_id"] == str(journey_id)
        assert data["status"] == "in_progress"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_user_journey_history(test_db: AsyncSession, seeded_test_user, test_user_id):
    """Test user journey history."""
    from app.models.transition_strategy import UserJourney
    
    # Create two journeys
    j1 = UserJourney(
        id=uuid.uuid4(),
        user_id=test_user_id,
        path_id=str(uuid.uuid4()),
        start_vac=[0, 0, 0],
        goal_vac=[1, 1, 1],
        status="completed",
        waypoints={},
        current_waypoint=1
    )
    test_db.add(j1)
    
    j2 = UserJourney(
        id=uuid.uuid4(),
        user_id=test_user_id,
        path_id=str(uuid.uuid4()),
        start_vac=[0, 0, 0],
        goal_vac=[1, 1, 1],
        status="abandoned",
        waypoints={},
        current_waypoint=0
    )
    test_db.add(j2)
    await test_db.commit()
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"/observer/user/{test_user_id}/journey-history")
        assert response.status_code == 200
        data = response.json()
        assert data["total_journeys"] >= 2  # Could be more if other tests ran? No, cleanup cleans DB.
        assert data["completed"] >= 1
        assert data["abandoned"] >= 1

