"""Remove start_date and end_date from locations table

Revision ID: 46afb070d8a6
Revises: 7c562949ca4c
Create Date: 2025-08-19 16:10:25.831505

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '46afb070d8a6'
down_revision = '7c562949ca4c'
branch_labels = None
depends_on = None


def upgrade():
    # Remove start_date and end_date columns from locations table
    op.drop_column('locations', 'start_date')
    op.drop_column('locations', 'end_date')


def downgrade():
    # Add back start_date and end_date columns to locations table
    op.add_column('locations', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('locations', sa.Column('end_date', sa.Date(), nullable=True))
