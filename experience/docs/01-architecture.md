# Experience Module - Architecture

## System Architecture Overview

The Experience module operates as a **reactive visualization engine** within the L.O.V.E. Stack. It is the terminal component of a data processing pipeline that transforms raw emotional input into mathematical vectors, and finally into sensory output.

## The Complete L.O.V.E. Stack Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    USER INPUT LAYER                          │
│         (Voice Recording / Text Entry / Journal)             │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                      L - LISTENER                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Audio Processing (Whisper.rn / faster-whisper)       │  │
│  │  Speech-to-Text (Edge + Cloud Hybrid)                 │  │
│  └─────────────────────┬──────────────────────────────────┘  │
│                        │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │  LLM Semantic Analysis (LangChain + GPT/Llama)        │  │
│  │  Output: VAC Scalars [Valence, Arousal, Connection]  │  │
│  └─────────────────────┬──────────────────────────────────┘  │
│                        │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │  PII Sanitization (NER / Spacy)                       │  │
│  └─────────────────────┬──────────────────────────────────┘  │
└────────────────────────┼──────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                      O - OBSERVER                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL + pgvector                                 │  │
│  │  - atlas_definitions (87 emotions)                     │  │
│  │  - user_trajectory (state history)                     │  │
│  └─────────────────────┬──────────────────────────────────┘  │
│                        │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │  Context Retrieval (Vector Similarity Search)         │  │
│  │  HNSW Indexing for Fast Nearest-Neighbor Lookup       │  │
│  └─────────────────────┬──────────────────────────────────┘  │
└────────────────────────┼──────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                      V - VERSOR                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Quaternion Construction (VAC → q[w,x,y,z])           │  │
│  └─────────────────────┬──────────────────────────────────┘  │
│                        │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │  Transition Calculation (q_target × q_previous⁻¹)     │  │
│  │  Angular Distance (φ = 2 arccos|w|)                   │  │
│  └─────────────────────┬──────────────────────────────────┘  │
│                        │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │  SLERP Path Generation (60-120 interpolated frames)   │  │
│  │  Elasticity Calculation (E = φ / Δt)                  │  │
│  └─────────────────────┬──────────────────────────────────┘  │
└────────────────────────┼──────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                    E - EXPERIENCE                            │
│                      ⭐ YOU ARE HERE ⭐                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  State Management (Zustand)                            │  │
│  │  - targetVAC: [x, y, z]                                │  │
│  │  - targetQuaternion: [w, x, y, z]                      │  │
│  │  - slerpPath: Array<Quaternion>                        │  │
│  └─────────────────────┬──────────────────────────────────┘  │
│                        │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │  React Three Fiber Canvas                              │  │
│  │  └─ SoulSphere Component                               │  │
│  │     - Geometry: IcosahedronGeometry(detail=20)         │  │
│  │     - Material: Custom ShaderMaterial                  │  │
│  │     - Animation: useFrame SLERP interpolation          │  │
│  └─────────────────────┬──────────────────────────────────┘  │
│                        │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │  Haptic Feedback Manager                               │  │
│  │  - Pattern: Thud / Heartbeat / Flooding                │  │
│  │  - Library: react-native-haptics                       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                     USER OUTPUT LAYER                        │
│         (Visual Display + Haptic Vibration)                  │
└──────────────────────────────────────────────────────────────┘
```

## Experience Module Internal Architecture

### Component Hierarchy

```
<App>
  └─ <ExperienceProvider>  (Zustand Context)
      └─ <SafeAreaView>
          ├─ <Canvas frameloop="demand">  (React Three Fiber)
          │   ├─ <ambientLight />
          │   ├─ <pointLight />
          │   ├─ <PerspectiveCamera />
          │   └─ <SoulSphere>
          │       ├─ useFrame()  (Animation Loop)
          │       ├─ <icosahedronGeometry />
          │       └─ <shaderMaterial>
          │           ├─ vertexShader (Arousal Displacement)
          │           └─ fragmentShader (Valence/Connection)
          │
          ├─ <HapticManager />  (Headless Component)
          │   ├─ useEffect(watchAngularVelocity)
          │   └─ triggerPatterns()
          │
          └─ <DebugOverlay />  (Development Only)
              └─ Display Current VAC Values
