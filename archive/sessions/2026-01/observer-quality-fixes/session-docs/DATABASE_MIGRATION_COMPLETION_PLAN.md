# Database Migration Completion Plan
**Created:** 2026-01-03
**Goal:** Complete database schema implementation for production-ready L.O.V.E. stack
**Target:** Monday, 2026-01-06
**Status:** 🚧 In Progress

---

## Executive Summary

The Observer database has **incomplete migration coverage**. While Python models exist for 9+ feature sets, only 2 Alembic migrations have been created. The remaining 7 SQL files are dormant reference files that **are never executed**. This causes "relation does not exist" errors when code tries to query missing tables.

### Current State
- ✅ **2 Python migrations** (`3d24332d682d`, `4a8b9c2d3e4f`) - ACTIVE
- ❌ **7 SQL files** in `migrations/versions/` - NOT EXECUTED
- ❌ Missing tables: `waypoint_explanation_templates`, `path_matrix_cache`, `chat_messages`, `clinical_alerts`, etc.

### Solution
Convert all SQL files to Python Alembic migrations following asyncpg-compatible patterns.

---

## Migration Inventory

### Active Python Migrations ✅
| Revision | Name | Tables Created | Status |
|----------|------|----------------|--------|
| `3d24332d682d` | initial_schema_with_pgvector | `atlas_definitions`, `user_trajectory` | ✅ Active |
| `4a8b9c2d3e4f` | add_transition_system_tables | `transition_strategies`, `transition_patterns`, `category_transitions`, `pattern_strategies`, `user_journeys`, `journey_waypoints`, `strategy_attempts` | ✅ Active |

### SQL Files Requiring Conversion 🚧
| Priority | SQL File | Tables | Models Exist | Impact |
|----------|----------|--------|--------------|--------|
| **CRITICAL** | `add_waypoint_explanations.sql` | `waypoint_explanation_templates` | ❌ | **BLOCKING:** Path computation failing |
| **HIGH** | `add_path_matrix_cache.sql` | `path_matrix_cache`, `path_computation_jobs` | ❌ | Performance optimization used by code |
| **HIGH** | `add_chat_system.sql` | `chat_sessions`, `chat_messages` | ✅ Yes | Core feature, models defined |
| **MEDIUM** | `add_session_analytics.sql` | `session_analytics` | ✅ Yes | Analytics feature, model defined |
| **MEDIUM** | `add_clinical_alerts.sql` | `clinical_alerts` | ✅ Yes | Safety feature, model defined |
| **LOW** | `add_model_management.sql` | `model_assignments`, `model_performance_metrics` | ✅ Yes | Model tracking feature |
| **LOW** | `rename_model_name_to_ai_model_name.sql` | N/A (column rename) | N/A | Depends on model_management |
| **FUTURE** | `add_three_way_analysis.sql` | TBD | ❌ | Not yet implemented |
| **FUTURE** | `add_deep_feeling_mode.sql` | TBD | ❌ | Not yet implemented |
| **SKIP** | `fix_clinical_alerts_enum_types.sql` | N/A (enum fix) | N/A | Incorporate into clinical_alerts migration |

---

## Implementation Plan

### Phase 1: Critical Path (Fix Production Issue) ⚡
**Timeline:** Tonight (2026-01-03)
**Goal:** Resolve "waypoint_explanation_templates does not exist" error

#### Task 1.1: Waypoint Explanations Migration
- [ ] Create `5a1b2c3d4e5f_add_waypoint_explanations.py`
- [ ] Convert SQL to asyncpg-compatible Python
- [ ] Add proper downgrade() function
- [ ] Test upgrade/downgrade cycle
- [ ] Verify table created with correct schema

**Expected Result:** Path computation API works without errors

---

### Phase 2: High-Priority Features 🔥
**Timeline:** Tonight (2026-01-03)
**Goal:** Enable performance optimization and chat system

#### Task 2.1: Path Matrix Cache Migration
- [ ] Create `6b2c3d4e5f6g_add_path_matrix_cache.py`
- [ ] Handle `calculate_vac_hash()` function properly
- [ ] Create both tables: `path_matrix_cache`, `path_computation_jobs`
- [ ] Test upgrade/downgrade
- [ ] Verify `path_matrix_service.py` can query table

