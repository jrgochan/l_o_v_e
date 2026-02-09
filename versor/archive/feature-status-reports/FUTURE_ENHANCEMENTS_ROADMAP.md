# AI Models - Future Enhancements Roadmap
**Date**: December 7, 2025
**Purpose**: Detailed implementation plans for Phase 4-6 enhancements
**Estimated Total Time**: 27-33 hours for complete feature set

---

## 🚀 Phase 4: Quick Wins (2 hours)

**Goal**: Dramatically improve UX with minimal effort
**Priority**: ⭐⭐⭐⭐⭐ DO NEXT!

---

### **1. Disk Usage Display** (15 minutes)

**What**: Show total disk space consumed by all models

**UI Location**: Top of Models tab
```
┌─────────────────────────────────────────────┐
│ Local Models (3)  |  💾 Total: 31.4 GB      │
└─────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// In AIModelsSettings.tsx
const totalDiskUsage = localModels.reduce((sum, model) => sum + model.size, 0);
const formatTotalSize = () => {
  const gb = totalDiskUsage / (1024 ** 3);
  return `${gb.toFixed(1)} GB`;
};

// Add to header
<div className="flex items-center gap-4">
  <h3>Local Models ({localModels.length})</h3>
  <span className="text-sm text-gray-400">
    💾 Total: {formatTotalSize()}
  </span>
</div>
```

**Value**: Users can track storage at a glance

---

### **2. Bulk Assign Button** (30 minutes)

**What**: Assign one model to multiple functions at once

**UI Enhancement**: Add "ALL FUNCTIONS" option to assign dialog

**Implementation**:
```typescript
// In AIModelsSettings.tsx - Assign Dialog

// Add "Assign to All" button at top
<button
  onClick={() => {
    // Assign to all 4 functions
    Promise.all(
      functions.map(func => handleAssignToFunction(func.name, assignDialogState.modelName))
    );
    setAssignDialogState({ isOpen: false, modelName: '' });
  }}
  className="w-full mb-3 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 border-2 border-cyan-400 rounded"
>
  <div className="font-bold text-white">✨ ASSIGN TO ALL FUNCTIONS</div>
  <div className="text-xs text-cyan-200 mt-1">
    Use {assignDialogState.modelName} for everything
  </div>
</button>

<div className="border-t border-gray-700 pt-3 mb-2">
  <p className="text-xs text-gray-400 mb-2">Or assign individually:</p>
</div>

// Then existing function list...
```

**Value**: Save time when setting up uniform configuration

---

### **3. Quick Presets** (45 minutes)

**What**: One-click preset configurations

**Presets**:
- **Clinical Grade**: Use llama3.1:70b for everything (quality over speed)
- **Balanced**: Use llama3.1:8b for everything (recommended)
- **Fast & Light**: Use phi-3:mini for everything (speed over quality)

**UI Location**: Top of Models view

**Implementation**:
```typescript
// New file: experience/web/utils/modelPresets.ts
export const MODEL_PRESETS = {
  clinical: {
    name: 'Clinical Grade',
    description: 'Best quality for therapeutic use',
    icon: '🏥',
    model: 'llama3.1:70b-instruct-q4_0',
    assignments: {
      semantic_vac: 'llama3.1:70b-instruct-q4_0',
      multi_emotion: 'llama3.1:70b-instruct-q4_0',
      insight_generation: 'llama3.1:70b-instruct-q4_0',
      atlas_mapping: 'llama3.1:70b-instruct-q4_0'
    },
    requirements: 'Requires 48GB+ RAM'
  },
  balanced: {
    name: 'Balanced',
    description: 'Recommended for most users',
    icon: '⚖️',
    model: 'llama3.1:8b-instruct-q4_0',
    // ...
  },
  fast: {
    name: 'Fast & Lightweight',
    description: 'Maximum speed, lower resource usage',
    icon: '⚡',
    model: 'phi-3:mini',
    // ...
  }
};

// In AIModelsSettings.tsx
const applyPreset = async (presetKey: string) => {
  const preset = MODEL_PRESETS[presetKey];

  // Check if model exists
  const modelExists = localModels.some(m => m.name === preset.model);
  if (!modelExists) {
    showNotification('error', `${preset.model} not installed. Please pull it first.`);
    return;
  }

  // Apply to all functions
  for (const [func, model] of Object.entries(preset.assignments)) {
    await assignModel(func, model);
  }

  showNotification('success', `✓ Applied ${preset.name} preset`);
};

// UI
<div className="flex gap-2 mb-4">
  {Object.entries(MODEL_PRESETS).map(([key, preset]) => (
    <button
      key={key}
      onClick={() => applyPreset(key)}
      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded"
    >
      <span className="mr-2">{preset.icon}</span>
      <span className="font-medium">{preset.name}</span>
    </button>
  ))}
</div>
```

