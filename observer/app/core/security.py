"""Security Utilities.

Handles password hashing and JWT token generation.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

# Monkeypatch bcrypt to work with passlib 1.7.4
import bcrypt
from jose import jwt
from passlib.context import CryptContext

from app.config import settings

if not hasattr(bcrypt, "__about__"):
    try:

        class About:
            """Monkeypatched About class for bcrypt compatibility."""

            __version__ = bcrypt.__version__  # type: ignore[attr-defined]

        bcrypt.__about__ = About()  # type: ignore[attr-defined]
    except Exception:  # pragma: no cover
        pass

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bool(pwd_context.verify(plain_password, hashed_password))


def get_password_hash(password: str) -> str:
    """Hash a password for storage."""
    return str(pwd_context.hash(password))


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
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt: str = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return str(encoded_jwt)
