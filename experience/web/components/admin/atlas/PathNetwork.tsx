/**
 * Path Network Component
 *
 * Renders multiple transition paths between selected emotions.
 * Each path is color-coded by difficulty and shows waypoints.
 */

"use client";

import { useMemo, useRef } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { DIFFICULTY_COLORS, CATEGORY_COLORS } from "@/types/atlas-admin";
import type { EmotionPath } from "@/types/atlas-admin";
import { PathParticles } from "../visualizations/PathParticles";
import { PathCurveAnimated } from "../paths/PathCurveAnimated";
import { WaypointMarker } from "./WaypointMarker";

export function PathNetwork() {
  const computedPaths = useAtlasAdminStore((state) => state.computedPaths);
  const selectedIds = useAtlasAdminStore((state) => state.selectedEmotionIds);
  const layers = useAtlasAdminStore((state) => state.layers);
  const settings = useAtlasAdminStore((state) => state.settings);
  const transitionPath = useExperienceStore((state) => state.transitionPath);

  // Identify active path from experience store (Browsing Mode)
  const activePathDetails = useMemo(() => {
    if (!transitionPath?.current_state?.emotion || !transitionPath?.goal_state?.emotion)
      return null;
    return {
      from: transitionPath.current_state.emotion,
      to: transitionPath.goal_state.emotion,
    };
  }, [transitionPath]);

  // Filter paths: Show if both endpoints selected OR if it's the active browsing path
  const paths = Array.from(computedPaths.values()).filter((path) => {
    const isSelected = selectedIds.has(path.from.id) && selectedIds.has(path.to.id);
    const isActive = activePathDetails
      ? path.from.name === activePathDetails.from && path.to.name === activePathDetails.to
      : false;

    return isSelected || isActive;
  });

  if (!layers.transitionPaths || paths.length === 0) {
    return null;
  }

  return (
    <group>
      {paths.map((path) => (
        <PathCurve
          key={path.id}
          path={path}
          opacity={settings.pathOpacity}
          showWaypoints={layers.waypoints}
          activePathDetails={activePathDetails}
        />
      ))}
    </group>
  );
}

interface PathCurveProps {
  path: EmotionPath;
  opacity: number;
  showWaypoints: boolean;
  activePathDetails: { from: string; to: string } | null;
}

function PathCurve({ path, opacity, showWaypoints, activePathDetails }: PathCurveProps) {
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const selectedPathId = useAtlasAdminStore((state) => state.selectedPathId);
  const hoveredPathId = useAtlasAdminStore((state) => state.hoveredPathId);
  const setHoveredPath = useAtlasAdminStore((state) => state.setHoveredPath);
  const setSelectedPath = useAtlasAdminStore((state) => state.setSelectedPath);
  const pathAnimationMode = useAtlasAdminStore((state) => state.settings.pathAnimationMode);

  // Check if this specific path matches the active transition details
  const isActive = activePathDetails
    ? path.from.name === activePathDetails.from && path.to.name === activePathDetails.to
    : false;

  const isSelected = selectedPathId === path.id || isActive;
  const isHovered = hoveredPathId === path.id;
  const isGlobalDimmed = !!hoveredPathId || !!activePathDetails;

  // Dynamic opacity logic
  const currentOpacity = useMemo(() => {
    if (isHovered) return 1.0;
    if (isSelected) return 0.8; // Active/Selected paths stay bright
    if (isGlobalDimmed) return 0.05; // Others fade out deeply
    return opacity;
  }, [isHovered, isSelected, isGlobalDimmed, opacity]);

  // Build path points: start → waypoints → end
  const points = useMemo(() => {
    const pathPoints: THREE.Vector3[] = [];

    // Start
    pathPoints.push(new THREE.Vector3(...path.from.vac));

    // Waypoints
    path.waypoints.forEach((wp) => {
      pathPoints.push(new THREE.Vector3(...wp.vac));
    });

    // End
    pathPoints.push(new THREE.Vector3(...path.to.vac));

    return pathPoints;
  }, [path]);

  // Create smooth curve
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
  }, [points]);

  // Create tube geometry (increased radius for easier clicking)
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, 0.04, 8, false);
  }, [curve]);

  // Color based on difficulty
  const color = useMemo(() => {
    const colorHex = DIFFICULTY_COLORS[path.difficulty];
    return new THREE.Color(colorHex);
  }, [path.difficulty]);

  // Helper function to get category color for a waypoint emotion
  const getWaypointCategoryColor = (emotionName: string): string => {
    const emotion = allEmotions.find((e) => e.name === emotionName);
    if (emotion && emotion.category && CATEGORY_COLORS[emotion.category]) {
      return CATEGORY_COLORS[emotion.category];
    }
    return "#888888"; // Fallback gray if not found
  };

  // Hover handlers
  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredPath(path.id);
    document.body.style.cursor = "pointer";
  };

  const handlePointerLeave = () => {
    setHoveredPath(null);
    document.body.style.cursor = "auto";
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Toggle selection: if already selected, clear it, otherwise select it
    if (isSelected) {
      setSelectedPath(null);
    } else {
      setSelectedPath(path.id);
    }
  };

  return (
    <group
      data-testid="path-group"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      {/* Animated path tube - mode-based animation */}
      <PathCurveAnimated
        mode={pathAnimationMode}
        tubeGeometry={tubeGeometry}
        color={color}
        opacity={currentOpacity}
        isSelected={isSelected}
      />

      {/* Waypoint markers */}
      {showWaypoints &&
        path.waypoints.map((waypoint, index) => (
          <WaypointMarker
            key={index}
            position={waypoint.vac}
            emotionName={waypoint.emotion}
            categoryColor={getWaypointCategoryColor(waypoint.emotion)}
            isHighlighted={isSelected || isHovered}
            mode={pathAnimationMode}
            opacity={currentOpacity}
          />
        ))}

      {/* Animated particles showing directionality */}
      <PathParticles
        curve={curve}
        color={color}
        particleCount={10}
        speed={0.3}
        size={0.025}
        opacity={currentOpacity}
        isHighlighted={isSelected}
        mode={pathAnimationMode}
      />
    </group>
  );
}

// Component cleanup
