import { useFrame } from "@react-three/fiber";
import { RefObject } from "react";
import * as THREE from "three";

export function useWaypointPulse(
  meshRef: RefObject<THREE.Mesh | null>,
  mode: "subtle" | "dynamic" | "mystical"
) {
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;
    let pulse = 1.0;

    switch (mode) {
      case "subtle":
        // Gentle pulsing (2.0 Hz, 10% amplitude)
        pulse = 1.0 + Math.sin(time * 2.0) * 0.1;
        break;

      case "dynamic": {
        // Bouncy pulsing (3.5 Hz, 20% amplitude with harmonic overshoot)
        const base = Math.sin(time * 3.5) * 0.2;
        const overshoot = Math.sin(time * 7.0) * 0.05; // Double frequency harmonic
        pulse = 1.0 + base + overshoot;
        break;
      }

      case "mystical": {
        // Ethereal shimmer (variable frequency, quantum-like)
        const wave1 = Math.sin(time * 1.7) * 0.12;
        const wave2 = Math.sin(time * 2.3) * 0.08;
        const wave3 = Math.sin(time * 3.1) * 0.05;
        pulse = 1.0 + wave1 + wave2 + wave3;
        break;
      }
    }

    meshRef.current.scale.setScalar(pulse);
  });
}
