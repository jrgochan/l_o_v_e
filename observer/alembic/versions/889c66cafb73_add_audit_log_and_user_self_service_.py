"""add_audit_log_and_user_self_service_fields

Revision ID: 889c66cafb73
Revises: 533ab3f98b6d
Create Date: 2026-02-15 22:00:29.083600

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "889c66cafb73"
down_revision: Union[str, None] = "533ab3f98b6d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- New: audit_log table (may already exist from db_init) ---
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_log (
            id UUID NOT NULL PRIMARY KEY,
            event_type VARCHAR(100) NOT NULL,
            actor_id UUID,
            target_id UUID,
            metadata JSONB DEFAULT '{}',
            ip_address VARCHAR(45),
            "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        )
    """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_log_event_type ON audit_log (event_type)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_audit_log_actor_time ON audit_log (actor_id, timestamp DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_audit_log_target_time ON audit_log (target_id, timestamp DESC)"
    )

    # --- Users table: new columns for self-service ---
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "preferences",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
    )
    op.add_column("users", sa.Column("assigned_clinician_id", sa.Uuid(), nullable=True))
    op.create_index(
        "idx_users_clinician",
        "users",
        ["assigned_clinician_id"],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_foreign_key(
        "fk_users_assigned_clinician",
        "users",
        "users",
        ["assigned_clinician_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # --- Users table ---
    op.drop_constraint("fk_users_assigned_clinician", "users", type_="foreignkey")
    op.drop_index(
        "idx_users_clinician", table_name="users", postgresql_where=sa.text("deleted_at IS NULL")
    )
    op.drop_column("users", "assigned_clinician_id")
    op.drop_column("users", "preferences")
    op.drop_column("users", "deleted_at")

    # --- Audit log table ---
    op.drop_index("idx_audit_log_target_time", table_name="audit_log")
    op.drop_index("idx_audit_log_actor_time", table_name="audit_log")
    op.drop_index(op.f("ix_audit_log_event_type"), table_name="audit_log")
    op.drop_table("audit_log")
