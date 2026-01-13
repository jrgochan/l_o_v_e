import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useExperienceStore } from "@/stores/useExperienceStore";

export function ViewerPathFlyover() {
  const { camera } = useThree();
  const transitionPath = useExperienceStore((state) => state.transitionPath);
  const isFlying = useExperienceStore((state) => state.isFlying);
  const setIsFlying = useExperienceStore((state) => state.setIsFlying);

  // Read settings from store
  const flyoverSpeed = useExperienceStore((state) => state.flyoverSpeed);
  const setFlyoverProgress = useExperienceStore((state) => state.setFlyoverProgress);
  const setFlyoverCurrentWaypointIndex = useExperienceStore(
    (state) => state.setFlyoverCurrentWaypointIndex
  );

  // Animation state
  const progressRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const lookAtRef = useRef(new THREE.Vector3());
  const splineRef = useRef<THREE.CatmullRomCurve3 | null>(null);

  const BASE_DURATION = 12.0;
  const LOOK_AHEAD = 0.05;

  // Initialize spline when path changes
  useEffect(() => {
    if (transitionPath) {
      // Create points array: Start -> Waypoints -> End
      const points = [
        new THREE.Vector3(...transitionPath.current_state.vac),
        ...transitionPath.waypoints.map((wp) => new THREE.Vector3(...wp.vac)),
        new THREE.Vector3(...transitionPath.goal_state.vac),
      ];

      // Only create spline if we have enough points (Start + End = 2 minimum)
      if (points.length >= 2) {
        splineRef.current = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);

        // Reset progress when path changes
        progressRef.current = 0;
        setFlyoverProgress(0);
        setFlyoverCurrentWaypointIndex(-1);
      }
    }
  }, [transitionPath, setFlyoverProgress, setFlyoverCurrentWaypointIndex]);

  // Sync isFlying state and handle restart logic
  useEffect(() => {
    if (isFlying) {
      // Check store for explicit reset (e.g. from Plane button)
      // or if we are at the end (Auto-Restart)
      const storeProgress = useExperienceStore.getState().flyoverProgress;

      if (storeProgress === 0 && progressRef.current > 0.01) {
        // External reset detected
        progressRef.current = 0;
      } else if (progressRef.current >= 0.99) {
        // Auto-Restart at end of path
        progressRef.current = 0;
        setFlyoverProgress(0);
      }

      startTimeRef.current = null;
    }
  }, [isFlying, setFlyoverProgress]);

  useFrame((state) => {
    if (!isFlying || !splineRef.current || !transitionPath) return;

    if (startTimeRef.current === null) {
      // Resume from current progress
      const duration = BASE_DURATION / flyoverSpeed;
      const accruedTime = progressRef.current * duration;
      startTimeRef.current = state.clock.elapsedTime - accruedTime;
    }

    const duration = BASE_DURATION / flyoverSpeed;
    const elapsed = state.clock.elapsedTime - startTimeRef.current;

    // Calculate progress
    const rawProgress = elapsed / duration;

    // Easing (Standard Ease-In-Out Cubic)
    const t = Math.min(Math.max(rawProgress, 0), 1);
    const easedProgress = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    progressRef.current = easedProgress;
    setFlyoverProgress(easedProgress);

    // Position
    const currentPos = splineRef.current.getPointAt(easedProgress);
    camera.position.copy(currentPos);

    // Look At
    const lookAheadProgress = Math.min(easedProgress + LOOK_AHEAD, 1.0);
    const targetPos = splineRef.current.getPointAt(lookAheadProgress);

    // Smooth lookAt
    lookAtRef.current.lerp(targetPos, 0.1);
    camera.lookAt(lookAtRef.current);

    // Waypoint Index Tracking
    const totalPoints = transitionPath.waypoints.length + 2;
    const continuousIndex = easedProgress * (totalPoints - 1);
    const currentIndex = Math.floor(continuousIndex + 0.1);

    if (currentIndex !== flyoverCurrentWaypointIndexRef.current) {
      flyoverCurrentWaypointIndexRef.current = currentIndex;
      setFlyoverCurrentWaypointIndex(currentIndex);
    }

    // End
    if (elapsed >= duration) {
      setIsFlying(false);
    }
  });

  // Ref to track last index
  const flyoverCurrentWaypointIndexRef = useRef(-1);

  return null;
}
