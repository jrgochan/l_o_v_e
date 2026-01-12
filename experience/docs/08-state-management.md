# Experience Module - State Management

## Overview

The Experience module requires a state management solution that:

- ✅ Updates at 60fps without triggering React re-renders
- ✅ Allows direct access from animation loops (`useFrame`)
- ✅ Supports selective subscriptions (only re-render when specific values change)
- ✅ Has minimal boilerplate

**Zustand** meets all these requirements and is the official state management solution for the Experience module.

## Why Zustand Over Redux/Context?

### Comparison Table

| Feature           | Zustand   | Redux  | Context API                   |
| ----------------- | --------- | ------ | ----------------------------- |
| Boilerplate       | Minimal   | High   | Medium                        |
| Performance       | Excellent | Good   | Poor (unnecessary re-renders) |
| Transient Updates | ✅ Yes    | ❌ No  | ❌ No                         |
| Outside React     | ✅ Yes    | ✅ Yes | ❌ No                         |
| DevTools          | ✅ Yes    | ✅ Yes | ❌ No                         |
| Middleware        | ✅ Yes    | ✅ Yes | ❌ No                         |

### The Critical Advantage: Transient Updates

Zustand allows **state updates without re-rendering**. This is essential for the animation loop:

```typescript
// ❌ BAD: React state triggers 60 re-renders per second
const [rotation, setRotation] = useState(0);
useFrame(() => {
  setRotation((prev) => prev + 0.01); // Re-renders entire component tree
});

// ✅ GOOD: Zustand transient update (no re-render)
useFrame(() => {
  useExperienceStore.setState({ rotation: rotation + 0.01 });
});
```

## Store Architecture

### Complete Store Definition

**File**: `src/features/experience/store/useExperienceStore.ts`

