/**
 * Transition Path Renderer
 *
 * Renders an emotional transition path as a glowing 3D curve with waypoint markers.
 * Shows the journey from current state to goal state through intermediate waypoints.
 */

"use client";

import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TransitionPathResponse } from "@love/experience-shared";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { WaypointData } from "@/types/journeys";
import { PathCurveAnimated } from "@/components/admin/paths/PathCurveAnimated";
import type { PathAnimationMode } from "@/types/visualization";

interface PathRendererProps {
  path: TransitionPathResponse;
  onWaypointClick?: (waypointIndex: number) => void;
  onWaypointHover?: (
    index: number | null,
    data: WaypointData | null,
    position: THREE.Vector3 | null,
    state: string
  ) => void;
  activeJourney?: {
    current_waypoint: number;
    waypoints_reached: number[];
    status: string;
  } | null;
}

export function TransitionPathRenderer({
  path,
  onWaypointClick,
  onWaypointHover,
  activeJourney,
}: PathRendererProps) {
  const [hoveredWaypoint, setHoveredWaypoint] = useState<number | null>(null);

  // Get current sphere color to choose contrasting tube color
  const currentVAC = useExperienceStore((state) => state.currentVAC);
  const [valence] = currentVAC;

  // Read animation mode from settings
  const pathAnimationMode = useSettingsStore((state) => state.pathAnimationMode);

  // Extract all points along the path (current → waypoints → goal)
  const pathPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];

    // Start point (current state)
    const [cv, ca, cc] = path.current_state.vac;
    points.push(new THREE.Vector3(cv, ca, cc));

    // Waypoints
    path.waypoints.forEach((wp) => {
      const [wv, wa, wc] = wp.vac;
      points.push(new THREE.Vector3(wv, wa, wc));
    });

    // Goal point
    const [gv, ga, gc] = path.goal_state.vac;
    points.push(new THREE.Vector3(gv, ga, gc));

    return points;
  }, [path]);

  // Determine waypoint state based on journey progress
  const getWaypointState = (
    index: number
  ): "start" | "goal" | "reached" | "current" | "locked" | "waypoint" => {
    if (index === 0) return "start";
    if (index === pathPoints.length - 1) return "goal";

    if (!activeJourney) return "waypoint"; // No journey active, show as normal waypoint

    const waypointIdx = index - 1; // Adjust for start point
    if (activeJourney.waypoints_reached.includes(waypointIdx)) return "reached";
    if (waypointIdx === activeJourney.current_waypoint) return "current";
    if (waypointIdx > activeJourney.current_waypoint) return "locked";

    return "waypoint";
  };

  // Create smooth curve using CatmullRomCurve3
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(pathPoints, false, "catmullrom", 0.5);
  }, [pathPoints]);

  // Create tube geometry for the path
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, 0.08, 16, false);
  }, [curve]);

  // Calculate base color
  const baseColor = useMemo(() => {
    return valence < 0 ? new THREE.Color(1.0, 0.2, 0.2) : new THREE.Color(0.2, 1.0, 0.2);
  }, [valence]);

  return (
    <group>
      {/* The glowing path tube - Animated */}
      <PathCurveAnimated
        mode={pathAnimationMode}
        tubeGeometry={tubeGeometry}
        color={baseColor}
        opacity={1.0}
        isSelected={true}
      />

      {/* Waypoint markers */}
      {pathPoints.map((point, index) => {
        // Get waypoint data for tooltip
        let waypointData: WaypointData;
        if (index === 0) {
          waypointData = {
            index,
            emotion: path.current_state.emotion,
            reasoning: "Your starting point",
            estimated_time: "-",
            difficulty: "-",
            vac: path.current_state.vac,
            state: "start" as const,
          };
        } else if (index === pathPoints.length - 1) {
          waypointData = {
            index,
            emotion: path.goal_state.emotion,
            reasoning: "Your destination",
            estimated_time: "-",
            difficulty: "-",
            vac: path.goal_state.vac,
            state: "goal" as const,
          };
        } else {
          const wp = path.waypoints[index - 1];
          waypointData = {
            index,
            emotion: wp.emotion,
            reasoning: wp.reasoning,
            estimated_time: wp.estimated_time,
            difficulty: wp.difficulty,
            vac: wp.vac,
            state: getWaypointState(index),
          };
        }

        return (
          <WaypointMarker
            key={index}
            position={point}
            index={index}
            state={getWaypointState(index)}
            isHovered={hoveredWaypoint === index}
            onClick={() => onWaypointClick?.(index)}
            onPointerOver={() => {
              setHoveredWaypoint(index);
              onWaypointHover?.(index, waypointData, point, getWaypointState(index));
            }}
            onPointerOut={() => {
              setHoveredWaypoint(null);
              onWaypointHover?.(null, null, null, "");
            }}
            mode={pathAnimationMode}
          />
        );
      })}
    </group>
  );
}

