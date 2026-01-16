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
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import type { PathWaypoint } from "@/types/atlas-admin";

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
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const selectedIds = useAtlasAdminStore((state) => state.selectedEmotionIds);
  const hoveredId = useAtlasAdminStore((state) => state.hoveredEmotionId);
  const hoveredPathId = useAtlasAdminStore((state) => state.hoveredPathId);
  const selectedPathId = useAtlasAdminStore((state) => state.selectedPathId);
  const computedPaths = useAtlasAdminStore((state) => state.computedPaths);
  const isComputingPaths = useAtlasAdminStore((state) => state.isComputingPaths);
  const pathAnimationMode = useAtlasAdminStore((state) => state.settings.pathAnimationMode);
  const deselectEmotion = useAtlasAdminStore((state) => state.deselectEmotion);

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

    // Store values
    allEmotions,
    isComputingPaths,
    pathAnimationMode,
  };
}