```typescript
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Quaternion, Vector3 } from "three";

// ============================================================================
// TYPES
// ============================================================================

export type VACTuple = [number, number, number];
export type QuaternionTuple = [number, number, number, number];

export type HapticMode = "normal" | "quiet";
export type ColorblindMode =
  | "default"
  | "deuteranopia"
  | "protanopia"
  | "tritanopia";

interface EmotionalMetrics {
  angularDistance: number; // Current rotation distance (radians)
  angularVelocity: number; // Rate of change (rad/s)
  elasticity: number; // State change frequency
  slerpProgress: number; // 0.0 to 1.0 (animation progress)
}

interface UserPreferences {
  hapticMode: HapticMode;
  colorblindMode: ColorblindMode;
  reducedMotion: boolean;
  debugMode: boolean;
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface ExperienceStore {
  // -------------------------
  // Current State
  // -------------------------
  currentVAC: VACTuple;
  currentQuaternion: Quaternion;

  // -------------------------
  // Target State (from Versor)
  // -------------------------
  targetVAC: VACTuple;
  targetQuaternion: Quaternion;

  // -------------------------
  // Previous State (for velocity)
  // -------------------------
  previousQuaternion: Quaternion;
  previousTimestamp: number;

  // -------------------------
  // Metrics
  // -------------------------
  metrics: EmotionalMetrics;

  // -------------------------
  // User Preferences
  // -------------------------
  preferences: UserPreferences;

  // -------------------------
  // Actions
  // -------------------------

  // Set new target from Versor
  setTarget: (vac: VACTuple, quaternion: QuaternionTuple) => void;

  // Update current state (called from useFrame)
  updateCurrent: (quaternion: Quaternion) => void;

  // Calculate and update metrics
  updateMetrics: () => void;

  // User preference updates
  setHapticMode: (mode: HapticMode) => void;
  setColorblindMode: (mode: ColorblindMode) => void;
  setReducedMotion: (enabled: boolean) => void;
  toggleDebugMode: () => void;

  // Reset to neutral state
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const NEUTRAL_STATE: Partial<ExperienceStore> = {
  currentVAC: [0, 0, 0],
  currentQuaternion: new Quaternion(1, 0, 0, 0),
  targetVAC: [0, 0, 0],
  targetQuaternion: new Quaternion(1, 0, 0, 0),
  previousQuaternion: new Quaternion(1, 0, 0, 0),
  previousTimestamp: Date.now(),
  metrics: {
    angularDistance: 0,
    angularVelocity: 0,
    elasticity: 0,
    slerpProgress: 0,
  },
  preferences: {
    hapticMode: "normal",
    colorblindMode: "default",
    reducedMotion: false,
    debugMode: false,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateAngularDistance(q1: Quaternion, q2: Quaternion): number {
  const dot = q1.dot(q2);
  return 2 * Math.acos(Math.abs(Math.min(Math.max(dot, -1), 1)));
}

function calculateAngularVelocity(
  q1: Quaternion,
  q2: Quaternion,
  deltaTime: number,
): number {
  if (deltaTime === 0) return 0;
  const distance = calculateAngularDistance(q1, q2);
  return distance / deltaTime;
}

// ============================================================================
// STORE CREATION
// ============================================================================

export const useExperienceStore = create<ExperienceStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initialize with neutral state
        ...NEUTRAL_STATE,

        // ---------------------------------------------------------------------
        // SET TARGET
        // ---------------------------------------------------------------------
        setTarget: (vac, quaternionTuple) => {
          const targetQuat = new Quaternion(
            quaternionTuple[1], // x
            quaternionTuple[2], // y
            quaternionTuple[3], // z
            quaternionTuple[0], // w
          );

          // Calculate angular distance to new target
          const { currentQuaternion } = get();
          const distance = calculateAngularDistance(
            currentQuaternion,
            targetQuat,
          );

          set({
            targetVAC: vac,
            targetQuaternion: targetQuat,
            metrics: {
              ...get().metrics,
              angularDistance: distance,
              slerpProgress: 0, // Reset animation progress
            },
          });
        },

        // ---------------------------------------------------------------------
        // UPDATE CURRENT
        // ---------------------------------------------------------------------
        updateCurrent: (quaternion) => {
          const { previousQuaternion, previousTimestamp, targetQuaternion } =
            get();

          const now = Date.now();
          const deltaTime = (now - previousTimestamp) / 1000; // Convert to seconds

          // Calculate velocity
          const velocity = calculateAngularVelocity(
            quaternion,
            previousQuaternion,
            deltaTime,
          );

          // Calculate progress toward target
          const distanceToTarget = calculateAngularDistance(
            quaternion,
            targetQuaternion,
          );
          const initialDistance = get().metrics.angularDistance;
          const progress =
            initialDistance > 0 ? 1 - distanceToTarget / initialDistance : 1;

          set({
            currentQuaternion: quaternion,
            previousQuaternion: quaternion.clone(),
            previousTimestamp: now,
            metrics: {
              ...get().metrics,
              angularVelocity: velocity,
              slerpProgress: Math.min(progress, 1),
            },
          });
        },

        // ---------------------------------------------------------------------
        // UPDATE METRICS
        // ---------------------------------------------------------------------
        updateMetrics: () => {
          const { currentQuaternion, targetQuaternion } = get();
          const distance = calculateAngularDistance(
            currentQuaternion,
            targetQuaternion,
          );

          set({
            metrics: {
              ...get().metrics,
              angularDistance: distance,
            },
          });
        },

        // ---------------------------------------------------------------------
        // PREFERENCES
        // ---------------------------------------------------------------------
        setHapticMode: (mode) => {
          set({
            preferences: {
              ...get().preferences,
              hapticMode: mode,
            },
          });
        },

        setColorblindMode: (mode) => {
          set({
            preferences: {
              ...get().preferences,
              colorblindMode: mode,
            },
          });
        },

        setReducedMotion: (enabled) => {
          set({
            preferences: {
              ...get().preferences,
              reducedMotion: enabled,
            },
          });
        },

        toggleDebugMode: () => {
          set({
            preferences: {
              ...get().preferences,
              debugMode: !get().preferences.debugMode,
            },
          });
        },

        // ---------------------------------------------------------------------
        // RESET
        // ---------------------------------------------------------------------
        reset: () => {
          set({
            ...NEUTRAL_STATE,
            preferences: get().preferences, // Keep user preferences
          });
        },
      }),
      {
        name: "experience-storage",
        // Only persist user preferences
        partialize: (state) => ({ preferences: state.preferences }),
      },
    ),
    {
      name: "Experience Store",
    },
  ),
);

// ============================================================================
// SELECTORS (for optimized subscriptions)
// ============================================================================

export const selectTargetVAC = (state: ExperienceStore) => state.targetVAC;
export const selectCurrentVAC = (state: ExperienceStore) => state.currentVAC;
export const selectAngularVelocity = (state: ExperienceStore) =>
  state.metrics.angularVelocity;
export const selectHapticMode = (state: ExperienceStore) =>
  state.preferences.hapticMode;
export const selectColorblindMode = (state: ExperienceStore) =>
  state.preferences.colorblindMode;
```

