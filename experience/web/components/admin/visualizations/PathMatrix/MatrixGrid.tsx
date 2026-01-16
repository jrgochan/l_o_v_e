/**
 * Matrix Grid Component
 *
 * Renders the interactive grid visualization:
 * - Emotion view (87×87)
 * - Category view (13×13)
 * - Click to select emotion pairs
 * - Hover states with enhanced visuals
 */

"use client";

import type { AtlasEmotion, EmotionPath } from "@/types/atlas-admin";
// import type { TransitionPathResponse } from '@love/experience-shared';

interface MatrixGridProps {
  viewMode: "emotions" | "categories";
  sortedEmotions: AtlasEmotion[];
  categories: string[];
  getCellColor: (from: AtlasEmotion, to: AtlasEmotion) => string;
  getCategoryCellColor: (fromCat: string, toCat: string) => string;
  getCategoryAverageDifficulty: (
    fromCat: string,
    toCat: string
  ) => { avgDistance: number; difficulty: string; pathCount: number } | null;
  getPathForPair: (from: AtlasEmotion, to: AtlasEmotion) => EmotionPath | undefined | null;
  hoveredCell: { from: string; to: string } | null;
  onHoverCell: (from: string, to: string) => void;
  onLeaveCell: () => void;
  onCellClick: (from: AtlasEmotion, to: AtlasEmotion) => void;
  allEmotions: AtlasEmotion[];
}

/**
 * Renders the matrix grid (emotions or categories)
 */
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

/**
 * Renders the matrix grid (emotions or categories)
 */
export function MatrixGrid({
  viewMode,
  sortedEmotions,
  categories,
  getCellColor,
  getCategoryCellColor,
  getCategoryAverageDifficulty,
  getPathForPair,
  hoveredCell,
  onHoverCell,
  onLeaveCell,
  onCellClick,
}: MatrixGridProps) {
  const theme = useAdminTheme();

  if (viewMode === "categories") {
    // Category View (13×13)
    return (
      <div className="inline-block">
        {/* Header Row - Category Names */}
        <div className="flex">
          <div className={`w-48 h-12 flex-shrink-0 sticky left-0 ${theme.colors.background} z-20`} />
          {categories.map((category) => (
            <div
              key={category}
              className={`w-16 h-12 flex-shrink-0 sticky top-0 ${theme.colors.background} z-10 flex items-center justify-center`}
              style={{ writingMode: "vertical-rl" }}
            >
              <span className={`text-xs ${theme.colors.text.secondary} truncate`}>{category}</span>
            </div>
          ))}
        </div>

        {/* Category Rows */}
        {categories.map((fromCategory) => (
          <div key={fromCategory} className="flex">
            {/* Row Header */}
            <div className={`w-48 h-16 flex-shrink-0 sticky left-0 ${theme.colors.background} z-10 flex items-center px-3 border-r ${theme.colors.border}`}>
              <span className={`text-sm ${theme.colors.text.primary} truncate`}>{fromCategory}</span>
            </div>

            {/* Cells */}
            {categories.map((toCategory) => {
              const stats = getCategoryAverageDifficulty(fromCategory, toCategory);
              const isHovered =
                hoveredCell?.from === fromCategory && hoveredCell?.to === toCategory;
              const isSelf = fromCategory === toCategory;

              return (
                <div
                  key={toCategory}
                  className={`w-16 h-16 flex-shrink-0 border ${theme.colors.border} cursor-pointer transition-all flex items-center justify-center ${isHovered ? "ring-2 ring-cyan-400 z-30 scale-110 shadow-xl" : ""
                    }`}
                  style={{
                    backgroundColor: getCategoryCellColor(fromCategory, toCategory),
                  }}
                  onMouseEnter={() => onHoverCell(fromCategory, toCategory)}
                  onMouseLeave={onLeaveCell}
                  title={
                    isSelf
                      ? `${fromCategory} (self)`
                      : stats
                        ? `${fromCategory} → ${toCategory}\nAvg Distance: ${stats.avgDistance.toFixed(2)}\nDifficulty: ${stats.difficulty}\nPaths: ${stats.pathCount}`
                        : `${fromCategory} → ${toCategory}\n(Not computed)`
                  }
                >
                  {stats && !isSelf && (
                    <span className="text-[10px] text-white font-mono opacity-70 font-semibold" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                      {stats.avgDistance.toFixed(1)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // Emotion View (87×87)
  return (
    <div className="inline-block">
      {/* Header Row - Emotion Names (To) */}
      <div className="flex">
        <div className={`w-32 h-8 flex-shrink-0 sticky left-0 ${theme.colors.background} z-20`} />
        {sortedEmotions.map((emotion) => (
          <div
            key={emotion.id}
            className={`w-8 h-8 flex-shrink-0 sticky top-0 ${theme.colors.background} z-10`}
            style={{ writingMode: "vertical-rl" }}
          >
            <span className={`text-[10px] ${theme.colors.text.secondary} truncate`}>{emotion.name}</span>
          </div>
        ))}
      </div>

      {/* Matrix Rows */}
      {sortedEmotions.map((fromEmotion) => (
        <div key={fromEmotion.id} className="flex">
          {/* Row Header - Emotion Name (From) */}
          <div className={`w-32 h-8 flex-shrink-0 sticky left-0 ${theme.colors.background} z-10 flex items-center px-2 border-r ${theme.colors.border}`}>
            <span className={`text-[10px] ${theme.colors.text.secondary} truncate`}>{fromEmotion.name}</span>
          </div>

          {/* Cells */}
          {sortedEmotions.map((toEmotion) => {
            const path = getPathForPair(fromEmotion, toEmotion);
            const isHovered =
              hoveredCell?.from === fromEmotion.id && hoveredCell?.to === toEmotion.id;
            const isSelf = fromEmotion.id === toEmotion.id;

            return (
              <div
                key={toEmotion.id}
                className={`w-8 h-8 flex-shrink-0 border ${theme.colors.border} cursor-pointer transition-all ${isHovered ? "ring-2 ring-cyan-400 z-30 scale-125 shadow-xl" : "hover:scale-105"
                  }`}
                style={{
                  backgroundColor: getCellColor(fromEmotion, toEmotion),
                }}
                onClick={() => !isSelf && onCellClick(fromEmotion, toEmotion)}
                onMouseEnter={() => onHoverCell(fromEmotion.id, toEmotion.id)}
                onMouseLeave={onLeaveCell}
                title={
                  isSelf
                    ? `${fromEmotion.name} (self)`
                    : path
                      ? `${fromEmotion.name} → ${toEmotion.name}\nDistance: ${path.total_distance.toFixed(2)}\nDifficulty: ${path.difficulty}\nWaypoints: ${path.waypoints?.length ?? 0}`
                      : `${fromEmotion.name} → ${toEmotion.name}\n(Not computed)`
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
