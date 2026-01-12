/**
 * useEmotionAtlas Hook
 *
 * Fetches all 87 emotions from the Observer API and loads them into the admin store.
 */

import { useEffect, useCallback } from "react";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import type { AtlasEmotion } from "@/types/atlas-admin";
import type { ObserverEmotionResponse } from "@/types/api-responses";
import { logger } from "@/utils/logger";
import { getCanonicalEmotion } from "@love/experience-shared";

const OBSERVER_API_URL = process.env.NEXT_PUBLIC_OBSERVER_API_URL || "http://localhost:8000";

export function useEmotionAtlas() {
  const { allEmotions, isLoadingEmotions, error, setAllEmotions, setLoadingEmotions, setError } =
    useAtlasAdminStore();

  const fetchEmotions = useCallback(async () => {
    setLoadingEmotions(true);
    setError(null);

    try {
      logger.info("api", "Fetching emotions from Observer API...");
      const response = await fetch(`${OBSERVER_API_URL}/observer/atlas/emotions`);

      if (!response.ok) {
        throw new Error(`Failed to fetch emotions: ${response.statusText}`);
      }

      const data: ObserverEmotionResponse = await response.json();

      // Transform API response to our internal format
      // Patch with Canonical VACs if valid to ensure 3D visualization works even if backend sends valid 0,0,0 or mocks
      const emotions: AtlasEmotion[] = data.emotions.map((emotion) => {
        const canonical = getCanonicalEmotion(emotion.name);
        // Use canonical VAC if available and backend sends [0,0,0] (suspiciously neutral), or just prefer canonical for visuals
        // For now, we prefer backend, but fallback if backend is suspicious 0,0,0 for a non-neutral emotion
        const isSuspiciouslyNeutral =
          emotion.vac[0] === 0 &&
          emotion.vac[1] === 0 &&
          emotion.vac[2] === 0 &&
          emotion.name.toLowerCase() !== "neutral";

        const vac = isSuspiciouslyNeutral && canonical ? canonical.vac : emotion.vac;

        return {
          id: emotion.id,
          name: emotion.name,
          category: emotion.category,
          definition: emotion.definition,
          vac,
          quaternion: emotion.quaternion,
          color_hint: emotion.color_hint,
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
  }, [setLoadingEmotions, setError, setAllEmotions]);

  useEffect(() => {
    // Only fetch if we don't have emotions yet
    if (allEmotions.length === 0 && !isLoadingEmotions) {
      fetchEmotions();
    }
  }, [allEmotions.length, isLoadingEmotions, fetchEmotions]);

  const refetchEmotions = () => {
    fetchEmotions();
  };

  return {
    emotions: allEmotions,
    isLoading: isLoadingEmotions,
    error,
    refetch: refetchEmotions,
  };
}