#### Task 2.2: Chat System Migration
- [ ] Create `7c3d4e5f6g7h_add_chat_system.py`
- [ ] Convert chat_sessions and chat_messages tables
- [ ] Include trigger for `update_chat_session_updated_at()`
- [ ] Test upgrade/downgrade
- [ ] Verify models can query tables

**Expected Result:** Performance caching works, chat features enabled

---

### Phase 3: Medium-Priority Features 📊
**Timeline:** Saturday (2026-01-04)
**Goal:** Complete analytics and safety monitoring

#### Task 3.1: Session Analytics Migration
- [ ] Create `8d4e5f6g7h8i_add_session_analytics.py`
- [ ] Convert session_analytics table
- [ ] Test upgrade/downgrade
- [ ] Verify analytics queries work

#### Task 3.2: Clinical Alerts Migration
- [ ] Create `9e5f6g7h8i9j_add_clinical_alerts.py`
- [ ] Create ENUM types: `alert_level`, `alert_type`
- [ ] Handle enum type compatibility with asyncpg
- [ ] Incorporate fixes from `fix_clinical_alerts_enum_types.sql`
- [ ] Test upgrade/downgrade
- [ ] Verify alert model can query table

**Expected Result:** Full analytics and safety monitoring operational

---

### Phase 4: Low-Priority Features 🔧
**Timeline:** Sunday (2026-01-05)
**Goal:** Model management and optimizations

#### Task 4.1: Model Management Migration
- [ ] Create `af6g7h8i9j0k_add_model_management.py`
- [ ] Convert model_assignments and model_performance_metrics tables
- [ ] Include seed data (default model assignments)
- [ ] Handle column rename from `rename_model_name_to_ai_model_name.sql`
- [ ] Test upgrade/downgrade
- [ ] Verify model assignment queries work

**Expected Result:** Model tracking and performance monitoring enabled

---

### Phase 5: Documentation & Verification 📚
**Timeline:** Sunday-Monday (2026-01-05 to 2026-01-06)
**Goal:** Production-ready database system

#### Task 5.1: Update Documentation
- [ ] Update `MIGRATION_STATUS.md` with all new migrations
- [ ] Mark SQL files as "converted" with references to Python migrations
- [ ] Document complete table inventory
- [ ] Add troubleshooting guide

#### Task 5.2: Enhance `init-database.sh`
- [ ] Update `verify_tables()` with complete table list
- [ ] Add table count verification
- [ ] Improve error messages
- [ ] Test fresh database setup

#### Task 5.3: Complete Testing
- [ ] Fresh database creation test
- [ ] Full migration chain test (base → head)
- [ ] Rollback test (head → base → head)
- [ ] Verify all models can query their tables
- [ ] Test Observer API endpoints
- [ ] Test path computation (original error case)

#### Task 5.4: Create Verification Script
- [ ] Create `observer/scripts/verify_database_schema.py`
- [ ] Check all tables exist
- [ ] Check all indexes exist
- [ ] Check all foreign keys valid
- [ ] Check all models can instantiate
- [ ] Generate schema report

**Expected Result:** Bulletproof database system ready for production

---

## Technical Guidelines

### Alembic Migration Pattern (asyncpg compatible)

```python
"""Add feature_name

Revision ID: xyz123
Revises: abc456
Create Date: 2026-01-03
"""

from alembic import op

revision = "xyz123"
down_revision = "abc456"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add feature tables."""

    # Each statement MUST be separate for asyncpg
    op.execute("""
        CREATE TABLE IF NOT EXISTS my_table (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) NOT NULL
        )
    """)

    op.execute("CREATE INDEX idx_my_table_name ON my_table(name)")

    op.execute(
        "COMMENT ON TABLE my_table IS 'Description of table'"
    )


def downgrade() -> None:
    """Remove feature tables."""
    op.execute("DROP TABLE IF EXISTS my_table CASCADE")
```

### Critical Rules
1. ✅ **Separate execute() calls** - asyncpg requires one statement per execute
2. ✅ **IF NOT EXISTS** - Use for idempotency
3. ✅ **Always include downgrade()** - Must be able to roll back
4. ✅ **CASCADE on foreign keys** - Proper cleanup on delete
5. ✅ **Add table/column comments** - Self-documenting schema
6. ✅ **Test both directions** - upgrade AND downgrade must work