**Value**: Instant optimal setup for different use cases

---

### **4. Search & Filter** (30 minutes)

**What**: Find models quickly

**UI**:
```
┌────────────────────────────────────────────┐
│ 🔍 Search models...           [Input]      │
│ Filter: [All] [llama] [mixtral] [phi]      │
└────────────────────────────────────────────┘
```

**Implementation**:
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [familyFilter, setFamilyFilter] = useState<string | null>(null);

const filteredModels = localModels.filter(model => {
  const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesFamily = !familyFilter || model.family === familyFilter;
  return matchesSearch && matchesFamily;
});

// Get unique families
const families = [...new Set(localModels.map(m => m.family))];

// UI
<div className="mb-4 space-y-2">
  <input
    type="text"
    placeholder="🔍 Search models..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded"
  />
  <div className="flex gap-2">
    <button
      onClick={() => setFamilyFilter(null)}
      className={familyFilter === null ? 'active' : ''}
    >
      All
    </button>
    {families.map(family => (
      <button
        key={family}
        onClick={() => setFamilyFilter(family)}
        className={familyFilter === family ? 'active' : ''}
      >
        {family}
      </button>
    ))}
  </div>
</div>

// Use filteredModels instead of localModels in map
```

**Value**: Easy to find specific models in large collections

---

## 🎨 Phase 5: Professional Polish (7-8 hours)

**Goal**: Production-grade feature completeness
**Priority**: ⭐⭐⭐⭐

---

### **1. Ollama Registry Browser** (3-4 hours)

**What**: Explore and pull models from Ollama library

**New Component**: `ModelRegistryBrowser.tsx`

**Backend**:
```python
# listener/app/services/ollama_manager.py

async def list_available_models(self) -> List[RegistryModel]:
    """
    Get models available to pull from Ollama registry.
    Note: Ollama doesn't have a public registry API yet.
    We'll maintain a curated list of popular models.
    """
    # Curated list of popular models
    return [
        {
            "name": "llama3.1:8b-instruct-q4_0",
            "description": "Meta's Llama 3.1 - Balanced performance",
            "size_gb": 4.7,
            "parameter_size": "8B",
            "use_cases": ["General purpose", "Real-time analysis"],
            "tags": ["recommended", "balanced"]
        },
        {
            "name": "phi-3:mini",
            "description": "Microsoft's Phi-3 - Fast & efficient",
            "size_gb": 2.3,
            "parameter_size": "3.8B",
            "use_cases": ["Speed-critical", "Resource-constrained"],
            "tags": ["fast", "lightweight"]
        },
        # ... more models
    ]
```

**Frontend**:
- New tab: "Model Library"
- Grid view of available models
- Filter by tags, size, use case
- One-click pull
- Shows which are installed

**Value**: Users can discover new models without leaving the app

---

### **2. Model Details Modal** (1 hour)

**What**: Full specifications popup

**Component**: `ModelDetailsModal.tsx`

**Triggered By**: Click model name in ModelCard

**Shows**:
- Full model information
- Template, format, parameters
- Quantization details
- Estimated resource requirements
- Links to Ollama/Hugging Face pages
- Changelog (if available)
- Recommended use cases

**Implementation**:
```typescript
interface ModelDetailsModalProps {
  modelName: string;
  isOpen: boolean;
  onClose: () => void;
}

// Fetch from /listener/ai/models/{name}/details
// Display in beautiful modal with sections
```

**Value**: Power users can deep-dive into model specs

---

### **3. Export/Import Configuration** (1 hour)

**What**: Backup and restore model assignments

**UI**:
```
[💾 Export Config] [📁 Import Config]
```

**Export Format** (JSON):
```json
{
  "version": "1.0",
  "exported_at": "2025-12-07T15:30:00Z",
  "assignments": {
    "semantic_vac": "llama3.1:8b-instruct-q4_0",
    "multi_emotion": "llama3.1:8b-instruct-q4_0",
    "insight_generation": "llama3.1:8b-instruct-q4_0",
    "atlas_mapping": "phi-3:mini"
  },
  "models_used": [
    "llama3.1:8b-instruct-q4_0",
    "phi-3:mini"
  ]
}
```

**Implementation**:
```typescript
const exportConfig = () => {
  const config = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    assignments,
    models_used: [...new Set(Object.values(assignments))]
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `love-ai-config-${Date.now()}.json`;
  a.click();
};

