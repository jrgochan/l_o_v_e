/**
 * Path Particles Component
 *
 * Animated particles that flow along emotional transition paths
 * to visualize directionality and energy flow.
 */

"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface PathParticlesProps {
  curve: THREE.Curve<THREE.Vector3>;
  color: THREE.Color;
  particleCount?: number;
  speed?: number;
  size?: number;
  opacity?: number;
  isHighlighted?: boolean;
  mode?: string; // Using string to accept all modes easily without circular dep on types
}

export function PathParticles({
  curve,
  color,
  speed = 0.5,
  size = 0.02,
  opacity = 0.8,
  isHighlighted = false,
  mode = "subtle",
}: PathParticlesProps) {
  // Adjust particle parameters based on animation mode
  // Using explicit type cast to allow indexing by any PathAnimationMode string if needed,
  // or just ensuring keys match the string union.
  const modeParams: Record<
    string,
    { count: number; speedMult: number; sizeMult: number; glowMult: number }
  > = {
    subtle: { count: 10, speedMult: 0.6, sizeMult: 0.8, glowMult: 2.0 },
    dynamic: { count: 18, speedMult: 1.0, sizeMult: 1.2, glowMult: 2.5 },
    mystical: { count: 28, speedMult: 0.8, sizeMult: 1.0, glowMult: 3.0 },
    crystalline: { count: 15, speedMult: 0.0, sizeMult: 0.6, glowMult: 4.0 }, // Static sparkles
    luminous: { count: 40, speedMult: 2.0, sizeMult: 1.5, glowMult: 5.0 }, // High speed flow
    liquid: { count: 25, speedMult: 0.5, sizeMult: 1.1, glowMult: 2.0 }, // Slow flow
    glitch: { count: 5, speedMult: 10.0, sizeMult: 0.5, glowMult: 10.0 }, // Random chaotic
  };

  const params = modeParams[mode];
  const adjustedCount = params.count;
  const adjustedSpeed = speed * params.speedMult;
  const adjustedSize = size * params.sizeMult;
  const adjustedGlow = params.glowMult;
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const progressRef = useRef<number[]>([]);
  const dummyRef = useRef(new THREE.Object3D());

  // Initialize particle progress values (evenly spaced along curve)
  useEffect(() => {
    progressRef.current = Array.from({ length: adjustedCount }, (_, i) => i / adjustedCount);
  }, [adjustedCount]);

  // Animate particles along the curve
  useFrame((state, delta) => {
    if (!instancedMeshRef.current) return;

    const mesh = instancedMeshRef.current;
    const speedMultiplier = isHighlighted ? adjustedSpeed * 1.5 : adjustedSpeed;

    // Ensure we have enough particles initialized
    if (progressRef.current.length < adjustedCount) {
      progressRef.current = Array.from({ length: adjustedCount }, (_, i) => i / adjustedCount);
    }

    // Update each particle
    for (let i = 0; i < adjustedCount; i++) {
      // Safety check
      if (progressRef.current[i] === undefined) {
        progressRef.current[i] = i / adjustedCount;
      }

      // Advance progress
      progressRef.current[i] = (progressRef.current[i] + delta * speedMultiplier) % 1.0;

      // Get position on curve
      const point = curve.getPointAt(progressRef.current[i]);

      // Tangent usage removed as it was unused
      // const tangent = curve.getTangentAt(progressRef.current[i]);

      const dummy = dummyRef.current;

      // Set position
      dummy.position.copy(point);

      // Add slight bobbing motion for organic feel
      const bobOffset = Math.sin(state.clock.elapsedTime * 3.0 + i) * 0.01;
      dummy.position.y += bobOffset;

      // Scale particle based on progress (fade in/out at endpoints)
      const fadeDistance = 0.1;
      let scale = 1.0;
      if (progressRef.current[i] < fadeDistance) {
        scale = progressRef.current[i] / fadeDistance;
      } else if (progressRef.current[i] > 1.0 - fadeDistance) {
        scale = (1.0 - progressRef.current[i]) / fadeDistance;
      }

      // Apply pulsing effect
      const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 4.0 + i * 0.5) * 0.2;
      dummy.scale.setScalar(scale * pulse * (isHighlighted ? 1.5 : 1.0));

      // Update instance
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, adjustedCount]}>
      <sphereGeometry args={[adjustedSize, 8, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isHighlighted ? adjustedGlow * 1.5 : adjustedGlow}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
