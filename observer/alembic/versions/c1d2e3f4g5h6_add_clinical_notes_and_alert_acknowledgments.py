"""add_clinical_notes_and_alert_acknowledgments

Revision ID: c1d2e3f4g5h6
Revises: af08d7a00be9
Create Date: 2026-02-16 03:20:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4g5h6"
down_revision: Union[str, None] = "af08d7a00be9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- clinical_notes table ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS clinical_notes (
            id UUID NOT NULL PRIMARY KEY,
            clinician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
            content TEXT DEFAULT '',
            category VARCHAR(50) DEFAULT 'general' NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_clinical_notes_clinician_id ON clinical_notes (clinician_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_clinical_notes_client_id ON clinical_notes (client_id)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_clinical_notes_category ON clinical_notes (category)")

    # --- alert_acknowledgments table ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS alert_acknowledgments (
            id UUID NOT NULL PRIMARY KEY,
            alert_id UUID NOT NULL UNIQUE REFERENCES clinical_alerts(id) ON DELETE CASCADE,
            clinician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            action_taken VARCHAR(50) DEFAULT 'reviewed' NOT NULL,
            response_note TEXT,
            acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_alert_acknowledgments_alert_id ON alert_acknowledgments (alert_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_alert_acknowledgments_clinician_id ON alert_acknowledgments (clinician_id)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS alert_acknowledgments")
    op.execute("DROP TABLE IF EXISTS clinical_notes")
