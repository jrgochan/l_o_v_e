#ifdef GL_ES
precision highp float;
#endif

//
// Soul Sphere Vertex Shader
// Maps Arousal to surface displacement using Simplex noise
//

// Built-in uniforms from Three.js
uniform float uTime;
uniform float uArousal;  // -1.0 (calm) to +1.0 (chaotic)

// Varyings passed to fragment shader
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

//
// Simplex 3D Noise
// Description: Array and textureless GLSL 2D/3D/4D simplex noise functions
// Author: Ian McEwan, Ashima Arts
// License: MIT
//
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x * 34.0) + 1.0) * x);
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
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // Normalize gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  // Pass values to fragment shader
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;

  // Calculate noise frequency and amplitude based on arousal
  // High arousal = high frequency and amplitude (spiky, chaotic)
  // Low arousal = low frequency and amplitude (smooth, calm)
  float arousalAbs = abs(uArousal);
  float noiseFreq = 1.5 + (arousalAbs * 2.5);  // Range: 1.5 to 4.0
  float noiseAmp = 0.25 * arousalAbs;          // Range: 0.0 to 0.25

  // Sample 3D simplex noise at vertex position
  // Add time component for "breathing" animation
  vec3 noisePos = position * noiseFreq + vec3(uTime * 0.15);
  float noiseValue = snoise(noisePos);

  // Add second octave for more organic feel
  vec3 noisePos2 = position * noiseFreq * 2.0 + vec3(uTime * 0.1);
  float noiseValue2 = snoise(noisePos2) * 0.5;

  // Combine noise octaves
  float combinedNoise = noiseValue + noiseValue2;

  // Displace vertex along normal
  vec3 displaced = position + normal * (combinedNoise * noiseAmp);

  // Transform to world space for Fresnel calculation
  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = worldPos.xyz;

  // Final position
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
