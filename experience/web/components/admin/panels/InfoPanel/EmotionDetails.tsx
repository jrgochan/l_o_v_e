/**
 * EmotionDetails Component
 *
 * Displays detailed information about a single emotion including:
 * - Dual sphere display (character animation + VAC position)
 * - Emotion name and category
 * - Definition text
 * - VAC coordinates
 * - Bridge emotion indicator
 *
 * Uses CharacterSphere and PreviewSphere from Phase 2.
 * Mode-reactive via useAdminTheme.
 */

"use client";

import { CharacterSphere } from "@/components/admin/spheres/CharacterSphere";
import { PreviewSphere } from "@/components/admin/spheres/PreviewSphere";
import { BRIDGE_EMOTIONS } from "@/types/visualization";
import { resolveEmotionColor } from "@/utils/emotion-colors";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import type { Emotion, PathAnimationMode } from "@/types/visualization";

interface EmotionDetailsProps {
  emotion: Emotion;
  isHovered?: boolean;
  animationMode: PathAnimationMode;
}

export function EmotionDetails({ emotion, isHovered = false, animationMode }: EmotionDetailsProps) {
  const isBridge = (BRIDGE_EMOTIONS as readonly string[]).includes(emotion.name);
  const theme = useAdminTheme();

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        {isHovered && (
          <div
            className={`w-2 h-2 rounded-full ${theme.colors.primary.replace("text-", "bg-")} animate-pulse`}
          />
        )}
        <h2
          className={`text-xs font-semibold uppercase tracking-wider ${theme.colors.text.secondary}`}
        >
          {isHovered ? "👁️ Hovering Over" : "📍 Selected Emotion"}
        </h2>
      </div>

      <div
        className={`${theme.layout.borderRadius} p-4 space-y-4 transition-all duration-500 ${
          isHovered
            ? `${theme.effects.glass} ${theme.effects.glow}`
            : `bg-black/20 border ${theme.colors.border}`
        }`}
      >
        {/* Dual sphere view: Character + VAC Position */}
        <div className="flex gap-3 justify-center items-start">
          {/* Animated Character Sphere */}
          <CharacterSphere emotion={emotion} size={150} animationMode={animationMode} />

          {/* VAC Position Sphere */}
          <PreviewSphere emotion={emotion} size={120} />
        </div>

        <div className={`text-xs text-center ${theme.colors.text.muted}`}>
          <span className={theme.colors.text.secondary}>Character</span> •{" "}
          <span className={theme.colors.text.secondary}>VAC Position</span>
        </div>

        {/* Emotion Name & Category */}
        <div className={`pt-2 border-t ${theme.colors.border}`}>
          <h3 className={`text-xl font-bold ${theme.colors.text.primary} flex items-center gap-2`}>
            {emotion.name}
            {isBridge && (
              <span className="text-yellow-400 text-sm bg-yellow-400/10 px-2 py-0.5 rounded-md border border-yellow-400/30">
                ★ Bridge
              </span>
            )}
          </h3>
          <p
            className="text-xs font-semibold mt-1.5 uppercase tracking-wide"
            style={{ color: resolveEmotionColor(emotion) }}
          >
            {emotion.category}
          </p>
        </div>

        {/* Definition */}
        <div className={`pt-3 border-t ${theme.colors.border}`}>
          <h4
            className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme.colors.text.muted}`}
          >
            Definition
          </h4>
          <p className={`text-sm leading-relaxed ${theme.colors.text.secondary}`}>
            {emotion.definition}
          </p>
        </div>

        {/* VAC Coordinates */}
        <div className={`pt-3 border-t ${theme.colors.border}`}>
          <h4
            className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme.colors.text.muted}`}
          >
            VAC Coordinates
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div
              className={`bg-black/30 ${theme.layout.borderRadius} p-2 border ${theme.colors.border}`}
            >
              <div className={`text-xs mb-0.5 ${theme.colors.text.muted}`}>Valence</div>
              <div className={`text-sm font-mono font-semibold ${theme.colors.primary}`}>
                {emotion.vac[0].toFixed(3)}
              </div>
            </div>
            <div
              className={`bg-black/30 ${theme.layout.borderRadius} p-2 border ${theme.colors.border}`}
            >
              <div className={`text-xs mb-0.5 ${theme.colors.text.muted}`}>Arousal</div>
              <div className={`text-sm font-mono font-semibold ${theme.colors.primary}`}>
                {emotion.vac[1].toFixed(3)}
              </div>
            </div>
            <div
              className={`bg-black/30 ${theme.layout.borderRadius} p-2 border ${theme.colors.border}`}
            >
              <div className={`text-xs mb-0.5 ${theme.colors.text.muted}`}>Connection</div>
              <div className={`text-sm font-mono font-semibold ${theme.colors.primary}`}>
                {emotion.vac[2].toFixed(3)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