/**
 * Waypoint Marker Component
 *
 * Renders a sphere at each waypoint with different colors/states.
 */
interface WaypointMarkerProps {
  position: THREE.Vector3;
  index: number;
  state: "start" | "goal" | "reached" | "current" | "locked" | "waypoint";
  isHovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
  mode: PathAnimationMode;
}

function WaypointMarker(props: WaypointMarkerProps) {
  const { position, index, state, isHovered, onClick, onPointerOver, onPointerOut, mode } = props;
  const meshRef = useRef<THREE.Mesh>(null);

  // Different colors for different waypoint states
  const color = useMemo(() => {
    switch (state) {
      case "start":
        return new THREE.Color(0.2, 0.5, 1.0); // Blue
      case "goal":
        return new THREE.Color(0.2, 1.0, 0.2); // Green
      case "reached":
        return new THREE.Color(0.2, 0.8, 0.2); // Light green (completed)
      case "current":
        return new THREE.Color(1.0, 0.6, 1.0); // Bright purple (active)
      case "locked":
        return new THREE.Color(0.4, 0.4, 0.4); // Gray (not yet available)
      default:
        return new THREE.Color(0.8, 0.4, 1.0); // Purple (available waypoint)
    }
  }, [state]);

  // Pulsing animation for current waypoint
  useFrame((frameState) => {
    if (!meshRef.current) return;

    const time = frameState.clock.elapsedTime;
    let pulse = 1.0;

    // Base pulsing based on mode (from Admin logic)
    switch (mode) {
      case "subtle":
        pulse = 1.0 + Math.sin(time * 2.0 + index) * 0.1;
        break;
      case "dynamic": {
        const base = Math.sin(time * 3.5 + index) * 0.2;
        const overshoot = Math.sin(time * 7.0 + index) * 0.05;
        pulse = 1.0 + base + overshoot;
        break;
      }
      case "mystical": {
        const wave1 = Math.sin(time * 1.7 + index) * 0.12;
        const wave2 = Math.sin(time * 2.3 + index * 0.5) * 0.08;
        const wave3 = Math.sin(time * 3.1 + index * 0.2) * 0.05;
        pulse = 1.0 + wave1 + wave2 + wave3;
        break;
      }
      default:
        pulse = 1.0 + Math.sin(time * 2.0 + index) * 0.1;
    }

    // State overrides
    if (state === "current") {
      pulse = 1.0 + Math.sin(time * 3.0) * 0.15 + pulse * 0.5; // Combine with mode
    }

    // Enlarge on hover
    if (isHovered) {
      meshRef.current.scale.setScalar(pulse * 1.3);
    } else if (state === "start" || state === "goal" || state === "reached" || state === "locked") {
      meshRef.current.scale.setScalar(1.0);
    } else {
      meshRef.current.scale.setScalar(pulse);
    }
  });

  const size =
    state === "waypoint" || state === "current" || state === "reached" || state === "locked"
      ? 0.08
      : 0.12;
  const opacity = state === "locked" ? 0.4 : 0.9;
  const emissiveIntensity = state === "current" ? (isHovered ? 3.0 : 2.0) : isHovered ? 2.0 : 1.0;

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        transparent
        opacity={opacity}
      />

      {/* Outer glow ring */}
      <mesh>
        <sphereGeometry args={[size * 1.5, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.BackSide} />
      </mesh>
    </mesh>
  );
}
