/**
 * Mystical Ethereal Path Animation
 *
 * Otherworldly shimmer - quantum dreams
 * For deep introspection, creative inspiration, and magical moments
 */

"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface MysticalEtherealPathProps {
  tubeGeometry: THREE.TubeGeometry;
  color: THREE.Color;
  opacity: number;
  isSelected: boolean;
}

export function MysticalEtherealPath({
  tubeGeometry,
  color,
  opacity,
  isSelected,
}: MysticalEtherealPathProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  // Create custom shader material for mystical effects
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pathColor: { value: color },
        isSelected: { value: isSelected ? 1.0 : 0.0 },
        opacity: { value: opacity },
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vDisplacement;

        // Multi-frequency wave function for vertex displacement
        float multiWave(float t, float pos) {
          float wave1 = sin(pos * 3.0 - t * 0.4) * 0.02;
          float wave2 = sin(pos * 5.0 - t * 0.7) * 0.015;
          float wave3 = sin(pos * 7.0 - t * 1.1) * 0.01;
          return wave1 + wave2 + wave3;
        }

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);

          // Apply multi-wave displacement along surface normal
          float displacement = multiWave(time, uv.y);
          vDisplacement = displacement;

          vec3 newPosition = position + normal * displacement;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 pathColor;
        uniform float isSelected;
        uniform float opacity;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vDisplacement;

        // Flowing color gradient
        vec3 flowingGradient(float progress, vec3 baseColor, float t) {
          // Create flowing effect through color space
          float hueShift = mod(progress * 2.0 - t * 0.2, 1.0);

          vec3 white = vec3(1.0);
          vec3 complement = vec3(1.0 - baseColor.r, 1.0 - baseColor.g, 1.0 - baseColor.b);

          // Flow: base → white → complement → base
          float phase = mod(hueShift * 3.0, 3.0);

          if (phase < 1.0) {
            return mix(baseColor, white, phase);
          } else if (phase < 2.0) {
            return mix(white, complement, phase - 1.0);
          } else {
            return mix(complement, baseColor, phase - 2.0);
          }
        }

        // Quantum flutter (perlin-like noise approximation)
        float quantumFlutter(float t, float seed) {
          return sin(t * 10.0 + seed * 13.7) * 0.5 + 0.5;
        }

        void main() {
          // 1. Flowing color gradient along path
          vec3 color = flowingGradient(vUv.y, pathColor, time);

          // 2. Quantum flutter opacity
          float flutter = quantumFlutter(time, vUv.y);
          float basePulse = 0.7 + sin(time * 0.4) * 0.25;
          float finalOpacity = (basePulse + flutter * 0.15) * opacity;

          // 3. Enhanced glow based on vertex displacement
          float glowBoost = 1.0 + abs(vDisplacement) * 10.0;

          // 4. Selected path gets extra shimmer
          float selectedBoost = 1.0 + isSelected * 0.5;

          // Final color with emissive glow
          vec3 finalColor = color * (1.0 + glowBoost * 0.3) * selectedBoost;

          gl_FragColor = vec4(finalColor, finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // Ethereal glow effect
      side: THREE.DoubleSide,
    });
  }, [color, opacity, isSelected]);

  // Update shader uniforms each frame
  useFrame((state) => {
    /* istanbul ignore next */
    if (!shaderRef.current) return;
    shaderRef.current.uniforms.time.value = state.clock.elapsedTime;
    shaderRef.current.uniforms.isSelected.value = isSelected ? 1.0 : 0.0;
    shaderRef.current.uniforms.pathColor.value = color;
    shaderRef.current.uniforms.opacity.value = opacity;
  });

  // Update shader reference
  useEffect(() => {
    /* istanbul ignore next */
    if (meshRef.current && meshRef.current.material) {
      shaderRef.current = meshRef.current.material as THREE.ShaderMaterial;
    }
  }, []);

  return <mesh ref={meshRef} geometry={tubeGeometry} material={shaderMaterial} />;
}
