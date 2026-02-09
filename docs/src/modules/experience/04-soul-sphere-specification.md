# Experience Module - Soul Sphere Specification

## Overview

The **Soul Sphere** is the central visual component of the Experience module. It is not a static 3D model imported from design software—it is a **procedurally generated mesh** that morphs in real-time based on the user's emotional state.

The sphere's visual language is derived from the VAC model:

- **Color** represents Valence (emotional tone)
- **Geometry** represents Arousal (energy level)
- **Opacity/Glow** represents Connection (relational alignment)

## Design Philosophy

### Not a Dashboard, But an Instrument

Traditional emotion tracking apps display bar charts and line graphs. The Soul Sphere is fundamentally different:

- **Metaphor**: The sphere represents the **self** in emotional space
- **Rotation**: Represents the **work** of emotional transitions
- **Texture**: Represents the **energy** of the current state
- **Luminosity**: Represents the **openness** of connection

The user doesn't read data from the Soul Sphere—they **feel** it.

## Geometry Strategy

### Why Icosahedron over Standard Sphere?

A standard `SphereGeometry` in Three.js creates a grid of latitude/longitude quads. This results in:

- ❌ UV pinching at poles
- ❌ Uneven triangle distribution
- ❌ Visual artifacts during vertex displacement

An **IcosahedronGeometry** provides:

- ✅ Uniform triangulation across the entire surface
- ✅ Isotropic noise displacement (no polar distortion)
- ✅ Clean tessellation when subdivided

### Geometry Configuration

```typescript
import * as THREE from 'three';

const geometry = new THREE.IcosahedronGeometry(
  1.0,  // radius
  20    // subdivision detail
);
```

**Parameters**:

- **Radius**: `1.0` (unit sphere, scaled by parent group if needed)
- **Detail**: `20` subdivisions creates ~20,000+ triangles
  - iPhone 11 (A13): Can handle detail=20 at 60fps
  - Older devices: Fallback to detail=10 (~2,500 triangles)

### Low-Poly Fallback

For devices with weak GPUs, implement a performance check:

```typescript
const isLowPowerDevice = () => {
  const gl = GLView.createContextAsync();
  const renderer = gl.getParameter(gl.RENDERER);

  // Check for low-end chips
  const lowEndPatterns = ['Adreno 505', 'Mali-T720', 'PowerVR GT7600'];
  return lowEndPatterns.some(pattern => renderer.includes(pattern));
};

const detail = isLowPowerDevice() ? 10 : 20;
```

## Material System

### Custom Shader Material

The Soul Sphere uses a **custom ShaderMaterial** rather than built-in materials (MeshStandardMaterial, MeshPhysicalMaterial) because:

1. **Vertex Displacement**: We need to displace vertices based on noise
2. **Dynamic Normals**: Normals must be recalculated after displacement
3. **Fresnel Effect**: Custom glow requires view-direction calculations
4. **Performance**: No unnecessary PBR calculations on mobile

### Material Definition

```typescript
import { ShaderMaterial } from 'three';
import vertexShader from '../shaders/vertex.glsl';
import fragmentShader from '../shaders/fragment.glsl';

const material = new ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    // Time for animation
    uTime: { value: 0.0 },

    // VAC Inputs
    uValence: { value: 0.0 },    // -1.0 to 1.0
    uArousal: { value: 0.0 },    // -1.0 to 1.0
    uConnection: { value: 0.0 }, // -1.0 to 1.0

    // Color Palette
    uColorNeg: { value: new THREE.Color(0x8B0000) }, // Crimson
    uColorPos: { value: new THREE.Color(0x00FFFF) }, // Cyan

    // Camera for Fresnel
    uCameraPosition: { value: new THREE.Vector3() },
  },
  transparent: true,
  side: THREE.DoubleSide, // Render both sides for translucent effect
});
```

## Visual Mapping Rules

### 1. Valence → Color (Fragment Shader)

**Mapping**:

- Valence = -1.0: Deep Crimson (#8B0000)
- Valence = 0.0: Neutral Gray (#808080)
- Valence = +1.0: Bright Cyan (#00FFFF)

**Color Palette**:

| Valence Range | Primary Color | Hex | RGB |
|---------------|---------------|-----|-----|
| -1.0 to -0.7 | Deep Crimson | #8B0000 | (139, 0, 0) |
| -0.7 to -0.3 | Burgundy | #800020 | (128, 0, 32) |
| -0.3 to +0.3 | Slate Gray | #708090 | (112, 128, 144) |
| +0.3 to +0.7 | Teal | #008080 | (0, 128, 128) |
| +0.7 to +1.0 | Cyan | #00FFFF | (0, 255, 255) |

**Shader Implementation**:

```glsl
float mixFactor = (uValence + 1.0) * 0.5; // Remap [-1,1] to [0,1]
vec3 baseColor = mix(uColorNeg, uColorPos, smoothstep(-1.0, 1.0, uValence));
```

**Smoothstep** ensures gradual transitions rather than linear jumps.

### 2. Arousal → Vertex Displacement (Vertex Shader)

**Mapping**:

- Arousal = -1.0: Perfectly smooth sphere (no displacement)
- Arousal = 0.0: Minimal waviness
- Arousal = +1.0: Highly chaotic, spiky surface

**Displacement Algorithm**:

The vertex shader applies **3D Simplex Noise** to each vertex position:

```glsl
// Calculate noise frequency and amplitude based on arousal
float noiseFreq = 1.5 + (abs(uArousal) * 2.0);
float noiseAmp = 0.2 * abs(uArousal);

// Sample 3D noise at vertex position
vec3 noisePos = position * noiseFreq + vec3(uTime * 0.1);
float noiseValue = snoise3(noisePos);

// Displace along normal
vec3 displaced = position + normal * (noiseValue * noiseAmp);
```

**Visual Effect**:

- **Low Arousal** (Calm, Contentment): Smooth, meditative surface
- **High Arousal** (Excitement, Panic): Vibrating, turbulent surface

**Time Animation**: The `uTime` uniform slowly advances, causing the noise pattern to "breathe" or "pulse."

### 3. Connection → Fresnel Glow (Fragment Shader)

**Mapping**:

- Connection = -1.0: Opaque, solid, dull (like stone)
- Connection = 0.0: Semi-transparent
- Connection = +1.0: Translucent, radiant glow (like light)

**Fresnel Effect Explained**:

The Fresnel effect makes surfaces more transparent when viewed head-on, and more opaque/glowing at grazing angles (edges).

This mimics how:

- **Water** is transparent looking straight down, reflective at shallow angles
- **Glass** is invisible head-on, but edges glow
- **Forcefields** in sci-fi are transparent in the center, bright at the rim

**Implementation**:

```glsl
// Calculate view direction
vec3 viewDir = normalize(uCameraPosition - vWorldPosition);

// Dot product of view and normal (1.0 = head-on, 0.0 = edge)
float fresnel = dot(viewDir, vNormal);

// Invert: 0.0 at center, 1.0 at edges
fresnel = 1.0 - fresnel;

// Power curve for sharper edge glow
fresnel = pow(fresnel, 2.0);

// Scale by connection
float glowIntensity = fresnel * (uConnection + 1.2);
```

**Alpha Blending**:

```glsl
float alpha = 1.0;
if (uConnection > 0.0) {
  // High connection = more transparent
  alpha = 0.9 - (uConnection * 0.5) + fresnel;
} else {
  // Low connection = opaque
  alpha = 1.0;
}
```

**Result**:

- **Loneliness/Shame**: Dark, solid, heavy object
- **Love/Compassion**: Glowing, ethereal, light-emitting sphere

## Component Structure

### TypeScript Component

```typescript
// src/features/experience/components/SoulSphere/index.tsx

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperienceStore } from '../../store/useExperienceStore';
import vertexShader from '../../shaders/vertex.glsl';
import fragmentShader from '../../shaders/fragment.glsl';

export const SoulSphere: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Subscribe to target values from Zustand store
  const targetVAC = useExperienceStore(state => state.targetVAC);
  const targetQuaternion = useExperienceStore(state => state.targetQuaternion);

  // Create geometry (memoized to prevent recreation)
  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(1.0, 20);
  }, []);

  // Create material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uValence: { value: 0.0 },
        uArousal: { value: 0.0 },
        uConnection: { value: 0.0 },
        uColorNeg: { value: new THREE.Color(0x8B0000) },
        uColorPos: { value: new THREE.Color(0x00FFFF) },
        uCameraPosition: { value: new THREE.Vector3() },
      },
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  // Animation loop
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    // Update time uniform
    materialRef.current.uniforms.uTime.value += delta;

    // Update camera position for Fresnel
    materialRef.current.uniforms.uCameraPosition.value.copy(state.camera.position);

    // Interpolate VAC values toward target
    const lerpSpeed = delta * 2.0; // Adjust for smoothness

    materialRef.current.uniforms.uValence.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uValence.value,
      targetVAC[0],
      lerpSpeed
    );

    materialRef.current.uniforms.uArousal.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uArousal.value,
      targetVAC[1],
      lerpSpeed
    );

    materialRef.current.uniforms.uConnection.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uConnection.value,
      targetVAC[2],
      lerpSpeed
    );

    // SLERP quaternion rotation
    const targetQuat = new THREE.Quaternion(...targetQuaternion);
    meshRef.current.quaternion.slerp(targetQuat, lerpSpeed);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  );
};
```

## Scene Setup

### Canvas Configuration

```typescript
// App.tsx or main scene component

import { Canvas } from '@react-three/fiber/native';
import { SoulSphere } from './features/experience/components/SoulSphere';

export default function App() {
  return (
    <Canvas
      frameloop="demand" // Only render when needed
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ antialias: true }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.4} color="#8B0000" />

      {/* The Soul Sphere */}
      <SoulSphere />
    </Canvas>
  );
}
```

### Lighting Strategy

The Soul Sphere requires careful lighting:

1. **Ambient Light** (0.3 intensity): Ensures the sphere is never completely black
2. **Primary Point Light** (white, front): Main illumination
3. **Rim Light** (crimson, back): Adds depth and drama for negative states

**Avoid**:

- ❌ Directional lights (too harsh for emotional visualization)
- ❌ Spotlights (create unintended focal points)
- ❌ Hemisphere lights (flatten the form)

## Performance Considerations

### Geometry Detail Scaling

```typescript
const getDetailLevel = () => {
  const { platform } = Platform;
  const { model } = DeviceInfo;

  if (platform === 'ios') {
    // iPhone 11+ can handle high detail
    if (model.includes('iPhone13') || model.includes('iPhone14')) return 20;
    if (model.includes('iPhone11') || model.includes('iPhone12')) return 15;
    return 10; // Older devices
  }

  // Android: Conservative defaults
  return 10;
};
```

### Frame Loop Optimization

The `useFrame` hook runs every frame (ideally 60fps). Optimize by:

1. **Direct Mutation**: Mutate `meshRef.current` properties directly (no React re-renders)
2. **Selective Updates**: Only update uniforms when target values change
3. **Throttling**: Use `frameloop="demand"` and manually call `invalidate()`

```typescript
// Only render during transitions
useEffect(() => {
  if (isTransitioning) {
    invalidate(); // Trigger render
  }
}, [isTransitioning]);
```

## Accessibility Features

### Colorblind Mode

For users with deuteranopia (red-green colorblindness), replace the crimson-cyan palette with blue-orange:

```typescript
const colorblindMode = useExperienceStore(state => state.colorblindMode);

const [negColor, posColor] = colorblindMode
  ? [new THREE.Color(0x0000FF), new THREE.Color(0xFF8C00)] // Blue-Orange
  : [new THREE.Color(0x8B0000), new THREE.Color(0x00FFFF)]; // Crimson-Cyan
```

### Reduced Motion Mode

For users with vestibular disorders, reduce rotation speed:

```typescript
const reducedMotion = useExperienceStore(state => state.reducedMotion);

const lerpSpeed = reducedMotion ? delta * 0.5 : delta * 2.0;
```

## Testing Scenarios

### Test Vector: Joy

```typescript
setTarget([0.9, 0.7, 0.8], calculateQuaternion([0.9, 0.7, 0.8]));
```

**Expected Result**:

- Bright cyan color
- Moderately spiky surface (high energy)
- Radiant glow (high connection)

### Test Vector: Shame

```typescript
setTarget([-0.9, -0.1, -1.0], calculateQuaternion([-0.9, -0.1, -1.0]));
```

**Expected Result**:

- Deep crimson/dark color
- Smooth surface (low energy)
- Opaque, heavy appearance (no glow)

### Test Vector: Grief

```typescript
setTarget([-0.9, -0.4, 0.5], calculateQuaternion([-0.9, -0.4, 0.5]));
```

**Expected Result**:

- Crimson color (negative valence)
- Relatively smooth (low arousal)
- **Subtle glow** (positive connection despite pain)

This is the visual signature that distinguishes grief from despair.

## Next Steps

Now that you understand the Soul Sphere specification:

- **05-shader-implementation.md** - See the complete GLSL shader code
- **06-quaternion-and-animation.md** - Learn how rotations work