```

## Technology Stack Deep Dive

### React Native Ecosystem

**React Native 0.76.x** with **Legacy Bridge Mode**

⚠️ **CRITICAL**: The New Architecture (Fabric/TurboModules) is **NOT** compatible with `expo-gl`, which is required for React Three Fiber on mobile.

**Why the Legacy Bridge?**

- expo-gl uses the older C++ bridge system
- The New Architecture's synchronous JSI creates race conditions in the WebGL frame loop
- Developers report `ExponentGLObjectManager` errors with New Architecture enabled

**Configuration Requirements**:

```properties
# android/gradle.properties
newArchEnabled=false
```

```ruby
# iOS Podfile (generated)
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
```

### React Three Fiber (R3F) v8.x

**Why v8 and not v9?**

- R3F v9 targets **React 19**, which is still in alpha/beta
- The stable React 18.2.0 ecosystem requires R3F v8
- R3F v8 has mature mobile bindings via `@react-three/fiber/native`

**What R3F Provides**:

- Declarative 3D scene graph (React components for Three.js objects)
- Automatic memory management (cleanup on unmount)
- Frame loop integration (`useFrame` hook)
- Pointer event handling
- Reconciler optimized for 3D scene updates

### Three.js Core

Three.js is the underlying WebGL abstraction layer. R3F is a React renderer for Three.js.

**Key Three.js Objects Used**:

- `IcosahedronGeometry` - Base sphere mesh
- `ShaderMaterial` - Custom GLSL shaders
- `Quaternion` - Rotation representation
- `Clock` - Time tracking for animations
- `Vector3` - 3D coordinates

### State Management: Zustand

**Why Zustand over Redux/Context?**

- **Transient Updates**: Can update state without triggering React re-renders
- **Minimal Boilerplate**: No reducers, actions, or providers
- **Performance**: Direct store access in `useFrame` without reconciliation
- **Middleware Support**: Easy to add persistence, devtools, etc.

**Store Structure**:

```typescript
interface ExperienceStore {
  // Current Target (from Versor)
  targetVAC: [number, number, number];
  targetQuaternion: [number, number, number, number];

  // Animation State
  currentVAC: [number, number, number];
  currentQuaternion: [number, number, number, number];

  // Elasticity Metrics
  angularVelocity: number;
  elasticity: number;

  // Haptic State
  hapticMode: "normal" | "quiet";

  // Actions
  setTarget: (vac, quaternion) => void;
  setHapticMode: (mode) => void;
}
```

### Haptics: react-native-haptics

**Why react-native-haptics over expo-haptics?**

- **2.13x faster** for "Heavy" impacts (0.36ms vs 0.77ms latency)
- Critical for syncing vibration to visual rotation apogees
- More granular control on iOS (CoreHaptics integration)

**API Usage**:

```typescript
import Haptics from "react-native-haptics";

// Heavy impact for large transitions
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Light impact for heartbeat pattern
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Selection feedback for UI interactions
Haptics.selectionAsync();
```

## Data Flow Sequence Diagram

### User Records a Voice Note

```
User presses record
       ↓
Listener activates (whisper.rn edge processing)
       ↓
Real-time transcription streams to UI
       ↓
User finishes recording
       ↓
Audio uploaded to Listener API (faster-whisper cloud)
       ↓
LLM analyzes text → VAC scalars [-0.6, 0.8, -0.3]
       ↓
Observer logs to database
       ↓
Versor receives VAC + previous quaternion
       ↓
Versor computes:
  - target_quaternion
  - transition_quaternion
  - angular_distance (φ = 87°)
  - SLERP path (array of 90 interpolated quaternions)
       ↓
