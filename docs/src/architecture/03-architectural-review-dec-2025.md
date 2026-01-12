# L.O.V.E. Architectural Review - December 2025

## Comprehensive System Analysis & Future Planning

**Date**: December 7, 2025  
**Purpose**: Deep architectural review, containerization readiness, UX analysis  
**Scope**: All modules (L, O, V, E) + infrastructure

---

## 📊 Current Architecture Overview

### **L.O.V.E. Microservices**

```text
┌─────────────────────────────────────────────────────────┐
│                    EXPERIENCE (E)                        │
│  Next.js 16 + React 19 + React Three Fiber             │
│  Port 3000 - Web UI + 3D Soul Sphere                   │
│  ┌─────────────────────────────────────┐               │
│  │ Frontend Responsibilities:           │               │
│  │ • 3D rendering (R3F + Three.js)     │               │
│  │ • User interactions                  │               │
│  │ • State management (Zustand)        │               │
│  │ • WebSocket connections              │               │
│  │ • Animation calculations             │               │
│  │ • Real-time visualizations          │               │
│  └─────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
                         ↓ HTTP/WS
┌─────────────────────────────────────────────────────────┐
│                   OBSERVER (O)                           │
│  FastAPI + PostgreSQL 17 + pgvector                     │
│  Port 8000 - Data persistence & analysis                │
│  ┌─────────────────────────────────────┐               │
│  │ Backend Responsibilities:            │               │
│  │ • Database operations                │               │
│  │ • A* pathfinding                     │               │
│  │ • Transition strategies              │               │
│  │ • Session analytics                  │               │
│  │ • Insight generation                 │               │
│  │ • Chat orchestration                 │               │
│  │ • Multi-emotion analysis            │               │
│  │ • Clinical alerts                    │               │
│  └─────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
                         ↓ HTTP
┌─────────────────────────────────────────────────────────┐
│                   LISTENER (L)                           │
│  FastAPI + Ollama + faster-whisper + Redis              │
│  Port 8002 - Audio/text emotional analysis              │
│  ┌─────────────────────────────────────┐               │
│  │ Backend Responsibilities:            │               │
│  │ • Audio transcription                │               │
│  │ • Prosody analysis                   │               │
│  │ • Semantic VAC extraction            │               │
│  │ • Multi-emotion detection            │               │
│  │ • Atlas mapping                      │               │
│  │ • PII sanitization                   │               │
│  │ • Async job queue                    │               │
│  └─────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
                         ↓ HTTP
┌─────────────────────────────────────────────────────────┐
│                    VERSOR (V)                            │
│  FastAPI - Pure mathematics                              │
│  Port 8001 - Quaternion calculations                     │
│  ┌─────────────────────────────────────┐               │
│  │ Backend Responsibilities:            │               │
│  │ • VAC → Quaternion conversion        │               │
│  │ • Rotation calculations              │               │
│  │ • Mathematical utilities             │               │
│  │ • (Stateless, pure functions)        │               │
│  └─────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘

        ┌────────────────────────────┐
        │  Supporting Services       │
        ├────────────────────────────┤
        │ • PostgreSQL 17 + pgvector │
        │ • Redis 7 (job queue)      │
        │ • Ollama (local LLM)       │
        └────────────────────────────┘
```

---

## ✅ What's Working Exceptionally Well

### **1. Service Boundaries** (Excellent! 🟢)

**Each module has clear, single responsibility:**

- **Versor**: Pure mathematics (stateless, cacheable, fast)
- **Observer**: Data + orchestration (stateful, persistent)
- **Listener**: AI/ML processing (heavy compute, async)
- **Experience**: Visualization + UX (interactive, real-time)

**Why this works:**

- Services can scale independently
- Each can be deployed/updated separately
- Clear ownership and maintainability
- Technology choices match responsibilities

### **2. API Design** (Excellent! 🟢)

**RESTful + WebSocket hybrid:**

- REST for request/response (Atlas queries, pathfinding)
- WebSocket for real-time streams (chat, progress updates)
- Clear contracts (FastAPI auto-docs)
- Type-safe schemas (Pydantic)

**Current APIs are well-designed:**

- `/observer/atlas/emotions` - Fast, cacheable
- `/observer/transition-path` - Complex logic on backend ✅
- `/listener/analyze` - Heavy compute on backend ✅
- `/observer/chat` - WebSocket for streaming ✅

