# Experience Module - Performance Optimization

## Overview

The Experience module must maintain **60fps** on mid-range mobile devices while:

- Rendering a high-poly 3D sphere (20,000+ vertices)
- Running custom vertex/fragment shaders
- Updating uniforms every frame
- Processing haptic feedback
- Managing state updates

This document provides concrete strategies for achieving production-grade performance.

## Performance Targets

### Target Metrics

| Device Class                      | Target FPS | Geometry Detail    | Shader Complexity         |
| --------------------------------- | ---------- | ------------------ | ------------------------- |
| High-end (iPhone 13+)             | 60fps      | 20 subdivisions    | Full (with normal recalc) |
| Mid-range (iPhone 11-12)          | 60fps      | 15-20 subdivisions | Standard                  |
| Low-end (iPhone X, older Android) | 30-60fps   | 10 subdivisions    | Simplified                |

### Monitoring Performance

```typescript
import { useFrame } from "@react-three/fiber";

function PerformanceMonitor() {
  const fpsHistory = useRef<number[]>([]);

  useFrame((state, delta) => {
    const fps = 1 / delta;
    fpsHistory.current.push(fps);

    // Keep last 60 frames
    if (fpsHistory.current.length > 60) {
      fpsHistory.current.shift();
    }

    // Calculate average
    const avgFps =
      fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;

    if (avgFps < 50) {
      console.warn(`Low FPS detected: ${avgFps.toFixed(1)}`);
    }
  });

  return null;
}
```

## React Three Fiber Optimization

### 1. On-Demand Rendering

**Problem**: Continuous rendering drains battery when nothing is changing.

**Solution**: Use `frameloop="demand"` and manually trigger renders.

```typescript
import { useThree } from '@react-three/fiber';

function App() {
  return (
    <Canvas frameloop="demand">
      <Scene />
    </Canvas>
  );
}

function Scene() {
  const invalidate = useThree(state => state.invalidate);

  useEffect(() => {
    const store = useExperienceStore.getState();

    // Watch for target changes
    const unsubscribe = useExperienceStore.subscribe(
      state => state.targetQuaternion,
      () => {
        invalidate(); // Trigger render
      }
    );

    return unsubscribe;
  }, [invalidate]);
}
```

**Result**: Render only during transitions, not when idle.

### 2. Memoization

**Problem**: React recreates objects on every render, causing garbage collection pressure.

**Solution**: Use `useMemo` for expensive object creation.

```typescript
function SoulSphere() {
  // ✅ GOOD: Geometry created once
  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(1.0, 20);
  }, []);

  // ✅ GOOD: Material created once
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uValence: { value: 0 },
        // ... other uniforms
      },
    });
  }, []);

  return <mesh geometry={geometry} material={material} />;
}
```

### 3. Avoid React State in Animation Loops

**Problem**: `useState` triggers re-renders 60 times per second.

**Solution**: Use refs and Zustand for animation state.

```typescript
// ❌ BAD
const [rotation, setRotation] = useState(0);
useFrame(() => {
  setRotation((prev) => prev + 0.01); // 60 re-renders per second
});

// ✅ GOOD
const rotationRef = useRef(0);
useFrame(() => {
  rotationRef.current += 0.01; // No re-renders
  meshRef.current.rotation.y = rotationRef.current;
});
```

### 4. Selective Subscriptions

**Problem**: Subscribing to the entire store causes unnecessary re-renders.

**Solution**: Use selectors to subscribe only to needed values.

```typescript
// ❌ BAD: Re-renders on ANY store change
const store = useExperienceStore();

// ✅ GOOD: Only re-renders when targetVAC changes
const targetVAC = useExperienceStore((state) => state.targetVAC);
```

## Shader Optimization

### 1. Precision Control

Mobile GPUs benefit from lower precision:

```glsl
// Use mediump instead of highp
precision mediump float;

// For uniforms that don't need high precision
uniform lowp float uTime;
uniform mediump vec3 uColor;
```

**Trade-off**: `highp` (32-bit) vs `mediump` (16-bit)

- High precision: Better for vertex positions
- Medium precision: Fine for colors, normals
- Low precision: Fine for time, flags

### 2. Minimize Branching

GPUs execute all branches then discard results (expensive).