Experience receives via WebSocket/API:
  {
    targetVAC: [-0.6, 0.8, -0.3],
    targetQuaternion: [0.5, -0.3, 0.6, -0.5],
    slerpPath: [...],
    angularDistance: 87,
    dominantAxis: 'arousal'
  }
       ↓
Experience updates Zustand store
       ↓
SoulSphere component reacts:
  - useFrame begins SLERP interpolation
  - Uniforms update (uValence, uArousal, uConnection)
  - Geometry displaces (vertex shader)
  - Color shifts (fragment shader)
       ↓
HapticManager detects high angular velocity
       ↓
Triggers "Heavy Thud" at midpoint of rotation (frame 45/90)
       ↓
User sees sphere rotate and feels vibration
       ↓
Animation completes (quaternion delta < 0.001)
       ↓
Canvas switches to frameloop="demand" (stops rendering)
```

## Performance Architecture

### Rendering Pipeline

1. **JavaScript Thread**: React component logic, Zustand store updates
2. **UI Thread**: React Native bridge communication
3. **GL Thread**: WebGL rendering (via expo-gl)

**Critical Optimization**: The `useFrame` hook runs on the **JS thread** but directly mutates Three.js objects, bypassing React reconciliation. This allows 60fps animation without re-rendering the React component tree.

### Frame Loop Strategy

```typescript
// ❌ BAD: Triggers React re-render 60 times per second
const [rotation, setRotation] = useState([0, 0, 0]);
useFrame(() => {
  setRotation((prev) => [prev[0] + 0.01, prev[1], prev[2]]);
});

// ✅ GOOD: Direct mutation, no re-renders
const meshRef = useRef();
useFrame(() => {
  meshRef.current.rotation.x += 0.01;
});
```

### On-Demand Rendering

When the user is idle (no new emotional state), the WebGL loop should **pause** to save battery.

```typescript
<Canvas frameloop="demand">
  {/* Scene only renders when invalidate() is called */}
</Canvas>
```

**Invalidation Triggers**:

- New target quaternion from Versor
- User voice input detected
- During SLERP animation (loop remains active)
- Manual user interaction (camera controls)

## Communication Protocols

### Versor → Experience API

**Option A: REST (Polling)**

```http
GET /api/versor/current-state?user_id=123
```

**Response**:

```json
{
  "targetVAC": [-0.5, 0.8, -0.2],
  "targetQuaternion": [0.7, -0.3, 0.6, -0.1],
  "angularDistance": 45.3,
  "timestamp": "2025-12-02T18:30:00Z"
}
```

**Option B: WebSocket (Real-Time)**

```javascript
const ws = new WebSocket("wss://api.love.app/versor-stream");
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  useExperienceStore
    .getState()
    .setTarget(data.targetVAC, data.targetQuaternion);
};
```

**Recommendation**: WebSocket for production (lower latency), REST for development simplicity.

## Security Considerations

### Data Privacy

- No raw transcription stored on device
- PII stripped before network transmission
- Local encryption for sensitive state history

### API Authentication

- JWT tokens for Versor API access
- Token refresh mechanism
- Secure storage using react-native-keychain

## Platform Differences

### iOS

- Superior haptic engine (Taptic Engine)
- Better WebGL performance (Metal backend)
- Stricter memory limits (must optimize textures)

### Android

- Varied haptic quality (device-dependent)
- OpenGL ES backend (slightly slower)
- More permissive memory (but slower GC)

**Strategy**: Design for iOS performance baseline, then optimize for Android edge cases.

## Error Handling Architecture

```typescript
try {
  // Attempt to render scene
} catch (error) {
  if (error.name === "ExponentGLObjectManager") {
    // New Architecture conflict
    showAlert("Please disable New Architecture");
  } else if (error.name === "OutOfMemoryError") {
    // Reduce geometry detail
    fallbackToLowPolyMode();
  } else {
    // Generic error
    logToSentry(error);
  }
}
```

## Next Steps

Now that you understand the architecture, proceed to:

- **02-setup-and-dependencies.md** - Configure your development environment
- **03-vac-model-reference.md** - Learn the emotional model in depth