### **3. Data Flow** (Good! 🟡)

**Current pattern:**

```text
User Input → Listener (analyze) → Observer (store) → Experience (visualize)
```

**Strengths:**

- Clear data ownership
- Backend does heavy lifting
- Frontend focuses on UX

**Areas for improvement** (see Frontend/Backend Boundaries section):

- Some frontend calculations could move to backend
- Path matrix computation happening on frontend
- Emotion animation parameters calculated on frontend

---

## 🔍 Frontend vs Backend Computation Analysis

### **Currently on Frontend (Should Review):**

#### **1. Path Matrix Computation** 🤔

**Location**: `experience/web/hooks/usePathCalculator.ts`

**What it does**:

- Computes all possible paths between selected emotions
- Calls Observer API for each pair
- Manages loading states

**Analysis:**

- ✅ Good: Uses backend pathfinding API
- ⚠️ Concern: Makes N² API calls (if 5 emotions selected = 10-20 calls)
- 💡 **Recommendation**: Add `/observer/compute-path-matrix` endpoint
  - Frontend sends: list of emotion IDs
  - Backend returns: all paths in single response
  - Reduces network overhead
  - Can optimize queries (single DB transaction)

#### **2. Emotion Animation Parameter Calculation** 🤔

**Location**: `experience/web/utils/emotionAnimationMapper.ts`

**What it does**:

- Maps VAC + category → animation parameters
- Calculates breathing rate, amplitude, rotation, glow, motion type
- Runs on every emotion, every frame

**Analysis:**

- ✅ Good: Local calculation means instant response
- ✅ Good: No network latency
- ⚠️ Consideration: Could be pre-computed and cached
- 💡 **Recommendation**: Hybrid approach
  - **Keep on frontend** for real-time responsiveness
  - **Add to backend** as optional pre-computed field in emotion atlas
  - Benefits both approaches:
    - Real-time: Frontend calculates from live VAC
    - Canonical: Backend provides default parameters
    - Allows server-side A/B testing of parameters

#### **3. Aggregate Emotion State Calculation** ✅

**Location**: `experience/web/components/admin/AggregateEmotionSphere.tsx`

**What it does**:

- Blends colors from multiple emotions
- Calculates complexity score
- Determines particle count

**Analysis:**

- ✅ **CORRECT PLACEMENT**: Should stay on frontend
- Real-time visualization needs instant feedback
- No server round-trip needed
- Simple weighted average calculations

#### **4. Session Metrics Tracking** 🤔

**Location**: `experience/web/components/admin/ChatPanel.tsx`

**What it does**:

- Tracks emotion count, average confidence
- Calculates alert counts
- Maintains session timing

**Analysis:**

- ⚠️ **SHOULD MOVE TO BACKEND**: This is session data
- 💡 **Recommendation**: Move to Observer
  - Add to `session_analytics` table (already exists!)
  - Observer websocket streams metrics
  - Frontend just displays
  - Enables:
    - Persistent session history
    - Cross-session analytics
    - Clinician dashboard
    - Research data collection

---

## 🎯 Recommendations: Frontend/Backend Boundaries

### **MOVE TO BACKEND:**

1. **Session Metrics** → Observer
   - Already has `session_analytics` table
   - Add real-time streaming via WebSocket
   - Frontend becomes pure display

2. **Path Matrix Computation** → Observer
   - New endpoint: `POST /observer/compute-path-matrix`
   - Input: `{ emotion_ids: [...] }`
   - Output: `{ paths: [...], computation_time: ... }`
   - Reduces N² API calls to 1

3. **Emotion Relationship Graph** → Observer (optional)
   - Complex graph layout calculations
   - Could use backend graph algorithms
   - But: D3.js frontend layout is standard practice
   - **Verdict**: Keep on frontend (standard pattern)

### **KEEP ON FRONTEND:**

1. **Animation Parameter Calculation** ✅
   - Real-time responsiveness critical
   - No server round-trip
   - Simple math (appropriate for client)

2. **3D Rendering** ✅
   - Obviously frontend (WebGL/Three.js)
   - Cannot be server-side rendered

3. **UI State Management** ✅
   - Zustand stores (selected emotions, filters, layers)
   - Local-only state
   - No persistence needed

### **HYBRID APPROACH:**

