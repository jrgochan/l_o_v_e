"""add movement_pattern to emotion_definitions

Revision ID: 533ab3f98b6d
Revises: 0e896f34fb2e
Create Date: 2026-01-20 20:47:46.435210

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '533ab3f98b6d'
down_revision: Union[str, None] = '0e896f34fb2e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('emotion_definitions', sa.Column('movement_pattern', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('emotion_definitions', 'movement_pattern')