```glsl
// ❌ BAD: Branching in fragment shader
if (uConnection > 0.0) {
  alpha = 0.5;
} else {
  alpha = 1.0;
}

// ✅ GOOD: Mathematical blend (no branching)
alpha = mix(1.0, 0.5, step(0.0, uConnection));
```

### 3. Simplify Noise Functions

For low-end devices, use cheaper noise:

```glsl
// Simple 1D noise (fast)
float hash(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

// Use instead of 3D simplex for low-end devices
float displacement = hash(position.x + uTime) * noiseAmp;
```

### 4. Texture Atlases

If using textures, combine them:

```typescript
// ❌ BAD: Multiple texture samplers
uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform sampler2D uTexture3;

// ✅ GOOD: Single atlas
uniform sampler2D uAtlas;
```

## Geometry Optimization

### 1. Adaptive Detail Level

Dynamically adjust geometry complexity:

```typescript
function getGeometryDetail(): number {
  const { platform } = Platform;
  const deviceYear = getDeviceYear(); // Custom function

  if (platform === "ios") {
    if (deviceYear >= 2020) return 20; // iPhone 12+
    if (deviceYear >= 2018) return 15; // iPhone X-11
    return 10; // Older
  }

  // Android: Conservative defaults
  if (deviceYear >= 2021) return 15;
  return 10;
}

const detail = getGeometryDetail();
const geometry = new THREE.IcosahedronGeometry(1.0, detail);
```

### 2. Instancing for History

If showing multiple spheres (history visualization):

```typescript
function HistorySpheres({ states }: { states: EmotionalState[] }) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!instancedMeshRef.current) return;

    const tempMatrix = new THREE.Matrix4();
    const tempQuaternion = new THREE.Quaternion();
    const tempColor = new THREE.Color();

    states.forEach((state, i) => {
      // Set transform
      tempQuaternion.set(...state.quaternion);
      tempMatrix.compose(
        new THREE.Vector3(i * 2, 0, 0), // Position
        tempQuaternion,
        new THREE.Vector3(0.5, 0.5, 0.5) // Scale
      );
      instancedMeshRef.current.setMatrixAt(i, tempMatrix);

      // Set color
      tempColor.setRGB(state.vac[0], 0.5, state.vac[2]);
      instancedMeshRef.current.setColorAt(i, tempColor);
    });

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    instancedMeshRef.current.instanceColor.needsUpdate = true;
  }, [states]);

  return (
    <instancedMesh ref={instancedMeshRef} args={[null, null, states.length]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}
```

**Benefit**: Render 1000 spheres in a single draw call.

### 3. Level of Detail (LOD)

Switch geometry based on camera distance:

```typescript
import { LOD } from "three";

const lod = new LOD();
lod.addLevel(highPolyMesh, 0); // 0-5 units
lod.addLevel(midPolyMesh, 5); // 5-10 units
lod.addLevel(lowPolyMesh, 10); // 10+ units
```

## Memory Management

### 1. Dispose Resources

Prevent memory leaks by cleaning up Three.js objects:

```typescript
useEffect(() => {
  const geometry = new THREE.IcosahedronGeometry(1, 20);
  const material = new THREE.ShaderMaterial({
    /* ... */
  });

  return () => {
    geometry.dispose();
    material.dispose();
  };
}, []);
```

### 2. Texture Compression

Use KTX2 for environment maps:

```typescript
import { useKTX2 } from '@react-three/drei';

function Environment() {
  const texture = useKTX2('/textures/environment.ktx2');

  return <mesh>
    <sphereGeometry args={[100, 32, 32]} />
    <meshBasicMaterial map={texture} side={THREE.BackSide} />
  </mesh>;
}
```

**Benefit**: 70% smaller than PNG, GPU-decoded.

### 3. Object Pooling

Reuse objects instead of creating new ones:

```typescript
class QuaternionPool {
  private pool: Quaternion[] = [];

  acquire(): Quaternion {
    return this.pool.pop() || new Quaternion();
  }

  release(q: Quaternion) {
    q.set(1, 0, 0, 0); // Reset
    this.pool.push(q);
  }
}

const quatPool = new QuaternionPool();

// Usage
const temp = quatPool.acquire();
// ... use temp
quatPool.release(temp);
```

## JavaScript Performance

### 1. Avoid Allocations in Hot Paths

