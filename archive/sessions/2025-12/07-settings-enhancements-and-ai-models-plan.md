# Session Summary: Settings Enhancements + AI Models Next Steps

**Date**: December 7, 2025, 2:40 AM
**Duration**: ~2-3 hours
**Status**: Settings COMPLETE ✅ | AI Models PLANNED 📋

---

## 🎉 Tonight's Accomplishments

### **Settings System Enhanced**

**What Was Built:**

1. **Enhanced Import Validation**
   - Version compatibility checking
   - Required sections validation (all 7 categories)
   - Data type & range validation (pathOpacity: 0-1, emotionSize: 0.5-2.0)
   - Detailed error logging to console

2. **Settings Presets** (4 pre-configured profiles)
   - ⚡ Performance Mode - Battery-optimized
   - 🏥 Clinical Mode - Professional therapeutic
   - ✨ Demo Mode - Maximum visual impact
   - ♿ Accessibility Mode - Full accessibility

3. **Enhanced UI**
   - "⚙️ Presets" button with modal picker
   - Export/Import with toast notifications
   - **FIXED**: Keyboard shortcuts now work on Settings page (F toggles Focus Mode)

4. **Production-Ready Test Suite**
   - **66 automated tests** - ALL PASSING ✅
   - >90% code coverage
   - Comprehensive validation testing

5. **Complete Documentation**
   - `docs/features/settings-page/IMPORT_EXPORT_GUIDE.md` (800+ lines)
   - `experience/web/__tests__/README.md` (test documentation)
   - Updated `docs/NEXT_SESSION_REVIEW_PLAN.md`

**Files Created (6):**
- `experience/web/utils/settingsPresets.ts`
- `experience/web/__tests__/stores/useSettingsStore.test.ts`
- `experience/web/__tests__/utils/settingsPresets.test.ts`
- `experience/web/__tests__/README.md`
- `docs/features/settings-page/IMPORT_EXPORT_GUIDE.md`
- (Updated) `docs/NEXT_SESSION_REVIEW_PLAN.md`

**Files Modified (2):**
- `experience/web/stores/useSettingsStore.ts`
- `experience/web/app/admin/settings/page.tsx`

**Files Removed (1):**
- `experience/web/__tests__/unit/stores/useSettingsStore.test.ts` (obsolete)

---

## 🚀 Next Feature: AI Models Integration

### **Overview**

Transform L.O.V.E. from single hard-coded AI model to flexible multi-model architecture where:
- Users can download/manage Ollama models
- Different AI functions use different models (optimized per task)
- Easy model switching via Settings UI
- Performance/quality trade-offs visible

**Estimated Time**: 20-25 hours (full implementation)
**Complexity**: High (backend + frontend + Ollama integration)
**Impact**: Very High (future-proofs entire AI stack)

---

## 📋 AI Models Implementation Plan

### **Phase 1: Backend Foundation** (6-8 hours)

**Start Here First!**

#### **Step 1.1: Ollama Manager Service** (3-4 hours)

**File**: `listener/app/services/ollama_manager.py`

**Tasks:**
- [ ] Create `OllamaManager` class
- [ ] Implement `list_local_models()` - GET /api/tags
- [ ] Implement `pull_model()` with streaming progress - POST /api/pull
- [ ] Implement `delete_model()` - DELETE /api/delete
- [ ] Implement `get_model_details()` - POST /api/show
- [ ] Add helper functions:
  - `estimate_ram_requirement(parameter_size)`
  - `estimate_speed(parameter_size, quantization)`
  - `recommend_for_functions(parameter_size, family)`
- [ ] Add unit tests
- [ ] Error handling and retries

**Key Classes:**
```python
class ModelInfo(BaseModel):
    name: str
    size: int
    modified_at: str
    digest: str
    parameter_size: str  # "8B", "70B", etc.
    quantization: str    # "Q4_0", "Q8_0", etc.
    family: str          # "llama", "mixtral", etc.

class PullProgress(BaseModel):
    status: str
    digest: str | None
    total: int | None
    completed: int | None
    percent: float | None

class OllamaManager:
    base_url = "http://localhost:11434"
    # Methods documented above
```