1. **Waypoint Explanations**
   - ✅ Currently: Backend generates, frontend displays
   - Perfect pattern - keep as is!

2. **Insight Generation**
   - ✅ Currently: Backend generates, frontend formats
   - Perfect pattern - keep as is!

---

## 🐳 Containerization Readiness Analysis

### **Current State: Excellent Foundation!** 🟢

**Already Containerized:**

- ✅ Versor has `Containerfile`
- ✅ Observer has `Containerfile`
- ✅ Listener has `Containerfile`
- ✅ `podman-compose.yml` orchestrates full stack
- ✅ PostgreSQL 17 + pgvector ready
- ✅ Redis container ready
- ✅ Ollama container ready

**Development/Production Dual Mode:**

- ✅ `.venv` for development (fast iteration)
- ✅ Containers for production (consistency)
- ✅ Scripts for both modes
- ✅ `.env` configuration separate from containers

### **Experience Module: Needs Containerization**

**Current**: Next.js runs natively  
**Needed**: Containerfile for Experience web

```dockerfile
# experience/web/Containerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Run Next.js production server
CMD ["npm", "start"]
```

**Why needed:**

- Complete containerization of stack
- Consistent deployment
- CI/CD integration
- Scalability (multiple frontend replicas)

---

## 🌐 Network Architecture: Local vs Distributed

### **Current: Local-First** ✅

**Strengths:**

- Privacy-preserving (no cloud for emotional data)
- Fast (no network latency)
- Offline capable
- HIPAA-friendly (data never leaves device)

**Limitations:**

- Single-user only
- No collaboration
- No cross-device sync
- Resource intensive on client

### **Future: Distributed Architecture**

#### **Option A: Hybrid (Recommended)**

```text
┌──────────────────────────────────────────┐
│          Client Device                    │
│  ┌────────────────────────────┐          │
│  │  Experience (Web/Mobile)    │          │
│  │  - 3D Rendering             │          │
│  │  - User Interactions        │          │
│  │  - Local Caching            │          │
│  └────────────────────────────┘          │
│              ↓                            │
│    [Mode Toggle: Local vs Network]       │
│              ↓                            │
└──────────────────────────────────────────┘
         ↓                    ↓
    [Local]              [Network]
         ↓                    ↓
┌─────────────┐      ┌──────────────────┐
│ Local Stack │      │  Cloud Services  │
│ L + O + V   │      │  L + O + V       │
│ (Privacy)   │      │  (Scalable)      │
└─────────────┘      └──────────────────┘
```

**Toggle Implementation:**

```typescript
// Frontend setting
interface NetworkConfig {
  mode: 'local' | 'network';
  local: {
    observerUrl: 'http://localhost:8000',
    listenerUrl: 'http://localhost:8002',
    versorUrl: 'http://localhost:8001'
  };
  network: {
    observerUrl: 'https://api.love-platform.com/observer',
    listenerUrl: 'https://api.love-platform.com/listener',
    versorUrl: 'https://api.love-platform.com/versor'
  };
}
```

**Benefits:**

- User chooses: privacy (local) or convenience (network)
- Clinical: Always local (HIPAA)
- Research: Network (aggregate insights, but anonymized)
- Personal: User preference

#### **Option B: Edge Computing**

```text
Client → Edge Server (Local Network) → Cloud (Optional)
```

- Experience runs on client
- L+O+V run on local server (Raspberry Pi, NAS, etc.)
- Optional cloud sync for backup/research

---

## 🎨 UX Improvements Implemented (Today)

### **1. Animation Modes** - Therapeutic Flexibility

**Innovation**: Different aesthetic worlds for different needs

- Subtle: Regulation through rhythm
- Dynamic: Engagement through vitality
- Mystical: Expansion through beauty

**UX Impact**: Users can match visualization to therapeutic intent

### **2. Self-Documenting Motion** - Learning Through Observation

**Innovation**: Motion type indicators teach category dynamics

- Cyan ring = social/relational (users learn by seeing)
- Lime arcs = growth/optimism
- Gray cone = self-conscious/retreat
- Slate ring = stable/core

**UX Impact**: System teaches itself, no manual needed

### **3. Keyboard Navigation** - Power User Focus

**Innovation**: Complete keyboard control (18+ shortcuts)

- No mouse required for advanced users
- Faster workflow for clinicians
- Accessibility benefit

