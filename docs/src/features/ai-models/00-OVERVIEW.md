# AI Model Management - Overview

## Dynamic Model Selection & Management for L.O.V.E. Platform**

**Created**: December 7, 2025
**Status**: Planning Phase
**Purpose**: Enable users to download, manage, and assign different Ollama models to specific AI functions

---

## 🎯 Vision

Transform the L.O.V.E. platform from using a single hard-coded LLM model to a **flexible, multi-model architecture** where:

- Users can download new Ollama models as they're released
- Different AI functions can use different models (optimized for their task)
- Easy model switching via Settings UI
- Performance/quality trade-offs visible to users
- Future-proof as AI advances

---

## 🤖 Current State: Single Model

### What We Use Now

**Model**: `llama3.1:8b-instruct-q4_0`
**Location**: Ollama (local)
**Used For**: Everything

### Functions using AI

1. **Semantic VAC Extraction** (Listener)
   - Analyzes text/transcript → extracts VAC coordinates
   - Requires: Good semantic understanding

2. **Multi-Emotion Detection** (Listener)
   - Detects multiple concurrent emotions
   - Requires: Nuanced emotional intelligence

3. **Insight Generation** (Observer)
   - Creates therapeutic insights
   - Requires: Empathy, clinical knowledge

4. **Atlas Mapping** (Listener)
   - Maps detected emotions to 87-emotion atlas
   - Requires: Precision, consistency

### Limitations

- ⚠️ Single model does everything (not optimized per task)
- ⚠️ Can't experiment with newer/better models
- ⚠️ No performance/quality trade-offs
- ⚠️ Hard-coded model name in config
- ⚠️ No way to know what models are available

---

## 🌟 Proposed: Multi-Model Architecture

### The Innovation

**Different models for different tasks**, user-configurable:

```text
┌─────────────────────────────────────────────┐
│          AI Function Mapping                 │
├─────────────────────────────────────────────┤
│ Semantic VAC      → llama3.1:8b (fast)     │
│ Multi-Emotion     → mixtral:8x7b (nuanced) │
│ Insight Gen       → llama3.1:70b (deep)    │
│ Atlas Mapping     → phi-3:mini (precise)   │
└─────────────────────────────────────────────┘
```

### Why This Matters

1. **Performance Optimization**
   - Use fast models for real-time analysis (VAC extraction)
   - Use powerful models for complex tasks (insights)

2. **Quality/Speed Trade-offs**
   - User chooses: Fast + good OR Slow + excellent
   - Clinical vs personal use cases

3. **Future-Proofing**
   - New models release monthly
   - Users can upgrade without code changes
   - A/B test different models

4. **Cost Control**
   - Smaller models = less RAM/CPU
   - Can run on lower-spec hardware

---

## 🏗️ Architecture Components

### 1. Ollama API Integration

### Ollama API Capabilities

- Listing available models
- Pulling (downloading) models
- Deleting models
- Getting model info (size, parameters, etc.)

### Backend Service (Listener)

```python
# listener/app/services/ollama_manager.py

class OllamaManager:
    async def list_local_models(self) -> List[ModelInfo]:
        """Get models currently installed"""

    async def list_available_models(self) -> List[ModelInfo]:
        """Get models available to pull from Ollama registry"""

    async def pull_model(self, model_name: str) -> AsyncIterator[PullProgress]:
        """Download a model with progress updates"""

    async def delete_model(self, model_name: str):
        """Remove a model from local storage"""

    async def get_model_info(self, model_name: str) -> ModelDetails:
        """Get detailed info about a model"""
```

### 2. Model Configuration

### Backend (Observer + Listener)

```python
# Config structure
model_assignments = {
    "semantic_vac": "llama3.1:8b-instruct-q4_0",
    "multi_emotion": "llama3.1:8b-instruct-q4_0",
    "insight_generation": "llama3.1:8b-instruct-q4_0",
    "atlas_mapping": "llama3.1:8b-instruct-q4_0"
}

# Endpoint to update
POST /observer/ai-settings
{
  "function": "insight_generation",
  "model": "llama3.1:70b-instruct-q4_0"
}
```

