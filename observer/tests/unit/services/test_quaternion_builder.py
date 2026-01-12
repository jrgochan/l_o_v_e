import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.quaternion_builder import QuaternionBuilder

@pytest.fixture
def builder_http():
    """QuaternionBuilder in HTTP mode"""
    return QuaternionBuilder(versor_url="http://test-versor", use_http=True)

@pytest.fixture
def builder_direct():
    """QuaternionBuilder in direct mode (mocked imports)"""
    with patch("app.services.quaternion_builder.settings") as mock_settings:
        with patch.dict("sys.modules", {"versor.app.core.vac_model": MagicMock()}):
            yield QuaternionBuilder(use_http=False)

def test_validate_vac_valid(builder_http):
    """Test VAC validation with valid inputs"""
    builder_http._validate_vac([0.5, -0.5, 0.0])
    builder_http._validate_vac([1.0, -1.0, 1.0])

def test_validate_vac_invalid_length(builder_http):
    """Test VAC validation with invalid length"""
    with pytest.raises(ValueError, match="VAC must have 3 components"):
        builder_http._validate_vac([0.5, 0.5])

def test_validate_vac_out_of_range(builder_http):
    """Test VAC validation with out of range values"""
    with pytest.raises(ValueError, match="must be in range"):
        builder_http._validate_vac([1.5, 0.0, 0.0])

def test_is_unit_quaternion():
    """Test unit quaternion check"""
    assert QuaternionBuilder.is_unit_quaternion([1.0, 0.0, 0.0, 0.0])
    assert QuaternionBuilder.is_unit_quaternion([0.5, 0.5, 0.5, 0.5])
    assert not QuaternionBuilder.is_unit_quaternion([1.0, 1.0, 0.0, 0.0])

def test_quaternion_dict_conversion():
    """Test dictionary conversion helpers"""
    q_list = [1.0, 2.0, 3.0, 4.0]
    q_dict = QuaternionBuilder.quaternion_to_dict(q_list)
    assert q_dict == {"w": 1.0, "x": 2.0, "y": 3.0, "z": 4.0}
    
    q_list_back = QuaternionBuilder.dict_to_quaternion(q_dict)
    assert q_list_back == q_list

@pytest.mark.asyncio
async def test_from_vac_http_success(builder_http):
    """Test HTTP conversion success"""
    mock_response_data = {
        "current_state": {"w": 0.7, "x": 0.7, "y": 0.0, "z": 0.0}
    }
    
    with patch("httpx.AsyncClient") as MockClient:
        mock_client_instance = AsyncMock()
        MockClient.return_value.__aenter__.return_value = mock_client_instance
        
        # Use proper httpx.Response object with dummy request
        import httpx
        mock_request = httpx.Request("POST", "http://test-versor/versor/calculate")
        mock_response = httpx.Response(200, json=mock_response_data, request=mock_request)
        mock_client_instance.post.return_value = mock_response
        
        result = await builder_http.from_vac([0.5, 0.5, 0.0])
        
        assert result == [0.7, 0.7, 0.0, 0.0]
        mock_client_instance.post.assert_called_once()

@pytest.mark.asyncio
async def test_from_vac_http_failure_fallback(builder_http):
    """Test HTTP conversion failure fallback"""
    with patch("httpx.AsyncClient") as MockClient:
        mock_client_instance = AsyncMock()
        MockClient.return_value.__aenter__.return_value = mock_client_instance
        
        # Simulate HTTP error
        import httpx
        mock_client_instance.post.side_effect = httpx.HTTPError("Connection failed")
        
        result = await builder_http.from_vac([0.5, 0.5, 0.0])
        
        # Should return identity fallback
        # Should return identity fallback
        assert result == [1.0, 0.0, 0.0, 0.0]

def test_from_vac_no_validation(builder_http):
    """Test skipping validation"""
    # Invalid VAC (range > 1.0) but validate=False
    vac = [2.0, 0.0, 0.0]
    
    # Should attempt conversion (mock verify it's passed through)
    with patch.object(builder_http, '_from_vac_http', new_callable=AsyncMock) as mock_conv:
        mock_conv.return_value = [1,0,0,0]
        import asyncio
        asyncio.run(builder_http.from_vac(vac, validate=False))
        mock_conv.assert_called_with(vac)

def test_singleton_pattern():
    """Test usage of singleton getter."""
    from app.services.quaternion_builder import get_quaternion_builder, _quaternion_builder_instance
    
    # Reset singleton
    import app.services.quaternion_builder as qb_module
    old_instance = qb_module._quaternion_builder_instance
    qb_module._quaternion_builder_instance = None
    
    try:
        instance1 = get_quaternion_builder()
        instance2 = get_quaternion_builder()
        assert instance1 is instance2
        assert isinstance(instance1, QuaternionBuilder)
    finally:
        qb_module._quaternion_builder_instance = old_instance

def test_init_direct_mode_success():
    """Test successful initialization in direct mode."""
    mock_module = MagicMock()
    with patch.dict("sys.modules", {"versor.app.core.vac_model": mock_module}):
        qb = QuaternionBuilder(use_http=False)
        assert qb.use_http is False
        assert qb.VACVector is not None

def test_init_direct_mode_failure():
    """Test initialization failure when Versor is missing."""
    import builtins
    orig_import = builtins.__import__
    
    def mock_import(name, *args, **kwargs):
        if name.startswith("versor"):
            raise ImportError("No versor")
        return orig_import(name, *args, **kwargs)
        
    with patch("builtins.__import__", side_effect=mock_import):
        with pytest.raises(ImportError, match="Versor package not found"):
             QuaternionBuilder(use_http=False)

@pytest.mark.asyncio
async def test_from_vac_direct_conversion():
    """Test conversion using direct Versor import via public method."""
    mock_vac_vector_class = MagicMock()
    mock_vector_instance = MagicMock()
    mock_quaternion = MagicMock()
    mock_quaternion.w = 0.5
    mock_quaternion.x = 0.5
    mock_quaternion.y = 0.5
    mock_quaternion.z = 0.5
    
    mock_vac_vector_class.return_value = mock_vector_instance
    mock_vector_instance.to_quaternion.return_value = mock_quaternion
    
    # Setup sys.modules for init
    with patch.dict("sys.modules", {"versor.app.core.vac_model": MagicMock(VACVector=mock_vac_vector_class)}):
        qb = QuaternionBuilder(use_http=False)
        
        # Override the VACVector attribute to be safe (mocks can be tricky with sys.modules reload)
        qb.VACVector = mock_vac_vector_class
        
        result = await qb.from_vac([0.1, 0.2, 0.3])
        
        assert result == [0.5, 0.5, 0.5, 0.5]
        mock_vac_vector_class.assert_called_with(valence=0.1, arousal=0.2, connection=0.3)

