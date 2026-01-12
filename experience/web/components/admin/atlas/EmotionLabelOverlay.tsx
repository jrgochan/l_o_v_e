/**
 * Emotion Label Overlay Component (HTML Only)
 *
 * Renders emotion labels in HTML overlay.
 * Receives positions from EmotionLabelTracker inside Canvas.
 */

"use client";

import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { BRIDGE_EMOTIONS, CATEGORY_COLORS } from "@/types/atlas-admin";
import type { PathAnimationMode } from "@/types/atlas-admin";
import type { LabelPosition } from "./EmotionLabelTracker";

interface EmotionLabelOverlayProps {
  labels: LabelPosition[];
}

export function EmotionLabelOverlay({ labels }: EmotionLabelOverlayProps) {
  const selectedIds = useAtlasAdminStore((state) => state.selectedEmotionIds);
  const hoveredId = useAtlasAdminStore((state) => state.hoveredEmotionId);
  const layers = useAtlasAdminStore((state) => state.layers);
  const settings = useAtlasAdminStore((state) => state.settings);
  const mode = settings.pathAnimationMode;

  if (!layers.emotionLabels || labels.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {labels.map((label) => {
        if (!label.visible) return null;

        const isSelected = selectedIds.has(label.emotion.id);
        const isHovered = hoveredId === label.emotion.id;
        const isBridge = (BRIDGE_EMOTIONS as readonly string[]).includes(label.emotion.name);
        const categoryColor = CATEGORY_COLORS[label.emotion.category] || "#888888";

        // Get mode-specific label styling
        const labelStyle = getLabelStyle(mode, isSelected, isHovered, categoryColor);

        return (
          <div
            key={label.emotion.id}
            className={`absolute transition-all duration-300 ${labelStyle.animation}`}
            style={{
              left: `${label.x}px`,
              top: `${label.y}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div
              className={`${labelStyle.containerClass} ${labelStyle.textClass}`}
              style={labelStyle.containerStyle}
            >
              <div className="flex items-center gap-1.5">
                {isBridge && <span className={labelStyle.bridgeIconClass}>★</span>}
                <span className="font-medium">{label.emotion.name}</span>
              </div>
              {isHovered && (
                <>
                  <div className={`text-xs mt-0.5 ${labelStyle.categoryClass}`}>
                    {label.emotion.category}
                  </div>
                  <div className={`text-xs font-mono mt-0.5 ${labelStyle.vacClass}`}>
                    [{label.emotion.vac.map((v) => v.toFixed(2)).join(", ")}]
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Get mode-specific label styling
 */
export function getLabelStyle(
  mode: PathAnimationMode,
  isSelected: boolean,
  isHovered: boolean,
  categoryColor: string
) {
  const baseAnimation = isHovered ? "scale-110" : "scale-100";

  switch (mode) {
    case "subtle":
      // Clean, professional labels
      return {
        containerClass: `px-3 py-1.5 rounded-lg ${
          isHovered
            ? "bg-gray-800/95 border-2 border-cyan-400"
            : isSelected
              ? "bg-gray-900/90 border-2"
              : "bg-gray-800/85 border border-gray-700"
        }`,
        containerStyle: {
          borderColor: isSelected && !isHovered ? categoryColor : undefined,
          boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.3)" : "0 2px 6px rgba(0,0,0,0.2)",
        },
        textClass: isHovered ? "text-white" : "text-gray-200",
        categoryClass: "text-gray-400",
        vacClass: "text-gray-500",
        bridgeIconClass: "text-yellow-400",
        animation: `${baseAnimation} transition-transform duration-200`,
      };

    case "dynamic":
      // Vibrant, energetic labels
      return {
        containerClass: `px-4 py-2 rounded-xl font-semibold ${
          isHovered
            ? "bg-cyan-500 border-2 border-cyan-300"
            : isSelected
              ? "bg-gray-900/95 border-2"
              : "bg-gray-800/90 border-2 border-gray-600"
        }`,
        containerStyle: {
          borderColor: isSelected && !isHovered ? categoryColor : undefined,
          boxShadow: isHovered
            ? `0 0 20px ${categoryColor}80, 0 6px 16px rgba(0,0,0,0.4)`
            : isSelected
              ? `0 0 12px ${categoryColor}60, 0 4px 12px rgba(0,0,0,0.3)`
              : "0 3px 8px rgba(0,0,0,0.3)",
        },
        textClass: isHovered ? "text-white" : "text-white",
        categoryClass: "text-cyan-200",
        vacClass: "text-cyan-300",
        bridgeIconClass: "text-yellow-300 drop-shadow-[0_0_4px_rgba(255,215,0,0.8)]",
        animation: `${baseAnimation} transition-all duration-200`,
      };

    case "mystical":
      // Ethereal, cosmic labels
      return {
        containerClass: `px-4 py-2 rounded-2xl ${
          isHovered
            ? "bg-purple-900/40 border border-purple-300/50 backdrop-blur-md"
            : isSelected
              ? "bg-purple-950/30 border border-purple-400/40 backdrop-blur-md"
              : "bg-gray-900/20 border border-purple-500/20 backdrop-blur-sm"
        }`,
        containerStyle: {
          boxShadow: isHovered
            ? `0 0 24px ${categoryColor}40, 0 0 12px rgba(138,43,226,0.3), 0 8px 20px rgba(0,0,0,0.3)`
            : isSelected
              ? `0 0 16px ${categoryColor}30, 0 0 8px rgba(138,43,226,0.2), 0 6px 16px rgba(0,0,0,0.2)`
              : `0 0 8px ${categoryColor}20, 0 4px 12px rgba(0,0,0,0.2)`,
        },
        textClass: isHovered ? "text-purple-100" : "text-purple-200",
        categoryClass: "text-purple-300/80",
        vacClass: "text-purple-400/70",
        bridgeIconClass: "text-yellow-200 drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]",
        animation: `${baseAnimation} transition-all duration-300 ease-out`,
      };
  }
}