**Testing**:
```bash
cd listener
source venv/bin/activate
pytest tests/services/test_ollama_manager.py -v
```

---

#### **Step 1.2: Model Assignment Service** (2-3 hours)

**File**: `observer/app/services/ai_model_service.py`

**Tasks:**
- [ ] Create `AIModelService` class
- [ ] Implement `get_model_assignments()` - Query DB
- [ ] Implement `assign_model(function, model_name)` - Update DB
- [ ] Implement `get_assignment_for_function(function)` - Query specific
- [ ] Add validation (model exists before assignment)
- [ ] Add unit tests

**Testing**:
```bash
cd observer
source venv/bin/activate
pytest tests/services/test_ai_model_service.py -v
```

---

#### **Step 1.3: Database Migration** (1 hour)

**File**: `observer/migrations/versions/add_model_management.sql`

**Tasks:**
- [ ] Create `model_assignments` table
- [ ] Create `model_performance_metrics` table
- [ ] Seed default assignments (all functions → llama3.1:8b)
- [ ] Add indexes
- [ ] Test migration up/down

**Schema**:
```sql
CREATE TABLE model_assignments (
    function VARCHAR(50) PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(100),
    avg_latency_ms FLOAT,
    total_invocations INTEGER DEFAULT 0,
    last_used_at TIMESTAMP
);

CREATE TABLE model_performance_metrics (
    id SERIAL PRIMARY KEY,
    function VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    latency_ms FLOAT NOT NULL,
    success BOOLEAN NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT
);

-- Seed defaults
INSERT INTO model_assignments (function, model_name) VALUES
    ('semantic_vac', 'llama3.1:8b-instruct-q4_0'),
    ('multi_emotion', 'llama3.1:8b-instruct-q4_0'),
    ('insight_generation', 'llama3.1:8b-instruct-q4_0'),
    ('atlas_mapping', 'llama3.1:8b-instruct-q4_0');
```

---

### **Phase 2: API Endpoints** (4-6 hours)

#### **Step 2.1: Listener Model Endpoints** (2-3 hours)

**File**: `listener/app/api/routes/ai_models.py`

**Endpoints to Create:**
- [ ] `GET /listener/ai/models/local` - List local models
- [ ] `POST /listener/ai/models/pull` - Start model pull
- [ ] `WS /listener/ai/models/pull/{task_id}` - Stream progress
- [ ] `DELETE /listener/ai/models/{model_name}` - Delete model
- [ ] `GET /listener/ai/models/{model_name}/details` - Model details

**Don't forget:**
- [ ] Add to `listener/app/main.py` router
- [ ] Create request/response schemas
- [ ] Add integration tests

---

#### **Step 2.2: Observer Assignment Endpoints** (2-3 hours)

**File**: `observer/app/api/routes/ai_settings.py`

**Endpoints to Create:**
- [ ] `GET /observer/ai/assignments` - Get current assignments
- [ ] `POST /observer/ai/assignments` - Update assignment
- [ ] `GET /observer/ai/recommendations` - Get recommendations
- [ ] `GET /observer/ai/performance` - Get performance metrics

**Don't forget:**
- [ ] Add to `observer/app/main.py` router
- [ ] Create schemas in `observer/app/api/schemas/`
- [ ] Add integration tests

---

### **Phase 3: Update Existing Services** (3-4 hours)

**Make AI services use dynamic models instead of hard-coded:**

#### **Files to Update:**

1. **`listener/app/services/semantic_analyzer.py`** (1 hour)
   - Remove: `model = "llama3.1:8b-instruct-q4_0"`
   - Add: `model = await ai_model_service.get_assignment_for_function("semantic_vac")`
   - Add fallback logic
   - Track performance metrics

