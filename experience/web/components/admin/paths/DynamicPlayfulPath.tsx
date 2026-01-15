/**
 * Dynamic Playful Path Animation
 *
 * Engaging flow - alive with movement
 * For exploration, creativity, demos, and energizing sessions
 */

"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface DynamicPlayfulPathProps {
  tubeGeometry: THREE.TubeGeometry;
  color: THREE.Color;
  opacity: number;
  isSelected: boolean;
}

export function DynamicPlayfulPath({
  tubeGeometry,
  color,
  opacity,
  isSelected,
}: DynamicPlayfulPathProps) {
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

  // Dynamic playful animations
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // 1. Energetic breathing (1.8s cycle, 15% amplitude)
    const breathe = 1.0 + Math.sin(time * ((Math.PI * 2) / 1.8)) * 0.15;
    meshRef.current.scale.set(breathe, 1.0, breathe);

    // 2. Pronounced undulation (multi-wave, 1.5-3% with harmonics)
    const wave1 = Math.sin(time * 0.8 * Math.PI * 2) * 0.015;
    const wave2 = Math.sin(time * 1.2 * Math.PI * 2 + 0.5) * 0.01;
    const wobble = wave1 + wave2;
    meshRef.current.position.y = initialY.current + wobble;

    // 3. Dynamic opacity (2s cycle with harmonics, 0.5-0.9 range)
    const shimmer1 = Math.sin(time * ((Math.PI * 2) / 2.0)) * 0.2;
    const shimmer2 = Math.sin(time * ((Math.PI * 2) / 2.0) * 2.0) * 0.05;
    materialRef.current.opacity = (0.7 + shimmer1 + shimmer2) * opacity;

    // 4. Color brightness variation (3s cycle, ±15%)
    const colorPulse = 1.0 + Math.sin(time * ((Math.PI * 2) / 3.0)) * 0.15;
    const brighterColor = color.clone().multiplyScalar(colorPulse);
    materialRef.current.color.copy(brighterColor);
    materialRef.current.emissive.copy(brighterColor);

    // 5. Energetic glow (selected paths pulse faster)
    const glowCycle = isSelected ? 1.5 : 3.0;
    const glow = 1.2 + Math.sin(time * ((Math.PI * 2) / glowCycle)) * 0.3;
    materialRef.current.emissiveIntensity = glow * (isSelected ? 2.5 : 1.2);
  });

  return (
    <mesh ref={meshRef} geometry={tubeGeometry}>
      <meshStandardMaterial
        ref={materialRef}
        color={color}
        emissive={color}
        emissiveIntensity={1.2}
        transparent
        opacity={opacity}
        metalness={0.4}
        roughness={0.3}
        depthWrite={false}
        depthTest={true}
      />
    </mesh>
  );
}
