/**
 * VAC Animator Component
 *
 * Handles the interpolation of VAC values from Target to Current.
 * This ensures the Store's currentVAC is always updated, driving
 * both the 3D Sphere and the 2D UI Display, even if the Sphere is hidden.
 */

"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperienceStore } from "@/stores/useExperienceStore";

export function VACAnimator() {
  const targetVAC = useExperienceStore((state) => state.targetVAC);
  // We don't subscribe to currentVAC to avoid re-rendering ourselves while animating others
  // const currentVAC = useExperienceStore((state) => state.currentVAC);
  const updateCurrent = useExperienceStore((state) => state.updateCurrent);
  const setIsAnimating = useExperienceStore((state) => state.setIsAnimating);
  const isAnimating = useExperienceStore((state) => state.isAnimating);

  useFrame((state, delta) => {
    // Only animate if needed (optimization)
    // We check distance every frame to ensure we settle exactly on target
    // Read fresh values from store
    const currentVAC = useExperienceStore.getState().currentVAC;
    const [currentV, currentA, currentC] = currentVAC;
    const [targetV, targetA, targetC] = targetVAC;

    const distSq =
      Math.pow(targetV - currentV, 2) +
      Math.pow(targetA - currentA, 2) +
      Math.pow(targetC - currentC, 2);

    // Stop if very close and not forced to animate
    if (distSq < 0.000001 && !isAnimating) return;

    // Smooth interpolation speed
    // Use a fixed speed or dependent on delta
    const lerpSpeed = 3.0 * delta; // Adjusted for responsiveness

    const newValence = THREE.MathUtils.lerp(currentV, targetV, lerpSpeed);
    const newArousal = THREE.MathUtils.lerp(currentA, targetA, lerpSpeed);
    const newConnection = THREE.MathUtils.lerp(currentC, targetC, lerpSpeed);

    // Update store
    // Passing identity quaternion for now, as rotation is handled separately or derived
    const newVAC: [number, number, number] = [newValence, newArousal, newConnection];
    updateCurrent(newVAC, [0, 0, 0, 1]);

    // Check completion
    if (distSq < 0.0001) {
      if (isAnimating) setIsAnimating(false);
      // Snap to exact target when done to avoid micro-jitter
      if (distSq < 0.0000001) {
        updateCurrent(targetVAC, [0, 0, 0, 1]);
      }
    }
  });

  return null; // Headless component
}
