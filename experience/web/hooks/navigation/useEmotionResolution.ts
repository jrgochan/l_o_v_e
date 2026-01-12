import { useCallback } from "react";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import type { AtlasEmotion } from "@/types/atlas-admin";

export function useEmotionResolution() {
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);

  /**
   * Find an emotion in the atlas by name (case-insensitive, partial match)
   */
  const findEmotionByName = useCallback(
    (emotionName: string): AtlasEmotion | null => {
      if (!emotionName) return null;

      const searchTerm = emotionName.toLowerCase().trim();

      // Try exact match first
      let emotion = allEmotions.find((e) => e.name.toLowerCase() === searchTerm);

      // Fall back to partial match
      if (!emotion) {
        emotion = allEmotions.find(
          (e) =>
            e.name.toLowerCase().includes(searchTerm) || searchTerm.includes(e.name.toLowerCase())
        );
      }

      return emotion || null;
    },
    [allEmotions]
  );

  return { findEmotionByName };
}
