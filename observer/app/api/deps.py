"""API Dependencies.

Common dependencies for API routes, including database sessions and authentication.
"""

import os
from datetime import datetime, timezone
from typing import Annotated, Optional

import jwt
from app.core.security import get_password_hash
from app.core.settings import settings
from app.database import (
    get_db as get_db,  # re-export  # pylint: disable=useless-import-alias
)
from app.models.user import User, UserRole
from app.schemas.user import TokenData
from fastapi import Depends, HTTPException, Query, WebSocketException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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

    if (
        token == "dev-token-bypass"  # nosec B105
        and os.getenv("APP_ENV", "development") != "production"
    ):
        return await _get_or_create_dev_user(db)

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except (InvalidTokenError, ValidationError) as e:
        raise credentials_exception from e

    stmt = select(User).where(User.email == token_data.email)
    result = await db.execute(stmt)
    db_user = result.scalars().first()

    if db_user is None:
        raise credentials_exception

    return db_user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Ensure the current user is active and not soft-deleted."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    if current_user.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Account has been deleted")
    return current_user


async def get_current_admin(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    """Ensure the current user is an admin."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user


async def get_current_clinician(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    """Ensure the current user is a clinician or admin.

    Admins are granted clinician-level access for oversight purposes.
    """
    if current_user.role not in (UserRole.CLINICIAN, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clinician or admin privileges required",
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

    if token == "dev-token-bypass" and settings.APP_ENV != "production":  # nosec B105
        return await _get_or_create_dev_user(db)

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except (InvalidTokenError, ValidationError) as e:
        raise credentials_exception from e

    stmt = select(User).where(User.email == token_data.email)
    result = await db.execute(stmt)
    db_user = result.scalars().first()

    if db_user is None:
        raise credentials_exception

    return db_user


# Grace period for token refresh (seconds)
REFRESH_GRACE_SECONDS = 300  # 5 minutes


async def get_current_user_for_refresh(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Validate JWT for refresh — allows tokens expired within the grace period.

    This is used exclusively by the /auth/refresh endpoint so users can
    obtain a fresh token even if the old one just expired (e.g. browser
    tab was suspended and the proactive timer couldn't fire).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if (
        token == "dev-token-bypass"  # nosec B105
        and os.getenv("APP_ENV", "development") != "production"
    ):
        return await _get_or_create_dev_user(db)

    try:
        # Decode WITHOUT verifying expiration
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False},
        )

        # Manually check grace period
        exp = payload.get("exp")
        if exp is not None:
            now = datetime.now(timezone.utc).timestamp()
            if now > exp + REFRESH_GRACE_SECONDS:
                raise credentials_exception  # Too far past expiry

        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except (InvalidTokenError, ValidationError) as e:
        raise credentials_exception from e

    stmt = select(User).where(User.email == token_data.email)
    result = await db.execute(stmt)
    db_user = result.scalars().first()

    if db_user is None:
        raise credentials_exception

    return db_user