**UX Impact**: Professional tools for serious use

### **4. VAC-Driven Individuality** - Emotion Personality

**Innovation**: Each emotion moves uniquely based on psychology

- Anxiety breathes fast (matches internal experience)
- Joy reaches outward (social nature)
- Shame recoils (psychological accuracy)

**UX Impact**: Users UNDERSTAND emotions through motion

---

## 📱 Settings Page Architecture (Planned)

### **Current State:**

Settings scattered across UI:

- Some in ControlPanel (left sidebar)
- Some in ChatPanel toggles
- Some keyboard-only (M, O keys)
- No persistence (resets on refresh)

### **Proposed: Unified Settings Page**

**Route**: `/admin/settings`

**Architecture**:

```typescript
// Settings Store (Zustand)
interface SettingsState {
  // Visual
  pathAnimationMode: PathAnimationMode;
  emotionDisplayMode: EmotionDisplayMode; // Future: 'simple' | 'data'
  showMotionIndicators: boolean;
  colorScheme: ColorScheme;
  
  // Behavior
  autoComputePaths: boolean;
  focusMode: boolean;
  enableAnimations: boolean;
  
  // Network
  networkMode: 'local' | 'network';
  apiEndpoints: {
    observer: string;
    listener: string;
    versor: string;
  };
  
  // Preferences
  toneMode: 'warm' | 'clinical';
  deepFeelingDefault: boolean;
  
  // Persistence
  saveSettings: () => void;
  loadSettings: () => void;
  resetToDefaults: () => void;
}
```

**UI Structure**:

```text
Settings Page
├── Visual Settings
│   ├── Path Animation Mode (Subtle/Dynamic/Mystical)
│   ├── Emotion Display Mode (Simple/Data) [Future]
│   ├── Color Scheme (Category/Valence/Arousal/Connection)
│   ├── Show Motion Indicators (toggle)
│   └── Enable Animations (toggle)
│
├── Behavior Settings
│   ├── Auto-Compute Paths (toggle)
│   ├── Focus Mode (toggle)
│   └── Path Opacity (slider)
│
├── Network Settings
│   ├── Mode: Local vs Network (toggle)
│   ├── API Endpoints (if network mode)
│   ├── Connection Status
│   └── Test Connection (button)
│
├── Chat Preferences
│   ├── Default Tone (Warm/Clinical)
│   ├── Deep Feeling Mode Default (toggle)
│   └── Auto-Focus Emotions in Sphere (toggle)
│
└── Actions
    ├── Save Settings (persist to localStorage)
    ├── Reset to Defaults
    └── Export/Import Settings (JSON)
```

**Implementation Files**:

- `/experience/web/app/admin/settings/page.tsx` - Settings page
- `/experience/web/stores/useSettingsStore.ts` - Unified settings store
- `/experience/web/components/admin/settings/` - Setting sections
  - `VisualSettings.tsx`
  - `BehaviorSettings.tsx`
  - `NetworkSettings.tsx`
  - `ChatSettings.tsx`

**Persistence Strategy**:

- **localStorage** for client-side settings
- **Future**: POST to Observer `/user-preferences` endpoint
- **Future**: Sync across devices via network mode

---

## 🔌 Network/Local Mode Toggle Design

### **Implementation Strategy**

#### **Phase 1: Configuration Layer**

```typescript
// experience/web/config/api.ts
export interface ApiConfig {
  mode: 'local' | 'network';
  endpoints: {
    observer: string;
    listener: string;
    versor: string;
  };
}

const LOCAL_CONFIG: ApiConfig = {
  mode: 'local',
  endpoints: {
    observer: 'http://localhost:8000',
    listener: 'http://localhost:8002',
    versor: 'http://localhost:8001'
  }
};

const NETWORK_CONFIG: ApiConfig = {
  mode: 'network',
  endpoints: {
    observer: process.env.NEXT_PUBLIC_OBSERVER_URL || 'https://api.love.platform/observer',
    listener: process.env.NEXT_PUBLIC_LISTENER_URL || 'https://api.love.platform/listener',
    versor: process.env.NEXT_PUBLIC_VERSOR_URL || 'https://api.love.platform/versor'
  }
};

export function getApiConfig(): ApiConfig {
  const mode = localStorage.getItem('networkMode') as 'local' | 'network' || 'local';
  return mode === 'local' ? LOCAL_CONFIG : NETWORK_CONFIG;
}
```

