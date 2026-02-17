"""Add waypoint explanation templates

Revision ID: 5a1b2c3d4e5f
Revises: 4a8b9c2d3e4f
Create Date: 2026-01-03 20:27:00

This migration adds the waypoint_explanation_templates table for storing
research-backed explanations of emotional transition waypoints. These templates
provide users with psychological context, readiness signs, and research citations
for understanding why specific waypoints are chosen in their transition paths.

The WaypointExplainer service uses these templates to generate rich explanations
that transform abstract emotion names into actionable guidance with VAC analysis.
"""

from alembic import op

# Revision identifiers, used by Alembic
revision = "5a1b2c3d4e5f"
down_revision = "4a8b9c2d3e4f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create waypoint_explanation_templates table."""

    # Create the main table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS waypoint_explanation_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            from_emotion_id UUID REFERENCES atlas_definitions(id) ON DELETE CASCADE,
            to_emotion_id UUID REFERENCES atlas_definitions(id) ON DELETE CASCADE,
            waypoint_emotion_id UUID REFERENCES atlas_definitions(id) ON DELETE CASCADE,
            from_category VARCHAR(100),
            to_category VARCHAR(100),
            psychological_purpose TEXT NOT NULL,
            why_this_order TEXT NOT NULL,
            what_it_enables TEXT NOT NULL,
            previous_what_changed TEXT[],
            previous_why_necessary TEXT,
            next_what_enabled TEXT[],
            next_how_prepares TEXT,
            readiness_signs TEXT[] NOT NULL,
            warning_signs TEXT[],
            research_citations JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_by VARCHAR(100) DEFAULT 'system',
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            priority INTEGER DEFAULT 100,
            UNIQUE (from_emotion_id, to_emotion_id, waypoint_emotion_id)
        )
    """
    )

    # Create indexes for performance
    op.execute(
        "CREATE INDEX idx_waypoint_templates_from "
        "ON waypoint_explanation_templates(from_emotion_id)"
    )

    op.execute(
        "CREATE INDEX idx_waypoint_templates_to " "ON waypoint_explanation_templates(to_emotion_id)"
    )

    op.execute(
        "CREATE INDEX idx_waypoint_templates_waypoint "
        "ON waypoint_explanation_templates(waypoint_emotion_id)"
    )

    op.execute(
        "CREATE INDEX idx_waypoint_templates_priority "
        "ON waypoint_explanation_templates(priority DESC)"
    )

    op.execute(
        "CREATE INDEX idx_waypoint_templates_categories "
        "ON waypoint_explanation_templates(from_category, to_category)"
    )

    # Add table comment
    op.execute(
        "COMMENT ON TABLE waypoint_explanation_templates IS "
        "'Stores curated, research-backed explanations for common emotional "
        "transition waypoints. Used by WaypointExplainer service to provide "
        "rich psychological context.'"
    )

    # Add column comments
    op.execute(
        "COMMENT ON COLUMN waypoint_explanation_templates.psychological_purpose IS "
        "'Why this waypoint is psychologically necessary (core purpose)'"
    )

    op.execute(
        "COMMENT ON COLUMN waypoint_explanation_templates.research_citations IS "
        "'Array of research citations in JSON format with author, year, work, key_finding'"
    )

    op.execute(
        "COMMENT ON COLUMN waypoint_explanation_templates.priority IS "
        "'Higher priority templates are used first when multiple matches exist (100 = default)'"
    )


def downgrade() -> None:
    """Drop waypoint_explanation_templates table."""
    op.execute("DROP TABLE IF EXISTS waypoint_explanation_templates CASCADE")
