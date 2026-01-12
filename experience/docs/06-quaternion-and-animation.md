# Experience Module - Quaternion and Animation

## Overview

The Soul Sphere doesn't just change color and texture—it **rotates** through 3D space to represent emotional transitions. This rotation is not arbitrary; it is mathematically calculated by the Versor engine to represent the "shortest path" between emotional states.

This document explains:

- Why quaternions are used instead of Euler angles
- How SLERP creates smooth, constant-velocity rotations
- How to implement quaternion animation in React Three Fiber

## The Problem with Euler Angles

### What Are Euler Angles?

Euler angles represent 3D rotation using three separate values:

- **Pitch**: Rotation around X-axis (nodding up/down)
- **Yaw**: Rotation around Y-axis (shaking head left/right)
- **Roll**: Rotation around Z-axis (tilting head side-to-side)

```typescript
// Euler representation
const rotation = {
  x: 45, // 45° pitch
  y: 90, // 90° yaw
  z: 0, // 0° roll
};
```

### The Gimbal Lock Problem

When two axes align, you lose a degree of freedom. This is called **Gimbal Lock**.

**Visual Example**:

1. Rotate 90° around X-axis (pitch nose up)
2. Now Y-axis and Z-axis are parallel
3. You've lost the ability to distinguish between yaw and roll

**Emotional Metaphor**: Gimbal Lock represents being "stuck" in a state—trauma, flooding, or emotional paralysis where you can't "pivot" your perspective.

### Interpolation Problems

Linear interpolation (LERP) between Euler angles creates:

- ❌ Non-uniform rotation speeds (speeds up and slows down)
- ❌ Unexpected paths (may rotate 270° instead of 90°)
- ❌ Gimbal lock during transitions

## Quaternions: The Solution

### What is a Quaternion?

A quaternion is a **4-dimensional number** that represents rotation:

```
q = w + xi + yj + zk
```

Where:

- `w` is the scalar (real) part
- `x, y, z` are the vector (imaginary) parts
- `i, j, k` are imaginary units satisfying: i² = j² = k² = ijk = -1

**Don't panic!** You don't need to understand the math deeply—Three.js handles the calculations.

### Quaternion Representation in Code

```typescript
import { Quaternion } from "three";

// Create a quaternion
const q = new Quaternion(w, x, y, z);

// Or from axis-angle
const axis = new Vector3(0, 1, 0); // Y-axis
const angle = Math.PI / 2; // 90 degrees
const q2 = new Quaternion().setFromAxisAngle(axis, angle);
```

### Unit Quaternions

For rotation, we use **unit quaternions** where:

```
w² + x² + y² + z² = 1
```

This ensures the quaternion represents pure rotation without scaling.

## VAC to Quaternion Conversion

The Versor engine converts VAC values to quaternions. Here's a simplified version for understanding:

```typescript
function vacToQuaternion(
  valence: number,
  arousal: number,
  connection: number,
): Quaternion {
  // 1. Create axis from normalized VAC vector
  const axis = new Vector3(valence, arousal, connection);
  const magnitude = axis.length();

  if (magnitude < 0.001) {
    // Neutral state = identity quaternion
    return new Quaternion(1, 0, 0, 0);
  }

  // 2. Normalize axis
  axis.normalize();

  // 3. Calculate angle from magnitude
  // Map [0, √3] to [0, π]
  const maxMagnitude = Math.sqrt(3); // Maximum distance in unit cube
  const angle = (magnitude / maxMagnitude) * Math.PI;

  // 4. Create quaternion
  return new Quaternion().setFromAxisAngle(axis, angle);
}
```

**Example**:

```typescript
// Joy: [0.9, 0.7, 0.8]
const joyQuat = vacToQuaternion(0.9, 0.7, 0.8);
// Result: q ≈ [0.68, 0.50, 0.39, 0.45]

// Shame: [-0.9, -0.1, -1.0]
const shameQuat = vacToQuaternion(-0.9, -0.1, -1.0);
// Result: q ≈ [0.31, -0.66, -0.07, -0.73]
```

## SLERP: Spherical Linear Interpolation

### What is SLERP?

**SLERP** (Spherical Linear Interpolation) is a method of interpolating between two quaternions that:

- ✅ Follows the shortest path on a 4D hypersphere
- ✅ Maintains constant angular velocity
- ✅ Produces smooth, natural-looking rotations

### SLERP vs LERP

```
LERP: Cuts through the sphere (chord)
  start --------→ end

SLERP: Follows the surface (arc)
  start ~~~⌒~~→ end
```

LERP would cause:

- Variable rotation speed (faster in middle, slower at ends)
- Quaternion denormalization (scaling artifacts)

SLERP ensures:

- Constant rotation speed
- Always stays on unit sphere

### SLERP Formula

