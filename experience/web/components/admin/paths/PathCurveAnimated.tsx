/**
 * Path Curve Animated - Router Component
 *
 * Selects the appropriate animation mode based on user settings
 */

"use client";

import * as THREE from "three";
import type { PathAnimationMode } from "@/types/atlas-admin";
import { SubtleElegantPath } from "./SubtleElegantPath";
import { DynamicPlayfulPath } from "./DynamicPlayfulPath";
import { MysticalEtherealPath } from "./MysticalEtherealPath";

interface PathCurveAnimatedProps {
  mode: PathAnimationMode;
  tubeGeometry: THREE.TubeGeometry;
  color: THREE.Color;
  opacity: number;
  isSelected: boolean;
}

export function PathCurveAnimated({
  mode,
  tubeGeometry,
  color,
  opacity,
  isSelected,
}: PathCurveAnimatedProps) {
  const sharedProps = {
    tubeGeometry,
    color,
    opacity,
    isSelected,
  };

  switch (mode) {
    case "subtle":
      return <SubtleElegantPath {...sharedProps} />;

    case "dynamic":
      return <DynamicPlayfulPath {...sharedProps} />;

    case "mystical":
      return <MysticalEtherealPath {...sharedProps} />;

    default:
      // Fallback to subtle if unknown mode
      return <SubtleElegantPath {...sharedProps} />;
  }
}
