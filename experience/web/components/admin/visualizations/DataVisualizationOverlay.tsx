/**
 * Data Visualization Overlay Component
 *
 * Displays all 87 emotions as mini soul spheres in a grid layout.
 * Educational tool to visualize VAC (Valence-Arousal-Connection) dimensions.
 * Activated by pressing 'D' key or toggle in settings.
 */

"use client";

import { useState, useMemo } from "react";
import { MiniSoulSphere } from "../spheres/MiniSoulSphere";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import type { AtlasEmotion } from "@/types/atlas-admin";

interface DataVisualizationOverlayProps {
  onClose: () => void;
}

export function DataVisualizationOverlay({ onClose }: DataVisualizationOverlayProps) {
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const colorScheme = useAtlasAdminStore((state) => state.settings.colorScheme);
  const selectEmotion = useAtlasAdminStore((state) => state.selectEmotion);
  const setFocusedEmotion = useAtlasAdminStore((state) => state.setFocusedEmotion);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group emotions by category
  const emotionsByCategory = useMemo(() => {
    const grouped = new Map<string, AtlasEmotion[]>();
    allEmotions.forEach((emotion) => {
      if (!grouped.has(emotion.category)) {
        grouped.set(emotion.category, []);
      }
      grouped.get(emotion.category)!.push(emotion);
    });
    return grouped;
  }, [allEmotions]);

  // Filter emotions if category selected
  const displayedEmotions = useMemo(() => {
    if (!selectedCategory) return allEmotions;
    return allEmotions.filter((e) => e.category === selectedCategory);
  }, [allEmotions, selectedCategory]);

  // Sort emotions by name
  const sortedEmotions = useMemo(() => {
    return [...displayedEmotions].sort((a, b) => a.name.localeCompare(b.name));
  }, [displayedEmotions]);

  const handleEmotionClick = (emotion: AtlasEmotion) => {
    selectEmotion(emotion.id);
    setFocusedEmotion(emotion.id);
    onClose(); // Close overlay to see focused emotion
  };

  const hoveredEmotion = hoveredId ? allEmotions.find((e) => e.id === hoveredId) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h2 className="text-2xl font-bold text-white">Data Visualization Mode</h2>
          <p className="text-sm text-white/60 mt-1">
            All 87 emotions positioned by VAC coordinates
          </p>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
        >
          Close (D)
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Categories & Legend */}
        <div className="w-64 border-r border-white/10 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Category Filter */}
            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-3">Filter by Category</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    !selectedCategory
                      ? "bg-blue-500/20 text-blue-300 font-medium"
                      : "text-white/60 hover:bg-white/5"
                  }`}
                >
                  All ({allEmotions.length})
                </button>
                {Array.from(emotionsByCategory.entries())
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([category, emotions]) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedCategory === category
                          ? "bg-blue-500/20 text-blue-300 font-medium"
                          : "text-white/60 hover:bg-white/5"
                      }`}
                    >
                      <div className="truncate">{category}</div>
                      <div className="text-xs text-white/40">{emotions.length} emotions</div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Legend */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-sm font-semibold text-white/80 mb-3">VAC Dimensions</h3>
              <div className="space-y-3 text-xs text-white/70">
                <div>
                  <div className="font-medium text-white/90 mb-1">X-Axis: Valence</div>
                  <div className="flex items-center justify-between">
                    <span>← Negative</span>
                    <span>Positive →</span>
                  </div>
                </div>

                <div>
                  <div className="font-medium text-white/90 mb-1">Y-Axis: Arousal</div>
                  <div className="flex items-center justify-between">
                    <span>← Low</span>
                    <span>High →</span>
                  </div>
                </div>

                <div>
                  <div className="font-medium text-white/90 mb-1">Z-Axis: Connection</div>
                  <div className="flex items-center justify-between">
                    <span>← Withdrawal</span>
                    <span>Openness →</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="font-medium text-white/90 mb-1">Color Mode: {colorScheme}</div>
                  <div className="text-white/50">
                    {colorScheme === "category" && "Grouped by psychological category"}
                    {colorScheme === "valence" && "Red (negative) to Green (positive)"}
                    {colorScheme === "arousal" && "Blue (low) to Red (high)"}
                    {colorScheme === "connection" && "Purple (withdrawal) to Yellow (openness)"}
                  </div>
                </div>
              </div>
            </div>

            {/* Interactions */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-sm font-semibold text-white/80 mb-3">Interactions</h3>
              <div className="space-y-2 text-xs text-white/70">
                <div>
                  <span className="text-white/90 font-medium">Hover:</span> View details
                </div>
                <div>
                  <span className="text-white/90 font-medium">Click:</span> Focus in main sphere
                </div>
                <div>
                  <span className="text-white/90 font-medium">D Key:</span> Toggle mode
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Hover Details - Fixed height to prevent layout shift */}
          <div
            className="mb-4 transition-all duration-200"
            style={{ minHeight: hoveredEmotion ? "180px" : "0px" }}
          >
            {hoveredEmotion && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 animate-in fade-in duration-150">
                <h3 className="text-lg font-semibold text-white mb-2">{hoveredEmotion.name}</h3>
                <p className="text-sm text-white/70 mb-3 line-clamp-2">
                  {hoveredEmotion.definition}
                </p>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-white/50 mb-1">Valence</div>
                    <div className="text-white font-mono">{hoveredEmotion.vac[0].toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-white/50 mb-1">Arousal</div>
                    <div className="text-white font-mono">{hoveredEmotion.vac[1].toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-white/50 mb-1">Connection</div>
                    <div className="text-white font-mono">{hoveredEmotion.vac[2].toFixed(2)}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-white/50 truncate">
                  Category: {hoveredEmotion.category}
                </div>
              </div>
            )}
          </div>

          {/* Emotion Grid */}
          <div className="grid grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4">
            {sortedEmotions.map((emotion) => (
              <div
                key={emotion.id}
                className="flex flex-col items-center"
                onMouseEnter={() => setHoveredId(emotion.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <MiniSoulSphere
                  emotion={emotion}
                  colorMode={colorScheme}
                  size={80}
                  onClick={() => handleEmotionClick(emotion)}
                  isHovered={hoveredId === emotion.id}
                />
              </div>
            ))}
          </div>

          {/* Empty State */}
          {sortedEmotions.length === 0 && (
            <div className="flex items-center justify-center h-full text-white/50">
              <div className="text-center">
                <p className="text-lg mb-2">No emotions in this category</p>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  View all emotions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-white/10 p-4 text-center text-xs text-white/50">
        Showing {displayedEmotions.length} of {allEmotions.length} emotions
        {selectedCategory && ` in category: ${selectedCategory}`}
      </div>
    </div>
  );
}
