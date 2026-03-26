"""add octonion_extended column to multi_emotion_analyses

Revision ID: d4a5b6c7e8f9
Revises: 0e896f34fb2e
Create Date: 2026-03-26 19:54:00.000000

Adds a nullable JSONB column for the 4 octonion extension dimensions:
  { "depth": float, "coping": float, "velocity": float, "novelty": float }

Non-destructive: existing rows get NULL (valid — means "no octonion data yet").
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d4a5b6c7e8f9"
down_revision: Union[str, None] = "0e896f34fb2e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "multi_emotion_analyses",
        sa.Column(
            "octonion_extended",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment='Extended emotional dimensions: {"depth","coping","velocity","novelty"} all [-1,1]',
        ),
    )


def downgrade() -> None:
    op.drop_column("multi_emotion_analyses", "octonion_extended")