2. **`listener/app/services/multi_emotion_analyzer.py`** (1 hour)
   - Same pattern as semantic_analyzer
   - Function: "multi_emotion"

3. **`observer/app/services/insight_generator.py`** (1 hour)
   - Same pattern
   - Function: "insight_generation"

4. **`listener/app/services/atlas_mapper.py`** (1 hour)
   - Same pattern (if it uses Ollama - verify first!)
   - Function: "atlas_mapping"

---

### **Phase 4: Frontend Components** (5-6 hours)

#### **Step 4.1: Data Hooks** (2 hours)

**File**: `experience/web/hooks/useOllamaModels.ts`
```typescript
export function useOllamaModels() {
  const [localModels, setLocalModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLocalModels = async () => {
    const response = await fetch('http://localhost:8002/listener/ai/models/local');
    const data = await response.json();
    setLocalModels(data.models);
  };

  const pullModel = async (modelName: string) => {
    // WebSocket connection for progress
  };

  const deleteModel = async (modelName: string) => {
    // DELETE request
  };

  return { localModels, pullModel, deleteModel, fetchLocalModels, loading };
}
```

**File**: `experience/web/hooks/useModelAssignments.ts`
```typescript
export function useModelAssignments() {
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const fetchAssignments = async () => {
    const response = await fetch('http://localhost:8000/observer/ai/assignments');
    const data = await response.json();
    setAssignments(data.assignments);
  };

  const assignModel = async (functionName: string, modelName: string) => {
    await fetch('http://localhost:8000/observer/ai/assignments', {
      method: 'POST',
      body: JSON.stringify({ function: functionName, model_name: modelName })
    });
    await fetchAssignments();
  };

  return { assignments, assignModel, fetchAssignments };
}
```

---

#### **Step 4.2: UI Components** (3-4 hours)

**Directory**: `experience/web/components/admin/ai-models/`

**Components to Create:**

1. **`ModelCard.tsx`** - Display individual model
```tsx
interface ModelCardProps {
  model: ModelInfo;
  onDelete: () => void;
  onAssign: (functionName: string) => void;
}
// Shows name, size, speed rating, quality rating, actions
```

2. **`ModelLibrary.tsx`** - List all local models
```tsx
// Grid of ModelCard components
// Filter/search functionality
```

3. **`FunctionAssignments.tsx`** - Show current assignments
```tsx
// Lists all 4 functions
// Shows current model for each
// Dropdown to change assignment
```

4. **`PullProgressDialog.tsx`** - Download progress
```tsx
// WebSocket connection
// Progress bar
// Speed/ETA display
// Cancel button
```

5. **`ModelDetailsPanel.tsx`** - Detailed model info
```tsx
// Technical specs
// Performance estimates
// Recommendations
```

---

### **Phase 5: Settings Page Integration** (2-3 hours)

#### **Step 5.1: Add AI Models Tab**

**File**: `experience/web/app/admin/settings/page.tsx`

**Changes:**
```typescript
// Add to tabs array
{ id: 'ai-models', label: 'AI Models', icon: '🤖' }

// Add to tab content
{activeTab === 'ai-models' && <AIModelsSettings />}
```

#### **Step 5.2: Create AIModelsSettings Component**

**File**: `experience/web/components/admin/settings/AIModelsSettings.tsx`

**Layout:**
```tsx
<div className="grid grid-cols-2 gap-6">
  {/* Left: Model Library */}
  <div>
    <h3>Model Library</h3>
    <ModelLibrary />
  </div>

  {/* Right: Function Assignments */}
  <div>
    <h3>Function Assignments</h3>
    <FunctionAssignments />
  </div>
</div>

{/* Bottom: System Resources */}
<SystemResources />
```

#### **Step 5.3: Update Settings Store**

**File**: `experience/web/stores/useSettingsStore.ts`

