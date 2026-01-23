/**
 * ZenHUD Component
 *
 * Minimal heads-up display for Zen Mode.
 * Shows only essential information: hovered/selected emotion, basic stats.
 * Fades out when not interacting.
 */

"use client";

import { useVisualizationStore } from "@/stores/useVisualizationStore";

export function ZenHUD() {
  const hoveredPathId = useVisualizationStore((state) => state.hoveredPathId);
  const selectedPathId = useVisualizationStore((state) => state.selectedPathId);
  const computedPaths = useVisualizationStore((state) => state.computedPaths);
  const isFlying = useVisualizationStore((state) => state.isFlying);
  const setIsFlying = useVisualizationStore((state) => state.setIsFlying);

  // Get active path
  const activePathId = hoveredPathId || selectedPathId;
  const activePath = activePathId ? computedPaths.get(activePathId) : null;

  // Get hovered emotion if any
  const hoveredEmotionId = useVisualizationStore((state) => state.hoveredEmotionId);
  const allEmotions = useVisualizationStore((state) => state.allEmotions);
  const hoveredEmotion = hoveredEmotionId
    ? allEmotions.find((e) => e.id === hoveredEmotionId)
    : null;

  if (!activePath && !hoveredEmotion) return null;

  return (
    <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 pointer-events-none transition-opacity duration-500">
      <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-full px-8 py-4 flex flex-col items-center gap-2">
        {/* Hovered Emotion */}
        {hoveredEmotion && !activePath && (
          <div className="text-center animate-fade-in">
            <h2 className="text-3xl font-light text-white tracking-widest uppercase">
              {hoveredEmotion.name}
            </h2>
            <div className="flex gap-4 mt-2 text-xs text-white/60 font-mono">
              <span>V: {hoveredEmotion.vac[0].toFixed(2)}</span>
              <span>A: {hoveredEmotion.vac[1].toFixed(2)}</span>
              <span>C: {hoveredEmotion.vac[2].toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Active Path */}
        {activePath && (
          <div className="text-center animate-fade-in">
            <div className="flex items-center gap-4 text-2xl font-light text-white tracking-widest">
              <span>{activePath.from.name}</span>
              <span className="text-white/40 text-sm">⟶</span>
              <span>{activePath.to.name}</span>
            </div>
            <div className="flex justify-center gap-4 mt-2 text-xs text-white/50 uppercase tracking-widest">
              <span>{activePath.difficulty} Journey</span>
              <span>{activePath.waypoints.length} Steps</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFlying(!isFlying);
              }}
              className={`mt-4 px-6 py-2 rounded-full border transition-all text-sm tracking-widest uppercase flex items-center gap-2 mx-auto pointer-events-auto ${
                isFlying
                  ? "bg-red-500/20 border-red-500 text-red-100 hover:bg-red-500/30"
                  : "bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50"
              }`}
            >
              <span>{isFlying ? "Stop Journey" : "Play Journey"}</span>
              <span>{isFlying ? "⏹" : "▶"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