### ENUM Types (PostgreSQL)

Enums require special handling:

```python
# Create enum
op.execute("CREATE TYPE alert_level AS ENUM ('critical', 'warning', 'attention')")

# Use enum
op.execute("""
    CREATE TABLE my_table (
        level alert_level NOT NULL
    )
""")

# Downgrade
op.execute("DROP TABLE IF EXISTS my_table CASCADE")
op.execute("DROP TYPE IF EXISTS alert_level CASCADE")
```

### Functions & Triggers

```python
# Create function
op.execute("""
    CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
""")

# Create trigger
op.execute("""
    CREATE TRIGGER trigger_name
    BEFORE UPDATE ON my_table
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp()
""")

# Downgrade (order matters!)
op.execute("DROP TRIGGER IF EXISTS trigger_name ON my_table")
op.execute("DROP FUNCTION IF EXISTS update_timestamp()")
```

---

## Testing Checklist

### Per-Migration Testing
- [ ] `alembic upgrade +1` - Upgrade one migration
- [ ] Verify tables created in psql: `\dt table_name`
- [ ] `alembic downgrade -1` - Rollback one migration
- [ ] Verify tables removed: `\dt table_name` (should be empty)
- [ ] `alembic upgrade +1` - Re-upgrade
- [ ] Verify idempotency (no errors on second run)

### Full Chain Testing
- [ ] Fresh database: `dropdb love_db && createdb love_db`
- [ ] `alembic upgrade head` - Apply all migrations
- [ ] Verify all tables exist
- [ ] `alembic downgrade base` - Remove all migrations
- [ ] Verify all tables removed
- [ ] `alembic upgrade head` - Re-apply all
- [ ] Verify database operational

### Application Testing
- [ ] Start Observer API: `cd observer && ./venv/bin/uvicorn app.main:app`
- [ ] Test path computation: `POST /observer/transition-path`
- [ ] Test chat endpoints (once chat tables exist)
- [ ] Test analytics queries (once analytics tables exist)
- [ ] Check for any "relation does not exist" errors
- [ ] Verify all model queries work

---

## Migration Dependency Chain

```
3d24332d682d (initial_schema_with_pgvector)
    ↓
4a8b9c2d3e4f (add_transition_system_tables)
    ↓
5a1b2c3d4e5f (add_waypoint_explanations) ← CRITICAL
    ↓
6b2c3d4e5f6g (add_path_matrix_cache)
    ↓
7c3d4e5f6g7h (add_chat_system)
    ↓
8d4e5f6g7h8i (add_session_analytics)
    ↓  ↓
    |  9e5f6g7h8i9j (add_clinical_alerts) - Depends on chat_sessions
    ↓
af6g7h8i9j0k (add_model_management)
```

### Foreign Key Dependencies
- `clinical_alerts.session_id` → `chat_sessions.id` (chat must exist first)
- `session_analytics.session_id` → `chat_sessions.id` (chat must exist first)
- `chat_messages.session_id` → `chat_sessions.id` (in same migration)
- `waypoint_explanation_templates.from/to/waypoint_emotion_id` → `atlas_definitions.id` (already exists)
- `path_matrix_cache.from/to_emotion_id` → `atlas_definitions.id` (already exists)

---

## Complete Table Inventory (Target State)

### Core Emotion System
- ✅ `atlas_definitions` (87 emotions with VAC/quaternions)
- ✅ `user_trajectory` (user emotional state tracking)

### Transition System
- ✅ `transition_strategies` (evidence-based strategies)
- ✅ `transition_patterns` (common transition patterns)
- ✅ `category_transitions` (difficulty matrix)
- ✅ `pattern_strategies` (junction table)
- ✅ `user_journeys` (journey tracking)
- ✅ `journey_waypoints` (waypoint progress)
- ✅ `strategy_attempts` (strategy effectiveness)
- 🚧 `waypoint_explanation_templates` (waypoint explanations)

### Performance & Caching
- 🚧 `path_matrix_cache` (87×87 path cache)
- 🚧 `path_computation_jobs` (batch computation tracking)

### Chat & Analysis
- 🚧 `chat_sessions` (chat session tracking)
- 🚧 `chat_messages` (messages with emotion/prosody data)
- 🚧 `session_analytics` (session metrics)