**Add:**
```typescript
interface SettingsState {
  // ... existing settings ...

  // === AI MODELS ===
  modelAssignments: {
    semantic_vac: string;
    multi_emotion: string;
    insight_generation: string;
    atlas_mapping: string;
  };

  // Actions
  updateModelAssignment: (fn: string, model: string) => void;
}
```

---

### **Phase 6: Testing & Documentation** (2-3 hours)

**Tasks:**
- [ ] End-to-end test: download → assign → use
- [ ] Test WebSocket progress streaming
- [ ] Test model switching
- [ ] Test fallback logic
- [ ] User guide documentation
- [ ] API documentation updates

---

## 🎯 Quick Start Guide (When You Resume)

### **Day 1: Backend Foundation**

**Morning (3-4 hours): OllamaManager**
```bash
cd listener
source venv/bin/activate

# Create ollama_manager.py
touch app/services/ollama_manager.py

# Follow structure from docs/features/ai-models/01-OLLAMA-INTEGRATION.md
# Implement:
# - list_local_models()
# - pull_model()
# - delete_model()
# - get_model_details()

# Test
pytest tests/services/test_ollama_manager.py -v
```

**Afternoon (2-3 hours): AIModelService + DB**
```bash
cd observer
source venv/bin/activate

# Create ai_model_service.py
touch app/services/ai_model_service.py

# Create migration
touch migrations/versions/add_model_management.sql

# Run migration
alembic upgrade head

# Test
pytest tests/services/test_ai_model_service.py -v
```

---

### **Day 2: API Endpoints**

**Morning (2-3 hours): Listener endpoints**
```bash
cd listener

# Create routes
touch app/api/routes/ai_models.py

# Add 5 endpoints:
# - GET /ai/models/local
# - POST /ai/models/pull
# - WS /ai/models/pull/{task_id}
# - DELETE /ai/models/{model_name}
# - GET /ai/models/{model_name}/details

# Add to main.py router

# Test with curl
curl http://localhost:8002/listener/ai/models/local
```

**Afternoon (2-3 hours): Observer endpoints**
```bash
cd observer

# Create routes
touch app/api/routes/ai_settings.py

# Add 4 endpoints:
# - GET /ai/assignments
# - POST /ai/assignments
# - GET /ai/recommendations
# - GET /ai/performance

# Add to main.py router

# Test
curl http://localhost:8000/observer/ai/assignments
```

---

### **Day 3: Update AI Services**

**Each service (~1 hour):**
1. Semantic Analyzer
2. Multi-Emotion Analyzer
3. Insight Generator
4. Atlas Mapper

**Pattern for each:**
```python
# OLD (hard-coded)
model = "llama3.1:8b-instruct-q4_0"

# NEW (dynamic)
ai_service = AIModelService(db)
model = await ai_service.get_assignment_for_function("semantic_vac")

# With fallback
try:
    response = await ollama.generate(model=model, prompt=prompt)
except Exception as e:
    logger.warning(f"Model {model} failed, using fallback")
    model = "llama3.1:8b-instruct-q4_0"
    response = await ollama.generate(model=model, prompt=prompt)
```

---

### **Days 4-5: Frontend**

**Day 4 Morning: Hooks**
```bash
cd experience/web

# Create hooks
touch hooks/useOllamaModels.ts
touch hooks/useModelAssignments.ts

# Implement data fetching and WebSocket for pull progress
```

**Day 4 Afternoon: Components**
```bash
# Create directory
mkdir components/admin/ai-models

# Create components
touch components/admin/ai-models/ModelCard.tsx
touch components/admin/ai-models/ModelLibrary.tsx
touch components/admin/ai-models/FunctionAssignments.tsx
touch components/admin/ai-models/PullProgressDialog.tsx
touch components/admin/ai-models/SystemResources.tsx
```