```typescript
// ❌ BAD: Creates new array every frame
useFrame(() => {
  const target = [vac[0], vac[1], vac[2]];
  updateShader(target);
});

// ✅ GOOD: Reuse array
const targetRef = useRef([0, 0, 0]);
useFrame(() => {
  targetRef.current[0] = vac[0];
  targetRef.current[1] = vac[1];
  targetRef.current[2] = vac[2];
  updateShader(targetRef.current);
});
```

### 2. Debounce Non-Critical Updates

```typescript
import { debounce } from "lodash";

const updateMetrics = debounce(() => {
  useExperienceStore.getState().updateMetrics();
}, 100);
```

### 3. Use Web Workers for Heavy Computation

For complex calculations (e.g., path generation):

```typescript
// worker.ts
self.onmessage = (e) => {
  const { startQuat, endQuat, steps } = e.data;
  const path = generateSlerpPath(startQuat, endQuat, steps);
  self.postMessage(path);
};

// main thread
const worker = new Worker("./worker.ts");
worker.postMessage({ startQuat, endQuat, steps: 100 });
worker.onmessage = (e) => {
  const path = e.data;
  // Use path
};
```

## Platform-Specific Optimizations

### iOS

```typescript
import { Platform } from "react-native";

if (Platform.OS === "ios") {
  // Use Metal-specific optimizations
  gl.getExtension("WEBGL_compressed_texture_astc");

  // Enable high-performance mode
  gl.powerPreference = "high-performance";
}
```

### Android

```typescript
if (Platform.OS === "android") {
  // Reduce texture quality on low-end devices
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  if (maxTextureSize < 4096) {
    // Use lower-res textures
  }

  // Disable antialiasing on weak GPUs
  if (isLowEndDevice()) {
    gl.antialias = false;
  }
}
```

## Thermal Management

### 1. Throttle During Idle

```typescript
let idleTime = 0;
const IDLE_THRESHOLD = 5000; // 5 seconds

useFrame((state, delta) => {
  const velocity = useExperienceStore.getState().metrics.angularVelocity;

  if (velocity < 0.01) {
    idleTime += delta * 1000;
  } else {
    idleTime = 0;
  }

  // Reduce update frequency when idle
  if (idleTime > IDLE_THRESHOLD) {
    if (state.clock.elapsedTime % 0.5 < delta) {
      // Only update every 500ms
      updateSphere();
    }
  } else {
    updateSphere();
  }
});
```

### 2. Reduce Complexity on Overheating

```typescript
function detectThermalState(): "nominal" | "fair" | "serious" | "critical" {
  // iOS: Use ProcessInfo.thermalState (native module)
  // Android: Monitor CPU temp
  return "nominal";
}

useEffect(() => {
  const thermalState = detectThermalState();

  if (thermalState === "serious" || thermalState === "critical") {
    // Reduce geometry detail
    setGeometryDetail(10);
    // Simplify shaders
    disableNormalRecalculation();
  }
}, []);
```

## Profiling Tools

### React DevTools Profiler

```typescript
import { Profiler } from 'react';

<Profiler id="SoulSphere" onRender={onRenderCallback}>
  <SoulSphere />
</Profiler>

function onRenderCallback(
  id, phase, actualDuration, baseDuration, startTime, commitTime
) {
  console.log(`${id} took ${actualDuration}ms to render`);
}
```

### Chrome DevTools

1. Open dev tools → Performance tab
2. Record 3D rendering session
3. Look for:
   - Long frames (>16ms)
   - Scripting bottlenecks
   - Rendering bottlenecks
   - GPU activity

### Flipper (React Native)

```bash
npx react-native-flipper
```

Provides:

- Frame rate monitoring
- Memory usage
- Network activity
- Redux DevTools

## Performance Checklist

Before release, verify:

- [ ] Maintains 60fps on iPhone 11 with full detail
- [ ] Maintains 30fps on iPhone X with reduced detail
- [ ] No memory leaks (run for 10+ minutes)
- [ ] Battery drain < 10% per hour of active use
- [ ] No thermal throttling during normal use
- [ ] Shader compilation succeeds on all devices
- [ ] Geometry switches correctly based on device
- [ ] On-demand rendering activates when idle
- [ ] Haptics don't cause frame drops

## Next Steps

Now that you understand performance optimization:

- **10-api-integration.md** - Connect to Versor backend
- **11-development-roadmap.md** - Implementation phases