## Using the Store in Components

### Selective Subscriptions

Only re-render when specific values change:

```typescript
function SoulSphere() {
  // Only re-render when targetVAC changes
  const targetVAC = useExperienceStore((state) => state.targetVAC);

  // Only re-render when colorblind mode changes
  const colorblindMode = useExperienceStore(
    (state) => state.preferences.colorblindMode,
  );

  // ... component logic
}
```

### Accessing Store Outside React

Access store state from `useFrame` (no subscription, no re-render):

```typescript
useFrame((state, delta) => {
  // Direct access without subscription
  const targetQuat = useExperienceStore.getState().targetQuaternion;
  const preferences = useExperienceStore.getState().preferences;

  // Update state without triggering re-render
  useExperienceStore.setState({
    currentQuaternion: meshRef.current.quaternion,
  });
});
```

### Batch Updates

Update multiple values efficiently:

```typescript
useExperienceStore.setState({
  currentVAC: [0.5, 0.3, 0.7],
  currentQuaternion: newQuat,
  metrics: { ...newMetrics },
});
```

## Middleware

### DevTools Integration

Zustand integrates with Redux DevTools for debugging:

```typescript
// Already configured in store definition
// Open Redux DevTools in browser to inspect state changes
```

**Features**:

- Time-travel debugging
- Action replay
- State diff view

### Persistence Middleware

User preferences are automatically persisted to AsyncStorage:

```typescript
// Configured with persist middleware
partialize: (state) => ({ preferences: state.preferences });
```

This ensures:

- Haptic mode persists across app restarts
- Colorblind mode is remembered
- Reduced motion preference is saved

### Custom Middleware: Logging

Add logging for development:

```typescript
const logMiddleware = (config) => (set, get, api) =>
  config(
    (args) => {
      console.log("State update:", args);
      set(args);
      console.log("New state:", get());
    },
    get,
    api,
  );

export const useExperienceStore = create(
  logMiddleware(
    devtools(
      persist(),
      // ... store definition
    ),
  ),
);
```

## Performance Patterns

### Transient Updates in Animation Loop

```typescript
function SoulSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Get current target (no subscription)
    const { targetQuaternion, targetVAC } = useExperienceStore.getState();

    // Animate
    meshRef.current.quaternion.slerp(targetQuaternion, delta * 2.0);

    // Update shader uniforms (no subscription)
    if (meshRef.current.material.uniforms) {
      meshRef.current.material.uniforms.uValence.value =
        THREE.MathUtils.lerp(
          meshRef.current.material.uniforms.uValence.value,
          targetVAC[0],
          delta * 2.0
        );
    }

    // Transient update (no re-render)
    useExperienceStore.setState({
      currentQuaternion: meshRef.current.quaternion.clone(),
    });
  });

  return <mesh ref={meshRef}>...</mesh>;
}
```

### Computed Values

Create derived state using selectors:

```typescript
// In store
const selectIsTransitioning = (state: ExperienceStore) =>
  state.metrics.angularVelocity > 0.5;

const selectEmotionalIntensity = (state: ExperienceStore) => {
  const [valence, arousal, connection] = state.currentVAC;
  return Math.sqrt(valence ** 2 + arousal ** 2 + connection ** 2);
};

// In component
const isTransitioning = useExperienceStore(selectIsTransitioning);
const intensity = useExperienceStore(selectEmotionalIntensity);
```

## Testing the Store

### Unit Tests

```typescript
import { renderHook, act } from "@testing-library/react-hooks";
import { useExperienceStore } from "./useExperienceStore";

describe("useExperienceStore", () => {
  beforeEach(() => {
    // Reset store
    useExperienceStore.getState().reset();
  });

  test("initializes with neutral state", () => {
    const { result } = renderHook(() => useExperienceStore());

    expect(result.current.currentVAC).toEqual([0, 0, 0]);
    expect(result.current.metrics.angularVelocity).toBe(0);
  });

  test("setTarget updates target state", () => {
    const { result } = renderHook(() => useExperienceStore());

    act(() => {
      result.current.setTarget([0.5, 0.7, 0.9], [1, 0, 0, 0]);
    });

    expect(result.current.targetVAC).toEqual([0.5, 0.7, 0.9]);
  });

  test("calculates angular distance correctly", () => {
    const store = useExperienceStore.getState();

    const q1 = new Quaternion(1, 0, 0, 0); // Identity
    const q2 = new Quaternion(0, 1, 0, 0); // 180° rotation

    store.currentQuaternion = q1;
    store.setTarget([0, 0, 0], [0, 1, 0, 0]);

    expect(store.metrics.angularDistance).toBeCloseTo(Math.PI, 2);
  });

  test("respects haptic mode setting", () => {
    const { result } = renderHook(() =>
      useExperienceStore((state) => state.preferences.hapticMode),
    );

    act(() => {
      useExperienceStore.getState().setHapticMode("quiet");
    });

    expect(result.current).toBe("quiet");
  });
});
```

### Integration Tests

```typescript
test('store updates trigger component re-renders selectively', () => {
  let renderCount = 0;

  function TestComponent() {
    const targetVAC = useExperienceStore(state => state.targetVAC);
    renderCount++;
    return <div>{targetVAC[0]}</div>;
  }

  const { rerender } = render(<TestComponent />);
  expect(renderCount).toBe(1);

  // Update unrelated state (should NOT re-render)
  act(() => {
    useExperienceStore.setState({
      metrics: { ...useExperienceStore.getState().metrics, slerpProgress: 0.5 }
    });
  });
  expect(renderCount).toBe(1); // No re-render

  // Update subscribed state (SHOULD re-render)
  act(() => {
    useExperienceStore.getState().setTarget([0.5, 0, 0], [1, 0, 0, 0]);
  });
  expect(renderCount).toBe(2); // Re-rendered
});
```

## Common Patterns

### Debounced State Updates

Prevent excessive updates from external APIs:

```typescript
import { debounce } from "lodash";

const debouncedSetTarget = debounce((vac, quat) => {
  useExperienceStore.getState().setTarget(vac, quat);
}, 100);

// Usage in API listener
websocket.on("versor-update", (data) => {
  debouncedSetTarget(data.vac, data.quaternion);
});
```

### Conditional Actions

Only update if value has changed significantly:

```typescript
function setTargetIfChanged(newVAC: VACTuple, threshold = 0.05) {
  const currentVAC = useExperienceStore.getState().targetVAC;

  const delta = Math.sqrt(
    Math.pow(newVAC[0] - currentVAC[0], 2) +
      Math.pow(newVAC[1] - currentVAC[1], 2) +
      Math.pow(newVAC[2] - currentVAC[2], 2),
  );

  if (delta > threshold) {
    useExperienceStore
      .getState()
      .setTarget(newVAC, calculateQuaternion(newVAC));
  }
}
```

## Next Steps

Now that you understand state management:

- **09-performance-optimization.md** - Optimize for 60fps rendering
- **10-api-integration.md** - Connect to Versor backend
