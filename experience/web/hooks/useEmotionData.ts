/**
 * useEmotionData Hook
 *
 * Fetches all emotions from the Observer API and loads them into the admin store.
 */

import { useEffect, useCallback } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import {
  type Emotion,
  type EmotionCollection,
  ATLAS_DATASET_BRIDGE_EMOTIONS,
} from "@/types/visualization";
import type { ObserverEmotionResponse } from "@/types/api-responses";
import { logger } from "@/utils/logger";
import { getCanonicalEmotion } from "@love/experience-shared";

const OBSERVER_API_URL = process.env.NEXT_PUBLIC_OBSERVER_URL || "http://localhost:8000";

export function useEmotionData() {
  const {
    allEmotions,
    collections,
    activeCollectionId,
    isLoadingEmotions,
    isLoadingCollections,
    error,
    setAllEmotions,
    setCollections,
    setActiveCollection,
    setLoadingEmotions,
    setError,
  } = useVisualizationStore();

  // 1. Fetch Collections
  const fetchCollections = useCallback(async () => {
    if (collections.length > 0) return; // Already loaded

    try {
      logger.info("api", "Fetching emotion collections...");
      const response = await fetch(`${OBSERVER_API_URL}/observer/collections`);
      if (!response.ok) throw new Error("Failed to fetch collections");

      const data: { collections: EmotionCollection[] } = await response.json();
      const loadedCollections = data.collections || [];
      setCollections(loadedCollections);

      // Set default active if none selected
      if (!activeCollectionId && loadedCollections.length > 0) {
        const defaultCollection =
          loadedCollections.find((c) => c.is_default) || loadedCollections[0];
        setActiveCollection(defaultCollection.id);
        logger.info("api", `Set active collection to ${defaultCollection.name}`);
      }
    } catch (err) {
      logger.error("api", "Error fetching collections", err);
      // Don't block, just log. Fallback to emotions fetch might still work if default handles it.
    }
  }, [collections.length, activeCollectionId, setCollections, setActiveCollection]);

  // 2. Fetch Emotions for Active Collection
  const fetchEmotions = useCallback(async () => {
    // Wait for collection to be active (or default)
    // If no collections loaded yet, we might want to wait or just fetch default

    setLoadingEmotions(true);
    setError(null);

    try {
      const collectionParam = activeCollectionId ? `?collection_id=${activeCollectionId}` : "";
      logger.info("api", `Fetching emotions for collection ${activeCollectionId || "default"}...`);

      const response = await fetch(`${OBSERVER_API_URL}/observer/emotions${collectionParam}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch emotions: ${response.statusText}`);
      }

      const data: ObserverEmotionResponse = await response.json();

      // Transform API response
      const emotions: Emotion[] = data.emotions.map((emotion) => {
        const canonical = getCanonicalEmotion(emotion.name);
        // Fix for potentially missing VACs in backend (fallback to canonical if available)
        const isSuspiciouslyNeutral =
          !emotion.vac ||
          (emotion.vac[0] === 0 &&
            emotion.vac[1] === 0 &&
            emotion.vac[2] === 0 &&
            emotion.name.toLowerCase() !== "neutral");

        const vac = isSuspiciouslyNeutral && canonical ? canonical.vac : emotion.vac;

        // Bridge detection (fallback to hardcoded list if backend doesn't provide it)
        // Hardcoded list from Atlas dataset
        const BRIDGE_NAMES: readonly string[] = ATLAS_DATASET_BRIDGE_EMOTIONS;
        const isBridge = BRIDGE_NAMES.includes(emotion.name);

        return {
          id: emotion.id,
          collection_id: emotion.collection_id,
          name: emotion.name,
          category: emotion.category,
          definition: emotion.definition,
          vac: vac || [0, 0, 0],
          quaternion: emotion.quaternion,
          extended: emotion.extended_vector || undefined,
          color_hint: emotion.color_hint,
          movement_pattern: emotion.movement_pattern,
          is_bridge: isBridge,
        };
      });

      logger.info("api", `Loaded ${emotions.length} emotions from Observer`);
      setAllEmotions(emotions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logger.error("api", "Error fetching emotions", errorMessage);
      setError(errorMessage);
      setLoadingEmotions(false);
    }
  }, [activeCollectionId, setLoadingEmotions, setError, setAllEmotions]);

  // Initial load effect
  useEffect(() => {
    const init = async () => {
      await fetchCollections();
    };
    init();
  }, [fetchCollections]);

  // Fetch emotions when active collection changes
  useEffect(() => {
    if (activeCollectionId || (!isLoadingCollections && collections.length === 0)) {
      // Fetch if we have an ID, OR if we failed to load collections (default fallback)
      fetchEmotions();
    }
  }, [activeCollectionId, fetchEmotions, isLoadingCollections, collections.length]);

  const refetchEmotions = () => {
    fetchEmotions();
  };

  return {
    emotions: allEmotions,
    collections,
    activeCollectionId,
    isLoading: isLoadingEmotions || isLoadingCollections,
    error,
    refetch: refetchEmotions,
  };
}
