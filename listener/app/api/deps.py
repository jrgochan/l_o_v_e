"""API Dependencies.

Common dependencies for API routes, including authentication.
"""

from typing import Annotated, Any

from fastapi import Depends, HTTPException, Query, WebSocketException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.config import settings

# OAuth2 scheme for token extraction (points to Observer login)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.OBSERVER_URL}/auth/login")


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> dict[str, Any]:
    """Validate JWT token using shared secret."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode and verify signature using the shared secret
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception

        # We return the payload (claims) directly since Listener doesn't have a DB
        return payload  # type: ignore[no-any-return]
    except JWTError as e:
        raise credentials_exception from e


async def get_current_user_ws(token: Annotated[str, Query()]) -> dict[str, Any]:
    """Validate JWT token from query parameter for WebSockets."""
    credentials_exception = WebSocketException(
        code=status.WS_1008_POLICY_VIOLATION,
        reason="Could not validate credentials",
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        return payload  # type: ignore[no-any-return]
    except JWTError as e:
        raise credentials_exception from e
