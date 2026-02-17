"""add semantic embedding to messages

Revision ID: 870b1a357de9
Revises: f5b6fa371d99
Create Date: 2026-01-19 22:45:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = "870b1a357de9"
down_revision: Union[str, None] = "2ae04862ad3f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add semantic_embedding column
    # We use 384 as the default dimension for all-MiniLM-L6-v2
    op.add_column("chat_messages", sa.Column("semantic_embedding", Vector(384), nullable=True))

    # Create IVFFlat index for fast similarity search
    # lists=100 is a reasonable default for small to medium datasets
    op.create_index(
        "ix_chat_messages_semantic_embedding",
        "chat_messages",
        ["semantic_embedding"],
        unique=False,
        postgresql_using="ivfflat",
        postgresql_ops={"semantic_embedding": "vector_cosine_ops"},
        postgresql_with={"lists": 100},
    )


def downgrade() -> None:
    op.drop_index(
        "ix_chat_messages_semantic_embedding",
        table_name="chat_messages",
        postgresql_using="ivfflat",
    )
    op.drop_column("chat_messages", "semantic_embedding")