### Safety & Monitoring
- 🚧 `clinical_alerts` (clinical alert evaluations)

### Model Management
- 🚧 `model_assignments` (AI model assignments)
- 🚧 `model_performance_metrics` (model performance tracking)

### Future Features
- ⏳ `three_way_analysis` (advanced analysis)
- ⏳ `deep_feeling_mode` (special mode)

**Legend:**
- ✅ Implemented (Python migration exists)
- 🚧 Planned (SQL exists, needs conversion)
- ⏳ Future (feature not yet implemented)

---

## Success Criteria

### Definition of Done ✅

1. **All critical/high/medium migrations created** (6 migrations)
2. **All migrations tested** (upgrade/downgrade cycles)
3. **No "relation does not exist" errors** in Observer API
4. **Path computation works** (original error resolved)
5. **Fresh setup works** (`init-database.sh` succeeds)
6. **Documentation updated** (MIGRATION_STATUS.md current)
7. **Verification script passes** (schema check)
8. **Code can query all tables** (models work)

### Acceptance Test

```bash
# 1. Fresh database setup
cd infra
./init-database.sh

# 2. Start Observer
cd ../observer
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# 3. Test path computation (original failing case)
curl -X POST http://localhost:8000/observer/transition-path \
  -H "Content-Type: application/json" \
  -d '{
    "from_emotion": "Heartbreak",
    "to_emotion": "Curiosity",
    "max_waypoints": 3
  }'

# Expected: 200 OK with path data (no "waypoint_explanation_templates" error)

# 4. Verify all tables exist
psql -U love_user -d love_db -c "\dt" | grep -E "waypoint_explanation|path_matrix|chat_|session_analytics|clinical_alerts|model_"

# Expected: All tables listed

# 5. Run verification script
python scripts/verify_database_schema.py

# Expected: All checks pass ✅
```

---

## Risk Mitigation

### Backup Strategy
```bash
# Before running migrations
pg_dump -U love_user love_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore if needed
psql -U love_user love_db < backup_20260103_202500.sql
```

### Rollback Procedure
```bash
# If migration fails
cd observer
source venv/bin/activate

# Check current state
alembic current

# Rollback one migration
alembic downgrade -1

# Or rollback to specific revision
alembic downgrade 4a8b9c2d3e4f

# Or rollback everything
alembic downgrade base
```

### Common Issues & Solutions

**Issue:** "asyncpg.exceptions.SyntaxError: syntax error"
- **Cause:** Multiple statements in single execute()
- **Fix:** Split into separate op.execute() calls

**Issue:** "relation already exists"
- **Cause:** Migration run twice without downgrade
- **Fix:** Use `IF NOT EXISTS` or manually drop table first

**Issue:** "foreign key constraint violation"
- **Cause:** Wrong migration order
- **Fix:** Adjust dependency chain, ensure parent tables created first

**Issue:** "type already exists"
- **Cause:** ENUM type creation run twice
- **Fix:** Use `CREATE TYPE IF NOT EXISTS` (PostgreSQL 9.3+) or check first

---

## Progress Tracking

### Current Status (2026-01-03)
- ✅ Plan created
- ⏳ Implementation in progress
- ⏳ Testing pending
- ⏳ Documentation pending
- ⏳ Verification pending

### Completion Estimate
- **Critical (Phase 1):** Tonight (1-2 hours)
- **High (Phase 2):** Tonight (2-3 hours)
- **Medium (Phase 3):** Saturday (2-3 hours)
- **Low (Phase 4):** Sunday (1-2 hours)
- **Docs & Testing (Phase 5):** Sunday-Monday (3-4 hours)

**Total:** 10-15 hours over 3 days
**Target Completion:** Monday morning (2026-01-06) ✅

---

## Next Steps

1. **Immediate:** Create `5a1b2c3d4e5f_add_waypoint_explanations.py`
2. **Test:** Run upgrade, verify table exists, test path computation
3. **Continue:** Create remaining high-priority migrations
4. **Verify:** Full chain testing
5. **Document:** Update MIGRATION_STATUS.md
6. **Ship:** Production-ready database system ✅

---

## Notes

- Keep this document updated as progress is made
- Mark checkboxes as tasks complete
- Document any issues or deviations from plan
- Celebrate milestones! 🎉

**Let's build a bulletproof database system! 🚀**
