from pwdlib import PasswordHash  # pylint: disable=import-error

from app.core.security import get_password_hash, verify_password


def test_password_hashing():
    password = "secret"
    hashed = get_password_hash(password)
    assert verify_password(password, hashed)
    assert not verify_password("wrong", hashed)


def test_hasher_configuration():
    # Verify execution uses Argon2
    from app.core.security import (  # pylint: disable=import-outside-toplevel
        password_hash,
    )

    assert isinstance(password_hash, PasswordHash)

    # Check if Argon2Hasher is the default (generated hashes should start with $argon2)
    hashed = get_password_hash("test")
    assert hashed.startswith("$argon2")
