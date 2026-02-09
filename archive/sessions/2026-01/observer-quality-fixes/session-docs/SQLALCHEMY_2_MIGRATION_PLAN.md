# SQLAlchemy 2.0 Migration Plan - Observer Module

**Goal:** Migrate all 9 models to SQLAlchemy 2.0 `Mapped[]` syntax for 100% mypy strict compliance

**Timeline:** Systematic execution over focused work session
**Quality Standard:** Maintain all existing documentation, zero functionality changes

---

## 📋 Models to Migrate (9 files)

| # | Model | Lines | Complexity | Priority |
|---|-------|-------|------------|----------|
| 1 | atlas_definition.py | ~450 | Medium | HIGH - Core model |
| 2 | user_trajectory.py | ~490 | Medium | HIGH - Time-series |
| 3 | chat_session.py | ~450 | Medium | HIGH - Active use |
| 4 | chat_message.py | ~560 | High | HIGH - Active use |
| 5 | session_analytics.py | ~420 | Medium | MEDIUM |
| 6 | clinical_alert.py | ~440 | Medium | MEDIUM |
| 7 | multi_emotion_analysis.py | ~830 | High | MEDIUM |
| 8 | transition_strategy.py | ~660 | High | LOW - Less frequently used |
| 9 | model_assignment.py | ~330 | Low | LOW |

**Total:** ~4,630 lines across 9 files

---

## 🔄 Migration Pattern

### Before (SQLAlchemy 1.4 style):
```python
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID

class AtlasDefinition(Base):
    __tablename__ = "atlas_definitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    emotion_name = Column(String(100), nullable=False, unique=True)
    category = Column(String(100), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### After (SQLAlchemy 2.0 style):
```python
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column

class AtlasDefinition(Base):
    __tablename__ = "atlas_definitions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    emotion_name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(100), index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
```

**Key Changes:**
1. ✅ Type annotations using `Mapped[]`
2. ✅ `mapped_column()` instead of `Column()`
3. ✅ Remove `nullable=False` (Mapped implies non-null)
4. ✅ Use `Optional[Type]` for nullable fields
5. ✅ Cleaner imports
6. ✅ Full mypy type inference!

---

## 🎯 Migration Strategy

### Phase 1: Core Models (High Priority) - 4 hours
**Models:** atlas_definition, user_trajectory, chat_session, chat_message

**Approach:**
1. Migrate one model completely
2. Run tests to ensure no breakage
3. Verify mypy accepts new syntax
4. Repeat for next model

**Checkpoint:** 4 core models migrated, tests passing

### Phase 2: Analytics Models (Medium Priority) - 2 hours
**Models:** session_analytics, clinical_alert, multi_emotion_analysis

**Approach:**
1. Apply learned patterns from Phase 1
2. Handle any unique edge cases
3. Test analytics endpoints

**Checkpoint:** 7/9 models migrated

### Phase 3: Supporting Models (Low Priority) - 1 hour
**Models:** transition_strategy, model_assignment

**Approach:**
1. Quick migration using established patterns
2. Final testing

**Checkpoint:** All 9 models migrated!

### Phase 4: Verification & Cleanup - 1 hour
**Tasks:**
1. Run full test suite
2. Run mypy strict mode
3. Verify all quality checks pass
4. Update documentation if needed
5. Clean up migration scripts

**Final Checkpoint:** 100% SQLAlchemy 2.0, mypy strict passing!

---

## 🛠️ Technical Details

### Import Changes

**Before:**
```python
from sqlalchemy import Column, String, Integer, DateTime, Float, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector
```

**After:**
```python
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import String, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
```

### Column Type Mappings

| Old Column Type | New Mapped Type | Notes |
|----------------|-----------------|-------|
| `Column(UUID)` | `Mapped[UUID]` | Auto-generates |
| `Column(String(n))` | `Mapped[str]` + `String(n)` arg | Length in mapped_column |
| `Column(Integer)` | `Mapped[int]` | Simple |
| `Column(Float)` | `Mapped[float]` | Simple |
| `Column(Boolean)` | `Mapped[bool]` | Simple |
| `Column(DateTime)` | `Mapped[datetime]` | Import datetime |
| `Column(Text)` | `Mapped[str]` + `Text()` | Use Text() in mapped_column |
| `Column(JSONB)` | `Mapped[dict]` + `JSONB` | dict is the Python type |
| `Column(Vector(n))` | `Mapped[Any]` + `Vector(n)` | pgvector special case |
| `Column(..., nullable=True)` | `Mapped[Optional[Type]]` | Use Optional |
| `Column(ForeignKey(...))` | `Mapped[UUID]` + `ForeignKey` | FK in mapped_column |

### Relationship Declarations

**Before:**
```python
messages = relationship("ChatMessage", back_populates="session")
```

**After:**
```python
from typing import List
from sqlalchemy.orm import Mapped, relationship

