"""User Service — Business logic for user self-management.

Centralizes all user operations so they can be reused across
API routes, CLI tools, background jobs, and future mobile endpoints.
Every mutating action emits a domain event for audit logging.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import DomainEvent, event_bus
from app.core.security import get_password_hash, verify_password
from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from app.models.clinical_alert import ClinicalAlert
from app.models.user import User
from app.models.user_trajectory import UserTrajectory

logger = logging.getLogger(__name__)


class UserService:
    """Service layer for user account operations."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize the service with a database session."""
        self.db = db

    async def update_profile(
        self,
        user: User,
        *,
        full_name: Optional[str] = None,
        email: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> User:
        """Update the user's profile information.

        Only name and email can be changed by the user themselves.
        Role and status changes require admin privileges.
        """
        changes: Dict[str, Any] = {}

        if full_name is not None:
            changes["full_name_old"] = user.full_name
            user.full_name = full_name

        if email is not None and email != user.email:
            # Check for email uniqueness
            existing = await self.db.execute(
                select(User).where(User.email == email, User.id != user.id)
            )
            if existing.scalars().first():
                raise ValueError("Email already in use by another account")
            changes["email_old"] = user.email
            user.email = email

        if changes:
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)

            await event_bus.emit(
                DomainEvent(
                    event_type="user.profile_updated",
                    actor_id=user.id,
                    metadata=changes,
                    ip_address=ip_address,
                )
            )
            logger.info("User %s updated their profile", user.email)

        return user

    async def change_password(
        self,
        user: User,
        *,
        current_password: str,
        new_password: str,
        ip_address: Optional[str] = None,
    ) -> None:
        """Change the user's password after verifying the current one."""
        if not verify_password(current_password, user.password_hash):
            raise ValueError("Current password is incorrect")

        if verify_password(new_password, user.password_hash):
            raise ValueError("New password must be different from current password")

        user.password_hash = get_password_hash(new_password)
        self.db.add(user)
        await self.db.commit()

        await event_bus.emit(
            DomainEvent(
                event_type="user.password_changed",
                actor_id=user.id,
                ip_address=ip_address,
            )
        )
        logger.info("User %s changed their password", user.email)

    async def soft_delete_account(
        self,
        user: User,
        *,
        ip_address: Optional[str] = None,
    ) -> None:
        """Soft-delete the user's account.

        Sets deleted_at timestamp. Data is retained for the configured
        retention period (default: 30 days) before permanent purge.
        The user will be filtered out of all active queries.
        """
        user.deleted_at = datetime.now(timezone.utc)
        user.is_active = False
        self.db.add(user)
        await self.db.commit()

        await event_bus.emit(
            DomainEvent(
                event_type="user.account_deleted",
                actor_id=user.id,
                metadata={"email": user.email, "soft_delete": True},
                ip_address=ip_address,
            )
        )
        logger.info("User %s soft-deleted their account", user.email)

    # pylint: disable=too-many-locals
    async def export_data(self, user: User) -> Dict[str, Any]:
        """Export all user data as a structured dictionary.

        Includes: profile, sessions, messages, emotional trajectory,
        and clinical alerts. This supports GDPR Article 20 (data portability).
        """
        # Gather sessions
        sessions_result = await self.db.execute(
            select(ChatSession)
            .where(ChatSession.auth_user_id == user.id)
            .order_by(ChatSession.started_at.desc())
        )
        sessions = sessions_result.scalars().all()

        # Gather messages for all sessions
        session_ids = [s.id for s in sessions]
        messages_data: List[Dict[str, Any]] = []
        if session_ids:
            messages_result = await self.db.execute(
                select(ChatMessage)
                .where(ChatMessage.session_id.in_(session_ids))
                .order_by(ChatMessage.created_at)
            )
            messages = messages_result.scalars().all()
            messages_data = [
                {
                    "session_id": str(msg.session_id),
                    "role": "user" if msg.is_user_message else "assistant",
                    "content": msg.content,
                    "created_at": (msg.created_at.isoformat() if msg.created_at else None),
                }
                for msg in messages
            ]

        # Gather emotional trajectory
        trajectory_result = await self.db.execute(
            select(UserTrajectory)
            .where(UserTrajectory.user_id == user.id)
            .order_by(UserTrajectory.timestamp)
        )
        trajectory = trajectory_result.scalars().all()
        trajectory_data = [
            {
                "timestamp": t.timestamp.isoformat() if t.timestamp else None,
                "valence": t.vac_values[0] if t.vac_values else 0.0,
                "arousal": t.vac_values[1] if t.vac_values else 0.0,
                "control": t.vac_values[2] if t.vac_values else 0.0,
                "emotion_label": str(t.dominant_emotion_id),
                "elasticity": t.elasticity_metric,
            }
            for t in trajectory
        ]

        # Gather clinical alerts
        alerts_data: List[Dict[str, Any]] = []
        if session_ids:
            alerts_result = await self.db.execute(
                select(ClinicalAlert)
                .where(ClinicalAlert.session_id.in_(session_ids))
                .order_by(ClinicalAlert.timestamp)
            )
            alerts = alerts_result.scalars().all()
            alerts_data = [
                {
                    "session_id": str(a.session_id),
                    "alert_type": a.type,
                    "severity": a.level,
                    "description": a.message,
                    "created_at": a.timestamp.isoformat() if a.timestamp else None,
                }
                for a in alerts
            ]

        # Gather consents
        # pylint: disable=import-outside-toplevel
        from app.services.consent_service import ConsentService

        consent_svc = ConsentService(self.db)
        consents = await consent_svc.get_user_consents(user.id)
        consents_data = [
            {
                "consent_type": c.consent_type,
                "version": c.version,
                "granted_at": c.granted_at.isoformat() if c.granted_at else None,
                "revoked_at": c.revoked_at.isoformat() if c.revoked_at else None,
                "ip_address": c.ip_address,
            }
            for c in consents
        ]

        # Emit export event
        await event_bus.emit(
            DomainEvent(
                event_type="user.data_exported",
                actor_id=user.id,
            )
        )

        return {
            "export_version": "1.0",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "profile": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value if hasattr(user.role, "value") else user.role,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "preferences": user.preferences or {},
            },
            "sessions": [
                {
                    "id": str(s.id),
                    "started_at": s.started_at.isoformat() if s.started_at else None,
                    "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                    "tone_preference": s.tone_preference,
                    "message_count": s.message_count,
                }
                for s in sessions
            ],
            "messages": messages_data,
            "emotional_trajectory": trajectory_data,
            "clinical_alerts": alerts_data,
            "consents": consents_data,
        }
