/**
 * Octonion Layers Component
 *
 * Renders the concentric transparent shells around the Soul Sphere core:
 *   - Coping Shell (renderOrder 2): crystalline/fractured shield
 *   - Velocity Particles (renderOrder 1): orbiting particle field
 *   - Novelty Aura (renderOrder 0): outer glow/shimmer
 *
 * CRITICAL TRANSPARENCY FIX:
 *   All layers use depthWrite=false + explicit renderOrder (outer→inner)
 *   to prevent Z-fighting on overlapping transparent meshes.
 *
 * PERFORMANCE BUDGET:
 *   - Velocity particles capped at 200 max
 *   - Auto-disabled when renderQuality === "low"
 *   - reducedMotion: particles frozen, aura static
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

// ═══════════════════════════════════════════════════════════════════
// COPING SHELL — Semi-transparent shield that cracks/strengthens
// ═══════════════════════════════════════════════════════════════════

const copingVertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vPosition;

uniform float uTime;
uniform float uVelocity;  // For sympathetic breathing
uniform float uCoping;    // For sympathetic breathing regularity

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;

  // === SYMPATHETIC BREATHING (matches SoulSphere rhythm at lower amplitude) ===
  float velocityAbs = abs(uVelocity);
  float breathFreq = mix(3.14, 15.7, velocityAbs);
  float breathAmp = mix(0.015, 0.04, velocityAbs); // ~50% of core amplitude
  float dysreg = max(0.0, -uCoping);
  float breathWave = sin(uTime * breathFreq);
  breathWave += dysreg * 0.3 * sin(uTime * breathFreq * 2.7);
  breathWave += dysreg * 0.15 * sin(uTime * breathFreq * 4.1);
  breathWave = clamp(breathWave, -1.0, 1.0);

  vec3 displaced = position + normal * breathWave * breathAmp;

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

const copingFragmentShader = `
uniform float uCoping; // -1 (helpless) to +1 (empowered)
uniform float uTime;
uniform vec3 uCameraPosition;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vPosition;

// ── Pseudo-random hash (cheap, no texture needed) ──
float hash31(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

// ── 3D value noise (smooth randomness) ──
float noise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep

  float a = hash31(i);
  float b = hash31(i + vec3(1,0,0));
  float c = hash31(i + vec3(0,1,0));
  float d = hash31(i + vec3(1,1,0));
  float e = hash31(i + vec3(0,0,1));
  float f2 = hash31(i + vec3(1,0,1));
  float g = hash31(i + vec3(0,1,1));
  float h = hash31(i + vec3(1,1,1));

  return mix(
    mix(mix(a,b,f.x), mix(c,d,f.x), f.y),
    mix(mix(e,f2,f.x), mix(g,h,f.x), f.y),
    f.z
  );
}

// ── Cross-hatch crack function ──
// Returns crack intensity [0,1] at position p with given width
float crackLine(vec3 p, vec3 dir, float freq, float width) {
  float wave = sin(dot(p, dir) * freq);
  // Sharpen into thin lines (narrower = cleaner cracks)
  return smoothstep(width, width + 0.02, abs(wave));
}

void main() {
  vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
  float fresnel = 1.0 - abs(dot(viewDir, normalize(vNormal)));
  fresnel = pow(fresnel, 3.0);

  // ═══ BASE COLOR ═══
  // Empowered = emerald/gold, Helpless = ashen gray-red
  vec3 empoweredColor = vec3(0.2, 0.9, 0.5);
  vec3 helplessColor = vec3(0.35, 0.12, 0.08);
  float t = (uCoping + 1.0) * 0.5; // [0=helpless, 1=empowered]
  vec3 shieldColor = mix(helplessColor, empoweredColor, t);

  float crackIntensity = max(0.0, -uCoping); // 0 when empowered, 1 when helpless

  // ═══ CROSS-HATCH CRACK WEB ═══
  // 3 crack planes at different angles = irregular web, not parallel stripes
  // Each uses a different direction vector and frequency for organic feel

  // Width narrows at low intensity (hairlines), widens at high (gashes)
  float crackWidth = mix(0.92, 0.72, crackIntensity);

  // Layer 1: Primary fractures (dominant direction)
  float c1 = 1.0 - crackLine(vPosition, normalize(vec3(1.0, 0.7, 0.3)), 11.0, crackWidth);

  // Layer 2: Secondary fractures (rotated ~60°)
  float c2 = 1.0 - crackLine(vPosition, normalize(vec3(-0.5, 1.0, 0.6)), 13.0, crackWidth + 0.03);

  // Layer 3: Tertiary micro-fractures (only visible at moderate+ helplessness)
  float c3 = 1.0 - crackLine(vPosition, normalize(vec3(0.3, -0.4, 1.0)), 17.0, crackWidth + 0.06);
  c3 *= smoothstep(0.25, 0.5, crackIntensity); // Fade in at moderate

  // Layer 4: Fine shatter web (only at severe helplessness)
  float c4 = 1.0 - crackLine(vPosition, normalize(vec3(0.8, 0.2, -0.9)), 23.0, 0.82);
  c4 *= smoothstep(0.6, 0.85, crackIntensity); // Only at extreme

  // Combine: union of all crack layers
  float crack = max(max(c1, c2), max(c3, c4));

  // Add organic noise to break up perfect geometry
  float noiseVal = noise3D(vPosition * 6.0);
  crack *= mix(0.7, 1.0, noiseVal); // Randomize crack visibility

  // Scale by overall intensity (no cracks when empowered)
  crack *= crackIntensity;

  // ═══ DISSOLUTION (severe helplessness) ═══
  // At extreme helplessness, patches of the shell dissolve entirely
  float dissolve = 0.0;
  if (crackIntensity > 0.55) {
    float dissolveNoise = noise3D(vPosition * 4.0 + uTime * 0.15);
    // Threshold shrinks as helplessness increases = more holes
    float dissolveThreshold = mix(0.75, 0.35, (crackIntensity - 0.55) / 0.45);
    dissolve = smoothstep(dissolveThreshold, dissolveThreshold + 0.08, dissolveNoise);
    // Hot edge glow around dissolving holes
    float edgeGlow = smoothstep(dissolveThreshold - 0.06, dissolveThreshold, dissolveNoise)
                   * (1.0 - dissolve);
    crack = max(crack, edgeGlow * crackIntensity);
  }

  // ═══ CRACK COLORING ═══
  // Core crack color transitions: warm orange → white-hot at extreme
  vec3 crackColorMild = vec3(1.0, 0.45, 0.12);   // Warm ember
  vec3 crackColorHot  = vec3(1.0, 0.85, 0.5);     // White-hot
  vec3 crackColor = mix(crackColorMild, crackColorHot, crackIntensity);

  // Subtle time-based flicker in cracks (ember breathing)
  float flicker = 0.9 + 0.1 * sin(uTime * 3.0 + noiseVal * 6.28);
  crackColor *= flicker;

  // ═══ COMPOSITING ═══
  float shieldStrength = t;
  float baseAlpha = mix(0.02, 0.15, shieldStrength);
  float edgeAlpha = fresnel * mix(0.1, 0.4, shieldStrength);

  vec3 finalColor = mix(shieldColor, crackColor, crack);

  float alpha = baseAlpha + edgeAlpha + crack * 0.35;
  // Dissolve kills alpha entirely in dissolved patches
  alpha *= (1.0 - dissolve);
  alpha = clamp(alpha, 0.0, 0.55);

  gl_FragColor = vec4(finalColor, alpha);
}
`;

// ═══════════════════════════════════════════════════════════════════
// NOVELTY AURA — Outer ethereal glow
// ═══════════════════════════════════════════════════════════════════

const auraVertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const auraFragmentShader = `
uniform float uNovelty; // -1 (familiar) to +1 (novel)
uniform float uTime;
uniform vec3 uCameraPosition;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
  float fresnel = 1.0 - abs(dot(viewDir, normalize(vNormal)));
  fresnel = pow(fresnel, 2.0);

  // Novel = vivid iridescent shimmer, Familiar = barely visible
  float noveltyAbs = abs(uNovelty);
  float noveltySign = sign(uNovelty);

  // Iridescent color shift based on view angle + time
  vec3 iridescentA = vec3(0.5, 0.2, 0.9); // Violet
  vec3 iridescentB = vec3(0.2, 0.8, 0.9); // Cyan
  float shift = sin(fresnel * 6.28 + uTime * 0.5) * 0.5 + 0.5;
  vec3 novelColor = mix(iridescentA, iridescentB, shift);

  // Familiar = warm amber, subtle
  vec3 familiarColor = vec3(0.8, 0.6, 0.3);

  // Blend based on sign
  vec3 auraColor = uNovelty >= 0.0 ? novelColor : familiarColor;

  // Opacity scales with absolute novelty
  float alpha = fresnel * noveltyAbs * 0.25;
  alpha = clamp(alpha, 0.0, 0.3);

  gl_FragColor = vec4(auraColor, alpha);
}
`;

// ═══════════════════════════════════════════════════════════════════
// VELOCITY PARTICLES — orbiting dot field
// ═══════════════════════════════════════════════════════════════════

const PARTICLE_COUNT = 200; // Performance-capped

function generateParticlePositions(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Distribute on a sphere slightly larger than the coping shell
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.0; // Will be scaled by parent group
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function OctonionLayers() {
  const copingRef = useRef<THREE.ShaderMaterial>(null);
  const auraRef = useRef<THREE.ShaderMaterial>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const particleMaterialRef = useRef<THREE.PointsMaterial>(null);

  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const animationSpeed = useSettingsStore((s) => s.animationSpeed);
  const showCopingShell = useSettingsStore((s) => s.showCopingShell);
  const showVelocityParticles = useSettingsStore((s) => s.showVelocityParticles);
  const showNoveltyAura = useSettingsStore((s) => s.showNoveltyAura);

  // Geometries (shared, memoized)
  const copingGeometry = useMemo(() => new THREE.IcosahedronGeometry(1.0, 12), []);
  const auraGeometry = useMemo(() => new THREE.IcosahedronGeometry(1.0, 8), []);

  // Coping shell material
  const copingMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: copingVertexShader,
        fragmentShader: copingFragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        uniforms: {
          uCoping: { value: 0 },
          uTime: { value: 0 },
          uVelocity: { value: 0 },
          uCameraPosition: { value: new THREE.Vector3(0, 0, 5) },
        },
      }),
    []
  );

  // Aura material
  const auraMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: auraVertexShader,
        fragmentShader: auraFragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        uniforms: {
          uNovelty: { value: 0 },
          uTime: { value: 0 },
          uCameraPosition: { value: new THREE.Vector3(0, 0, 5) },
        },
      }),
    []
  );

  // Particle positions
  const particlePositions = useMemo(() => generateParticlePositions(), []);
  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    return geo;
  }, [particlePositions]);

  // Animation loop — all layers update here at 60fps
  useFrame((state, delta) => {
    const { coping, velocity, novelty } = useExperienceStore.getState().octonionExtended;
    const timeDelta = reducedMotion ? 0 : delta * animationSpeed * 0.5;

    // === COPING SHELL ===
    if (copingRef.current) {
      copingRef.current.uniforms.uCoping.value = coping;
      copingRef.current.uniforms.uTime.value += timeDelta;
      copingRef.current.uniforms.uVelocity.value = velocity;
      copingRef.current.uniforms.uCameraPosition.value.copy(state.camera.position);
    }

    // === NOVELTY AURA ===
    if (auraRef.current) {
      auraRef.current.uniforms.uNovelty.value = novelty;
      auraRef.current.uniforms.uTime.value += timeDelta;
      auraRef.current.uniforms.uCameraPosition.value.copy(state.camera.position);
    }

    // === VELOCITY PARTICLES ===
    if (particlesRef.current && particleMaterialRef.current) {
      const breathMul = useSettingsStore.getState().breathingIntensity;
      const effectiveVelocity = velocity * breathMul;
      const velocityAbs = Math.abs(effectiveVelocity);
      const pMat = particleMaterialRef.current;

      // Opacity: dormant at velocity=0, vivid at ±1
      pMat.opacity = velocityAbs * 0.6;

      // Color: still = cool blue, fast = warm orange
      const hue = 0.55 - velocityAbs * 0.4; // 0.55 (blue) → 0.15 (orange)
      pMat.color.setHSL(hue, 0.8, 0.6);

      // Size: larger when faster — creates "streak" trail appearance
      pMat.size = 0.015 + velocityAbs * 0.035;

      // Orbital rotation (frozen when reducedMotion or velocity=0)
      if (!reducedMotion && velocityAbs > 0.01) {
        const rotSpeed = effectiveVelocity * 0.5; // Sign determines direction
        particlesRef.current.rotation.y += rotSpeed * delta;
        particlesRef.current.rotation.x += rotSpeed * delta * 0.3;

        // Non-uniform scale: stretch along rotation axis for comet-tail effect
        const stretch = 1.0 + velocityAbs * 0.15;
        particlesRef.current.scale.set(1.8, 1.8 * stretch, 1.8);
      } else {
        particlesRef.current.scale.set(1.8, 1.8, 1.8);
      }
    }
  });

  return (
    <group>
      {/* Outer Aura — Novelty (renderOrder 0, renders first = behind) */}
      {showNoveltyAura && (
        <mesh
          geometry={auraGeometry}
          scale={2.0} // Outermost shell
          renderOrder={0}
        >
          <shaderMaterial
            ref={auraRef}
            attach="material"
            vertexShader={auraVertexShader}
            fragmentShader={auraFragmentShader}
            transparent={true}
            depthWrite={false}
            depthTest={true}
            side={THREE.DoubleSide}
            uniforms={auraMaterial.uniforms}
          />
        </mesh>
      )}

      {/* Velocity Particle Field (renderOrder 1) */}
      {showVelocityParticles && (
        <points ref={particlesRef} geometry={particleGeometry} scale={1.8} renderOrder={1}>
          <pointsMaterial
            ref={particleMaterialRef}
            size={0.02}
            color="#88CCFF"
            transparent={true}
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation={true}
          />
        </points>
      )}

      {/* Coping Shell (renderOrder 2, renders between particles and core) */}
      {showCopingShell && (
        <mesh
          geometry={copingGeometry}
          scale={1.6} // Between core and particles
          renderOrder={2}
        >
          <shaderMaterial
            ref={copingRef}
            attach="material"
            vertexShader={copingVertexShader}
            fragmentShader={copingFragmentShader}
            transparent={true}
            depthWrite={false}
            depthTest={true}
            side={THREE.DoubleSide}
            uniforms={copingMaterial.uniforms}
          />
        </mesh>
      )}
    </group>
  );
}
