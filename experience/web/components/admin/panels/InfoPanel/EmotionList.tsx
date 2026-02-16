/**
 * EmotionList Component
 *
 * Displays a list of multiple selected emotions with:
 * - Character sphere for each emotion
 * - Compact emotion information
 * - VAC coordinates
 * - Category coloring
 *
 * Uses CharacterSphere from Phase 2.
 * Mode-reactive via useAdminTheme.
 */

"use client";

import { CharacterSphere } from "@/components/admin/spheres/CharacterSphere";
import { resolveEmotionColor } from "@/utils/emotion-colors";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import type { Emotion, PathAnimationMode } from "@/types/visualization";

interface EmotionListProps {
  emotions: Emotion[];
  animationMode: PathAnimationMode;
  onRemove?: (id: string) => void;
  onFocus?: (id: string | null) => void;
  focusedEmotionId?: string | null;
}

export function EmotionList({
  emotions,
  animationMode,
  onRemove,
  onFocus,
  focusedEmotionId,
}: EmotionListProps) {
  const theme = useAdminTheme();

  if (emotions.length === 0) {
    return (
      <section>
        <h2
          className={`text-xs font-semibold uppercase tracking-wider mb-3 ${theme.colors.text.muted}`}
        >
          Selected Emotions
        </h2>
        <p className={`text-sm ${theme.colors.text.muted}`}>
          Click emotions in the 3D view or select from the left panel
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${theme.colors.text.muted}`}>
          Selected Emotions
        </h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border bg-black/20 ${theme.colors.text.muted} ${theme.colors.border}`}
        >
          {emotions.length}
        </span>
      </div>
      <div className="space-y-2">
        {emotions.map((emotion) => (
          <div
            key={emotion.id}
            onClick={() => onFocus?.(focusedEmotionId === emotion.id ? null : emotion.id)}
            className={`bg-black/20 border ${theme.layout.borderRadius} p-3 transition-all duration-500 cursor-pointer group ${
              focusedEmotionId === emotion.id
                ? `${theme.effects.glass} ${theme.effects.glow}`
                : `${theme.colors.border} ${theme.colors.hover}`
            }`}
          >
            <div className="flex gap-3 items-start">
              {/* Animated Character Sphere */}
              <CharacterSphere emotion={emotion} size={100} animationMode={animationMode} />

              {/* Emotion Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className={`font-semibold text-sm mb-1 ${theme.colors.text.primary}`}>
                    {emotion.name}
                  </div>
                  {onRemove && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(emotion.id);
                      }}
                      className={`${theme.colors.text.muted} hover:text-red-400 p-1 -mt-1 -mr-1 transition-colors`}
                      title="Remove from selection"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div
                  className="text-xs font-semibold mb-2 uppercase tracking-wide"
                  style={{ color: resolveEmotionColor(emotion) }}
                >
                  {emotion.category}
                </div>

                {emotion.definition && (
                  <div
                    className={`text-xs italic mb-3 leading-relaxed ${theme.colors.text.secondary}`}
                  >
                    &quot;{emotion.definition}&quot;
                  </div>
                )}
                <div className={`text-xs space-y-0.5 ${theme.colors.text.secondary}`}>
                  <div className="flex justify-between">
                    <span>Valence:</span>
                    <span className={`font-mono font-semibold ${theme.colors.primary}`}>
                      {emotion.vac[0].toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Arousal:</span>
                    <span className={`font-mono font-semibold ${theme.colors.primary}`}>
                      {emotion.vac[1].toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connection:</span>
                    <span className={`font-mono font-semibold ${theme.colors.primary}`}>
                      {emotion.vac[2].toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
