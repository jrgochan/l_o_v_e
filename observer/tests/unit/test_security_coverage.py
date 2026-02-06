def test_verify_password_logic():
    """Coverage for verify_password and get_password_hash."""
    from datetime import timedelta

    from app.core.security import create_access_token, get_password_hash, verify_password

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