```
slerp(q1, q2, t) = (sin((1-t)Ω) / sin(Ω)) * q1 + (sin(tΩ) / sin(Ω)) * q2
```

Where:

- `t` = interpolation factor (0 to 1)
- `Ω` = angle between quaternions = arccos(q1 · q2)

**Fortunately**, Three.js implements this for us:

```typescript
const result = new Quaternion();
result.slerpQuaternions(q1, q2, t);

// Or mutate in-place
q1.slerp(q2, t);
```

## Implementation in React Three Fiber

### Basic Quaternion Animation

```typescript
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Quaternion } from 'three';

function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  // Target quaternion from Versor
  const targetQuat = new Quaternion(0.7, -0.3, 0.6, -0.1);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // SLERP toward target at 2x speed
    meshRef.current.quaternion.slerp(targetQuat, delta * 2.0);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 20]} />
      <meshStandardMaterial color="cyan" />
    </mesh>
  );
}
```

### Calculating Angular Distance

To determine "how far" the rotation is (for haptic feedback intensity):

```typescript
function angularDistance(q1: Quaternion, q2: Quaternion): number {
  // Dot product
  const dot = q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;

  // Angular distance in radians
  const angle = 2 * Math.acos(Math.abs(dot));

  return angle;
}

// Example
const anger = vacToQuaternion(-0.5, 0.8, -0.2);
const calm = vacToQuaternion(0.5, -0.7, 0.4);

const distance = angularDistance(anger, calm);
console.log(`Angular distance: ${distance * (180 / Math.PI)}°`);
// Output: Angular distance: 137.2°
```

### Angular Velocity

Angular velocity determines how "fast" the user is transitioning:

```typescript
function calculateAngularVelocity(
  currentQuat: Quaternion,
  previousQuat: Quaternion,
  deltaTime: number,
): number {
  const distance = angularDistance(currentQuat, previousQuat);
  const velocity = distance / deltaTime; // radians per second

  return velocity;
}

// Usage
const velocity = calculateAngularVelocity(currentQuat, prevQuat, 0.016); // ~60fps
if (velocity > 5.0) {
  console.log("High-velocity transition! Trigger heavy haptic.");
}
```

## Advanced Animation Techniques

### Easing Functions

For more expressive transitions, apply easing to the SLERP factor:

```typescript
// Ease-out cubic
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// In useFrame
const rawT = delta * 2.0;
const easedT = easeOutCubic(rawT);
meshRef.current.quaternion.slerp(targetQuat, easedT);
```

**Easing Options**:

- **Ease-in**: Slow start, fast end (building momentum)
- **Ease-out**: Fast start, slow end (settling into state)
- **Ease-in-out**: Slow at both ends (smooth, organic)

### Multi-Stage Transitions

For complex emotional journeys (e.g., Anger → Sadness → Acceptance):

```typescript
const path = [
  vacToQuaternion(-0.5, 0.8, -0.2), // Anger
  vacToQuaternion(-0.6, -0.4, 0.0), // Sadness
  vacToQuaternion(0.6, -0.2, 0.9), // Acceptance
];

let currentIndex = 0;
let progress = 0;

useFrame((state, delta) => {
  if (currentIndex >= path.length - 1) return;

  const current = path[currentIndex];
  const next = path[currentIndex + 1];

  // Interpolate
  const q = new Quaternion();
  q.slerpQuaternions(current, next, progress);
  meshRef.current.quaternion.copy(q);

  // Advance progress
  progress += delta * 0.5;

  if (progress >= 1.0) {
    progress = 0;
    currentIndex++;
  }
});
```

### Spring Physics

For more organic, physics-based animation:

```typescript
import { useSpring } from '@react-spring/three';

function SpringAnimatedSphere() {
  const [spring, setSpring] = useSpring(() => ({
    quaternion: [1, 0, 0, 0],
    config: { mass: 1, tension: 170, friction: 26 },
  }));

  // Update target
  useEffect(() => {
    const target = vacToQuaternion(valence, arousal, connection);
    setSpring({ quaternion: [target.w, target.x, target.y, target.z] });
  }, [valence, arousal, connection]);

  return (
    <animated.mesh quaternion={spring.quaternion}>
      <icosahedronGeometry args={[1, 20]} />
      <meshStandardMaterial />
    </animated.mesh>
  );
}
```

## Zustand Integration

### Store Setup