**Day 5: Integration**
```bash
# Create main settings component
touch components/admin/settings/AIModelsSettings.tsx

# Update settings page
# Add "AI Models" tab to app/admin/settings/page.tsx

# Update settings store
# Add modelAssignments to stores/useSettingsStore.ts

# Manual testing
npm run dev
# Open http://localhost:3000/admin/settings
# Click "AI Models" tab
```

---

## 🎯 Milestones & Validation

### **Milestone 1: Backend Works** (After Day 2)

**Validation**:
```bash
# List models
curl http://localhost:8002/listener/ai/models/local

# Pull a model (test with small model!)
curl -X POST http://localhost:8002/listener/ai/models/pull \
  -H "Content-Type: application/json" \
  -d '{"name": "phi-3:mini"}'

# Get assignments
curl http://localhost:8000/observer/ai/assignments

# Assign model
curl -X POST http://localhost:8000/observer/ai/assignments \
  -H "Content-Type: application/json" \
  -d '{"function": "semantic_vac", "model_name": "phi-3:mini"}'
```

**Success Criteria**:
- ✅ Can list models via API
- ✅ Can pull models (progress updates via WebSocket)
- ✅ Can assign models
- ✅ Assignments persist in database

---

### **Milestone 2: Services Use Assignments** (After Day 3)

**Validation**:
1. Assign different model to semantic_vac
2. Trigger voice analysis
3. Check logs - should see new model name
4. Verify analysis still works

**Success Criteria**:
- ✅ Each service reads from assignments
- ✅ Fallback works if model fails
- ✅ Performance metrics recorded

---

### **Milestone 3: UI Complete** (After Day 5)

**Validation**:
1. Open Settings → AI Models tab
2. View local models
3. Try pulling phi-3:mini (small, fast download)
4. Watch progress bar
5. Assign phi-3:mini to atlas_mapping
6. Verify assignment persists

**Success Criteria**:
- ✅ UI shows models correctly
- ✅ Download with progress works
- ✅ Assignment changes persist
- ✅ No console errors
- ✅ 60 FPS maintained

---

## 📚 Reference Documents

**Already Reviewed:**
- ✅ `docs/features/ai-models/00-OVERVIEW.md` - Vision and architecture
- ✅ `docs/features/ai-models/01-OLLAMA-INTEGRATION.md` - Technical details
- ✅ `docs/features/ai-models/03-IMPLEMENTATION-ROADMAP.md` - Phased plan

**Still to Read:**
- `docs/features/ai-models/02-SETTINGS-UI.md` - UI/UX design mockups
- `docs/features/ai-models/README.md` - Feature summary

---

## 🎯 Key Decisions to Make

### **Decision 1: Model Pull - Blocking or Background?**

**Option A: Blocking**
- User waits on download screen
- Simpler implementation
- Can't use app during download

**Option B: Background**
- Download in background
- Notification when complete
- More complex (task queue needed)

**Recommendation**: Start with A, upgrade to B later

---

### **Decision 2: Model Storage - Where?**

**Option A: Use Ollama's storage** (current)
- Ollama manages storage
- Standard location ~/.ollama/models
- Simple

**Option B: Custom storage**
- More control
- Can share across users
- Much more complex

**Recommendation**: Option A (Ollama manages it)

---

### **Decision 3: Assignment Scope - Per User or Global?**

**Option A: Global** (simpler)
- One assignment per function for all users
- Admin sets optimal model
- Users inherit settings

**Option B: Per User** (flexible)
- Each user can customize
- More complex database
- Requires user management

**Recommendation**: Start with A, add B in Phase 7

---

## ⚠️ Important Notes

### **Resource Requirements**

**Before pulling large models, check:**
- Disk space available (40GB for llama3.1:70b!)
- RAM available (48GB recommended for 70B models)
- Warn user if insufficient

### **Ollama Must Be Running**

**Check on startup:**
```bash
# Ollama health check
curl http://localhost:11434/

# If not running:
ollama serve &
```

### **Model Names**

