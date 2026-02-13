from pwdlib import PasswordHash  # pylint: disable=import-error

from app.core.security import get_password_hash, verify_password


def test_password_hashing():
    password = "secret"
    hashed = get_password_hash(password)
    assert verify_password(password, hashed)
    assert not verify_password("wrong", hashed)


def test_hasher_configuration():
    # Verify execution uses Argon2
    from app.core.security import password_hash  # pylint: disable=import-outside-toplevel

    assert isinstance(password_hash, PasswordHash)

    # Check if Argon2Hasher is the default (generated hashes should start with $argon2)
    hashed = get_password_hash("test")
    assert hashed.startswith("$argon2")


def test_create_access_token():
    """Test token creation with and without custom expiry."""
    from datetime import timedelta  # pylint: disable=import-outside-toplevel

    from app.core.security import create_access_token  # pylint: disable=import-outside-toplevel

    # Token with explicit expiry
    token = create_access_token({"sub": "test"}, expires_delta=timedelta(minutes=5))
    assert isinstance(token, str)
    assert len(token) > 0

    # Token with default expiry
    token_default = create_access_token({"sub": "test2"})
    assert isinstance(token_default, str)