```typescript
// src/features/experience/store/useExperienceStore.ts

import { create } from "zustand";
import { Quaternion } from "three";

interface ExperienceStore {
  targetVAC: [number, number, number];
  targetQuaternion: Quaternion;
  currentQuaternion: Quaternion;
  previousQuaternion: Quaternion;
  angularVelocity: number;

  setTarget: (vac: [number, number, number], quat: Quaternion) => void;
  updateCurrent: (quat: Quaternion) => void;
}

export const useExperienceStore = create<ExperienceStore>((set, get) => ({
  targetVAC: [0, 0, 0],
  targetQuaternion: new Quaternion(1, 0, 0, 0),
  currentQuaternion: new Quaternion(1, 0, 0, 0),
  previousQuaternion: new Quaternion(1, 0, 0, 0),
  angularVelocity: 0,

  setTarget: (vac, quat) => set({ targetVAC: vac, targetQuaternion: quat }),

  updateCurrent: (quat) => {
    const prev = get().currentQuaternion.clone();
    set({
      currentQuaternion: quat,
      previousQuaternion: prev,
    });
  },
}));
```

### Component Usage

```typescript
function SoulSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetQuaternion = useExperienceStore(state => state.targetQuaternion);
  const updateCurrent = useExperienceStore(state => state.updateCurrent);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // SLERP
    meshRef.current.quaternion.slerp(targetQuaternion, delta * 2.0);

    // Update store (for haptic calculations)
    updateCurrent(meshRef.current.quaternion);
  });

  return <mesh ref={meshRef}>...</mesh>;
}
```

## Performance Considerations

### Avoiding Quaternion Churn

```typescript
// ❌ BAD: Creates new Quaternion every frame
useFrame(() => {
  const target = new Quaternion(w, x, y, z);
  mesh.quaternion.slerp(target, 0.1);
});

// ✅ GOOD: Reuse Quaternion object
const targetRef = useRef(new Quaternion());

useFrame(() => {
  targetRef.current.set(w, x, y, z);
  mesh.quaternion.slerp(targetRef.current, 0.1);
});
```

### Early Termination

Stop interpolation when target is reached:

```typescript
useFrame((state, delta) => {
  const distance = angularDistance(
    meshRef.current.quaternion,
    targetQuaternion,
  );

  if (distance < 0.001) {
    // Close enough—stop animating
    return;
  }

  meshRef.current.quaternion.slerp(targetQuaternion, delta * 2.0);
});
```

### Demand Rendering

```typescript
import { useThree } from '@react-three/fiber';

function SoulSphere() {
  const invalidate = useThree(state => state.invalidate);

  useFrame((state, delta) => {
    const distance = angularDistance(...);

    if (distance < 0.001) {
      // Stop rendering when idle
      return;
    }

    // Animate
    meshRef.current.quaternion.slerp(targetQuaternion, delta * 2.0);

    // Request next frame
    invalidate();
  });
}
```

## Debugging Quaternions

### Visualizing Orientation

```typescript
function QuaternionDebugger({ quaternion }: { quaternion: Quaternion }) {
  const axis = new Vector3();
  const angle = quaternion.angleTo(new Quaternion(1, 0, 0, 0));

  return (
    <Text position={[0, 2, 0]}>
      Angle: {(angle * 180 / Math.PI).toFixed(1)}°
    </Text>
  );
}
```

### Gimbal Lock Detection

```typescript
function detectGimbalLock(euler: Euler): boolean {
  // Check if any axis is near ±90°
  const threshold = Math.PI / 2 - 0.1;
  return (
    Math.abs(euler.x) > threshold ||
    Math.abs(euler.y) > threshold ||
    Math.abs(euler.z) > threshold
  );
}

// Verify quaternions never hit gimbal lock
const euler = new Euler().setFromQuaternion(quaternion);
if (detectGimbalLock(euler)) {
  console.warn("Would have gimbal lock with Euler!");
}
```

## Testing Rotations

### Unit Tests

```typescript
import { Quaternion } from "three";
import { angularDistance } from "./quaternion-utils";

describe("Quaternion Utils", () => {
  test("identity quaternion has zero distance from itself", () => {
    const q = new Quaternion(1, 0, 0, 0);
    expect(angularDistance(q, q)).toBeCloseTo(0, 5);
  });

  test("opposite quaternions have π distance", () => {
    const q1 = new Quaternion(1, 0, 0, 0);
    const q2 = new Quaternion(-1, 0, 0, 0);
    expect(angularDistance(q1, q2)).toBeCloseTo(Math.PI, 3);
  });

  test("SLERP maintains unit length", () => {
    const q1 = new Quaternion(0.7, 0.5, 0.3, 0.4).normalize();
    const q2 = new Quaternion(-0.3, 0.6, -0.5, 0.5).normalize();

    const result = new Quaternion();
    result.slerpQuaternions(q1, q2, 0.5);

    const length = Math.sqrt(
      result.w ** 2 + result.x ** 2 + result.y ** 2 + result.z ** 2,
    );
    expect(length).toBeCloseTo(1.0, 5);
  });
});
```

## Next Steps

Now that you understand quaternion animation:

- **07-haptic-feedback-system.md** - Sync vibration to rotation
- **08-state-management.md** - Complete Zustand implementation
