# Experience Module - Shader Implementation

## Overview

The Soul Sphere's visual effects are achieved through **custom GLSL shaders**. These shaders run directly on the GPU, allowing for real-time vertex displacement and dynamic lighting effects at 60fps on mobile devices.

This document provides the complete, production-ready shader code along with detailed explanations of each technique.

## GLSL Fundamentals

### What is GLSL?

**GLSL** (OpenGL Shading Language) is a C-like language that runs on the GPU. It processes vertices and pixels in parallel, making it extremely fast for graphical computations.

### The Shader Pipeline

```
Vertex Shader → Rasterization → Fragment Shader → Screen
```

1. **Vertex Shader**: Processes each vertex of the geometry (position, displacement)
2. **Rasterization**: GPU interpolates between vertices to create fragments (pixels)
3. **Fragment Shader**: Processes each pixel (color, transparency, lighting)

## Vertex Shader: Arousal Displacement

The vertex shader is responsible for:

1. Displacing vertices along their normals based on Arousal
2. Using 3D Simplex Noise for organic, turbulent surfaces
3. Animating the displacement over time

### Complete Vertex Shader Code

**File**: `src/features/experience/shaders/vertex.glsl`

```glsl
// Vertex Shader - Soul Sphere Arousal Displacement

precision mediump float;

// ============================================================================
// UNIFORMS (Set from JavaScript)
// ============================================================================

uniform float uTime;      // Animation time
uniform float uArousal;   // -1.0 to 1.0 (Arousal level)

// ============================================================================
// ATTRIBUTES (Built-in Three.js)
// ============================================================================

// position: vec3 - Vertex position
// normal: vec3 - Vertex normal
// uv: vec2 - Texture coordinates

// ============================================================================
// VARYINGS (Passed to Fragment Shader)
// ============================================================================

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vDisplacement; // Amount of displacement (for coloring peaks)

// ============================================================================
// SIMPLEX NOISE FUNCTION
// ============================================================================

//
// Description : Array and textureless GLSL 2D/3D/4D simplex
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License.
//

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  // Permutations
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  // Gradients
  float n_ = 0.142857142857; // 1.0/7.0
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// ============================================================================
// MAIN VERTEX SHADER
// ============================================================================

void main() {
  // Pass UVs to fragment shader
  vUv = uv;

  // Start with base position
  vec3 pos = position;

  // -------------------------------------------------------------------------
  // AROUSAL-BASED DISPLACEMENT
  // -------------------------------------------------------------------------

  // Map arousal to noise parameters
  // High arousal = high frequency, high amplitude (chaotic, spiky)
  // Low arousal = low frequency, low amplitude (smooth, calm)

  float arousalAbs = abs(uArousal); // Use absolute value (energy is energy)

  // Frequency: How "busy" the noise is
  // Range: 1.5 (calm) to 3.5 (chaotic)
  float noiseFreq = 1.5 + (arousalAbs * 2.0);

  // Amplitude: How far vertices are displaced
  // Range: 0.0 (smooth sphere) to 0.2 (20% of radius)
  float noiseAmp = 0.2 * arousalAbs;

  // Time offset for animation (slow breathing effect)
  float timeOffset = uTime * 0.1;

  // Sample 3D noise at this vertex's position
  vec3 noisePos = vec3(
    pos.x * noiseFreq + timeOffset,
    pos.y * noiseFreq,
    pos.z * noiseFreq
  );

  float noiseValue = snoise(noisePos);

  // Calculate displacement amount
  float displacement = noiseValue * noiseAmp;

  // Displace vertex along its normal
  pos += normal * displacement;

  // Store displacement for fragment shader (to highlight peaks)
  vDisplacement = displacement;

  // -------------------------------------------------------------------------
  // TRANSFORM TO SCREEN SPACE
  // -------------------------------------------------------------------------

  // Calculate world position (before projection)
  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPosition.xyz;

  // Transform normal to world space
  vNormal = normalize(normalMatrix * normal);

  // Final position (MVP transform)
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

### Vertex Shader Explanation

#### Noise Parameters

```glsl
float noiseFreq = 1.5 + (arousalAbs * 2.0);
float noiseAmp = 0.2 * arousalAbs;
```

- **Low Arousal** (Calm): `noiseFreq = 1.5`, `noiseAmp ≈ 0.0` → Smooth sphere
- **High Arousal** (Panic): `noiseFreq = 3.5`, `noiseAmp = 0.2` → Chaotic surface

#### Time Animation

```glsl
float timeOffset = uTime * 0.1;
```

Multiplying by `0.1` creates a slow "breathing" effect. The noise pattern evolves organically over time, preventing a static, frozen appearance.

#### Displacement Direction

```glsl
pos += normal * displacement;
```

Vertices are pushed **along their normal** (perpendicular to the surface). This maintains the spherical shape while adding texture.

## Fragment Shader: Color and Glow

The fragment shader is responsible for:

1. Mapping Valence to color (crimson to cyan gradient)
2. Creating the Fresnel glow effect based on Connection
3. Adding highlights to displaced peaks (Arousal feedback)
4. Calculating alpha transparency

### Complete Fragment Shader Code

**File**: `src/features/experience/shaders/fragment.glsl`

```glsl
// Fragment Shader - Soul Sphere Color and Glow

