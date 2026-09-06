"""performance indexes for dashboard/training hot paths

Revision ID: 0001_perf_indexes
Revises:
Create Date: 2026-06-27

Adds the indexes the dashboard + training endpoints rely on. Every dashboard
load joins/filters on these columns (Assessment.user_id, Result.assessment_id,
Progress.user_id, TrainingPlan.user_id, TrainingTask.plan_id, ...) which were
previously unindexed → sequential scans on every request.

All statements use IF NOT EXISTS so this is safe to run against the existing DB
(which already has a few of the single-column user_id indexes).
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_perf_indexes"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (index_name, table, columns) — composite (user_id, created_at) covers both the
# WHERE user_id filter AND the ORDER BY created_at used in the "latest" lookups.
INDEXES = [
    ("ix_assessments_user_created", "assessments", "user_id, created_at"),
    ("ix_results_assessment_id", "results", "assessment_id"),
    ("ix_results_session_id", "results", "session_id"),
    ("ix_progress_user_created", "progress", "user_id, created_at"),
    ("ix_training_plans_user_id", "training_plans", "user_id"),
    ("ix_training_tasks_plan_id", "training_tasks", "plan_id"),
    ("ix_eye_tracking_user_created", "eye_tracking", "user_id, created_at"),
    ("ix_writing_tests_user_created", "writing_tests", "user_id, created_at"),
    ("ix_advanced_eye_user_created", "advanced_eye_metrics", "user_id, created_at"),
    ("ix_assessment_sessions_user_id", "assessment_sessions", "user_id"),
    ("ix_courses_user_id", "courses", "user_id"),
]


def upgrade() -> None:
    for name, table, cols in INDEXES:
        op.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {table} ({cols})")


def downgrade() -> None:
    for name, _table, _cols in INDEXES:
        op.execute(f"DROP INDEX IF EXISTS {name}")