const importConfig = async (file: File) => {
  const text = await file.text();
  const config = JSON.parse(text);

  // Validate
  if (config.version !== '1.0') throw new Error('Unsupported version');

  // Check if models exist
  const missing = config.models_used.filter(m =>
    !localModels.some(local => local.name === m)
  );

  if (missing.length > 0) {
    // Show warning: "These models need to be pulled: ..."
  }

  // Apply assignments
  for (const [func, model] of Object.entries(config.assignments)) {
    await assignModel(func, model);
  }
};
```

**Value**: Share configurations, backup/restore setups

---

### **4. Assignment History** (2 hours)

**What**: Audit trail of assignment changes

**Database Addition**:
```sql
CREATE TABLE model_assignment_history (
    id SERIAL PRIMARY KEY,
    function VARCHAR(50) NOT NULL,
    old_model VARCHAR(100),
    new_model VARCHAR(100) NOT NULL,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255)
);
```

**UI Component**: `AssignmentHistory.tsx`

**Shows**:
```
Assignment History (Last 10)

Dec 7, 3:15 PM - user changed insight_generation
  llama3.1:8b → llama3.1:70b
  Reason: Better quality for clinical use
  [Rollback]

Dec 7, 2:30 PM - user changed atlas_mapping
  llama3.1:8b → phi-3:mini
  Reason: Faster classification
  [Rollback]
