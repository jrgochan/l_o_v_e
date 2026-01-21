/**
 * Mini Soul Sphere Component
 *
 * CSS-based sphere for Data Visualization Mode (no WebGL).
 * Displays emotion with gradient colors based on VAC coordinates.
 * Designed for performance when showing all emotions simultaneously.
 */

"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { AtlasEmotion } from "@/types/atlas-admin";
import { resolveEmotionColor } from "@/utils/emotion-colors";

interface MiniSoulSphereProps {
  emotion: AtlasEmotion;
  colorMode: "category" | "valence" | "arousal" | "connection";
  size?: number;
  onClick?: () => void;
  isHovered?: boolean;
}

/**
 * CSS-based mini sphere - much more performant than WebGL
 */
export function MiniSoulSphere({
  emotion,
  colorMode,
  size = 60,
  onClick,
  isHovered = false,
}: MiniSoulSphereProps) {
  // Determine color based on mode
  const colorHex = useMemo(() => {
    switch (colorMode) {
      case "category":
        return resolveEmotionColor(emotion);

      case "valence": {
        // Red (negative) to Green (positive)
        const valence = emotion.vac[0];
        const hue = ((valence + 1) / 2) * 120; // 0-120 degrees
        return new THREE.Color().setHSL(hue / 360, 0.8, 0.5).getHexString();
      }

      case "arousal": {
        // Blue (low) to Red (high)
        const arousal = emotion.vac[1];
        const normalized = (arousal + 1) / 2;
        const hue = (1 - normalized) * 240; // 240-0 degrees
        return new THREE.Color().setHSL(hue / 360, 0.8, 0.5).getHexString();
      }

      case "connection": {
        // Purple (low) to Yellow (high)
        const connection = emotion.vac[2];
        const normalized = (connection + 1) / 2;
        const hue = normalized * 60 + 270; // 270-330 degrees
        return new THREE.Color().setHSL((hue % 360) / 360, 0.8, 0.5).getHexString();
      }

      default:
        return "#888888";
    }
  }, [emotion, colorMode]);

  // Ensure hash prefix for non-category hex strings (THREE returns without hash)
  const finalColor = colorHex.startsWith("#") ? colorHex : `#${colorHex}`;

  return (
    <div
      className="mini-soul-sphere-container flex flex-col items-center gap-2"
      style={{
        width: `${size}px`,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      {/* Wrapper to prevent layout shift on hover */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: `${size * 0.7}px`,
          height: `${size * 0.7}px`,
        }}
      >
        {/* CSS Sphere with gradient - positioned absolutely to avoid layout shift */}
        <div
          className="absolute inset-0 transition-all duration-200"
          style={{
            borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%, ${finalColor}dd, ${finalColor} 60%, ${finalColor}88)`,
            display: "flex", // Ensure it renders
            boxShadow: isHovered
              ? `0 0 20px ${finalColor}aa, inset 0 0 10px ${finalColor}44`
              : `0 0 10px ${finalColor}66, inset 0 0 5px ${finalColor}22`,
            transform: isHovered ? "scale(1.1)" : "scale(1)",
            filter: isHovered ? "brightness(1.2)" : "brightness(1)",
          }}
        >
          {/* Shine effect */}
          <div
            className="absolute top-[15%] left-[25%] w-[30%] h-[30%] rounded-full opacity-60"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.8), transparent)",
            }}
          />
        </div>
      </div>

      {/* Emotion label */}
      <div
        className="text-center text-xs font-medium truncate w-full px-1 transition-colors duration-200"
        style={{
          color: isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.8)",
        }}
      >
        {emotion.name}
      </div>
    </div>
  );
}
