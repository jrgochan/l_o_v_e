"""API Dependencies.

Common dependencies for API routes, including authentication.
"""

from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.config import settings

# OAuth2 scheme for token extraction (points to Observer login)
# Note: Versor is usually internal, but this supports direct client access if needed
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8000/auth/login")


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

        return payload  # type: ignore[no-any-return]
    except JWTError:
        raise credentials_exception