### 3. Frontend Settings UI

### New Settings Tab: "AI Models"

Shows:

- Current model assignments
- Available models (local)
- Model library (pullable)
- Performance characteristics
- Download manager

---

## 🎨 User Experience

### Model Library View

```text
Available Models (Local)

┌─────────────────────────────────────────────┐
│ ✅ llama3.1:8b-instruct-q4_0                │
│    Size: 4.7 GB | Params: 8B | Speed: ★★★★ │
│    Quality: ★★★★ | RAM: 8GB                 │
│    [Currently Used: All functions]          │
│    [Delete]                                  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✅ mixtral:8x7b-instruct-v0.1               │
│    Size: 26 GB | Params: 47B | Speed: ★★   │
│    Quality: ★★★★★ | RAM: 32GB               │
│    [Not assigned]                            │
│    [Assign to Function] [Delete]             │
└─────────────────────────────────────────────┘

Model Library (Available to Download)

┌─────────────────────────────────────────────┐
│ ⬇️ llama3.2:3b-instruct                     │
│    Size: 2.0 GB | Params: 3B | Speed: ★★★★★│
│    Quality: ★★★ | RAM: 4GB                  │
│    [Pull Model]                              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ⬇️ phi-3:mini                                │
│    Size: 2.3 GB | Params: 3.8B | Speed: ★★★★│
│    Quality: ★★★★ | RAM: 6GB                 │
│    [Pull Model]                              │
└─────────────────────────────────────────────┘
```

### Function Assignment View

```text
AI Function Assignments

Semantic VAC Extraction (Real-time)
├─ Current Model: llama3.1:8b-instruct-q4_0
├─ Performance: ~2.2s per analysis
├─ Recommendation: Fast model (< 8B parameters)
└─ [Change Model ▼]

Multi-Emotion Detection (Deep Feeling Mode)
├─ Current Model: llama3.1:8b-instruct-q4_0
├─ Performance: ~5s per analysis
├─ Recommendation: Nuanced model (8B-70B)
└─ [Change Model ▼]

Insight Generation (Therapeutic Guidance)
├─ Current Model: llama3.1:8b-instruct-q4_0
├─ Performance: ~3s per generation
├─ Recommendation: Empathetic model (8B+)
└─ [Change Model ▼]

Atlas Mapping (Emotion Classification)
├─ Current Model: llama3.1:8b-instruct-q4_0
├─ Performance: ~1.5s per mapping
├─ Recommendation: Precise model (any size)
└─ [Change Model ▼]
```

### Download Progress

```text
Downloading mixtral:8x7b-instruct-v0.1

Progress: ████████████░░░░░░░░ 65%
Downloaded: 17.2 GB / 26.4 GB
Speed: 12.5 MB/s
Est. Time Remaining: 12 minutes

Layers:
✅ application/vnd.docker.image.rootfs  (15.2 GB)
⏳ application/vnd.docker.container     (11.2 GB) - 65%
⬜ metadata                             (4 KB)

[Cancel Download]
```

---

## 💡 Key Features

### 1. Model Discovery

- List all Ollama registry models
- Show model cards (description, capabilities)
- Filter by size, speed, quality
- Search functionality

### 2. Easy Download

- One-click pull from Ollama registry
- Progress bar with speed/ETA
- Pause/resume downloads
- Retry on failure

### 3. Smart Assignment

- Recommendations per function
- Performance predictions
- Quality estimates
- Resource requirements visible

### 4. Testing & Validation

- Test model before assigning
- Sample analysis with preview
- Compare outputs side-by-side
- A/B testing framework

### 5. Resource Management

- Show disk space used
- RAM requirements per model
- Auto-cleanup of unused models
- Warning if insufficient resources

