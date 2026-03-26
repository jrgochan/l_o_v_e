/**
 * Soul Sphere Component
 *
 * The central 3D visualization that morphs based on emotional state (VAC).
 * Renders a shader-based sphere that responds to valence, arousal, and connection.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useVisualizationStore } from "@/stores/useVisualizationStore";

// Inline vertex shader
const vertexShader = `
#ifdef GL_ES
precision highp float;
#endif

uniform float uTime;
uniform float uArousal;
uniform float uVelocity;      // Octonion: -1 (still) to +1 (rapid change)
uniform float uCoping;         // Octonion: -1 (helpless) to +1 (empowered)
uniform float uDepthTopology;  // Octonion: 0 (surface) to 1 (profound, absolute)
uniform int uMode; // 0:Subtle, 1:Dynamic, 2:Mystical, 3:Crystalline, 4:Luminous, 5:Liquid, 6:Glitch

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vNoise; // Pass noise to fragment for texture generation

// Simplex 3D Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
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
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;

  float arousalAbs = abs(uArousal);
  float noiseFreq = 1.5 + (arousalAbs * 2.5);
  float noiseAmp = 0.25 * arousalAbs;

  vec3 displaced = position;
  float noiseVal = 0.0;

  // --- MODE SPECIFIC VERTEX DISPLACEMENT ---

  if (uMode == 3) { // Crystalline - Sharp, angular, faceted gem
      // Multi-octave noise stepped into pronounced facets
      float n1 = snoise(position * 3.0);
      float n2 = snoise(position * 6.0 + vec3(17.0)) * 0.3;
      float combined = n1 + n2;
      float stepVal = floor(combined * 8.0) / 8.0; // More facets, sharper geometry
      // Stronger displacement for dramatic angular appearance
      displaced += normal * (stepVal * (0.15 + noiseAmp * 1.5));
      noiseVal = combined;
  }
  else if (uMode == 5) { // Liquid - Smooth flowing sine waves
      // Flowing wave motion
      float wave = sin(position.y * 4.0 + uTime * 2.0) * 0.5 +
                   cos(position.x * 4.0 + uTime * 1.5) * 0.5;
      displaced += normal * (wave * (0.05 + noiseAmp * 0.5));
      noiseVal = wave;
  }
  else if (uMode == 6) { // Glitch - Vertex snapping / jitter
      float jitter = step(0.95, fract(sin(dot(position.xy ,vec2(12.9898,78.233))) * 43758.5453 + uTime));
      // Randomly snap vertices
      vec3 snapPos = floor(position * 5.0) / 5.0;
      displaced = mix(position, snapPos, jitter * 0.5);
      displaced += normal * (snoise(position * 10.0 + uTime) * noiseAmp * jitter);
      noiseVal = jitter;
  }
  else { // Standard Noise Modes (Subtle, Dynamic, Mystical, Luminous)
      // === DEPTH TOPOLOGY: modulate noise by emotional depth ===
      float depthAbs = uDepthTopology; // Already [0,1]
      float noiseAmpMod = noiseAmp * (1.0 + depthAbs * 2.0);  // Up to 3x at max depth
      float noiseFreqMod = noiseFreq * (1.0 + depthAbs * 0.5); // Slight freq increase

      vec3 noisePos = position * noiseFreqMod + vec3(uTime * 0.15);
      float n1 = snoise(noisePos);

      vec3 noisePos2 = position * noiseFreqMod * 2.0 + vec3(uTime * 0.1);
      float n2 = snoise(noisePos2) * 0.5;

      float combined = n1 + n2;

      // Third octave: only for deep emotions (gated at 0.4 for perf)
      float n3 = 0.0;
      if (depthAbs > 0.4) {
          n3 = snoise(position * noiseFreqMod * 3.0 + vec3(uTime * 0.08)) * 0.25 * (depthAbs - 0.4) / 0.6;
      }

      // Low-frequency ocean swell (deep emotions only)
      float swell = snoise(position * 0.8 + vec3(uTime * 0.05)) * depthAbs * 0.15;

      displaced += normal * (combined * noiseAmpMod + swell + n3);
      noiseVal = combined;
  }

  // === BREATHING: velocity controls speed, coping controls regularity ===
  float velocityAbs = abs(uVelocity);
  float breathFreq = mix(3.14, 15.7, velocityAbs);  // 2s → 0.4s cycle
  float breathAmp = mix(0.03, 0.08, velocityAbs);    // ±3% → ±8%

  // Dysregulation: add harmonic distortion when coping < 0
  float dysreg = max(0.0, -uCoping);
  float breathWave = sin(uTime * breathFreq);
  breathWave += dysreg * 0.3 * sin(uTime * breathFreq * 2.7);  // Odd harmonic
  breathWave += dysreg * 0.15 * sin(uTime * breathFreq * 4.1); // Higher harmonic
  breathWave = clamp(breathWave, -1.0, 1.0);

  displaced += normal * breathWave * breathAmp;

  // Pass noise value for coloring
  vNoise = noiseVal;

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

// Inline fragment shader
const fragmentShader = `
#ifdef GL_ES
precision highp float;
#endif

uniform float uValence;
uniform float uConnection;
uniform int uMode; // 0:Subtle, 1:Dynamic, 2:Mystical, 3:Crystalline, 4:Luminous, 5:Liquid, 6:Glitch
uniform vec3 uColorNeg;
uniform vec3 uColorPos;
uniform float uOpacity;
uniform vec3 uCameraPosition;
uniform float uTime;
uniform float uDepth; // Octonion: -1 (superficial) to +1 (profound)

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vNoise;

void main() {
  float mixFactor = (uValence + 1.0) * 0.5;
  float smoothMix = smoothstep(-1.0, 1.0, uValence);
  vec3 baseColor = mix(uColorNeg, uColorPos, smoothMix);

  vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
  float fresnel = dot(viewDir, normalize(vNormal));
  fresnel = 1.0 - abs(fresnel);
  fresnel = pow(fresnel, 2.5);

  float glowIntensity = fresnel * max(0.0, uConnection + 0.5);
  vec3 glowColor = vec3(1.0, 1.0, 1.0);
  vec3 finalColor = baseColor;
  float alpha = 0.3;

  // --- MODE SPECIFIC COLORING ---

  if (uMode == 3) { // Crystalline
       // Chromatic dispersion — wavelength-dependent refraction through crystal
       float fresnelR = pow(1.0 - dot(viewDir, normalize(vNormal)), 2.0);
       float fresnelG = pow(1.0 - dot(viewDir, normalize(vNormal)), 2.5);
       float fresnelB = pow(1.0 - dot(viewDir, normalize(vNormal)), 3.0);
       vec3 dispersion = vec3(fresnelR, fresnelG, fresnelB);

       // Facet edge detection — white highlights at crystal face boundaries
       float facetEdge = abs(fract(vNoise * 8.0) - 0.5) * 2.0;
       float edgeLine = smoothstep(0.82, 1.0, facetEdge);

       // Soft specular sparkles (pow-based, not binary step)
       float sparkle = pow(max(fract(vNoise * 12.0 + uTime * 0.5), 0.0), 12.0);

       finalColor = mix(baseColor, dispersion, 0.5);
       finalColor += vec3(1.0) * edgeLine * 0.25; // White facet edges
       finalColor += glowColor * sparkle * 1.5;    // Jewel sparkles
       finalColor += glowColor * glowIntensity * 0.3;
       alpha = 0.15 + (fresnel * 0.85); // Very transparent center, opaque edges
  }
  else if (uMode == 4) { // Luminous
      // High energy glow
      finalColor = baseColor * 2.0; // Brighter base
      finalColor += glowColor * glowIntensity * 1.5; // Strong glow
      // Pulsing core
      float pulse = sin(uTime * 3.0) * 0.5 + 0.5;
      finalColor += baseColor * pulse * 0.5;
      alpha = 0.4 + (fresnel * 0.6);
  }
  else if (uMode == 5) { // Liquid
      // Deep and glossy
      float specular = pow(fresnel, 5.0); // Sharp highlights
      finalColor = mix(baseColor * 0.8, vec3(1.0), specular);
      // Iridescence
      vec3 irid = 0.5 + 0.5 * cos(uTime + vPosition.xyx + vec3(0,2,4));
      finalColor += irid * 0.2 * specular;
      alpha = 0.5 + (fresnel * 0.5);
  }
  else if (uMode == 6) { // Glitch
      // Digital artifacts
      float stripe = step(0.5, sin(vPosition.y * 50.0 + uTime * 10.0));
      if (stripe > 0.5) discard; // Scanlines
      finalColor = mix(baseColor, vec3(0.0, 1.0, 0.0), vNoise * 0.5); // Matrix green tint
      finalColor += glowColor * glowIntensity;
      alpha = 0.6;
  }
  else { // Standard Modes
     finalColor = baseColor + (glowColor * glowIntensity * 0.6);
     float baseAlpha = 0.15 + (fresnel * 0.75);
     alpha = baseAlpha;
     if (uConnection > 0.0) {
        alpha = baseAlpha - (uConnection * 0.15);
     } else {
        alpha = baseAlpha + 0.05;
     }
  }

  vec3 ambient = finalColor * 0.3;
  float diffuse = max(dot(normalize(vNormal), viewDir), 0.0);
  vec3 diffuseColor = finalColor * diffuse * 0.7;
  vec3 litColor = ambient + diffuseColor;

  // ===== OCTONION: DEPTH → CORE LUMINANCE =====
  // Deep feelings glow from within (emissive boost)
  // Superficial feelings are matte/dim
  float depthGlow = max(0.0, uDepth) * 0.4; // Positive depth = inner glow
  float depthDim = max(0.0, -uDepth) * 0.3;  // Negative depth = matte
  litColor += litColor * depthGlow;           // Emissive boost
  litColor *= (1.0 - depthDim);               // Matte darkening

  gl_FragColor = vec4(litColor, alpha * uOpacity);
}
`;

export function SoulSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Get settings for visual mode
  const { pathAnimationMode, sphereOpacity, animationSpeed } = useSettingsStore();

  // Map mode string to integer for shader
  const modeInt = useMemo(() => {
    switch (pathAnimationMode) {
      case "subtle":
        return 0;
      case "dynamic":
        return 1;
      case "mystical":
        return 2;
      case "crystalline":
        return 3;
      case "luminous":
        return 4;
      case "liquid":
        return 5;
      case "glitch":
        return 6;
      default:
        return 0;
    }
  }, [pathAnimationMode]);

  const allEmotions = useVisualizationStore((state) => state.allEmotions);
  const selectedEmotionIds = useVisualizationStore((state) => state.selectedEmotionIds);

  // Compute aggregate VAC and Color
  const aggregateColor = useMemo(() => {
    // Default Teal if no selection
    if (selectedEmotionIds.size === 0) return new THREE.Color("#2DD4BF"); // Teal

    const selected = allEmotions.filter((e) => selectedEmotionIds.has(e.id));
    if (selected.length === 0) return new THREE.Color("#2DD4BF");

    // Calculate average VAC
    const agg = selected.reduce(
      (acc, e) => {
        acc[0] += e.vac[0];
        acc[1] += e.vac[1];
        acc[2] += e.vac[2];
        return acc;
      },
      [0, 0, 0] as [number, number, number]
    );

    const count = selected.length;
    const v = agg[0] / count;
    const a = agg[1] / count;
    const c = agg[2] / count;

    // Axis colors (matching VACAxisLabels3D)
    // Valence: Teal/Cyan (+) / Crimson (-)
    const cV = v >= 0 ? new THREE.Color("#2DD4BF") : new THREE.Color("#E11D48");
    // Arousal: Amber (+) / Indigo/Blue (-)
    const cA = a >= 0 ? new THREE.Color("#F59E0B") : new THREE.Color("#4338CA");
    // Connection: Vibrant Purple (+) / Slate Gray (-)
    const cC = c >= 0 ? new THREE.Color("#A855F7") : new THREE.Color("#64748B");

    // Weight by magnitude of deviation from center
    const wV = Math.abs(v);
    const wA = Math.abs(a);
    const wC = Math.abs(c);
    const totalW = wV + wA + wC;

    // If perfectly neutral, default to Teal
    if (totalW < 0.01) return new THREE.Color("#2DD4BF");

    // Weighted blend
    const mixed = new THREE.Color(0, 0, 0);
    mixed.r = (cV.r * wV + cA.r * wA + cC.r * wC) / totalW;
    mixed.g = (cV.g * wV + cA.g * wA + cC.g * wC) / totalW;
    mixed.b = (cV.b * wV + cA.b * wA + cC.b * wC) / totalW;

    // Boost saturation slightly as averaging can wash out colors
    const hsl = { h: 0, s: 0, l: 0 };
    mixed.getHSL(hsl);
    mixed.setHSL(hsl.h, Math.min(hsl.s * 1.2, 1.0), hsl.l);

    return mixed;
  }, [selectedEmotionIds, allEmotions]);

  // Create geometry and material
  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(1.0, 20); // High detail sphere
  }, []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uValence: { value: 0 },
        uArousal: { value: 0 },
        uConnection: { value: 0 },
        uMode: { value: 0 },
        uDepth: { value: 0 },
        uVelocity: { value: 0 },
        uCoping: { value: 0 },
        uDepthTopology: { value: 0 },
        uColorNeg: { value: new THREE.Color("#FF4444") },
        uColorPos: { value: new THREE.Color("#44FF44") },
        uCameraPosition: { value: new THREE.Vector3(0, 0, 5) },
        uOpacity: { value: 1.0 },
      },
    });
  }, []);

  // Update mode uniform when it changes
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uMode.value = modeInt;
      // Override standard valence mixing with our computed aggregate color
      // By setting both Neg and Pos to the same color, mix() returns that color
      materialRef.current.uniforms.uColorNeg.value.copy(aggregateColor);
      materialRef.current.uniforms.uColorPos.value.copy(aggregateColor);
    }
  });

  // Animation loop — lerp octonion + update all uniforms at 60fps
  useFrame((state, delta) => {
    if (!materialRef.current) return;

    // Direct store access for 60fps performance without re-renders
    const currentVAC = useExperienceStore.getState().currentVAC;
    const octonionExt = useExperienceStore.getState().octonionExtended;
    const octonionTarget = useExperienceStore.getState().targetOctonionExtended;
    const octonionEnabled = useSettingsStore.getState().enableOctonionLayer;

    // === LERP: Smoothly interpolate octonionExtended toward target ===
    // damp(current, target, lambda, delta) — lambda=3 gives ~1s settle
    const LAMBDA = 3.0;
    const dampedDepth = THREE.MathUtils.damp(octonionExt.depth, octonionTarget.depth, LAMBDA, delta);
    const dampedCoping = THREE.MathUtils.damp(octonionExt.coping, octonionTarget.coping, LAMBDA, delta);
    const dampedVelocity = THREE.MathUtils.damp(octonionExt.velocity, octonionTarget.velocity, LAMBDA, delta);
    const dampedNovelty = THREE.MathUtils.damp(octonionExt.novelty, octonionTarget.novelty, LAMBDA, delta);

    // Write back to store (direct set for perf — no React re-render triggered)
    useExperienceStore.getState().setOctonionExtended({
      depth: dampedDepth,
      coping: dampedCoping,
      velocity: dampedVelocity,
      novelty: dampedNovelty,
    });

    // Scale time by animation speed
    materialRef.current.uniforms.uTime.value += delta * animationSpeed;

    // Core VAC uniforms
    materialRef.current.uniforms.uValence.value = currentVAC[0];
    materialRef.current.uniforms.uArousal.value = currentVAC[1];
    materialRef.current.uniforms.uConnection.value = currentVAC[2];

    // === OCTONION UNIFORMS ===
    // When octonion is enabled: use extended dimensions
    // When disabled: fallback to VAC (arousal→velocity, valence→coping)
    const effectiveVelocity = octonionEnabled ? dampedVelocity : currentVAC[1]; // arousal fallback
    const effectiveCoping = octonionEnabled ? dampedCoping : currentVAC[0];     // valence fallback
    const effectiveDepth = octonionEnabled ? dampedDepth : 0;

    materialRef.current.uniforms.uDepth.value = effectiveDepth;
    materialRef.current.uniforms.uVelocity.value = effectiveVelocity;
    materialRef.current.uniforms.uCoping.value = effectiveCoping;
    materialRef.current.uniforms.uDepthTopology.value = Math.abs(effectiveDepth);

    // Update opacity
    materialRef.current.uniforms.uOpacity.value = sphereOpacity;

    // Update camera position for Fresnel effect
    materialRef.current.uniforms.uCameraPosition.value.copy(state.camera.position);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} scale={1.5}>
      <shaderMaterial
        ref={materialRef}
        attach="material"
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent={true}
        side={THREE.DoubleSide}
        depthWrite={false}
        uniforms={material.uniforms}
      />
    </mesh>
  );
}
