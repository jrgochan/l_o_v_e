import pytest
from unittest.mock import patch, AsyncMock

def test_lifespan_startup_shutdown():
    """Test that lifespan events run init_db and close_db."""
    from app.main import app
    from fastapi.testclient import TestClient
    
    # We need to patch the init_db and close_db functions imported in main
    # Note: app.main imports them from app.database
    with patch("app.main.init_db", new_callable=AsyncMock) as mock_init, \
         patch("app.main.close_db", new_callable=AsyncMock) as mock_close:
        
        # Using TestClient as context manager triggers lifespan
        with TestClient(app) as client:
            # Startup phase should have run
            assert mock_init.called
            # Shutdown phase has NOT run yet
            assert not mock_close.called
            
            # Make a simple request to ensure app is up
            response = client.get("/")
            assert response.status_code == 200
            
        # After context exit, shutdown phase should have run
        assert mock_close.called

def test_lifespan_startup_failure():
    """Test that lifespan handles startup failure."""
    from app.main import app
    from fastapi.testclient import TestClient
    
    with patch("app.main.init_db", side_effect=Exception("Startup Fail")) as mock_init:
        # Should raise exception during startup
        with pytest.raises(Exception, match="Startup Fail"):
            with TestClient(app) as client:
                pass

