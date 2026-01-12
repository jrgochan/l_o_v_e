/**
 * Emotion Badge Component
 *
 * Displays a single emotion as a styled chip/badge.
 * Size and style vary based on prominence (primary/secondary/underlying).
 */

"use client";

import type { VAC, EmotionProminence } from "@/types/chat";

interface EmotionBadgeProps {
  emotion: string;
  confidence: number;
  vac?: VAC;
  prominence?: EmotionProminence;
  size?: "small" | "medium" | "large";
  showConfidence?: boolean;
  onClick?: () => void;
  className?: string;
}

export function EmotionBadge({
  emotion,
  confidence,
  vac,
  prominence = "primary",
  size = "medium",
  showConfidence = true,
  onClick,
  className = "",
}: EmotionBadgeProps) {
  // Determine color based on VAC valence
  const getColorClasses = (valence?: number) => {
    if (!valence && valence !== 0) {
      return "bg-gray-600 border-gray-500";
    }

    if (valence < -0.5) {
      return "bg-red-600/90 border-red-500";
    } else if (valence < -0.1) {
      return "bg-orange-600/90 border-orange-500";
    } else if (valence < 0.1) {
      return "bg-amber-500/90 border-amber-400";
    } else if (valence < 0.5) {
      return "bg-lime-500/90 border-lime-400";
    } else {
      return "bg-green-600/90 border-green-500";
    }
  };

  // Size classes
  const sizeClasses = {
    small: "px-2 py-1 text-xs",
    medium: "px-3 py-1.5 text-sm",
    large: "px-4 py-2 text-base",
  };

  // Prominence-based styling
  const prominenceClasses = {
    primary: "font-bold border-2 opacity-100",
    secondary: "font-medium border opacity-90",
    underlying: "font-normal border opacity-60",
  };

  const colorClasses = getColorClasses(vac?.valence);

  return (
    <div
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 rounded-full
        text-white transition-all duration-200
        ${sizeClasses[size]}
        ${prominenceClasses[prominence]}
        ${colorClasses}
        ${onClick ? "cursor-pointer hover:scale-105 hover:shadow-lg" : ""}
        ${className}
      `}
      title={
        vac
          ? `VAC: (${vac.valence.toFixed(2)}, ${vac.arousal.toFixed(2)}, ${vac.connection.toFixed(2)})`
          : undefined
      }
    >
      {/* Emotion Name */}
      <span>{emotion}</span>

      {/* Confidence Badge */}
      {showConfidence && (
        <span
          className={`
          px-1.5 py-0.5 rounded-full text-xs font-mono
          ${prominence === "primary" ? "bg-white/20" : "bg-white/15"}
        `}
        >
          {(confidence * 100).toFixed(0)}%
        </span>
      )}

      {/* Prominence Indicator */}
      {prominence === "underlying" && <span className="text-xs opacity-75">*</span>}
    </div>
  );
}

/**
 * Emotion Badge List Component
 *
 * Displays multiple emotion badges in a horizontal flex layout
 */

interface EmotionBadgeListProps {
  emotions: Array<{
    emotion: string;
    confidence: number;
    vac?: VAC;
    prominence?: EmotionProminence;
  }>;
  onEmotionClick?: (emotion: string) => void;
  className?: string;
}

export function EmotionBadgeList({
  emotions,
  onEmotionClick,
  className = "",
}: EmotionBadgeListProps) {
  if (!emotions || emotions.length === 0) {
    return null;
  }

  // Sort by prominence (primary first, then secondary, then underlying)
  const prominenceOrder = { primary: 0, secondary: 1, underlying: 2 };
  const sortedEmotions = [...emotions].sort((a, b) => {
    const orderA = prominenceOrder[a.prominence || "secondary"];
    const orderB = prominenceOrder[b.prominence || "secondary"];
    return orderA - orderB;
  });

  return (
    <div className={`flex flex-wrap gap-2 items-center ${className}`}>
      {sortedEmotions.map((emo, index) => {
        // Size based on prominence
        const size =
          emo.prominence === "primary"
            ? "large"
            : emo.prominence === "underlying"
              ? "small"
              : "medium";

        return (
          <EmotionBadge
            key={`${emo.emotion}-${index}`}
            emotion={emo.emotion}
            confidence={emo.confidence}
            vac={emo.vac}
            prominence={emo.prominence}
            size={size}
            onClick={onEmotionClick ? () => onEmotionClick(emo.emotion) : undefined}
          />
        );
      })}
    </div>
  );
}
