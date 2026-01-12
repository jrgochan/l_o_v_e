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

  // Local state for flyover
  const [progress, setProgress] = useState(0);
  // label state removed in favor of PathDetailsOverlay
  const splineRef = useRef<THREE.CatmullRomCurve3 | null>(null);

  // Initialize spline when path changes
  useEffect(() => {
    if (transitionPath?.waypoints && transitionPath.waypoints.length >= 2) {
      // Create points array: Start -> Waypoints -> End
      const points = [
        new THREE.Vector3(...transitionPath.current_state.vac),
        ...transitionPath.waypoints.map((wp) => new THREE.Vector3(...wp.vac)),
        new THREE.Vector3(...transitionPath.goal_state.vac),
      ];

      splineRef.current = new THREE.CatmullRomCurve3(points);
      splineRef.current.tension = 0.5; // Smooth curve

      // Reset progress when path changes
      setProgress(0);
      setFlyoverProgress(0);
      setFlyoverCurrentWaypointIndex(-1);
    }
  }, [transitionPath, setFlyoverProgress, setFlyoverCurrentWaypointIndex]);

  // Reset when starting flight
  useEffect(() => {
    if (isFlying) {
      // On start (or restart), we don't necessarily reset progress to 0 if pausing/resuming
      // But per current logic, it seems to want to run a full path.
      // Let's keep existing behavior of reset on mount/start for now, but strictly speaking
      // if we pause we might want to resume.
      // The previous code had:
      // setTimeout(() => { setProgress(0); ... }, 0);
      // Let's only reset if progress is 1 (completed)
      if (progress >= 1) {
        setProgress(0);
        setFlyoverProgress(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlying]);

  useFrame(() => {
    if (!isFlying || !splineRef.current || !transitionPath) return;

    // Advance progress
    // Base speed modifiable by store
    const BASE_SPEED = 0.002;
    const step = BASE_SPEED * flyoverSpeed;

    const rawProgress = progress + step;

    if (rawProgress >= 1) {
      // Arrived
      setProgress(1);
      setFlyoverProgress(1);
      setIsFlying(false);

      // Position at goal
      const point = splineRef.current.getPointAt(1);
      camera.position.copy(point);
      camera.lookAt(0, 0, 0);
    } else {
      setProgress(rawProgress);
      setFlyoverProgress(rawProgress);

      // Get exact position on curve
      const point = splineRef.current.getPointAt(rawProgress);
      camera.position.copy(point);

      // Look ahead
      const lookAtProgress = Math.min(rawProgress + 0.05, 1);
      const lookAtPoint = splineRef.current.getPointAt(lookAtProgress);
      camera.lookAt(lookAtPoint);
      // Update store index if changed
      const totalPoints = transitionPath.waypoints.length + 2;
      const continuousIndex = rawProgress * (totalPoints - 1);
      const currentIndex = Math.floor(continuousIndex + 0.1);

      // Check against current store value (or local ref if we had one, but strict equality check in setter might handle it)
      // To be safe/performant, we rely on the fact that we are already updating progress every frame.
      // But let's only call if changed to minimize noise if we split components later.
      // Actually we don't have access to the previous value easily without a ref.
      // We'll trust zustand's equality check or just fire it.
      // But let's use a ref for local optimization if acceptable, or just fire it.
      // Given we fire setFlyoverProgress every frame, one more set isn't huge, but let's be nice.
      if (currentIndex !== flyoverCurrentWaypointIndexRef.current) {
        flyoverCurrentWaypointIndexRef.current = currentIndex;
        setFlyoverCurrentWaypointIndex(currentIndex);
      }
    }
  });

  // Ref to track last index to avoid store thrashing
  const flyoverCurrentWaypointIndexRef = useRef(-1);

  // No visual rendering from this component anymore, purely a camera controller
  // UI is handled by PathDetailsOverlay
  return null;
}
