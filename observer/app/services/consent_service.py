"""Consent Service — Business logic for consent management.

Handles granting, revoking, checking, and enforcing consent policies.
All mutating operations emit domain events for audit trail.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.core.consent_policies import (
    CONSENT_POLICIES,
    ConsentPolicy,
    get_policy,
    get_required_policies,
)
from app.core.events import DomainEvent, event_bus
from app.models.consent_record import ConsentRecord
from app.models.user import User
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class ConsentService:
    """Manages consent lifecycle: grant, revoke, query, enforce."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize the service with a database session."""
        self.db = db

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------

    async def grant_consent(
        self,
        user: User,
        policy_key: str,
        *,
        ip_address: str | None = None,
    ) -> ConsentRecord:
        """Grant consent for a specific policy at its current version.

        If the user already has an active consent for this policy at the
        current version, returns the existing record unchanged.  If they
        have an older version, the old one is revoked and a new one created.
        """
        policy = get_policy(policy_key)
        if policy is None:
            raise ValueError(f"Unknown consent policy: {policy_key}")

        # Check for existing active consent
        existing = await self._get_active_consent(user.id, policy_key)

        if existing and existing.version == policy.version:
            return existing  # Already consented at current version

        # Revoke outdated consent if present
        if existing:
            existing.revoked_at = datetime.now(timezone.utc)
            existing.notes = f"Superseded by v{policy.version}"

        # Create new consent record
        record = ConsentRecord(
            user_id=user.id,
            consent_type=policy_key,
            version=policy.version,
            ip_address=ip_address,
        )
        self.db.add(record)
        await self.db.flush()

        await event_bus.emit(
            DomainEvent(
                event_type="consent.granted",
                actor_id=user.id,
                target_id=user.id,
                metadata={
                    "policy_key": policy_key,
                    "version": policy.version,
                },
                ip_address=ip_address,
            )
        )

        logger.info(
            "Consent granted",
            extra={
                "user_id": str(user.id),
                "policy": policy_key,
                "version": policy.version,
            },
        )
        return record

    async def revoke_consent(
        self,
        user: User,
        policy_key: str,
        *,
        ip_address: str | None = None,
    ) -> ConsentRecord | None:
        """Revoke active consent for a policy.

        Returns the revoked record, or None if no active consent existed.
        """
        policy = get_policy(policy_key)
        if policy is None:
            raise ValueError(f"Unknown consent policy: {policy_key}")

        record = await self._get_active_consent(user.id, policy_key)
        if record is None:
            return None

        record.revoked_at = datetime.now(timezone.utc)
        await self.db.flush()

        await event_bus.emit(
            DomainEvent(
                event_type="consent.revoked",
                actor_id=user.id,
                target_id=user.id,
                metadata={
                    "policy_key": policy_key,
                    "version": record.version,
                },
                ip_address=ip_address,
            )
        )

        logger.info(
            "Consent revoked",
            extra={"user_id": str(user.id), "policy": policy_key},
        )
        return record

    async def grant_bulk(
        self,
        user: User,
        policy_keys: list[str],
        *,
        ip_address: str | None = None,
    ) -> list[ConsentRecord]:
        """Grant consent for multiple policies at once (registration flow)."""
        records = []
        for key in policy_keys:
            record = await self.grant_consent(user, key, ip_address=ip_address)
            records.append(record)
        return records

    # ------------------------------------------------------------------
    # Read operations
    # ------------------------------------------------------------------

    async def get_user_consents(self, user_id: UUID) -> list[ConsentRecord]:
        """Return all active (non-revoked) consent records for a user."""
        stmt = (
            select(ConsentRecord)
            .where(
                ConsentRecord.user_id == user_id,
                ConsentRecord.revoked_at.is_(None),
            )
            .order_by(ConsentRecord.granted_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_consent_status(self, user_id: UUID) -> dict[str, Any]:
        """Full consent status: granted, missing, and outdated policies.

        Returns a dictionary suitable for API response:
        {
            "granted": [...],       # policies with current-version consent
            "missing": [...],       # required policies never consented to
            "outdated": [...],      # policies consented to at old version
            "all_required_met": bool
        }
        """
        active_records = await self.get_user_consents(user_id)
        consented: dict[str, ConsentRecord] = {
            r.consent_type: r for r in active_records
        }

        granted = []
        missing = []
        outdated = []

        for policy in CONSENT_POLICIES.values():
            record = consented.get(policy.key)
            if record is None:
                if policy.required:
                    missing.append(policy.to_dict())
            elif record.version != policy.version:
                outdated.append(
                    {
                        **policy.to_dict(),
                        "consented_version": record.version,
                    }
                )
            else:
                granted.append(
                    {
                        **policy.to_dict(),
                        "granted_at": (
                            record.granted_at.isoformat() if record.granted_at else None
                        ),
                    }
                )

        all_required_met = len(missing) == 0 and all(
            p.key not in {o["key"] for o in outdated} for p in get_required_policies()
        )

        return {
            "granted": granted,
            "missing": missing,
            "outdated": outdated,
            "all_required_met": all_required_met,
        }

    async def get_missing_required(self, user_id: UUID) -> list[ConsentPolicy]:
        """Return required policies the user hasn't consented to at current version."""
        active = await self.get_user_consents(user_id)
        consented = {r.consent_type: r.version for r in active}

        missing = []
        for policy in get_required_policies():
            user_version = consented.get(policy.key)
            if user_version is None or user_version != policy.version:
                missing.append(policy)
        return missing

    async def check_all_required(self, user_id: UUID) -> bool:
        """Check whether user has accepted all required policies at current versions."""
        missing = await self.get_missing_required(user_id)
        return len(missing) == 0

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _get_active_consent(
        self, user_id: UUID, policy_key: str
    ) -> ConsentRecord | None:
        """Get the active (non-revoked) consent for a specific policy."""
        stmt = select(ConsentRecord).where(
            and_(
                ConsentRecord.user_id == user_id,
                ConsentRecord.consent_type == policy_key,
                ConsentRecord.revoked_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()
