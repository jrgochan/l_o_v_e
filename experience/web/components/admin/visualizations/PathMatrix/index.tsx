/**
 * Path Matrix Grid Component
 *
 * Displays an interactive heatmap of all possible emotion-to-emotion transitions.
 * Color-coded by path difficulty to show the entire emotional landscape.
 *
 * Refactored with:
 * - Custom hook for data processing (useMatrixData)
 * - Sub-components for cleaner organization
 * - Enhanced UX with better tooltips and visual feedback
 */

"use client";

import { useState } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useComputeAllPaths } from "@/hooks/useComputeAllPaths";
import { useMatrixData } from "@/hooks/visualization/useMatrixData";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import { logger } from "@/utils/logger";
import { MatrixHeader } from "./MatrixHeader";
import { MatrixLegend } from "./MatrixLegend";
import { MatrixGrid } from "./MatrixGrid";
import { MatrixTooltip } from "./MatrixTooltip";
import type { Emotion, EmotionPath } from "@/types/visualization";
import type { CachedPathData } from "@/types/api-responses";

interface PathMatrixGridProps {
  onClose: () => void;
}

type ViewMode = "emotions" | "categories";

export function PathMatrixGrid({ onClose }: PathMatrixGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("emotions");
  const [hoveredCell, setHoveredCell] = useState<{ from: string; to: string } | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(false);

  // Store state
  const allEmotions = useVisualizationStore((state) => state.allEmotions);
  const computedPaths = useVisualizationStore((state) => state.computedPaths);
  const addComputedPath = useVisualizationStore((state) => state.addComputedPath);
  const selectMultiple = useVisualizationStore((state) => state.selectMultiple);

  // Hooks
  const theme = useAdminTheme();
  const { computeAllPaths, isComputing, progress, estimatedTimeRemaining } = useComputeAllPaths();
  const {
    sortedEmotions,
    categories,
    getPathForPair,
    getCellColor,
    getCategoryAverageDifficulty,
    getCategoryCellColor,
    stats,
  } = useMatrixData({ allEmotions, computedPaths });

  // Load all cached paths from backend
  const loadCachedPaths = async () => {
    setIsLoadingCache(true);

    try {
      logger.info("api", "Loading all cached paths from backend...");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_OBSERVER_URL || "http://localhost:8000"}/observer/paths/all?limit=10000`
      );

      if (!response.ok) {
        alert('No cached paths available. Run "Compute All Paths" first.');
        return;
      }

      const data = await response.json();

      if (!data.paths || data.paths.length === 0) {
        alert("No cached paths found.");
        return;
      }

      // Transform and load paths into store
      let loaded = 0;
      data.paths.forEach((pathData: CachedPathData) => {
        const fromEmotion = allEmotions.find((e) => e.id === pathData.from_emotion.id);
        const toEmotion = allEmotions.find((e) => e.id === pathData.to_emotion.id);

        if (fromEmotion && toEmotion) {
          const path: EmotionPath = {
            id: `${fromEmotion.id}-${toEmotion.id}`,
            from: fromEmotion,
            to: toEmotion,
            waypoints: pathData.waypoints.map((wp) => ({
              emotion: wp.emotion,
              vac: wp.vac,
              reasoning: "",
              strategies: [],
            })),
            total_distance: pathData.distance,
            estimated_time: pathData.estimated_time,
            difficulty: pathData.difficulty as "easy" | "moderate" | "difficult",
            requires_bridge: pathData.requires_bridge,
            bridge_emotions: [],
          };

          addComputedPath(path);
          loaded++;
        }
      });

      logger.info("api", `✅ Loaded ${loaded} cached paths`);
      alert(`Successfully loaded ${loaded} cached paths from backend!`);
    } catch (err) {
      logger.error("api", "Error loading cached paths", err);
      alert("Error loading cached paths. Check console.");
    } finally {
      setIsLoadingCache(false);
    }
  };

  // Export matrix as CSV
  const exportMatrixAsCSV = () => {
    const rows: string[][] = [
      ["From", "To", "Distance", "Difficulty", "Waypoints", "Bridges", "Estimated Time"],
    ];

    // Generate CSV data
    sortedEmotions.forEach((fromEmotion) => {
      sortedEmotions.forEach((toEmotion) => {
        if (fromEmotion.id === toEmotion.id) return; // Skip self-transitions

        const path = getPathForPair(fromEmotion, toEmotion);
        if (!path) return; // Skip non-computed paths

        rows.push([
          fromEmotion.name,
          toEmotion.name,
          path.total_distance.toFixed(3),
          path.difficulty,
          path.waypoints.length.toString(),
          path.requires_bridge ? "Yes" : "No",
          path.estimated_time,
        ]);
      });
    });

    // Convert to CSV string
    const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `emotion-path-matrix-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logger.info("general", `✅ Exported ${rows.length - 1} paths to CSV`);
  };

  // Handle cell click - select ONLY those two emotions
  const handleCellClick = (fromEmotion: Emotion, toEmotion: Emotion) => {
    // Temporarily set to manual to prevent auto-computation
    const currentSetting = useVisualizationStore.getState().settings.computeMode;
    useVisualizationStore.getState().updateSetting("computeMode", "manual");

    // Clear all selections first
    useVisualizationStore.getState().clearSelection();

    // Select only these two emotions
    selectMultiple([fromEmotion.id, toEmotion.id]);

    // Set the path as selected in InfoPanel
    const pathId = `${fromEmotion.id}-${toEmotion.id}`;
    useVisualizationStore.getState().setSelectedPath(pathId);

    // Restore compute mode after a brief delay
    setTimeout(() => {
      useVisualizationStore.getState().updateSetting("computeMode", currentSetting);
    }, 100);

    onClose(); // Close matrix to see the path in 3D
  };

  // Get hovered emotion objects
  const hoveredEmotions =
    hoveredCell && viewMode === "emotions"
      ? {
          from: allEmotions.find((e) => e.id === hoveredCell.from),
          to: allEmotions.find((e) => e.id === hoveredCell.to),
        }
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm">
      <div
        className={`${theme.effects.glass} ${theme.layout.borderRadius} shadow-2xl w-full h-full flex flex-col border ${theme.colors.border}`}
      >
        {/* Header */}
        <MatrixHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isComputing={isComputing}
          isLoadingCache={isLoadingCache}
          progress={progress}
          estimatedTimeRemaining={estimatedTimeRemaining}
          stats={stats}
          onLoadCache={loadCachedPaths}
          onComputeAll={computeAllPaths}
          onExport={exportMatrixAsCSV}
          onClose={onClose}
        />

        {/* Legend & Stats */}
        <MatrixLegend stats={stats} />

        {/* Matrix Grid */}
        <div className={`flex-1 overflow-auto p-4 ${theme.colors.background}`}>
          <MatrixGrid
            viewMode={viewMode}
            sortedEmotions={sortedEmotions}
            categories={categories}
            getCellColor={getCellColor}
            getCategoryCellColor={getCategoryCellColor}
            getCategoryAverageDifficulty={getCategoryAverageDifficulty}
            getPathForPair={getPathForPair}
            hoveredCell={hoveredCell}
            onHoverCell={(from, to) => setHoveredCell({ from, to })}
            onLeaveCell={() => setHoveredCell(null)}
            onCellClick={handleCellClick}
            allEmotions={allEmotions}
          />
        </div>

        {/* Enhanced Hover Tooltip */}
        {hoveredEmotions?.from && hoveredEmotions?.to && (
          <MatrixTooltip
            fromEmotion={hoveredEmotions.from}
            toEmotion={hoveredEmotions.to}
            path={getPathForPair(hoveredEmotions.from, hoveredEmotions.to)}
          />
        )}
      </div>
    </div>
  );
}
