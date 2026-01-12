/**
 * Base Emotion Chip Component
 *
 * Foundation component for emotion display chips/badges.
 * Provides shared styling, click handling, and hover effects.
 * Used by EmotionBadge, EmotionCard, and other display variants.
 *
 * @example
 * ```tsx
 * <BaseEmotionChip
 *   emotion="Joy"
 *   category="Joy"
 *   color="#22c55e"
 *   size="md"
 *   showCategory={true}
 *   onClick={() => console.log('Clicked')}
 * />
 * ```
 */

"use client";

import { CATEGORY_COLORS } from "@/types/atlas-admin";

export type ChipSize = "sm" | "md" | "lg";

export interface BaseEmotionChipProps {
  emotion: string;
  category?: string;
  color?: string;
  size?: ChipSize;
  showCategory?: boolean;
  showBridge?: boolean;
  confidence?: number;
  onClick?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-base",
};

/**
 * BaseEmotionChip - Reusable foundation for emotion displays
 */
export function BaseEmotionChip({
  emotion,
  category,
  color,
  size = "md",
  showCategory = false,
  showBridge = false,
  confidence,
  onClick,
  className = "",
}: BaseEmotionChipProps) {
  // Get category color if not provided
  const chipColor = color || (category ? CATEGORY_COLORS[category] : "#888888");

  const isBridge = [
    "Vulnerability",
    "Awe",
    "Compassion",
    "Curiosity",
    "Acceptance",
    "Gratitude",
  ].includes(emotion);

  return (
    <div
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 rounded-full
        ${sizeClasses[size]}
        ${onClick ? "cursor-pointer hover:brightness-110 active:scale-95" : ""}
        transition-all duration-200
        ${className}
      `}
      style={{
        backgroundColor: `${chipColor}33`,
        borderColor: chipColor,
        borderWidth: "1px",
        borderStyle: "solid",
      }}
    >
      {/* Category color dot */}
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: chipColor }} />

      {/* Emotion name */}
      <span className="font-medium text-white">{emotion}</span>

      {/* Bridge indicator */}
      {showBridge && isBridge && <span className="text-yellow-400 text-xs">★</span>}

      {/* Confidence */}
      {confidence !== undefined && (
        <span className="text-xs text-white/70 font-mono">{(confidence * 100).toFixed(0)}%</span>
      )}

      {/* Category label */}
      {showCategory && category && (
        <span className="text-xs text-white/60 border-l border-white/20 pl-2">{category}</span>
      )}
    </div>
  );
}
