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
 */

"use client";

import { CharacterSphere } from "@/components/admin/spheres/CharacterSphere";
import { CATEGORY_COLORS } from "@/types/atlas-admin";
import type { AtlasEmotion, PathAnimationMode } from "@/types/atlas-admin";

interface EmotionListProps {
  emotions: AtlasEmotion[];
  animationMode: PathAnimationMode;
  onRemove?: (id: string) => void;
}

export function EmotionList({ emotions, animationMode, onRemove }: EmotionListProps) {
  if (emotions.length === 0) {
    return (
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Selected Emotions
        </h2>
        <p className="text-sm text-gray-500">
          Click emotions in the 3D view or select from the left panel
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Selected Emotions
        </h2>
        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
          {emotions.length}
        </span>
      </div>
      <div className="space-y-2">
        {emotions.map((emotion) => (
          <div
            key={emotion.id}
            className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:bg-gray-800 hover:border-gray-600 transition-all"
          >
            <div className="flex gap-3 items-start">
              {/* Animated Character Sphere */}
              <CharacterSphere emotion={emotion} size={100} animationMode={animationMode} />

              {/* Emotion Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="font-semibold text-white text-sm mb-1">{emotion.name}</div>
                  {onRemove && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(emotion.id);
                      }}
                      className="text-gray-500 hover:text-red-400 p-1 -mt-1 -mr-1 transition-colors"
                      title="Remove from selection"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div
                  className="text-xs font-semibold mb-2 uppercase tracking-wide"
                  style={{ color: CATEGORY_COLORS[emotion.category] || "#888888" }}
                >
                  {emotion.category}
                </div>
                <div className="text-xs text-gray-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Valence:</span>
                    <span className="font-mono text-cyan-400 font-semibold">
                      {emotion.vac[0].toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Arousal:</span>
                    <span className="font-mono text-cyan-400 font-semibold">
                      {emotion.vac[1].toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connection:</span>
                    <span className="font-mono text-cyan-400 font-semibold">
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
