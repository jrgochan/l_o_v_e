/**
 * Custom OrbitControls Component
 *
 * Simple camera controls for rotating and zooming the Soul Sphere.
 * Replaces @react-three/drei to avoid peer dependency conflicts.
 */

"use client";

import { useEffect, useRef } from "react";
import { extend, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";

// Extend R3F with OrbitControls
extend({ OrbitControls: OrbitControlsImpl });

interface OrbitControlsProps {
  enableDamping?: boolean;
  dampingFactor?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
  minDistance?: number;
  maxDistance?: number;
  enabled?: boolean;
}

export function OrbitControls({
  enableDamping = true,
  dampingFactor = 0.05,
  enablePan = false,
  enableZoom = true,
  minDistance = 3,
  maxDistance = 10,
  enabled = true,
}: OrbitControlsProps) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    controls.enabled = enabled;
    controls.enableDamping = enableDamping;
    controls.dampingFactor = dampingFactor;
    controls.enablePan = enablePan;
    controls.enableZoom = enableZoom;
    controls.minDistance = minDistance;
    controls.maxDistance = maxDistance;

    return () => {
      controls.dispose();
    };
  }, [enableDamping, dampingFactor, enablePan, enableZoom, minDistance, maxDistance, enabled]);

  useFrame(() => {
    if (controlsRef.current && enableDamping) {
      controlsRef.current.update();
    }
  });

  // @ts-expect-error - R3F extended component
  return <orbitControls ref={controlsRef} args={[camera, gl.domElement]} />;
}