#### **Phase 2: API Client Wrapper**

```typescript
// experience/web/lib/apiClient.ts
class ApiClient {
  private config: ApiConfig;
  
  constructor() {
    this.config = getApiConfig();
  }
  
  updateMode(mode: 'local' | 'network') {
    this.config = mode === 'local' ? LOCAL_CONFIG : NETWORK_CONFIG;
    localStorage.setItem('networkMode', mode);
  }
  
  async fetchObserver(path: string, options?: RequestInit) {
    const url = `${this.config.endpoints.observer}${path}`;
    return fetch(url, options);
  }
  
  // Similar for listener, versor
  
  async testConnection(): Promise<{
    observer: boolean;
    listener: boolean;
    versor: boolean;
  }> {
    // Ping /health endpoints
    // Return connection status
  }
}

export const api = new ApiClient();
```

#### **Phase 3: Settings UI**

```typescript
// In Settings page
<section>
  <h2>Network Mode</h2>
  <Toggle
    checked={networkMode === 'network'}
    onChange={(checked) => {
      const mode = checked ? 'network' : 'local';
      setNetworkMode(mode);
      api.updateMode(mode);
    }}
    leftLabel="🏠 Local (Privacy)"
    rightLabel="🌐 Network (Cloud)"
  />
  
  {networkMode === 'local' && (
    <p className="text-sm text-gray-400">
      ✅ All data stays on your device (HIPAA compliant)
    </p>
  )}
  
  {networkMode === 'network' && (
    <div className="mt-4">
      <ConnectionStatus />
      <button onClick={testConnection}>Test Connection</button>
    </div>
  )}
</section>
```

---

## 📦 Containerization Roadmap

### **Current Containerization Status**

| Module | Containerfile | Tested | Production Ready |
|--------|---------------|--------|------------------|
| Versor | ✅ Yes | ⏳ Not tested | 🟡 Needs testing |
| Observer | ✅ Yes | ⏳ Not tested | 🟡 Needs testing |
| Listener | ✅ Yes | ⏳ Not tested | 🟡 Needs testing |
| Experience | ❌ No | ❌ No | ❌ Needs creation |
| PostgreSQL | ✅ Yes (pgvector/pgvector:pg17) | ✅ Working | ✅ Ready |
| Redis | ✅ Yes (redis:7-alpine) | ✅ Working | ✅ Ready |
| Ollama | ✅ Yes (ollama/ollama) | ✅ Working | ✅ Ready |

### **Next Steps for Full Containerization**

#### **1. Create Experience Containerfile** (30 min)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

#### **2. Update podman-compose.yml** (15 min)

Add Experience service:

```yaml
experience:
  build:
    context: ../experience/web
    dockerfile: Containerfile
  ports:
    - "3000:3000"
  environment:
    - NEXT_PUBLIC_OBSERVER_URL=http://observer:8000
    - NEXT_PUBLIC_LISTENER_URL=http://listener:8002
    - NEXT_PUBLIC_VERSOR_URL=http://versor:8001
  depends_on:
    - observer
    - listener
    - versor
```

#### **3. Test Full Stack** (1 hour)

```bash
cd infra
podman-compose build
podman-compose up -d
# Test all services
curl http://localhost:3000 # Experience
curl http://localhost:8000/health # Observer
curl http://localhost:8002/health # Listener
curl http://localhost:8001/health # Versor
```

#### **4. CI/CD Integration** (2-3 hours)

Add `.gitlab-ci.yml` to Experience:

```yaml
stages:
  - build
  - test
  - deploy

build:
  stage: build
  image: docker:latest
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -f Containerfile .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

---

## 🚀 Deployment Architecture (Future)

### **Local Deployment** (Current + Enhanced)

```text
┌────────────────────────────────┐
│     User's Device/Server        │
│                                 │
│  ┌──────────────────────────┐  │
│  │  L.O.V.E. Stack          │  │
│  │  (All containers)        │  │
│  │                          │  │
│  │  • Experience :3000      │  │
│  │  • Observer :8000        │  │
│  │  • Listener :8002        │  │
│  │  • Versor :8001          │  │
│  │  • PostgreSQL :5432      │  │
│  │  • Redis :6379           │  │
│  │  • Ollama :11434         │  │
│  └──────────────────────────┘  │
│                                 │
│  Data: Never leaves device      │
│  Privacy: Maximum               │
│  Performance: Excellent         │
└────────────────────────────────┘
```

**Use Cases:**

- Personal use
- Clinical practice (HIPAA compliance)
- Research (local analysis)

### **Network Deployment** (Future)

```text
┌──────────────────────────────────────────────────┐
│              Client Devices                       │
│  Web Browser | Mobile App | Tablet               │
└──────────────────────────────────────────────────┘
                    ↓ HTTPS/WSS
