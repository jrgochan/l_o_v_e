/**
 * Emotional Controls Component
 *
 * Provides buttons to test canonical emotions and see their VAC mappings.
 * This is the debug UI for exploring the emotional space.
 */

"use client";

import { useExperienceStore, CANONICAL_EMOTIONS } from "@/stores/useExperienceStore";

export function EmotionalControls() {
  const setTarget = useExperienceStore((state) => state.setTarget);
  const reset = useExperienceStore((state) => state.reset);
  const isAnimating = useExperienceStore((state) => state.isAnimating);

  const emotions = Object.values(CANONICAL_EMOTIONS);

  const handleEmotionClick = (vac: [number, number, number]) => {
    setTarget(vac);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Canonical Emotions</h3>
        {isAnimating && <span className="text-xs text-cyan-400 animate-pulse">Animating...</span>}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {emotions.map((emotion) => {
          const [v, a, c] = emotion.vac;
          const color = v > 0 ? "bg-cyan-600 hover:bg-cyan-500" : "bg-red-700 hover:bg-red-600";

          return (
            <button
              key={emotion.name}
              onClick={() => handleEmotionClick(emotion.vac)}
              className={`${color} text-white px-4 py-3 rounded-lg text-left transition-colors`}
            >
              <div className="font-medium">{emotion.name}</div>
              <div className="text-xs opacity-75 mt-1">
                V:{v.toFixed(1)} A:{a.toFixed(1)} C:{c.toFixed(1)}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={reset}
        className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        Reset to Neutral
      </button>
    </div>
  );
}
