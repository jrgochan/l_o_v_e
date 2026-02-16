/**
 * Scene Component
 *
 * Sets up the Three.js scene with camera, lights, and the Soul Sphere.
 * Uses React Three Fiber Canvas for WebGL rendering.
 */

"use client";

// import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ViewerPathFlyover } from "@/components/ViewerPathFlyover";
import { OrbitControls } from "./OrbitControls";
import { SoulSphere } from "./SoulSphere";
import { EmotionCloud } from "@/components/admin/visualization/EmotionCloud";
import { TransitionPathRenderer } from "@/components/TransitionPathRenderer";
// import { WaypointTooltip } from "./WaypointTooltip";
import { Stars } from "@react-three/drei";
import { VACAnimator } from "@/components/VACAnimator";
import { VACAxisLabels3D } from "@/components/VACAxisLabels3D";

import { useExperienceStore } from "@/stores/useExperienceStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { logger } from "@/utils/logger";
// import type { WaypointData } from "@/types/journeys";

export function Scene() {
  const transitionPath = useExperienceStore((state) => state.transitionPath);
  const showPath = useExperienceStore((state) => state.showPath);
  const activeJourney = useExperienceStore((state) => state.activeJourney);
  const isFlying = useExperienceStore((state) => state.isFlying);

  // Layer visibility from settings
  const { layers } = useSettingsStore();

  // Tooltip state
  // const [hoveredWaypoint, setHoveredWaypoint] = useState<{
  //   index: number;
  //   screenPos: { x: number; y: number };
  //   data: WaypointData;
  //   state: string;
  // } | null>(null);

  // Debug logging
  logger.debug("rendering", "Scene render", {
    showPath,
    hasPath: !!transitionPath,
    pathWaypoints: transitionPath?.waypoints?.length,
    willRenderPath: showPath && transitionPath,
  });

  // Simple tooltip handler - shows in corner for now
  const handleWaypointHover = () => {
    // Disabled as per user request
    /* if (isHovering && waypointData) {
      setHoveredWaypoint({
        index: waypointData.index,
        screenPos: { x: 100, y: 100 }, // Fixed position for simplicity
        data: waypointData,
        state: waypointData.state,
      });
    } else {
      setHoveredWaypoint(null);
    } */
  };

  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]} // Support high DPI displays
      >
        {/* Helper Systems */}
        <VACAnimator />

        {/* Background */}
        <color attach="background" args={["#050510"]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />

        {/* Soul Sphere (Single or Cloud) */}
        {/* Soul Sphere Layer */}
        {layers.soulSphere && <SoulSphere />}

        {/* Emotion Cloud (Points) */}
        <group renderOrder={3}>
          <EmotionCloud enableFloatingLabels={true} />
        </group>

        {/* Transition Path (if generated and enabled) */}
        {showPath && transitionPath && layers.transitionPaths && (
          <TransitionPathRenderer
            path={transitionPath}
            activeJourney={activeJourney}
            onWaypointClick={(index) =>
              logger.debug("user-interaction", "Clicked waypoint", { index })
            }
            onWaypointHover={() => handleWaypointHover()}
          />
        )}

        {/* Cinematic Camera Controller */}
        <ViewerPathFlyover />

        {/* Camera controls - Disabled while flying */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          enabled={!isFlying}
        />

        {/* 3D Axis Labels (Helper) */}
        <VACAxisLabels3D />
      </Canvas>

      {/* Tooltip overlay */}
      {/* Tooltip overlay - Disabled as per user request */}
      {/* {hoveredWaypoint && hoveredWaypoint.data && (
        <WaypointTooltip
          waypoint={hoveredWaypoint.data}
          position={hoveredWaypoint.screenPos}
          waypointState={
            hoveredWaypoint.state as
              | "start"
              | "goal"
              | "reached"
              | "current"
              | "locked"
              | "waypoint"
          }
        />
      )} */}
    </>
  );
}
