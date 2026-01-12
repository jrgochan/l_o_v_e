/**
 * Soul Sphere Component
 *
 * The central 3D visualization that morphs based on emotional state (VAC).
 * Uses custom GLSL shaders to map:
 * - Valence → Color (crimson to cyan)
 * - Arousal → Geometry displacement (calm to chaotic)
 * - Connection → Glow/transparency (disconnected to connected)
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperienceStore } from "@/stores/useExperienceStore";

// Inline vertex shader (avoiding Turbopack GLSL loading issues)
const vertexShader = `
#ifdef GL_ES
precision highp float;
#endif

uniform float uTime;
uniform float uArousal;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

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
  
  vec3 noisePos = position * noiseFreq + vec3(uTime * 0.15);
  float noiseValue = snoise(noisePos);
  
  vec3 noisePos2 = position * noiseFreq * 2.0 + vec3(uTime * 0.1);
  float noiseValue2 = snoise(noisePos2) * 0.5;
  
  float combinedNoise = noiseValue + noiseValue2;
  vec3 displaced = position + normal * (combinedNoise * noiseAmp);
  
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
uniform vec3 uColorNeg;
uniform vec3 uColorPos;
uniform vec3 uCameraPosition;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

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
  vec3 finalColor = baseColor + (glowColor * glowIntensity * 0.6);
  
  // IMPROVED: Fresnel-based transparency - center is translucent, edges are opaque
  float baseAlpha = 0.15 + (fresnel * 0.75);  // Center: 0.15, Edge: 0.9
  
  // Adjust by connection
  float alpha = baseAlpha;
  if (uConnection > 0.0) {
    alpha = baseAlpha - (uConnection * 0.15);  // More transparent when connected
  } else {
    alpha = baseAlpha + 0.05;  // Slightly more opaque when disconnected
  }
  
  alpha = clamp(alpha, 0.1, 0.95);  // Always some transparency
  
  vec3 ambient = finalColor * 0.3;
  float diffuse = max(dot(normalize(vNormal), viewDir), 0.0);
  vec3 diffuseColor = finalColor * diffuse * 0.7;
  vec3 litColor = ambient + diffuseColor;
  
  gl_FragColor = vec4(litColor, alpha);
}
`;

export function SoulSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Subscribe to store
  // Subscribe to store targets only (so we wake up when target changes)
  // const targetVAC = useExperienceStore((state) => state.targetVAC);
  // We do NOT subscribe to currentVAC here to avoid 60fps re-renders.
  // We read it transiently in useFrame.
  // const updateCurrent = useExperienceStore((state) => state.updateCurrent);
  // const setIsAnimating = useExperienceStore((state) => state.setIsAnimating);

  // Create geometry and material
  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(1.5, 20);
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
        uColorNeg: { value: new THREE.Color(0.545, 0.0, 0.0) }, // Crimson
        uColorPos: { value: new THREE.Color(0.0, 1.0, 1.0) }, // Cyan
        uCameraPosition: { value: new THREE.Vector3(0, 0, 5) },
      },
    });
  }, []);

  // Animation loop - Visuals Only
  useFrame((state, delta) => {
    if (!materialRef.current) return;

    // Update time uniform
    materialRef.current.uniforms.uTime.value += delta;

    // Read current state from store (driven by VACAnimator)
    // Read current state from store transiently (avoiding react render loop)
    const currentVAC = useExperienceStore.getState().currentVAC;
    const [currentV, currentA, currentC] = currentVAC;

    // Update uniforms directly from store state
    materialRef.current.uniforms.uValence.value = currentV;
    materialRef.current.uniforms.uArousal.value = currentA;
    materialRef.current.uniforms.uConnection.value = currentC;

    // Update camera position for Fresnel effect
    materialRef.current.uniforms.uCameraPosition.value.copy(state.camera.position);
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        attach="material"
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent={true}
        side={THREE.DoubleSide}
        uniforms={material.uniforms}
      />
    </mesh>
  );
}