precision mediump float;

// ============================================================================
// UNIFORMS (Set from JavaScript)
// ============================================================================

uniform float uValence;     // -1.0 to 1.0 (Emotional tone)
uniform float uConnection;  // -1.0 to 1.0 (Relational alignment)
uniform vec3 uColorNeg;     // Negative valence color (Crimson)
uniform vec3 uColorPos;     // Positive valence color (Cyan)
uniform vec3 uCameraPosition; // Camera position for Fresnel

// ============================================================================
// VARYINGS (From Vertex Shader)
// ============================================================================

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vDisplacement;

// ============================================================================
// MAIN FRAGMENT SHADER
// ============================================================================

void main() {

  // -------------------------------------------------------------------------
  // 1. VALENCE MAPPING (COLOR)
  // -------------------------------------------------------------------------

  // Remap valence from [-1, 1] to [0, 1] for mixing
  float mixFactor = (uValence + 1.0) * 0.5;

  // Use smoothstep for non-linear, more pleasing transition
  float smoothMix = smoothstep(-1.0, 1.0, uValence);

  // Interpolate between negative and positive colors
  vec3 baseColor = mix(uColorNeg, uColorPos, smoothMix);

  // -------------------------------------------------------------------------
  // 2. AROUSAL HIGHLIGHTS (PEAK BRIGHTNESS)
  // -------------------------------------------------------------------------

  // Brighten displaced peaks for visual feedback
  // Positive displacement = peaks (bright)
  // Negative displacement = valleys (darker)
  float peakHighlight = vDisplacement * 2.0;
  baseColor += vec3(peakHighlight * 0.3); // Subtle brightening

  // -------------------------------------------------------------------------
  // 3. CONNECTION MAPPING (FRESNEL GLOW)
  // -------------------------------------------------------------------------

  // Normalize vectors
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(uCameraPosition - vWorldPosition);

  // Calculate Fresnel term
  // Dot product: 1.0 when looking directly at surface, 0.0 at edges
  float fresnelDot = dot(viewDir, normal);

  // Invert: 0.0 at center, 1.0 at edges
  float fresnelTerm = 1.0 - fresnelDot;

  // Apply power curve for sharper edge glow
  fresnelTerm = pow(fresnelTerm, 2.0);

  // Clamp to prevent oversaturation
  fresnelTerm = clamp(fresnelTerm, 0.0, 1.0);

  // Scale by connection level
  // High connection = strong glow
  // Low connection = no glow
  float glowIntensity = fresnelTerm * (uConnection + 1.2);

  // Glow color (ethereal blue-white)
  vec3 glowColor = vec3(0.8, 0.9, 1.0);

  // Add glow to base color
  vec3 finalColor = baseColor + (glowColor * glowIntensity * 0.5);

  // -------------------------------------------------------------------------
  // 4. ALPHA (TRANSPARENCY)
  // -------------------------------------------------------------------------

  float alpha = 1.0;

  if (uConnection > 0.0) {
    // High connection = more transparent (ethereal)
    // But edges remain visible due to Fresnel
    alpha = 0.9 - (uConnection * 0.5) + (fresnelTerm * 0.3);
  } else {
    // Low/negative connection = opaque (solid, heavy)
    alpha = 1.0;
  }

  // Clamp alpha to valid range
  alpha = clamp(alpha, 0.1, 1.0); // Never fully transparent

  // -------------------------------------------------------------------------
  // 5. OUTPUT
  // -------------------------------------------------------------------------

  gl_FragColor = vec4(finalColor, alpha);
}
```

### Fragment Shader Explanation

#### Valence Color Mixing

```glsl
float smoothMix = smoothstep(-1.0, 1.0, uValence);
vec3 baseColor = mix(uColorNeg, uColorPos, smoothMix);
```

`smoothstep()` creates an S-curve transition, making color changes feel more organic than linear interpolation.

#### Peak Highlighting

```glsl
float peakHighlight = vDisplacement * 2.0;
baseColor += vec3(peakHighlight * 0.3);
```

Vertices that are displaced **outward** (peaks) are brightened. This gives the high-arousal sphere a glowing, energetic quality.

#### Fresnel Calculation

```glsl
float fresnelDot = dot(viewDir, normal);
float fresnelTerm = 1.0 - fresnelDot;
fresnelTerm = pow(fresnelTerm, 2.0);
```

The **power of 2** creates a sharper falloff. Higher powers (3.0, 4.0) would make the glow even more concentrated at edges.

#### Connection-Based Transparency

```glsl
if (uConnection > 0.0) {
  alpha = 0.9 - (uConnection * 0.5) + (fresnelTerm * 0.3);
}
```

- Base transparency increases with Connection
- Fresnel adds back opacity at edges (ensures visibility)
- Result: High Connection creates a "forcefield" or "spirit" appearance

## Advanced Techniques

### Normal Recalculation (Optional Enhancement)

The provided shaders use the **original normals** for lighting. For ultra-high fidelity, you can recalculate normals after displacement.

**Method**: Sample noise at neighboring vertices to construct a tangent plane.

```glsl
// In vertex shader (performance intensive!)
float offset = 0.01;
vec3 tangent = vec3(offset, 0.0, 0.0);
vec3 bitangent = vec3(0.0, offset, 0.0);

