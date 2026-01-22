import sys
import pytest
from unittest.mock import patch, MagicMock
import importlib

def test_security_bcrypt_monkeypatch_logic():
    """Test the bcrypt monkeypatch logic in security.py."""
    # Similar to main.py test, we need to force reload to hit the module-level code
    import bcrypt
    
    # Save original state
    original_about = getattr(bcrypt, "__about__", None)
    
    try:
        # Simulate bcrypt HAVING __about__ (skip patch branch logic)
        # This covers lines 16 (false) -> jump to 24
        if not hasattr(bcrypt, "__about__"):
            bcrypt.__about__ = MagicMock()
            
        # Remove app.core.security from sys.modules
        if "app.core.security" in sys.modules:
            del sys.modules["app.core.security"]
            
        import app.core.security
        importlib.reload(app.core.security)
        
        # Verify it didn't crash and functionality remains
        assert hasattr(bcrypt, "__about__")
        
    finally:
        # cleanup
        if original_about is None and hasattr(bcrypt, "__about__"):
             del bcrypt.__about__
        elif original_about is not None:
             bcrypt.__about__ = original_about

def test_security_bcrypt_monkeypatch_apply():
    """Test that the monkeypatch actually applies when __about__ is missing."""
    import bcrypt
    import importlib
    
    # Save original state
    original_about = getattr(bcrypt, "__about__", None)
    
    try:
        # Force __about__ to be missing
        if hasattr(bcrypt, "__about__"):
            del bcrypt.__about__
            
        # Remove app.core.security from sys.modules
        if "app.core.security" in sys.modules:
            del sys.modules["app.core.security"]
            
        import app.core.security
        importlib.reload(app.core.security)
        
        # Verify it applied (it should have created an About class)
        assert hasattr(bcrypt, "__about__")
        assert hasattr(bcrypt.__about__, "__version__")
        
    finally:
        # cleanup
        if original_about is None and hasattr(bcrypt, "__about__"):
             del bcrypt.__about__
        elif original_about is not None:
             bcrypt.__about__ = original_about

def test_verify_password_logic():
    """Coverage for verify_password and get_password_hash."""
    from app.core.security import verify_password, get_password_hash, create_access_token
    from datetime import timedelta
    
    # Hash
    pwd = "secret"
    hashed = get_password_hash(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed)
    assert not verify_password("wrong", hashed)
    
    # Token
    token = create_access_token({"sub": "test"}, expires_delta=timedelta(minutes=5))
    assert isinstance(token, str)
    assert len(token) > 0
    
    # Token default expiry
    token_default = create_access_token({"sub": "test2"})
    assert isinstance(token_default, str)