messages: Mapped[List["ChatMessage"]] = relationship(back_populates="session")
```

---

## ✅ Quality Assurance

### Testing Checkpoints

**After Each Model:**
1. Syntax check: `python -m py_compile app/models/model_name.py`
2. Import check: `python -c "from app.models.model_name import ModelName"`
3. Mypy check: `mypy app/models/model_name.py --strict`

**After Each Phase:**
1. Run model tests: `pytest tests/models/`
2. Run integration tests: `pytest tests/integration/`
3. Verify database operations work
4. Check no runtime errors

**Final Verification:**
1. Full test suite: `pytest`
2. All quality checks: `./infra/scripts/check-python-quality.sh --module=observer`
3. Manual smoke test of key endpoints
4. Documentation review

### Rollback Plan

**If Issues Arise:**
1. Git history available (commit after each model)
2. Each model is independent
3. Can roll back individual files
4. No database schema changes needed
5. Tests will catch breaking changes

---

## 📚 Documentation Maintenance

### Preserve All Documentation

**What Stays:**
- ✅ All module-level docstrings
- ✅ All class docstrings
- ✅ All method docstrings
- ✅ All inline comments
- ✅ Google-style format

**What Changes:**
- Field definitions (Column → Mapped)
- Type annotations (explicit instead of inferred)
- Import statements (updated for SQLAlchemy 2.0)

**Documentation Additions:**
- Type hints make code self-documenting
- Mypy will enforce documentation accuracy

---

## 🚀 Execution Plan

### Step-by-Step Process

**For Each Model:**

1. **Backup** (Safety)
   - Commit current state
   - Note line count for verification

2. **Update Imports** (Foundation)
   ```python
   from sqlalchemy.orm import Mapped, mapped_column
   from typing import Optional  # for nullable fields
   from uuid import UUID, uuid4  # explicit UUID
   from datetime import datetime  # explicit datetime
   ```

3. **Migrate Columns** (Core Work)
   - Convert each Column to Mapped + mapped_column
   - Add type annotations
   - Handle nullable with Optional[]
   - Preserve all parameters (unique, index, etc.)

4. **Update Methods** (Type Safety)
   - Add return types to __repr__ → str
   - Add return types to to_dict() → Dict[str, Any]
   - Ensure type imports present

5. **Verify** (Quality)
   - Python syntax check
   - Mypy strict check
   - Run related tests
   - Commit if passing

**Repeat for all 9 models**

---

## 📊 Success Metrics

### Before Migration
```
Mypy Errors: 319
- SQLAlchemy Base issues: ~40
- Column type mismatches: ~80
- Missing annotations: ~50
- Complex inference: ~149
```

### After Migration Target
```
Mypy Errors: 0 (or <10 with documented exceptions)
- Base class: Properly typed ✓
- Columns: Full type inference ✓
- Methods: Explicit annotations ✓
- IDE: Perfect autocomplete ✓
```

### Quality Check Target
```
✅ Black: Pass
✅ isort: Pass
✅ Flake8: Pass
✅ Pylint: Pass
✅ Bandit: Pass
✅ Radon: Pass
✅ Mypy: Pass (strict mode!)
⚠️ Pydocstyle: Address after typing complete
```

---

## ⚠️ Known Challenges & Solutions

### Challenge 1: pgvector Columns
**Issue:** Vector types don't have direct Mapped equivalent
**Solution:**
```python
from typing import Any
vac_vector: Mapped[Any] = mapped_column(Vector(3))  # type: ignore[assignment]
```

### Challenge 2: JSONB Columns
**Issue:** JSONB is dict but mypy needs specifics
**Solution:**
```python
from typing import Dict, Any
context: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
```

### Challenge 3: Relationships
**Issue:** Circular imports in relationship annotations
**Solution:**
```python
from typing import TYPE_CHECKING, List
if TYPE_CHECKING:
    from app.models.chat_message import ChatMessage

messages: Mapped[List["ChatMessage"]] = relationship(back_populates="session")
```

### Challenge 4: Server Defaults
**Issue:** func.now() type inference
**Solution:**
```python
created_at: Mapped[datetime] = mapped_column(server_default=func.now())
# Mypy understands this perfectly!
```

---

## 🎓 Expected Benefits

### Immediate
- ✅ 100% mypy strict mode compliance
- ✅ Zero type: ignore hacks
- ✅ Perfect IDE autocomplete
- ✅ Catch type errors at dev time

### Long-term
- ✅ Easier onboarding (types = documentation)
- ✅ Safer refactoring (type checker validates)
- ✅ Better code navigation (jump to definition)
- ✅ Future-proof (SQLAlchemy 2.0 standard)

---

## 📝 Execution Checklist

- [ ] Phase 1: Core Models (4 hours)
  - [ ] atlas_definition.py
  - [ ] user_trajectory.py
  - [ ] chat_session.py
  - [ ] chat_message.py

- [ ] Phase 2: Analytics Models (2 hours)
  - [ ] session_analytics.py
  - [ ] clinical_alert.py
  - [ ] multi_emotion_analysis.py

- [ ] Phase 3: Supporting Models (1 hour)
  - [ ] transition_strategy.py
  - [ ] model_assignment.py

- [ ] Phase 4: Verification (1 hour)
  - [ ] Run full test suite
  - [ ] Verify mypy strict passes
  - [ ] Run all quality checks
  - [ ] Update documentation
  - [ ] Celebrate! 🎉

**Total Estimated Time:** 8 hours of focused work

---

## 🚀 Ready to Execute!

This plan ensures:
- ✅ Systematic approach (one model at a time)
- ✅ Quality verification at each step
- ✅ Safety (tests catch issues immediately)
- ✅ Documentation preserved
- ✅ Best-in-class final result

**Let's create the most type-safe, maintainable emotional intelligence platform possible!** 💜
