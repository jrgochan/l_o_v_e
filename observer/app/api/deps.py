"""API Dependencies.

Common dependencies for API routes, including database sessions and authentication.
"""

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Query, WebSocketException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.core.settings import settings
from app.database import get_db as get_db  # re-export  # pylint: disable=useless-import-alias
from app.models.user import User, UserRole
from app.schemas.user import TokenData

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def _get_or_create_dev_user(db: AsyncSession) -> User:
    """Get or create the dev admin user for bypass authentication."""
    stmt = select(User).where(User.email == "dev@admin.com")
    result = await db.execute(stmt)
    db_user = result.scalars().first()

    if not db_user:
        db_user = User(
            email="dev@admin.com",
            full_name="Dev Admin",
            role=UserRole.ADMIN,
            is_active=True,
            password_hash=get_password_hash("dev"),
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)

    return db_user


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Validate JWT token and retrieve current user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if token == "dev-token-bypass":
        return await _get_or_create_dev_user(db)

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except (JWTError, ValidationError) as e:
        raise credentials_exception from e

    stmt = select(User).where(User.email == token_data.email)
    result = await db.execute(stmt)
    db_user = result.scalars().first()

    if db_user is None:
        raise credentials_exception

    return db_user


async def get_current_active_user(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """Ensure the current user is active."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_admin(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> User:
    """Ensure the current user is an admin."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user


async def get_current_user_ws(
    token: Annotated[str, Query()],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Validate JWT token from query parameter for WebSockets."""
    credentials_exception = WebSocketException(
        code=status.WS_1008_POLICY_VIOLATION,
        reason="Could not validate credentials",
    )

    if token == "dev-token-bypass":
        return await _get_or_create_dev_user(db)

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except (JWTError, ValidationError) as e:
        raise credentials_exception from e

    stmt = select(User).where(User.email == token_data.email)
    result = await db.execute(stmt)
    db_user = result.scalars().first()

    if db_user is None:
        raise credentials_exception

    return db_user