---

## 🎓 Model Recommendations by Function

### Semantic VAC Extraction (Real-time)

**Requirements**: Fast, consistent, good semantic understanding
**Recommended Models**:

- ✅ `llama3.1:8b` - Balanced speed/quality
- ✅ `phi-3:mini` - Faster, slightly less accurate
- ⚠️ `llama3.1:70b` - Overkill (too slow for real-time)

### Multi-Emotion Detection (Deep Feeling)

**Requirements**: Nuanced, handles complexity, empathetic
**Recommended Models**:

- ✅ `llama3.1:8b` - Good baseline
- ✅ `mixtral:8x7b` - Better at complexity
- ✅ `llama3.1:70b` - Best quality (if hardware allows)

### Insight Generation (Therapeutic Guidance)

**Requirements**: Empathetic, clinical knowledge, warm/clinical tone flexibility
**Recommended Models**:

- ✅ `llama3.1:8b` - Good for warm tone
- ✅ `llama3.1:70b` - Better clinical knowledge
- ✅ `mixtral:8x7b` - Good balance

### Atlas Mapping (Classification)

**Requirements**: Precise, consistent, fast
**Recommended Models**:

- ✅ `phi-3:mini` - Fast and precise for classification
- ✅ `llama3.1:8b` - Balanced
- ⚠️ Larger models not necessary (classification is simpler)

---

## 🚀 Benefits

### For Users

- Choose speed vs quality based on their hardware
- Experiment with latest AI advances
- Optimize for their use case

### For Clinicians

- Use best models for client sessions (quality)
- Use fast models for training/demos (speed)
- Professional-grade flexibility

### For Researchers

- Compare model performance on emotional analysis
- Validate VAC extraction across models
- Contribute to AI/emotion research

### For Platform

- Future-proof (new models don't require code changes)
- Competitive advantage (users can use bleeding-edge AI)
- Allows user-contributed model recommendations

---

## 📊 Technical Challenges & Solutions

### Challenge 1: Model Size

**Problem**: Some models are huge (llama3.1:70b = ~40GB)
**Solutions**:

- Show size prominently before download
- Warn if insufficient disk space
- Offer quantized versions (q4_0 vs q8_0)
- Progressive download with resume

### Challenge 2: Resource Requirements

**Problem**: Large models need lots of RAM
**Solutions**:

- Display RAM requirements clearly
- Detect available system RAM
- Warn if model won't fit
- Suggest smaller alternatives

### Challenge 3: Download Time

**Problem**: Large models take 30+ minutes to download
**Solutions**:

- Background download
- Don't block UI
- Notification when complete
- Resume interrupted downloads

### Challenge 4: Model Loading Time

**Problem**: Switching models requires unload/reload (~30s)
**Solutions**:

- Keep frequently-used models loaded
- Preload on startup
- Show loading indicator
- Cache model in RAM

---

## 🎯 Success Criteria

### AI Model Management Success Criteria

1. ✅ Users can discover available models
2. ✅ One-click download with progress
3. ✅ Easy assignment to functions
4. ✅ Clear performance impact visible
5. ✅ Resource requirements transparent
6. ✅ System remains stable (no crashes from OOM)
7. ✅ Settings persist (survive restart)

---

## 📋 Related Documents

- `01-OLLAMA-INTEGRATION.md` - Ollama API details
- `02-SETTINGS-UI.md` - UI/UX design
- `03-BACKEND-SERVICES.md` - Service implementation
- `04-IMPLEMENTATION-ROADMAP.md` - Phased rollout

---

**Status**: Architecture defined, ready for detailed planning
**Complexity**: High (backend + frontend + Ollama integration)
**Impact**: Very High (future-proofs entire AI stack)
**Estimated Time**: 20-25 hours (full implementation)

**This feature transforms L.O.V.E. into a flexible AI platform!** 🤖✨
