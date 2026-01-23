import { useState, useEffect } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { getObserverClient, Emotion, TransitionPathResponse } from "@love/experience-shared";
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
      const client = getObserverClient();
      const path = await client.generateTransitionPath(
        "00000000-0000-0000-0000-000000000001", // Mock user ID
        currentVAC,
        selectedGoal.vac,
        3 // max waypoints
      );

      setGeneratedPath(path);
      setTransitionPath(path); // Store in global state for 3D visualization
      logger.info("api", "Generated transition path", { path });
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