```

**Implementation**:
- Backend service tracks changes
- Frontend shows history
- Rollback = re-apply old assignment

**Value**: Accountability, easy undo, audit trail

---

## 🌟 Phase 6: Advanced Features (18-23 hours)

**Goal**: Research-grade capabilities
**Priority**: ⭐⭐⭐ Future Enhancement

---

### **1. A/B Testing Framework** (6-8 hours)

**What**: Compare two models on same input

**New Page**: `/admin/ai-models/testing`

**Flow**:
1. Select 2 models to compare
2. Choose function to test (semantic_vac, multi_emotion, etc.)
3. Provide sample input (text or transcript)
4. Run analysis with both models
5. Show outputs side-by-side
6. Compare: latency, quality, differences
7. Select winner → assign to function

**UI**:
```
┌────────────────────────────────────────────┐
│ A/B Model Testing                           │
├────────────────────────────────────────────┤
│ Model A: [llama3.1:8b ▼]                   │
│ Model B: [phi-3:mini ▼]                    │
│ Function: [Semantic VAC ▼]                 │
│                                             │
│ Sample Input:                               │
│ [I'm feeling anxious about...]             │
│                                             │
│ [Run Test]                                  │
│                                             │
│ Results:                                    │
│ ┌─────────────┬─────────────┐             │
│ │ llama3.1:8b │ phi-3:mini  │             │
│ ├─────────────┼─────────────┤             │
│ │ V: 0.65     │ V: 0.62     │             │
│ │ A: -0.32    │ A: -0.28    │             │
│ │ C: 0.58     │ C: 0.61     │             │
│ ├─────────────┼─────────────┤             │
│ │ 2.3s        │ 1.8s  ✓     │             │
│ └─────────────┴─────────────┘             │
│                                             │
│ [Use Model A] [Use Model B]                │
└────────────────────────────────────────────┘
```

**Value**: Data-driven model selection, research capabilities

---

### **2. Performance Dashboards** (4-5 hours)

**What**: Visualize performance trends over time

**New Component**: `PerformanceDashboard.tsx`

**Charts**:
1. **Latency Trend** - Line chart showing avg latency per function over last 7 days
2. **Usage Distribution** - Pie chart of invocations per function
3. **Model Efficiency** - Bar chart comparing tokens/sec across models
4. **Daily Invocations** - Area chart showing usage over time

**Libraries**: recharts or victory for React charts

**Data Source**: Expand `model_performance_metrics` table to track daily stats

**Value**: Insights into usage patterns, optimization opportunities

---

### **3. Resource Monitoring** (3-4 hours)

**What**: Real-time system resource tracking

**New Component**: `ResourceMonitor.tsx`

**Shows**:
- RAM usage per loaded model
- Total system RAM used
- Disk space remaining
- Warning if approaching limits
- Suggestions (e.g., "Delete unused models to free 15GB")

**Implementation**:
- Backend service queries system resources (psutil library)
- Frontend polls every 5 seconds
- Warning thresholds configurable

**Value**: Prevent out-of-memory issues, optimize resource usage

---

### **4. Model Testing Suite** (5-6 hours)

**What**: Test model quality before assigning

**New Component**: `ModelTester.tsx`

**Features**:
- Sample test cases per function
- Run analysis with selected model
- Preview output
- Quality scoring (subjective rating)
- Latency measurement
- Comparison with current model

**Test Cases**:
```typescript
const TEST_CASES = {
  semantic_vac: [
    { input: "I'm feeling anxious about the future", expected_v: 0.6 },
    { input: "I'm so excited and happy!", expected_v: -0.7 },
  ],
  multi_emotion: [
    { input: "I'm sad but also grateful", expected: ["sadness", "gratitude"] },
  ],
  // ...
};
```

**Value**: Confidence in model choice before committing

---

## 📚 Implementation Dependencies

### **Phase 4 Dependencies:**
- None! All can be built with existing infrastructure

### **Phase 5 Dependencies:**
- Registry browser: Curated model list (no public API)
- History: Database migration for history table
- Export/import: File upload handling

### **Phase 6 Dependencies:**
- A/B testing: Ability to run analysis with specific model
- Dashboards: Time-series data collection
- Resource monitoring: System monitoring library (psutil)
- Testing suite: Sample test data, evaluation criteria

---

## 🎯 Recommended Implementation Order

### **Next Session (2 hours):**
1. Disk usage display (15 min)
2. Bulk assign (30 min)
3. Quick presets (45 min)
4. Search/filter (30 min)

**Impact**: Huge UX improvement for minimal effort

### **Following Session (7-8 hours):**
1. Registry browser (3-4 hours)
2. Model details modal (1 hour)
3. Export/import (1 hour)
4. Assignment history (2 hours)

**Impact**: Professional-grade completeness

### **Future Sessions (18-23 hours):**
1. A/B testing (6-8 hours)
2. Dashboards (4-5 hours)
3. Resource monitoring (3-4 hours)
4. Testing suite (5-6 hours)

**Impact**: Research-grade capabilities

---

## 💡 Alternative Approaches

### **Instead of Building Registry Browser:**
Could add:
- "Popular Models" quick-select with ~10 curated options
- Links to Ollama website for discovery
- Import from URL (paste Ollama model page URL)

**Trade-off**: Less feature-complete but much faster to build (1 hour vs 4 hours)

### **Instead of Full A/B Testing:**
Could add:
- "Preview" button on recommendations
- Shows sample analysis with recommended model
- Simple yes/no to apply

**Trade-off**: Less powerful but covers 80% of use case (2 hours vs 8 hours)

---

## 🏆 Success Metrics

### **Phase 4 Success** (Quick Wins):
- Users can see disk usage at a glance
- Bulk operations save clicks
- Presets enable instant setup
- Search finds models quickly

### **Phase 5 Success** (Professional):
- Users discover models in-app
- Configurations are portable
- Assignment changes are trackable
- Model specs are fully accessible

### **Phase 6 Success** (Advanced):
- Research workflows supported
- Data-driven decisions enabled
- Resource optimization automated
- Quality assurance built-in

---

## 📋 Notes for Future Implementation

### **Phase 4 Tips:**
- All features are additive (no breaking changes)
- Can ship incrementally (one feature at a time)
- Test with real usage scenarios

### **Phase 5 Tips:**
- Registry browser needs curated model list (Ollama has no public API)
- Consider using official Ollama model library as source
- History tracking should be async (don't slow down assignments)

### **Phase 6 Tips:**
- A/B testing needs careful UX design (complex feature)
- Dashboards should use existing performance data
- Resource monitoring might need backend refactor

---

**Total Enhancement Time**: 27-33 hours
**Current Completion**: 90%
**Recommended Next**: Phase 4 (2 hours for huge impact)

**The current feature is production-ready!** Future phases are enhancements, not requirements. ✨
