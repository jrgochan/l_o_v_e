/**
 * Advanced Path Animation Component
 *
 * Handles the new advanced visual modes:
 * - Crystalline: Sharp, angular, high opacity
 * - Luminous: Glowing, additive, energetic
 * - Liquid: Flowing, smooth, glossy
 * - Glitch: Digital artifacts, flickering
 */

"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PathAnimationMode } from "@/types/atlas-admin";

interface AdvancedPathProps {
  mode: PathAnimationMode;
  tubeGeometry: THREE.TubeGeometry;
  color: THREE.Color;
  opacity: number;
  isSelected: boolean;
}

export function AdvancedPath({
  mode,
  tubeGeometry,
  color,
  opacity,
  isSelected,
}: AdvancedPathProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const initialY = useRef(0);

  // Store initial position
  useEffect(() => {
    if (meshRef.current?.position) {
      initialY.current = meshRef.current.position.y;
    }
  }, []);

  // Animation Loop
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // --- SHARED DEFAULTS ---
    let targetOpacity = opacity;
    const targetColor = color.clone();
    const targetEmissive = color.clone();
    let targetEmissiveIntensity = isSelected ? 2.0 : 1.0;

    // --- MODE SPECIFIC LOGIC ---

    if (mode === "crystalline") {
      // Sharp, static structure, diamond-like shimmer
      // Static geometry (no wobble)
      meshRef.current.position.y = initialY.current;

      // Occasional sharp flash
      const flash = Math.pow(Math.sin(time * 2.0 + meshRef.current.id), 20.0);
      targetEmissiveIntensity += flash * 2.0;

      // High opacity for "solid" look
      targetOpacity = Math.min(1.0, opacity * 1.5);
    } else if (mode === "luminous") {
      // Pure energy, pulsing
      const pulse = Math.sin(time * 4.0) * 0.5 + 0.5;
      targetEmissiveIntensity = (isSelected ? 3.0 : 1.5) + pulse;

      // Add white to color for "hot" look
      targetColor.lerp(new THREE.Color(1, 1, 1), 0.3 * pulse);
      targetEmissive.lerp(new THREE.Color(1, 1, 1), 0.2);
    } else if (mode === "liquid") {
      // Smooth flowing wave
      const wave = Math.sin(time * 1.5 + meshRef.current.position.x) * 0.05;
      meshRef.current.position.y = initialY.current + wave;

      // Glossy opacity variation
      const flow = Math.sin(time * 1.0);
      targetOpacity = opacity * (0.8 + flow * 0.2);
    } else if (mode === "glitch") {
      // Digital artifacts
      // Random position snapping
      if (Math.random() > 0.95) {
        const offset = (Math.random() - 0.5) * 0.1;
        meshRef.current.position.y = initialY.current + offset;
      }

      // Flicker opacity
      if (Math.random() > 0.9) {
        targetOpacity = opacity * 0.2;
      }

      // Random color channel split look (simulated by color shift)
      if (Math.random() > 0.98) {
        targetColor.setRGB(0, 1, 0); // Matrix green flash
        targetEmissive.setRGB(0, 1, 0);
        targetEmissiveIntensity = 5.0;
      }
    }

    // Apply updates
    materialRef.current.opacity = targetOpacity;
    materialRef.current.color.copy(targetColor);
    materialRef.current.emissive.copy(targetEmissive);
    materialRef.current.emissiveIntensity = targetEmissiveIntensity;
  });

  return (
    <mesh ref={meshRef} geometry={tubeGeometry}>
      <meshStandardMaterial
        ref={materialRef}
        color={color}
        emissive={color}
        emissiveIntensity={1.0}
        transparent
        opacity={opacity}
        metalness={mode === "crystalline" || mode === "liquid" ? 0.9 : 0.4}
        roughness={mode === "crystalline" ? 0.1 : 0.3}
        depthWrite={false}
        flatShading={mode === "crystalline" || mode === "glitch"}
      />
    </mesh>
  );
}
