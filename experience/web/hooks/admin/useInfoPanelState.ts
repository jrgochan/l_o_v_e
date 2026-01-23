/**
 * useInfoPanelState Hook
 *
 * Manages the state for the Info Panel component including:
 * - Active tab selection (info vs stats)
 * - Selected waypoint modal state
 * - Display priority logic (emotion vs path)
 * - Selected paths filtering
 *
 * @example
 * ```tsx
 * const {
 *   activeTab,
 *   setActiveTab,
 *   selectedWaypoint,
 *   setSelectedWaypoint,
 *   displayPath,
 *   displayEmotion,
 *   selectedPaths
 * } = useInfoPanelState();
 * ```
 */

import { useState, useMemo } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import type { PathWaypoint } from "@/types/visualization";

export type TabType = "info" | "stats";

export interface SelectedWaypointState {
  waypoint: PathWaypoint;
  index: number;
}

export function useInfoPanelState() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("info");

  // Waypoint modal state
  const [selectedWaypoint, setSelectedWaypoint] = useState<SelectedWaypointState | null>(null);

  // Store state
  const allEmotions = useVisualizationStore((state) => state.allEmotions);
  const selectedIds = useVisualizationStore((state) => state.selectedEmotionIds);
  const hoveredId = useVisualizationStore((state) => state.hoveredEmotionId);
  const hoveredPathId = useVisualizationStore((state) => state.hoveredPathId);
  const selectedPathId = useVisualizationStore((state) => state.selectedPathId);
  const computedPaths = useVisualizationStore((state) => state.computedPaths);
  const isComputingPaths = useVisualizationStore((state) => state.isComputingPaths);
  const pathAnimationMode = useVisualizationStore((state) => state.settings.pathAnimationMode);
  const deselectEmotion = useVisualizationStore((state) => state.deselectEmotion);
  const setFocusedEmotionId = useVisualizationStore((state) => state.setFocusedEmotionId);
  const focusedEmotionId = useVisualizationStore((state) => state.focusedEmotionId);

  // Compute selected emotions (memoized to avoid infinite loops)
  const selectedEmotions = useMemo(() => {
    return allEmotions.filter((emotion) => selectedIds.has(emotion.id));
  }, [allEmotions, selectedIds]);

  // Display path - prioritize selected over hovered (persists on click)
  const displayPath = useMemo(() => {
    if (selectedPathId) {
      return computedPaths.get(selectedPathId) || null;
    }
    if (hoveredPathId) {
      return computedPaths.get(hoveredPathId) || null;
    }
    return null;
  }, [selectedPathId, hoveredPathId, computedPaths]);

  // Display emotion - ONLY if not showing a path
  const displayEmotion = useMemo(() => {
    if (displayPath) return null;

    if (hoveredId) {
      return allEmotions.find((e) => e.id === hoveredId) || null;
    }

    if (selectedEmotions.length === 1) {
      return selectedEmotions[0];
    }

    return null;
  }, [displayPath, hoveredId, allEmotions, selectedEmotions]);

  // Filter paths to only show between selected emotions
  const selectedPaths = useMemo(() => {
    if (selectedIds.size < 2) return [];

    // Only show paths where BOTH from and to are in selected set
    return Array.from(computedPaths.values()).filter(
      (path) => selectedIds.has(path.from.id) && selectedIds.has(path.to.id)
    );
  }, [computedPaths, selectedIds]);

  return {
    // Tab state
    activeTab,
    setActiveTab,

    // Waypoint modal
    selectedWaypoint,
    setSelectedWaypoint,

    // Display logic
    displayPath,
    displayEmotion,
    selectedEmotions,
    selectedPaths,

    // Store actions
    deselectEmotion,
    setFocusedEmotionId,

    // Store values
    allEmotions,
    isComputingPaths,
    pathAnimationMode,
    focusedEmotionId,
  };
}
