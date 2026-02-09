import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface EmotionState {
  emotion: string;
  category: string;
  vac: [number, number, number];
}

export interface Waypoint {
  order: number;
  emotion: string;
  category: string;
  vac: [number, number, number];
  reasoning: string;
  estimated_time: string;
  difficulty: string;
}

import { StrategyStep } from "../services/therapeuticService";

export interface Path {
  path_id: string;
  current_state: EmotionState;
  goal_state: EmotionState;
  waypoints: Waypoint[];
  path_metrics: {
    total_distance: number;
    estimated_time: string;
    difficulty: string;
    requires_bridge: boolean;
    bridge_emotions?: string[];
    success_probability?: number;
  };
  steps?: StrategyStep[]; // For explanation details
}

interface PathExplorerState {
  // Selection
  startEmotion: EmotionState | null;
  goalEmotion: EmotionState | null;

  // Paths
  primaryPath: Path | null;
  alternativePaths: Path[];
  isLoading: boolean;
  error: string | null;

  // Explanation UX
  selectedStepIndex: number | null;
  showExplanation: boolean;
  explanationMode: "simple" | "detailed";

  // Actions
  setStartEmotion: (emotion: EmotionState | null) => void;
  setGoalEmotion: (emotion: EmotionState | null) => void;
  setPrimaryPath: (path: Path) => void;
  setAlternativePaths: (paths: Path[]) => void;
  selectStep: (index: number | null) => void;
  toggleExplanation: (show: boolean) => void;
  setExplanationMode: (mode: "simple" | "detailed") => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  updateWaypoint: (index: number, newWaypoint: Waypoint) => void;
}

export const usePathExplorerStore = create<PathExplorerState>()(
  devtools(
    (set) => ({
      startEmotion: null,
      goalEmotion: null,
      primaryPath: null,
      alternativePaths: [],
      isLoading: false,
      error: null,
      selectedStepIndex: null,
      showExplanation: false,
      explanationMode: "simple",

      setStartEmotion: (emotion) => set({ startEmotion: emotion }),
      setGoalEmotion: (emotion) => set({ goalEmotion: emotion }),
      setPrimaryPath: (path) => set({ primaryPath: path }),
      setAlternativePaths: (paths) => set({ alternativePaths: paths }),
      selectStep: (index) => set({ selectedStepIndex: index }),
      toggleExplanation: (show) => set({ showExplanation: show }),
      setExplanationMode: (mode) => set({ explanationMode: mode }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      reset: () =>
        set({
          startEmotion: null,
          goalEmotion: null,
          primaryPath: null,
          alternativePaths: [],
          error: null,
          selectedStepIndex: null,
          showExplanation: false,
        }),
      updateWaypoint: (index, newWaypoint) =>
        set((state) => {
          if (!state.primaryPath) return {};

          // Deep clone path to avoid mutation issues
          const newPath = { ...state.primaryPath };
          const newWaypoints = [...newPath.waypoints];

          // Update specific waypoint (offset by 1 if steps include start?)
          // The store 'waypoints' array usually excludes start/goal in Python,
          // but 'steps' often includes them.
          // Let's assume index matches the 'waypoints' array for now.
          if (index >= 0 && index < newWaypoints.length) {
            newWaypoints[index] = newWaypoint;
            newPath.waypoints = newWaypoints;

            // Clear detailed steps/explanations since they are now stale
            // A full explanation regeneration would be needed from backend
            newPath.steps = [];

            // Mark as user-modified (optional logic)
            // (could add a 'modified' flag to Path interface later)
          }

          return { primaryPath: newPath };
        }),
    }),
    { name: "PathExplorerStore" }
  )
);