┌──────────────────────────────────────────────────┐
│           Load Balancer / API Gateway             │
│         (nginx/traefik + SSL termination)         │
└──────────────────────────────────────────────────┘
                    ↓
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Experience  │  Observer   │  Listener   │   Versor    │
│ (Multiple)  │ (Multiple)  │ (Multiple)  │  (Multiple) │
│  Replicas   │  Replicas   │  Replicas   │   Replicas  │
└─────────────┴─────────────┴─────────────┴─────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│              Managed Services                            │
│  • PostgreSQL (RDS/Cloud SQL)                           │
│  • Redis (ElastiCache/Cloud Memorystore)                │
│  • Ollama (GPU instances for LLM)                       │
│  • Object Storage (session recordings, backups)         │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**

- Scalability (handle thousands of users)
- Reliability (redundancy, failover)
- Collaboration (shared sessions, clinician access)
- Research (aggregate insights)

---

## 🔐 Architecture Optimizations

### **Recommendation 1: API Gateway Pattern**

**Problem**: Frontend knows about 3 different backend URLs  
**Solution**: Single API gateway

```text
Frontend → API Gateway :8080 → Routes to:
                                 ├─ /observer/* → Observer :8000
                                 ├─ /listener/* → Listener :8002
                                 └─ /versor/* → Versor :8001
```

**Benefits:**

- Single endpoint for frontend
- Easier CORS management
- Rate limiting
- Authentication/authorization at gateway
- Request logging centralized

**Implementation**: nginx or traefik in container

### **Recommendation 2: Caching Layer**

**Add Redis caching for:**

- Atlas emotions (changes rarely)
- Transition paths (cache by emotion pair)
- Waypoint explanations (static once generated)

**Impact:**

- Faster responses
- Reduced database load
- Better scalability

### **Recommendation 3: GraphQL (Future Consider)**

**Current**: Multiple REST endpoints  
**Future Option**: Single GraphQL endpoint

**Pros:**

- Frontend requests exactly what it needs
- Reduces over-fetching
- Type-safe queries

**Cons:**

- Added complexity
- Learning curve
- May be overkill for current scale

**Verdict**: Stick with REST for now, consider when scaling

---

## 🎯 Immediate Next Steps

### **1. Settings Page** (4-6 hours)

- [ ] Create `/admin/settings` route
- [ ] Design Settings UI components
- [ ] Create unified settings store
- [ ] Implement localStorage persistence
- [ ] Add network mode toggle
- [ ] Add connection testing

### **2. Experience Containerization** (2-3 hours)

- [ ] Create `experience/web/Containerfile`
- [ ] Update `podman-compose.yml`
- [ ] Test containerized build
- [ ] Verify all features work in container
- [ ] Document container deployment

### **3. Move Session Metrics to Backend** (3-4 hours)

- [ ] Add WebSocket streaming to Observer
- [ ] Update `session_analytics` service
- [ ] Remove metrics calculation from ChatPanel
- [ ] Frontend consumes metrics stream
- [ ] Test real-time updates

### **4. Path Matrix Endpoint** (2-3 hours)

- [ ] Create `/observer/compute-path-matrix` endpoint
- [ ] Optimize: single DB query for all paths
- [ ] Update frontend to use new endpoint
- [ ] Measure performance improvement
- [ ] Update API docs

---

## 💡 Long-Term Vision

### **Local-First, Network-Optional**

The architecture should support:

**Default**: Fully local (privacy, offline, HIPAA)  
**Optional**: Network mode (collaboration, sync, research)  
**Hybrid**: Local analysis, optional cloud backup

**Key principle**: User owns their emotional data. Network is convenience, not requirement.

---

**Status**: Architecture is solid, ready for next phase  
**Readiness**: Containerization 80% complete  
**UX**: Exceptional and getting better  
**Next**: Settings page + full containerization
