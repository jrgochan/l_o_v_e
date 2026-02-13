"""Security Utilities.

Handles password hashing and JWT token generation.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.settings import settings

password_hash = PasswordHash((Argon2Hasher(),))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bool(password_hash.verify(plain_password, hashed_password))


def get_password_hash(password: str) -> str:
    """Hash a password for storage."""
    return str(password_hash.hash(password))


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token.

    Args:
        data: Payload data to include in token
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT string
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})
    encoded_jwt: str = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return str(encoded_jwt)
