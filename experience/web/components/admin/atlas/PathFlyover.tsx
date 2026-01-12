/**
 * PathFlyover Component
 *
 * "Director Mode" Camera Controller.
 * Animates the camera along the selected path curve to provide a cinematic experience.
 */

"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

import { useAmbientAudio } from "@/hooks/useAmbientAudio";

export function PathFlyover() {
  const { camera } = useThree();
  const setIsFlying = useAtlasAdminStore((state) => state.setIsFlying);
  const isFlying = useAtlasAdminStore((state) => state.isFlying);
  const selectedPathId = useAtlasAdminStore((state) => state.selectedPathId);
  const computedPaths = useAtlasAdminStore((state) => state.computedPaths);
  const setHoveredEmotion = useAtlasAdminStore((state) => state.setHoveredEmotion);
  const hoveredEmotionId = useAtlasAdminStore((state) => state.hoveredEmotionId);
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);

  // SFX
  const { playWhoosh } = useAmbientAudio();

  // Animation state
  const progressRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const pathCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const lookAtRef = useRef(new THREE.Vector3());
  const initialCameraPosRef = useRef(new THREE.Vector3());
  // const initialCameraTargetRef = useRef(new THREE.Vector3());

  // Waypoint tracking for labels
  const waypointsRef = useRef<Array<{ id: string; vec: THREE.Vector3 }>>([]);

  // Tuning parameters
  // Duration scales with path length? Fixed for now.
  const FLY_DURATION = 12.0; // Seconds
  const LOOK_AHEAD = 0.05; // 5% ahead of current position

  // Setup flyover when triggered
  useEffect(() => {
    if (!isFlying || !selectedPathId) {
      pathCurveRef.current = null;
      startTimeRef.current = null;
      progressRef.current = 0;
      return;
    }

    const path = computedPaths.get(selectedPathId);
    if (!path) {
      console.warn("PathFlyover: Selected path not found");
      setIsFlying(false);
      return;
    }

    // Build the curve dynamically from path waypoints
    const points: THREE.Vector3[] = [];
    const activeWaypoints: Array<{ id: string; vec: THREE.Vector3 }> = [];

    // Start
    const startVec = new THREE.Vector3(...path.from.vac);
    points.push(startVec);
    activeWaypoints.push({ id: path.from.id, vec: startVec });

    // Intermediate Waypoints
    path.waypoints.forEach((wp) => {
      const vec = new THREE.Vector3(...wp.vac);
      points.push(vec);
      // Lookup ID by name (PathWaypoint.emotion is name)
      const emotion = allEmotions.find((e) => e.name === wp.emotion);
      if (emotion) {
        activeWaypoints.push({ id: emotion.id, vec });
      }
    });

    // End
    const endVec = new THREE.Vector3(...path.to.vac);
    points.push(endVec);
    activeWaypoints.push({ id: path.to.id, vec: endVec });

    // Cache Waypoints for proximity check
    waypointsRef.current = activeWaypoints;

    // Create curve matching PathNetwork visual
    pathCurveRef.current = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);

    // Store initial state to possibly smoothly transition? (For now simplified reset)
    initialCameraPosRef.current.copy(camera.position);

    // Play SFX
    playWhoosh(3.0);
  }, [
    isFlying,
    selectedPathId,
    computedPaths,
    setIsFlying,
    camera.position,
    playWhoosh,
    allEmotions,
  ]);

  // Cleanup: Clear hover states when unmounting or stopping flight
  useEffect(() => {
    if (!isFlying) {
      useAtlasAdminStore.getState().setHoveredEmotion(null);
    }
  }, [isFlying]);

  useFrame((state) => {
    if (!isFlying || !pathCurveRef.current) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const rawProgress = elapsed / FLY_DURATION;

    // Ease-in-out cubic manually
    // t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
    const t = Math.min(Math.max(rawProgress, 0), 1);
    const easedProgress = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    progressRef.current = easedProgress;

    // Get position on curve
    const currentPos = pathCurveRef.current.getPointAt(easedProgress);

    // Calculate look-ahead target
    const lookAheadProgress = Math.min(easedProgress + LOOK_AHEAD, 1.0);
    const targetPos = pathCurveRef.current.getPointAt(lookAheadProgress);

    // Apply offset to camera relative to curve point so we aren't INSIDE the line
    // We want to be slightly above and behind the "current point" looking at "target"
    // But for a flyover, maybe we want to be exactly ON the line?
    // Let's try slightly offset to see the path better.

    // Approach 2: Camera travels ON the line, looking forward.
    camera.position.copy(currentPos);

    // Smooth lookAt
    lookAtRef.current.lerp(targetPos, 0.1);
    camera.lookAt(lookAtRef.current);

    // End condition
    if (elapsed >= FLY_DURATION) {
      setIsFlying(false);
      setHoveredEmotion(null);
      // Optional: Snap to final view or drift
    }

    // --- Waypoint Proximity Check ---
    // Find closest waypoint to current camera position
    let closestDist = Infinity;
    let closestId = null;

    for (const wp of waypointsRef.current) {
      const dist = camera.position.distanceTo(wp.vec);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = wp.id;
      }
    }

    // Trigger hover if close enough (Threshold: 0.8 units)
    const PROXIMITY_THRESHOLD = 0.8;
    if (closestId && closestDist < PROXIMITY_THRESHOLD) {
      if (hoveredEmotionId !== closestId) {
        setHoveredEmotion(closestId);
      }
    } else if (hoveredEmotionId !== null) {
      // Clear if we moved away from everything
      setHoveredEmotion(null);
    }
  });

  return null;
}
