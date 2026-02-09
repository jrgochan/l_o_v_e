import { useState, useEffect } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { usePathExplorerStore } from "@/stores/usePathExplorerStore";
import { getObserverClient, Emotion, TransitionPathResponse } from "@love/experience-shared";
import { therapeuticService } from "@/services/therapeuticService";
import { logger } from "@/utils/logger";

export function useGoalSettingLogic() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [filteredEmotions, setFilteredEmotions] = useState<Emotion[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Emotion | null>(null);
  const [generatedPath, setGeneratedPath] = useState<TransitionPathResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);

  const currentVAC = useExperienceStore((state) => state.currentVAC);
  const setTransitionPath = useExperienceStore((state) => state.setTransitionPath);
  const startJourney = useExperienceStore((state) => state.startJourney);
  const activeJourney = useExperienceStore((state) => state.activeJourney);

  // New Store
  const { setAlternativePaths, setPrimaryPath } = usePathExplorerStore();

  const loadEmotionAtlas = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const client = getObserverClient();
      const response = await client.loadEmotionAtlas();

      setEmotions(response.emotions);
      setFilteredEmotions(response.emotions);
      logger.info("api", `Loaded ${response.total_count} emotions from atlas`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load emotions";
      setError(errorMsg);
      logger.error("api", "Failed to load emotion atlas", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load emotion atlas when opened
  useEffect(() => {
    if (isOpen && emotions.length === 0) {
      loadEmotionAtlas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Filter emotions based on search
  useEffect(() => {
    if (searchQuery) {
      const filtered = emotions.filter(
        (e) =>
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEmotions(filtered);
    } else {
      setFilteredEmotions(emotions);
    }
  }, [searchQuery, emotions]);

  const handleGeneratePath = async () => {
    if (!selectedGoal) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Use new therapeutic service to support alternatives
      // Format request
      const request = {
        user_id: "00000000-0000-0000-0000-000000000001",
        current_vac: currentVAC,
        goal_vac: selectedGoal.vac,
        max_waypoints: 3,
      };

      // Fetch alternatives
      const response = await therapeuticService.findAlternativePaths(request);

      const paths = response.paths;

      if (paths && paths.length > 0) {
        // Set all paths in store for comparison view
        setAlternativePaths(paths);

        // Auto-select the first/primary path for legacy compatibility
        // We need to map the new path format to the old TransitionPathResponse format if possible
        // Or updated generatedPath type.
        // For now, let's assume the first path is what we show in the GoalSetting UI
        // But ideally GoalSetting UI should hide and show PathComparisonView

        // Let's set the primary path in the store
        setPrimaryPath(paths[0]);

        // And update the legacy state so the UI shows something
        // We might need to cast or transform if types mismatch slightly, but they should be close.
        // The backend returns a slightly different structure for 'alternatives' vs the old 'transition-path'.
        // The old structure has 'visualization_data' which is heavy.
        // The new structure has 'steps' (explanations).

        // We might need to call the single path generation if we want the full viz data for the legacy 3D view
        // OR we update the 3D view to handle the new format.
        // Given Phase 2 is about "Path Comparison", let's prioritize that.

        if (paths.length > 1) {
          logger.info("api", `Found ${paths.length} alternative paths`);
          // We don't set generatedPath yet, we let the user choose in PathComparisonView?
          // But GoalSetting.tsx doesn't know about PathComparisonView yet.
        } else {
          // If only one path, treat as standard
          // We might need the full viz data which findAlternativePaths might simplify?
          // Actually findAlternativePaths includes 'quaternion_path' in the backend?
          // Checking backend: NO, find_alternative_paths (the endpoint) returns a SIMPLIFIED list.
          // It does NOT return 'visualization_data' (the 3D curves).
        }

        // fallback: Call the original GENERATE endpoint to get the full 3D data for the BEST path
        // This ensures the 3D scene works while we show the alternatives in the UI.
        const client = getObserverClient();
        const primaryPathFull = await client.generateTransitionPath(
          "00000000-0000-0000-0000-000000000001",
          currentVAC,
          selectedGoal.vac,
          3
        );

        setGeneratedPath(primaryPathFull);
        setTransitionPath(primaryPathFull);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to generate path";
      setError(errorMsg);
      logger.error("api", "Path generation error", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectGoal = (emotion: Emotion) => {
    setSelectedGoal(emotion);
    setGeneratedPath(null); // Clear previous path
    setAlternativePaths([]); // Clear alternatives
  };

  const toggleStrategy = (strategyId: string) => {
    setExpandedStrategy(expandedStrategy === strategyId ? null : strategyId);
  };

  const handleStartJourney = async () => {
    if (!generatedPath) return;

    try {
      const client = getObserverClient();
      const response = await client.startJourney(
        "00000000-0000-0000-0000-000000000001",
        generatedPath.path_id
      );

      // Store journey in state
      startJourney(response.journey_id, generatedPath.path_id, generatedPath.waypoints.length);

      logger.info("general", "Journey started", { response });
    } catch (err) {
      logger.error("general", "Failed to start journey", err);
      setError("Failed to start journey. Please try again.");
    }
  };

  return {
    isOpen,
    setIsOpen,
    searchQuery,
    setSearchQuery,
    emotions,
    filteredEmotions,
    selectedGoal,
    generatedPath,
    setGeneratedPath,
    isGenerating,
    isLoading,
    error,
    expandedStrategy,
    handleGeneratePath,
    handleSelectGoal,
    toggleStrategy,
    handleStartJourney,
    currentVAC,
    activeJourney,
  };
}
