"""add extended_vector column to emotion_definitions

Revision ID: e5b6c7d8f9g0
Revises: d4a5b6c7e8f9
Create Date: 2026-03-26 20:55:00.000000

Adds a Vector(4) column for pre-computed extended dimension defaults:
  [Depth, Coping, Velocity, Novelty] — each in range [-1, 1].

These values come from the emotion seed data (computed by
scripts/compute_extended_defaults.py using psychologically-grounded
heuristics from Lazarus, Scherer, and depth psychology).

Non-destructive: existing rows get NULL until re-seeded.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = "e5b6c7d8f9g0"
down_revision: Union[str, None] = "d4a5b6c7e8f9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "emotion_definitions",
        sa.Column(
            "extended_vector",
            Vector(4),
            nullable=True,
            comment="Extended dimensions: [Depth, Coping, Velocity, Novelty] each in [-1,1]",
        ),
    )


def downgrade() -> None:
    op.drop_column("emotion_definitions", "extended_vector")
