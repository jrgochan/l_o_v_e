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
 */

"use client";

import { CharacterSphere } from "@/components/admin/spheres/CharacterSphere";
import { PreviewSphere } from "@/components/admin/spheres/PreviewSphere";
import { BRIDGE_EMOTIONS } from "@/types/visualization";
import { resolveEmotionColor } from "@/utils/emotion-colors";
import type { Emotion, PathAnimationMode } from "@/types/visualization";

interface EmotionDetailsProps {
  emotion: Emotion;
  isHovered?: boolean;
  animationMode: PathAnimationMode;
}

export function EmotionDetails({ emotion, isHovered = false, animationMode }: EmotionDetailsProps) {
  const isBridge = (BRIDGE_EMOTIONS as readonly string[]).includes(emotion.name);

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        {isHovered && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {isHovered ? "👁️ Hovering Over" : "📍 Selected Emotion"}
        </h2>
      </div>

      <div
        className={`rounded-lg p-4 space-y-4 transition-all ${
          isHovered
            ? "bg-cyan-900/30 border border-cyan-700/50 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
            : "bg-gray-800/50 border border-gray-700/50"
        }`}
      >
        {/* Dual sphere view: Character + VAC Position */}
        <div className="flex gap-3 justify-center items-start">
          {/* Animated Character Sphere */}
          <CharacterSphere emotion={emotion} size={150} animationMode={animationMode} />

          {/* VAC Position Sphere */}
          <PreviewSphere emotion={emotion} size={120} />
        </div>

        <div className="text-xs text-center text-white/50 -mt-2">
          <span className="text-white/70">Character</span> •{" "}
          <span className="text-white/70">VAC Position</span>
        </div>

        {/* Emotion Name & Category */}
        <div className="pt-2 border-t border-gray-700/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
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
        <div className="pt-3 border-t border-gray-700/30">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Definition
          </h4>
          <p className="text-sm text-gray-300 leading-relaxed">{emotion.definition}</p>
        </div>

        {/* VAC Coordinates */}
        <div className="pt-3 border-t border-gray-700/30">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            VAC Coordinates
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900/50 rounded-md p-2 border border-gray-700/30">
              <div className="text-xs text-gray-500 mb-0.5">Valence</div>
              <div className="text-sm text-cyan-400 font-mono font-semibold">
                {emotion.vac[0].toFixed(3)}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-md p-2 border border-gray-700/30">
              <div className="text-xs text-gray-500 mb-0.5">Arousal</div>
              <div className="text-sm text-cyan-400 font-mono font-semibold">
                {emotion.vac[1].toFixed(3)}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-md p-2 border border-gray-700/30">
              <div className="text-xs text-gray-500 mb-0.5">Connection</div>
              <div className="text-sm text-cyan-400 font-mono font-semibold">
                {emotion.vac[2].toFixed(3)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
