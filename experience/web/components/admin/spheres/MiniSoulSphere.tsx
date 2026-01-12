/**
 * Mini Soul Sphere Component
 *
 * CSS-based sphere for Data Visualization Mode (no WebGL).
 * Displays emotion with gradient colors based on VAC coordinates.
 * Designed for performance when showing all 87 emotions simultaneously.
 */

"use client";

import { useMemo } from "react";
import type { AtlasEmotion } from "@/types/atlas-admin";
import { CATEGORY_COLORS } from "@/types/atlas-admin";

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
        return CATEGORY_COLORS[emotion.category] || "#888888";

      case "valence": {
        // Red (negative) to Green (positive)
        const valence = emotion.vac[0];
        const hue = ((valence + 1) / 2) * 120; // 0-120 degrees
        return `hsl(${hue}, 80%, 50%)`;
      }

      case "arousal": {
        // Blue (low) to Red (high)
        const arousal = emotion.vac[1];
        const normalized = (arousal + 1) / 2;
        const hue = (1 - normalized) * 240; // 240-0 degrees
        return `hsl(${hue}, 80%, 50%)`;
      }

      case "connection": {
        // Purple (low) to Yellow (high)
        const connection = emotion.vac[2];
        const normalized = (connection + 1) / 2;
        const hue = normalized * 60 + 270; // 270-330 degrees
        return `hsl(${hue}, 80%, 50%)`;
      }

      default:
        return "#888888";
    }
  }, [emotion, colorMode]);

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
            background: `radial-gradient(circle at 30% 30%, ${colorHex}dd, ${colorHex} 60%, ${colorHex}88)`,
            boxShadow: isHovered
              ? `0 0 20px ${colorHex}aa, inset 0 0 10px ${colorHex}44`
              : `0 0 10px ${colorHex}66, inset 0 0 5px ${colorHex}22`,
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
