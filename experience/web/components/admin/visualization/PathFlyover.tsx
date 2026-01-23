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
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { TransitionPathResponse, WaypointInfo } from "@love/experience-shared";

import { useAmbientAudio } from "@/hooks/useAmbientAudio";

export function PathFlyover() {
  const { camera } = useThree();
  const setIsFlying = useVisualizationStore((state) => state.setIsFlying);
  const isFlying = useVisualizationStore((state) => state.isFlying);
  const selectedPathId = useVisualizationStore((state) => state.selectedPathId);
  const computedPaths = useVisualizationStore((state) => state.computedPaths);
  const setHoveredEmotion = useVisualizationStore((state) => state.setHoveredEmotion);
  const hoveredEmotionId = useVisualizationStore((state) => state.hoveredEmotionId);
  const allEmotions = useVisualizationStore((state) => state.allEmotions);

  // Experience Store Sync (for PathDetailsOverlay)
  const setTransitionPath = useExperienceStore((state) => state.setTransitionPath);
  const setFlyoverProgress = useExperienceStore((state) => state.setFlyoverProgress);
  const flyoverSpeed = useExperienceStore((state) => state.flyoverSpeed);
  const setExperienceIsFlying = useExperienceStore((state) => state.setIsFlying);
  const expIsFlying = useExperienceStore((state) => state.isFlying);

  // Sync Experience -> Admin (Overlay controls Admin)
  // REMOVED: Bidirectional sync caused infinite loop.
  // Admin Store is the Source of Truth for Director Mode.
  // If we need Overlay to close Director Mode, it should call a specific action, not rely on store listening.

  // Sync Admin -> Experience (Admin engine updates Overlay UI)
  useEffect(() => {
    if (isFlying !== expIsFlying) {
      setExperienceIsFlying(isFlying);
    }
  }, [isFlying, setExperienceIsFlying, expIsFlying]);

  // SFX
  const { playWhoosh } = useAmbientAudio();

  // Animation state
  const progressRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const pathCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const lookAtRef = useRef(new THREE.Vector3());
  const lastPathIdRef = useRef<string | null>(null);

  // Waypoint tracking for labels
  const waypointsRef = useRef<Array<{ id: string; vec: THREE.Vector3 }>>([]);

  // Tuning parameters
  const BASE_DURATION = 12.0; // Seconds at 1x speed
  const LOOK_AHEAD = 0.05;

  // Setup path curve when selection changes
  useEffect(() => {
    if (!selectedPathId) {
      pathCurveRef.current = null;
      startTimeRef.current = null;
      progressRef.current = 0;
      setFlyoverProgress(0);
      lastPathIdRef.current = null;
      return;
    }

    // Only fully reset if ID changed
    if (selectedPathId !== lastPathIdRef.current) {
      progressRef.current = 0;
      setFlyoverProgress(0);
      startTimeRef.current = null;
      lastPathIdRef.current = selectedPathId;
    }

    const path = computedPaths.get(selectedPathId);
    if (!path) {
      console.warn("PathFlyover: Selected path not found");
      setIsFlying(false);
      return;
    }

    // MAP AND SYNC PATH TO EXPERIENCE STORE
    const mappedPath: TransitionPathResponse = {
      path_id: path.id,
      current_state: {
        emotion: path.from.name,
        vac: path.from.vac,
        category: path.from.category,
        quaternion: [0, 0, 0, 1],
      },
      goal_state: {
        emotion: path.to.name,
        vac: path.to.vac,
        category: path.to.category,
        quaternion: [0, 0, 0, 1],
      },
      waypoints: path.waypoints.map((wp, i): WaypointInfo => {
        const wpEmotion = allEmotions.find((e) => e.name === wp.emotion);
        return {
          emotion: wp.emotion,
          vac: wp.vac,
          reasoning: wp.reasoning,
          category: wpEmotion?.category || "Neutral",
          quaternion: [0, 0, 0, 1],
          order: i,
          distance_from_previous: 0,
          estimated_time: "0s",
          difficulty: "0",
          strategies: [],
        };
      }),
      created_at: new Date().toISOString(),
      visualization_data: {},
      path_metrics: {
        total_distance: 0,
        total_estimated_time: "0s",
        overall_difficulty: "0",
        success_probability: 1,
        requires_external_support: false,
      },
      alternatives: [],
      personalization_notes: [],
    };
    setTransitionPath(mappedPath);

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

    // Create curve matches PathNetwork visual
    pathCurveRef.current = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);

    // Note: We do NOT playSFX here automatically anymore, unless we want to separate "Select" from "Play".
    // Director mode usually starts immediately?
    // If we want "Play Journey" button to start it, we shouldn't start automatically.
    // But currently `selectedPathId` is set by clicking the list.
    // We probably want to wait for "Play".
    // So valid.
  }, [
    selectedPathId,
    computedPaths,
    allEmotions,
    setTransitionPath,
    setFlyoverProgress,
    setIsFlying,
  ]);

  // Sync isFlying state and handle restart logic (Ported from ViewerPathFlyover)
  useEffect(() => {
    if (isFlying) {
      playWhoosh(3.0);

      // Check store for explicit reset (e.g. from Plane button in Overlay)
      // or if we are at the end (Auto-Restart logic, though Overlay handles that too)
      const storeProgress = useExperienceStore.getState().flyoverProgress;

      // If store says 0 but we are at >1% locally, it means an external reset happened
      if (storeProgress === 0 && progressRef.current > 0.01) {
        progressRef.current = 0;
      }

      // Ensure we force a "resume" calc by clearing active ref
      startTimeRef.current = null;
    }
  }, [isFlying, playWhoosh]);

  // Cleanup: Clear hover states when unmounting or stopping flight
  useEffect(() => {
    if (!isFlying) {
      useVisualizationStore.getState().setHoveredEmotion(null);
    }
  }, [isFlying]);

  useFrame((state) => {
    if (!isFlying || !pathCurveRef.current) return;

    if (startTimeRef.current === null) {
      // Resume from current progress
      // t = elapsed / duration  =>  elapsed = t * duration
      // startTime = now - elapsed
      const duration = BASE_DURATION / flyoverSpeed; // Need this here for calc
      const accruedTime = progressRef.current * duration;
      startTimeRef.current = state.clock.elapsedTime - accruedTime;
    }

    // Dynamic duration based on speed
    const duration = BASE_DURATION / flyoverSpeed;
    const elapsed = state.clock.elapsedTime - startTimeRef.current;

    // Calculate progress (0 to 1)
    const rawProgress = elapsed / duration;

    // Ease-in-out cubic manually
    // t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
    const t = Math.min(Math.max(rawProgress, 0), 1);
    const easedProgress = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    progressRef.current = easedProgress;
    setFlyoverProgress(easedProgress);

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
    if (elapsed >= duration) {
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
