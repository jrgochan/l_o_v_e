"""Consent Routes — User consent management.

Public endpoint to list policies; authenticated endpoints for
granting, viewing, and revoking consent.
"""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_db
from app.core.consent_policies import CONSENT_POLICIES, get_policy
from app.models.user import User
from app.services.consent_service import ConsentService

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas (local to this route module)
# ---------------------------------------------------------------------------


class ConsentGrantRequest(BaseModel):
    """Request body for granting consent to one or more policies."""

    policy_keys: list[str]


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------


@router.get("/policies")
async def list_policies() -> Any:
    """List all available consent policies.

    FIXME: Define proper Pydantic response schema (ConsentListResponse).


    No authentication required — the frontend needs this to render
    consent forms during registration before the user has a token.
    """
    return {
        "policies": [p.to_dict() for p in CONSENT_POLICIES.values()],
    }


# ---------------------------------------------------------------------------
# Authenticated
# ---------------------------------------------------------------------------


@router.get("/me")
async def get_my_consent_status(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    """Get the current user's consent status.

    Returns granted, missing, and outdated policies.
    """
    service = ConsentService(db)
    return await service.get_consent_status(current_user.id)


@router.post("/me")
async def grant_consents(
    body: ConsentGrantRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> Any:
    """Grant consent to one or more policies.

    Accepts a list of policy keys. Unknown keys are rejected.
    """
    # Validate all keys first
    unknown = [k for k in body.policy_keys if get_policy(k) is None]
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown consent policies: {', '.join(unknown)}",
        )

    service = ConsentService(db)
    ip = request.client.host if request.client else None

    records = await service.grant_bulk(
        current_user,
        body.policy_keys,
        ip_address=ip,
    )
    await db.commit()

    return {
        "granted": [r.to_dict() for r in records],
        "message": f"Consent granted for {len(records)} policy(ies)",
    }


@router.delete("/me/{policy_key}")
async def revoke_consent(
    policy_key: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> Any:
    """Revoke consent for a specific policy.

    Note: revoking a required policy may limit the user's access
    on their next login.
    """
    if get_policy(policy_key) is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown consent policy: {policy_key}",
        )

    service = ConsentService(db)
    ip = request.client.host if request.client else None

    record = await service.revoke_consent(current_user, policy_key, ip_address=ip)
    await db.commit()

    if record is None:
        raise HTTPException(
            status_code=404,
            detail=f"No active consent found for {policy_key}",
        )

    return {
        "revoked": record.to_dict(),
        "message": f"Consent revoked for {policy_key}",
    }
