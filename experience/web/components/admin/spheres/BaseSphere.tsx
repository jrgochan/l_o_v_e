/**
 * Base Sphere Component
 *
 * Foundation component for all sphere variants in the admin interface.
 * Provides shared functionality for:
 * - Three.js setup
 * - Basic animations (breathing, rotation, glow)
 * - Color management
 * - Size configuration
 * - Material properties
 *
 * This component uses the render props pattern to allow variants
 * to customize behavior while sharing common functionality.
 *
 * @example
 * ```tsx
 * <BaseSphere
 *   color={categoryColor}
 *   size={0.4}
 *   position={[x, y, z]}
 *   animation={{
 *     breathing: { enabled: true, rate: 2.0, amplitude: 0.08 },
 *     rotation: { enabled: true, speed: 0.003 },
 *     glow: { enabled: true, intensity: 0.5, pulseSpeed: 1.5 }
 *   }}
 * >
 *   {(meshRef, materialRef) => (
 *     // Custom rendering logic here
 *   )}
 * </BaseSphere>
 * ```
 */

"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SphereAnimation, ThreePointerEvent } from "@/types/three";

export interface BaseSphereProps {
  color: THREE.Color | string;
  size?: number;
  position?: [number, number, number] | THREE.Vector3;
  animation?: SphereAnimation;
  material?: {
    metalness?: number;
    roughness?: number;
    transparent?: boolean;
    opacity?: number;
  };
  geometry?: {
    widthSegments?: number;
    heightSegments?: number;
  };
  onClick?: (event: ThreePointerEvent) => void;
  onPointerOver?: (event: ThreePointerEvent) => void;
  onPointerOut?: (event: ThreePointerEvent) => void;
  children?:
    | React.ReactNode
    | ((
        meshRef: React.RefObject<THREE.Mesh | null>,
        materialRef: React.RefObject<THREE.MeshStandardMaterial | null>
      ) => React.ReactNode);
}

/**
 * BaseSphere - Shared foundation for all sphere variants
 */
export function BaseSphere({
  color,
  size = 0.4,
  position = [0, 0, 0],
  animation = {},
  material = {},
  geometry = {},
  onClick,
  onPointerOver,
  onPointerOut,
  children,
}: BaseSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // Parse color
  const colorObj = typeof color === "string" ? new THREE.Color(color) : color;

  // Default animation settings
  const anim = {
    breathing: animation.breathing || { enabled: true, rate: 2.0, amplitude: 0.08 },
    rotation: animation.rotation || { enabled: true, speed: 0.003, axis: "y" as const },
    glow: animation.glow || { enabled: true, intensity: 0.5, pulseSpeed: 1.5 },
  };

  // Default material settings
  const mat = {
    metalness: material.metalness ?? 0.3,
    roughness: material.roughness ?? 0.4,
    transparent: material.transparent ?? false,
    opacity: material.opacity ?? 1.0,
  };

  // Default geometry settings
  const geom = {
    widthSegments: geometry.widthSegments ?? 32,
    heightSegments: geometry.heightSegments ?? 32,
  };

  // Animation loop
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // 1. BREATHING ANIMATION
    if (anim.breathing.enabled) {
      const breathe =
        1.0 + Math.sin(time * ((Math.PI * 2) / anim.breathing.rate)) * anim.breathing.amplitude;
      meshRef.current.scale.setScalar(breathe);
    }

    // 2. ROTATION ANIMATION
    if (anim.rotation.enabled) {
      switch (anim.rotation.axis) {
        case "x":
          meshRef.current.rotation.x += anim.rotation.speed;
          break;
        case "y":
          meshRef.current.rotation.y += anim.rotation.speed;
          break;
        case "z":
          meshRef.current.rotation.z += anim.rotation.speed;
          break;
      }
    }

    // 3. GLOW PULSE ANIMATION
    if (anim.glow.enabled) {
      const glowPulse = 1.0 + Math.sin(time * ((Math.PI * 2) / anim.glow.pulseSpeed)) * 0.3;
      materialRef.current.emissiveIntensity = anim.glow.intensity * glowPulse;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[size, geom.widthSegments, geom.heightSegments]} />
        <meshStandardMaterial
          ref={materialRef}
          color={colorObj}
          emissive={colorObj}
          emissiveIntensity={anim.glow.intensity}
          metalness={mat.metalness}
          roughness={mat.roughness}
          transparent={mat.transparent}
          opacity={mat.opacity}
        />
      </mesh>

      {/* Render children (for custom additions like rings, particles, etc.) */}
      {}
      {}
      {}
      {}
      {}
      {/* eslint-disable-next-line react-hooks/refs */}
      {typeof children === "function" ? children(meshRef, materialRef) : children}
    </group>
  );
}

/**
 * Helper: Create standard lighting setup for sphere canvases
 */
export function StandardLighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1.0} />
      <pointLight position={[-5, -5, -5]} intensity={0.5} />
    </>
  );
}

/**
 * Helper: Get color from VAC valence
 */
export function getColorFromValence(valence: number): THREE.Color {
  if (valence > 0.5) return new THREE.Color(0x22c55e); // green-500
  if (valence > 0.1) return new THREE.Color(0xa3e635); // lime-400
  if (valence > -0.1) return new THREE.Color(0xfbbf24); // amber-400
  if (valence > -0.5) return new THREE.Color(0xf97316); // orange-500
  return new THREE.Color(0xef4444); // red-500
}

/**
 * Helper: Get color from category
 */
export function getColorFromCategory(
  category: string,
  categoryColors: Record<string, string>
): THREE.Color {
  return new THREE.Color(categoryColors[category] || "#888888");
}

/**
 * Helper: Blend multiple colors with weights
 */
export function blendColors(colors: THREE.Color[], weights: number[]): THREE.Color {
  if (colors.length === 0) return new THREE.Color(0xfbbf24);

  let totalWeight = 0;
  let weightedR = 0;
  let weightedG = 0;
  let weightedB = 0;

  colors.forEach((color, i) => {
    const weight = weights[i] || 1.0;
    weightedR += color.r * weight;
    weightedG += color.g * weight;
    weightedB += color.b * weight;
    totalWeight += weight;
  });

  if (totalWeight === 0) return new THREE.Color(0xfbbf24);

  return new THREE.Color(weightedR / totalWeight, weightedG / totalWeight, weightedB / totalWeight);
}
