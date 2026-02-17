"""Authentication Routes.

Handles user registration and login (token generation).
"""

from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_for_refresh, get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.settings import settings
from app.models.user import User, UserRole
from app.schemas.user import Token, UserCreate, UserResponse
from app.services.consent_service import ConsentService

router = APIRouter()


@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    """OAuth2 compatible token login, get an access token for future requests."""
    # Authenticate user
    stmt = select(User).where(User.email == form_data.username)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=access_token_expires,
    )

    # Check consent status — inform frontend if re-consent is needed
    consent_svc = ConsentService(db)
    missing = await consent_svc.get_missing_required(user.id)

    response: dict[str, Any] = {
        "access_token": access_token,
        "token_type": "bearer",
    }

    if missing:
        response["consent_required"] = True
        response["outstanding_policies"] = [p.to_dict() for p in missing]

    return response


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    """Create new user."""
    if not settings.REGISTRATION_ENABLED:
        raise HTTPException(
            status_code=403,
            detail="Public registration is disabled",
        )

    # Check if user exists
    stmt = select(User).where(User.email == user_in.email)
    result = await db.execute(stmt)
    existing_user = result.scalars().first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists",
        )

    # Create user - Force role to USER for public registration
    user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=UserRole.USER,
        is_active=True,
    )

    db.add(user)
    await db.flush()  # Assign user.id before granting consents

    # Grant any consents submitted with registration
    if user_in.consents:
        consent_svc = ConsentService(db)
        await consent_svc.grant_bulk(
            user,
            user_in.consents,
            ip_address=None,  # Could extract from Request if needed
        )

    await db.commit()
    await db.refresh(user)

    return user


@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: Annotated[User, Depends(get_current_user_for_refresh)],
) -> Any:
    """Issue a fresh access token.

    Accepts tokens expired within a 5-minute grace window so the frontend
    can recover even if its proactive refresh timer was slightly late.
    """
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.email, "role": current_user.role},
        expires_delta=access_token_expires,
    )

    return {"access_token": access_token, "token_type": "bearer"}
