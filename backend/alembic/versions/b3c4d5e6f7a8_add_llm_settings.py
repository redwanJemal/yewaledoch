"""add llm_settings table

Revision ID: b3c4d5e6f7a8
Revises: 5d2d49dfe0aa
Create Date: 2026-04-13 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "5d2d49dfe0aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "llm_settings",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False, server_default="anthropic"),
        sa.Column("api_key", sa.Text(), nullable=False, server_default=""),
        sa.Column("model", sa.String(length=200), nullable=False, server_default="claude-sonnet-4-20250514"),
        sa.Column("base_url", sa.Text(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("llm_settings")
