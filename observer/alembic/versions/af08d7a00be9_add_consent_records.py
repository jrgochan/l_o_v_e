"""add_consent_records

Revision ID: af08d7a00be9
Revises: 889c66cafb73
Create Date: 2026-02-15 22:06:27.545572

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "af08d7a00be9"
down_revision: Union[str, None] = "889c66cafb73"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Table may already exist in the DB — use IF NOT EXISTS.
    op.execute("""
        CREATE TABLE IF NOT EXISTS consent_records (
            id UUID NOT NULL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            consent_type VARCHAR(100) NOT NULL,
            version VARCHAR(20) NOT NULL DEFAULT '1.0',
            granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            revoked_at TIMESTAMP WITH TIME ZONE,
            ip_address VARCHAR(45),
            notes TEXT
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_consent_records_user_id ON consent_records (user_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_consent_records_consent_type ON consent_records (consent_type)"
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_consent_records_consent_type"), table_name="consent_records")
    op.drop_index(op.f("ix_consent_records_user_id"), table_name="consent_records")
    op.drop_table("consent_records")