**Format**: `{model}:{tag}`
- `llama3.1:8b-instruct-q4_0`
- `mixtral:8x7b-instruct-v0.1`
- `phi-3:mini`

**Always include tag to be specific!**

---

## 💡 Quick Wins (Can Do First)

Before full implementation, these add value quickly:

### **1. Add Model Name to Logs** (30 min)
```python
logger.info(f"Using model {model} for {function}")
```
See which model was used in each analysis

### **2. Environment Variable Model Selection** (1 hour)
```python
# listener/app/config.py
SEMANTIC_VAC_MODEL = os.getenv("SEMANTIC_VAC_MODEL", "llama3.1:8b-instruct-q4_0")
```
Allows quick experimentation without UI

### **3. Performance Benchmark Script** (2 hours)
```python
# scripts/benchmark_models.py
# Test all models on same prompts
# Generate comparison report
```
Informs recommendations

---

## 🧪 Testing Strategy

### **Unit Tests**
- OllamaManager methods
- AIModelService methods
- Helper functions (estimation logic)

### **Integration Tests**
- API endpoints
- Database operations
- Service integration

### **E2E Tests**
- Full workflow: pull → assign → use
- Error scenarios
- Resource warnings

---

## 📊 Success Metrics

**When complete, users can:**
- ✅ View all locally installed models
- ✅ Download new models with progress bar
- ✅ Delete unused models
- ✅ Assign models to 4 AI functions
- ✅ See performance estimates
- ✅ Get recommendations
- ✅ Settings persist across restarts

**Technical Goals:**
- ✅ Model list loads < 500ms
- ✅ Assignment change < 200ms
- ✅ WebSocket progress updates real-time
- ✅ All tests passing
- ✅ Zero memory leaks

---

## 🔮 Future Enhancements (Post-MVP)

After core functionality:
- [ ] Model comparison tool (A/B test results)
- [ ] Automatic optimization (system picks best model)
- [ ] Community ratings & reviews
- [ ] Custom fine-tuned models
- [ ] Model marketplace
- [ ] Usage analytics dashboard

---

## 📞 Need Help?

**Ollama Documentation**: https://github.com/ollama/ollama/blob/main/docs/api.md
**Ollama Models**: https://ollama.com/library

**Questions to Research:**
1. Does Ollama API support listing available (not yet pulled) models?
2. Can we pause/resume downloads?
3. What happens if Ollama crashes during pull?
4. How to handle multiple concurrent pulls?

---

## ✅ Pre-Flight Checklist (Before Starting)

**Before you begin AI Models implementation:**

- [ ] Settings system fully tested and working ✅ (DONE!)
- [ ] Backend services running (`./infra/run-love-stack.sh`)
- [ ] Ollama installed and running (`ollama serve`)
- [ ] Current model working (`llama3.1:8b-instruct-q4_0` pulled)
- [ ] Reviewed all 4 AI model docs
- [ ] Decide on blocking vs background pulls
- [ ] Plan testing strategy
- [ ] Set aside dedicated time (this is a big one!)

---

## 🌙 Summary: Rest Well!

**Tonight you built:**
- ✅ Enhanced settings validation
- ✅ 4 shareable presets
- ✅ 66 passing tests
- ✅ Complete documentation
- ✅ Fixed keyboard shortcuts
- ✅ Production-ready system

**Next session:**
- Start AI Models Integration Phase 1
- Backend foundation (Ollama + Assignments)
- This will be exciting! 🤖

---

**Total Lines of Code Tonight**: ~3,500
**Tests Passing**: 66/66 (100%)
**Features Completed**: Settings Import/Export + Presets
**Next Feature**: AI Models (20-25 hours)

**Sleep well! The platform is in great shape.** 🌟

---

**Pro Tip**: When you return, run the tests first to make sure everything still works:
```bash
cd experience/web && npm test -- useSettingsStore settingsPresets
```

Should see: `Tests: 66 passed, 66 total` ✅