float noiseCenter = snoise(noisePos);
float noiseTangent = snoise(noisePos + tangent * noiseFreq);
float noiseBitangent = snoise(noisePos + bitangent * noiseFreq);

vec3 newNormal = cross(
  tangent + normal * (noiseTangent - noiseCenter),
  bitangent + normal * (noiseBitangent - noiseCenter)
);
vNormal = normalize(newNormal);
```

⚠️ **Warning**: This triples the noise calculations per vertex. Only use on high-end devices.

### Chromatic Aberration (Bittersweetness)

For complex emotional states like "Bittersweetness," add chromatic splitting:

```glsl
// In fragment shader
vec2 offset = vUv * 0.01;
float r = texture2D(uTexture, vUv + offset).r;
float g = texture2D(uTexture, vUv).g;
float b = texture2D(uTexture, vUv - offset).b;
vec3 color = vec3(r, g, b);
```

This separates red/blue channels, creating a "bittersweet" visual effect.

### Voronoi Noise (Alternative to Simplex)

For a more "crystalline" texture (e.g., for states like "Defensiveness"):

```glsl
// Voronoi cell noise (creates faceted appearance)
float voronoi(vec3 p) {
  vec3 cell = floor(p);
  float minDist = 1.0;

  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 neighbor = cell + vec3(x, y, z);
        vec3 point = neighbor + hash3(neighbor);
        float dist = length(point - p);
        minDist = min(minDist, dist);
      }
    }
  }

  return minDist;
}
```

## Performance Optimization

### Mobile GPU Considerations

1. **Precision**: Use `mediump` instead of `highp` (better performance, acceptable quality)
2. **Avoid Branching**: Minimize `if` statements in shaders
3. **Precompute**: Calculate constant values in JavaScript, pass as uniforms
4. **Texture Atlases**: If using textures, combine into a single atlas

### Shader Compilation Checking

```typescript
const checkShaderCompilation = (shader: THREE.Shader) => {
  const gl = renderer.getContext();

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
  }
};
```

## Testing Shaders

### Shader Playground

Test shaders in isolation using:

- **ShaderToy**: https://www.shadertoy.com/
- **GLSL Sandbox**: http://glslsandbox.com/

### Visual Regression Testing

Capture screenshots at canonical VAC values and compare:

```typescript
const testCases = [
  { name: "joy", vac: [0.9, 0.7, 0.8] },
  { name: "shame", vac: [-0.9, -0.1, -1.0] },
  { name: "grief", vac: [-0.9, -0.4, 0.5] },
];

testCases.forEach(({ name, vac }) => {
  setVAC(vac);
  captureScreenshot(`./tests/snapshots/${name}.png`);
});
```

## Troubleshooting

### Black Screen

**Cause**: Shader compilation error.
**Solution**: Check browser console for GLSL errors.

### Flat Appearance (No Displacement)

**Cause**: `uArousal` is not being updated.
**Solution**: Verify uniform updates in `useFrame`.

### Glow Not Visible

**Cause**: `uCameraPosition` not updated.
**Solution**: Ensure camera position is passed to shader each frame.

### Performance Drops

**Cause**: Too many vertices or too complex noise.
**Solution**: Reduce geometry detail or use simpler noise function.

## Next Steps

Now that you have the complete shader implementation:

- **06-quaternion-and-animation.md** - Learn about SLERP rotation
- **07-haptic-feedback-system.md** - Add vibration feedback
