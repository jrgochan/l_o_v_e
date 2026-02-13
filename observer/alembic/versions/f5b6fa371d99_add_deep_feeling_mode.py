"""add_deep_feeling_mode

Revision ID: f5b6fa371d99
Revises: 3ea92525bf77
Create Date: 2026-01-08 19:17:59.150513

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f5b6fa371d99"
down_revision: Union[str, None] = "3ea92525bf77"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "chat_sessions",
        sa.Column(
            "deep_feeling_mode", sa.Boolean(), server_default="false", nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_column("chat_sessions", "deep_feeling_mode")
