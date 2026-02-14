/**
 * Emotion Cluster Component
 *
 * Displays multiple emotions in a grid or flow layout.
 * Built on BaseEmotionChip for consistent styling.
 *
 * @example
 * ```tsx
 * <EmotionCluster
 *   emotions={[
 *     { emotion_name: "Joy", category: "Joy", confidence: 0.9 },
 *     { emotion_name: "Gratitude", category: "Joy", confidence: 0.8 }
 *   ]}
 *   layout="grid"
 *   onEmotionClick={(emotion) => console.log(emotion)}
 * />
 * ```
 */

"use client";

import { BaseEmotionChip } from "./BaseEmotionChip";
import type { DetectedEmotion } from "@/types/chat";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface EmotionClusterProps {
  emotions: DetectedEmotion[];
  layout?: "grid" | "flow";
  size?: "sm" | "md" | "lg";
  showCategory?: boolean;
  showConfidence?: boolean;
  onEmotionClick?: (emotion: DetectedEmotion) => void;
  className?: string;
}

/**
 * EmotionCluster - Display multiple emotions
 */
export function EmotionCluster({
  emotions,
  layout = "flow",
  size = "md",
  showCategory = false,
  showConfidence = true,
  onEmotionClick,
  className = "",
}: EmotionClusterProps) {
  const theme = useAdminTheme();
  if (emotions.length === 0) {
    return <div className={`text-sm italic ${theme.colors.text.muted}`}>No emotions detected</div>;
  }

  const layoutClass = layout === "grid" ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2";

  return (
    <div className={`${layoutClass} ${className}`}>
      {emotions.map((emotion, index) => (
        <BaseEmotionChip
          key={emotion.id || `${emotion.emotion_name}-${index}`}
          emotion={emotion.emotion_name}
          category={emotion.category}
          size={size}
          showCategory={showCategory}
          showBridge={true}
          confidence={showConfidence ? emotion.confidence : undefined}
          onClick={onEmotionClick ? () => onEmotionClick(emotion) : undefined}
        />
      ))}
    </div>
  );
}

/**
 * Compact list variant - one per line
 */
export function EmotionList({
  emotions,
  onEmotionClick,
}: {
  emotions: DetectedEmotion[];
  onEmotionClick?: (emotion: DetectedEmotion) => void;
}) {
  const theme = useAdminTheme();
  if (emotions.length === 0) {
    return <div className={`text-sm italic ${theme.colors.text.muted}`}>No emotions detected</div>;
  }

  return (
    <div className="space-y-2">
      {emotions.map((emotion, index) => (
        <div
          key={emotion.id || `${emotion.emotion_name}-${index}`}
          className={`flex items-center justify-between rounded-lg p-2 transition ${theme.colors.background} ${theme.colors.hover}`}
        >
          <BaseEmotionChip
            emotion={emotion.emotion_name}
            category={emotion.category}
            size="sm"
            showBridge={true}
            onClick={onEmotionClick ? () => onEmotionClick(emotion) : undefined}
          />
          {emotion.confidence && (
            <span className={`text-xs font-mono ${theme.colors.text.muted}`}>
              {(emotion.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
