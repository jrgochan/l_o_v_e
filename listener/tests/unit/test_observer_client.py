"""
Listener Module - Observer Client Tests

Unit tests for the ObserverClient (with mocked HTTP requests).
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from app.services.observer_client import ObserverClient, get_observer_client
from app.models.vac_response import EmotionalClassification, VACVector


@pytest.fixture
def mock_emotion():
    """Create a mock emotional classification"""
    return EmotionalClassification(
        primary_emotion="Joy",
        category="Places We Go When Life Is Good",
        vac=VACVector(valence=0.9, arousal=0.7, connection=0.8),
        confidence=0.92,
        reasoning="High positive affect with strong connection"
    )


class TestObserverClient:
    """Test Observer client functionality"""
    
    def test_client_initialization(self):
        """Test client initializes with correct settings"""
        client = ObserverClient(
            base_url="http://test:8000",
            timeout=5.0
        )
        assert client.base_url == "http://test:8000"
        assert client.timeout == 5.0
    
    def test_singleton_pattern(self):
        """Test that get_observer_client returns same instance"""
        client1 = get_observer_client()
        client2 = get_observer_client()
        assert client1 is client2
    
    @pytest.mark.asyncio
    async def test_record_state_success(self, mock_emotion):
        """Test successful state recording"""
        with patch('app.services.observer_client.httpx.AsyncClient') as mock_client:
            # Setup mock response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "state_id": "state-123",
                "status": "success"
            }
            mock_response.raise_for_status = Mock()
            
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )
            
            # Test recording
            client = ObserverClient()
            result = await client.record_state(
                user_id="user-456",
                session_id="session-789",
                text="I feel great!",
                emotion=mock_emotion
            )
            
            assert result["state_id"] == "state-123"
            assert result["status"] == "success"
    
    @pytest.mark.asyncio
    async def test_record_state_with_timestamp(self, mock_emotion):
        """Test recording with explicit timestamp"""
        with patch('app.services.observer_client.httpx.AsyncClient') as mock_client:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"state_id": "state-123"}
            mock_response.raise_for_status = Mock()
            
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )
            
            timestamp = datetime(2025, 12, 3, 20, 0, 0)
            
            client = ObserverClient()
            result = await client.record_state(
                user_id="user-123",
                session_id="session-456",
                text="Test text",
                emotion=mock_emotion,
                timestamp=timestamp
            )
            
            assert result["state_id"] == "state-123"
    
    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """Test successful health check"""
        with patch('app.services.observer_client.httpx.AsyncClient') as mock_client:
            mock_response = Mock()
            mock_response.status_code = 200
            
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            
            client = ObserverClient()
            result = await client.health_check()
            
            assert result == True
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self):
        """Test health check when service is down"""
        with patch('app.services.observer_client.httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=Exception("Connection refused")
            )
            
            client = ObserverClient()
            result = await client.health_check()
            
            assert result == False
    
    @pytest.mark.asyncio
    async def test_get_insights(self):
        """Test getting insights from Observer"""
        with patch('app.services.observer_client.httpx.AsyncClient') as mock_client:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "insights": ["test insight"],
                "patterns": []
            }
            mock_response.raise_for_status = Mock()
            
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            
            client = ObserverClient()
            result = await client.get_insights(user_id="user-123", limit=10)
            
            assert "insights" in result

    @pytest.mark.asyncio
    async def test_record_state_failure(self, mock_emotion):
        """Test failure in record_state."""
        import httpx
        with patch('app.services.observer_client.httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=httpx.HTTPError("Fail")
            )
            
            client = ObserverClient()
            with pytest.raises(httpx.HTTPError):
                await client.record_state("u", "s", "t", mock_emotion)

    @pytest.mark.asyncio
    async def test_get_insights_failure(self):
        """Test failure in get_insights."""
        import httpx
        with patch('app.services.observer_client.httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.HTTPError("Fail")
            )
            
            client = ObserverClient()
            with pytest.raises(httpx.HTTPError):
                await client.get_insights("u")

    def test_ensure_uuid_valid(self):
        """Test _ensure_uuid with valid UUID."""
        from app.services.observer_client import _ensure_uuid
        valid = "550e8400-e29b-41d4-a716-446655440000"
        assert _ensure_uuid(valid) == valid
        
        # Test generation
        assert _ensure_uuid("bob") != "bob"


# Run these tests with:
# pytest tests/unit/test_observer_client.py -v
