/**
 * Subtle Elegant Path Animation
 *
 * Therapeutic calm - gentle breathing & soft flow
 * Default mode for clinical work and focused exploration
 */

"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SubtleElegantPathProps {
  tubeGeometry: THREE.TubeGeometry;
  color: THREE.Color;
  opacity: number;
  isSelected: boolean;
}

export function SubtleElegantPath({
  tubeGeometry,
  color,
  opacity,
  isSelected,
}: SubtleElegantPathProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const initialY = useRef(0);

  // Store initial position
  useEffect(() => {
    /* istanbul ignore next */
    if (meshRef.current) {
      initialY.current = meshRef.current.position.y;
    }
  }, []);

  // Subtle elegant animations
  useFrame((state) => {
    /* istanbul ignore next */
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // 1. Gentle breathing (3.5s cycle, 7.5% amplitude)
    const breathe = 1.0 + Math.sin(time * ((Math.PI * 2) / 3.5)) * 0.075;
    meshRef.current.scale.set(breathe, 1.0, breathe);

    // 2. Soft undulation (0.5% vertical, barely visible)
    const wobble = Math.sin(time * 0.3) * 0.005;
    meshRef.current.position.y = initialY.current + wobble;

    // 3. Opacity shimmer (4s cycle, 0.6-0.75 range)
    const shimmer = 0.675 + Math.sin(time * ((Math.PI * 2) / 4.0)) * 0.075;
    materialRef.current.opacity = shimmer * opacity;

    // 4. Subtle glow pulse (5s cycle)
    const glow = 1.0 + Math.sin(time * ((Math.PI * 2) / 5.0)) * 0.05;
    materialRef.current.emissiveIntensity = glow * (isSelected ? 2.0 : 1.0);
  });

  return (
    <mesh ref={meshRef} geometry={tubeGeometry}>
      <meshStandardMaterial
        ref={materialRef}
        color={color}
        emissive={color}
        emissiveIntensity={isSelected ? 2.0 : 1.0}
        transparent
        opacity={opacity}
        metalness={0.2}
        roughness={0.5}
        depthWrite={false}
        depthTest={true}
      />
    </mesh>
  );
}
