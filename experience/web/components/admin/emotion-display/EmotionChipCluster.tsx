/**
 * Emotion Chip Cluster Component
 *
 * Horizontal layout for displaying multiple emotions inline in chat messages.
 * Primary emotion is larger, secondary are medium, underlying are smaller and faded.
 */

"use client";

import { EmotionBadge } from "./EmotionBadge";
import type { VAC, EmotionProminence, DetectedEmotion } from "@/types/chat";

interface EmotionChipClusterProps {
  emotions: DetectedEmotion[];
  onEmotionClick?: (emotion: string) => void;
  showConfidence?: boolean;
  className?: string;
}

export function EmotionChipCluster({
  emotions,
  onEmotionClick,
  showConfidence = true,
  className = "",
}: EmotionChipClusterProps) {
  if (!emotions || emotions.length === 0) {
    return null;
  }

  // Separate emotions by prominence
  const primary = emotions.find((e) => e.prominence === "primary");
  const secondary = emotions.filter((e) => e.prominence === "secondary");
  const underlying = emotions.filter((e) => e.prominence === "underlying");

  return (
    <div className={`flex flex-wrap gap-2 items-center ${className}`}>
      {/* Primary Emotion - Large and prominent */}
      {primary && (
        <EmotionBadge
          emotion={primary.emotion_name}
          confidence={primary.confidence}
          vac={primary.vac}
          prominence="primary"
          size="large"
          showConfidence={showConfidence}
          onClick={onEmotionClick ? () => onEmotionClick(primary.emotion_name) : undefined}
        />
      )}

      {/* Secondary Emotions - Medium */}
      {secondary.map((emo, index) => (
        <EmotionBadge
          key={`${emo.emotion_name}-secondary-${index}`}
          emotion={emo.emotion_name}
          confidence={emo.confidence}
          vac={emo.vac}
          prominence="secondary"
          size="medium"
          showConfidence={showConfidence}
          onClick={onEmotionClick ? () => onEmotionClick(emo.emotion_name) : undefined}
        />
      ))}

      {/* Underlying Emotions - Small and faded with asterisk */}
      {underlying.map((emo, index) => (
        <EmotionBadge
          key={`${emo.emotion_name}-underlying-${index}`}
          emotion={emo.emotion_name}
          confidence={emo.confidence}
          vac={emo.vac}
          prominence="underlying"
          size="small"
          showConfidence={showConfidence}
          onClick={onEmotionClick ? () => onEmotionClick(emo.emotion_name) : undefined}
        />
      ))}
    </div>
  );
}

/**
 * Simple Emotion Chip Cluster (for backward compatibility)
 *
 * When you have a list of emotions without DetectedEmotion type
 */

interface SimpleEmotionChipClusterProps {
  emotions: Array<{
    name: string;
    confidence: number;
    vac?: VAC;
    prominence?: EmotionProminence;
  }>;
  onEmotionClick?: (emotion: string) => void;
  className?: string;
}

export function SimpleEmotionChipCluster({
  emotions,
  onEmotionClick,
  className = "",
}: SimpleEmotionChipClusterProps) {
  if (!emotions || emotions.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 items-center ${className}`}>
      {emotions.map((emo, index) => {
        const prominence = emo.prominence || "primary";
        const size =
          prominence === "primary" ? "large" : prominence === "underlying" ? "small" : "medium";

        return (
          <EmotionBadge
            key={`${emo.name}-${index}`}
            emotion={emo.name}
            confidence={emo.confidence}
            vac={emo.vac}
            prominence={prominence}
            size={size}
            onClick={onEmotionClick ? () => onEmotionClick(emo.name) : undefined}
          />
        );
      })}
    </div>
  );
}
