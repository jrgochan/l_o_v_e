"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { Html } from "@react-three/drei";
import { useSpring, animated } from "@react-spring/web";

export function ViewerPathFlyover() {
  const { camera } = useThree();
  const transitionPath = useExperienceStore((state) => state.transitionPath);
  const isFlying = useExperienceStore((state) => state.isFlying);
  const setIsFlying = useExperienceStore((state) => state.setIsFlying);

  // Local state for flyover
  const [progress, setProgress] = useState(0);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const splineRef = useRef<THREE.CatmullRomCurve3 | null>(null);

  // Animation springs for label UI
  const [springs, api] = useSpring(() => ({
    opacity: 0,
    y: 20,
    config: { tension: 280, friction: 60 },
  }));

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
    }
  }, [transitionPath]);

  // Reset when starting flight
  useEffect(() => {
    if (isFlying) {
      setTimeout(() => {
        setProgress(0);
        setCurrentLabel("Departing: " + transitionPath?.current_state.emotion);
      }, 0);
      api.start({ opacity: 1, y: 0 });
    } else {
      api.start({ opacity: 0, y: 20 });
    }
  }, [isFlying, transitionPath, api]);

  useFrame(() => {
    if (!isFlying || !splineRef.current) return;

    // Advance progress (matching Admin speed/duration approx)
    const SPEED = 0.002; // Slightly faster than before
    const rawProgress = progress + SPEED;

    // Easing for cinematic feel (Ease-in-out cubic)
    // t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
    // actually, let's just stick to linear progress for now unless we refactor to time-based
    // keeping it simple but strictly adhering to path

    if (rawProgress >= 1) {
      // Arrived
      setProgress(1);
      setIsFlying(false);

      // Position at goal
      const point = splineRef.current.getPointAt(1);
      camera.position.copy(point);
      // Look slightly down/center
      camera.lookAt(0, 0, 0);
    } else {
      setProgress(rawProgress);

      // Get exact position on curve
      const point = splineRef.current.getPointAt(rawProgress);

      // "Through the path" mode: Stick strictly to the rail
      // Admin uses: camera.position.copy(currentPos);
      camera.position.copy(point);

      // Look ahead
      // We look slightly ahead to steer the camera
      const lookAtProgress = Math.min(rawProgress + 0.05, 1);
      const lookAtPoint = splineRef.current.getPointAt(lookAtProgress);
      camera.lookAt(lookAtPoint);

      // Update labels based on progress zones
      if (transitionPath) {
        // Approximate waypoint indices
        const totalPoints = transitionPath.waypoints.length + 2; // start, end, + waypoints
        const segmentSize = 1 / (totalPoints - 1);

        transitionPath.waypoints.forEach((wp, index) => {
          // waypoints are at indices 1..N
          const wpProgress = (index + 1) * segmentSize;
          if (Math.abs(rawProgress - wpProgress) < 0.05) {
            if (currentLabel !== wp.emotion) {
              setCurrentLabel(wp.emotion);
            }
          }
        });

        if (rawProgress > 0.95 && currentLabel !== transitionPath.goal_state.emotion) {
          setCurrentLabel("Arriving: " + transitionPath.goal_state.emotion);
        }
      }
    }
  });

  if (!isFlying) return null;

  return (
    <Html center position={[0, -0.5, 0]} style={{ pointerEvents: "none" }}>
      <animated.div
        style={{
          ...springs,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          padding: "12px 24px",
          borderRadius: "24px",
          color: "white",
          border: "1px solid rgba(255,255,255,0.2)",
          fontFamily: "Inter, sans-serif",
          fontSize: "14px",
          whiteSpace: "nowrap",
        }}
      >
        {currentLabel}
      </animated.div>
    </Html>
  );
}
