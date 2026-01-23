/**
 * Emotion Card Component
 *
 * Detailed card for displaying emotion information.
 * Built on BaseEmotionChip with expanded information display.
 *
 * @example
 * ```tsx
 * <EmotionCard
 *   emotion={{
 *     name: "Joy",
 *     category: "Joy",
 *     vac: [0.8, 0.6, 0.7],
 *     definition: "A feeling of great pleasure..."
 *   }}
 *   confidence={0.92}
 *   showSphere={true}
 *   onClick={() => console.log('Clicked')}
 * />
 * ```
 */

"use client";

import { BaseEmotionChip } from "./BaseEmotionChip";
import { PreviewSphere } from "../spheres/PreviewSphere";
import type { Emotion } from "@/types/visualization";
import { resolveEmotionColor } from "@/utils/emotion-colors";

interface EmotionCardProps {
  emotion: Emotion;
  confidence?: number;
  showSphere?: boolean;
  showVAC?: boolean;
  showDefinition?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * EmotionCard - Detailed emotion information display
 */
export function EmotionCard({
  emotion,
  confidence,
  showSphere = false,
  showVAC = true,
  showDefinition = false,
  onClick,
  className = "",
}: EmotionCardProps) {
  const categoryColor = resolveEmotionColor(emotion);
  const isBridge = [
    "Vulnerability",
    "Awe",
    "Compassion",
    "Curiosity",
    "Acceptance",
    "Gratitude",
  ].includes(emotion.name);

  return (
    <div
      className={`
        bg-gray-800 rounded-lg p-4 border border-gray-700
        ${onClick ? "cursor-pointer hover:bg-gray-750 hover:border-gray-600" : ""}
        transition-all duration-200
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex gap-4">
        {/* Sphere preview */}
        {showSphere && (
          <div className="flex-shrink-0">
            <PreviewSphere emotion={emotion} size={100} showLabels={false} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with emotion name */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: categoryColor }}
            />
            <h3 className="text-lg font-bold text-white">
              {emotion.name}
              {isBridge && <span className="text-yellow-400 ml-2 text-sm">★ Bridge</span>}
            </h3>
          </div>

          {/* Category */}
          <div className="text-sm font-semibold mb-3" style={{ color: categoryColor }}>
            {emotion.category}
          </div>

          {/* Confidence */}
          {confidence !== undefined && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Confidence</span>
                <span className="font-mono text-white">{(confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${confidence * 100}%`,
                    backgroundColor: categoryColor,
                  }}
                />
              </div>
            </div>
          )}

          {/* VAC Coordinates */}
          {showVAC && (
            <div className="space-y-1 text-sm mb-3">
              <div className="flex justify-between text-gray-400">
                <span>Valence:</span>
                <span className="text-white font-mono">{emotion.vac[0].toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Arousal:</span>
                <span className="text-white font-mono">{emotion.vac[1].toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Connection:</span>
                <span className="text-white font-mono">{emotion.vac[2].toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Definition */}
          {showDefinition && emotion.definition && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-sm text-gray-300 leading-relaxed">{emotion.definition}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact variant - uses BaseEmotionChip directly
 */
export function EmotionBadge({
  emotion,
  category,
  confidence,
  onClick,
}: {
  emotion: string;
  category: string;
  confidence?: number;
  onClick?: () => void;
}) {
  return (
    <BaseEmotionChip
      emotion={emotion}
      category={category}
      size="sm"
      showBridge={true}
      confidence={confidence}
      onClick={onClick}
    />
  );
}
