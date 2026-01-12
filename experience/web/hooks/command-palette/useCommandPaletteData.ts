import { useState, useCallback } from "react";
import { logger } from "@/utils/logger";

const RECENT_EMOTIONS_KEY = "love-recent-emotions";
const FAVORITE_EMOTIONS_KEY = "love-favorite-emotions";
const MAX_RECENT = 10;

export function useCommandPaletteData() {
  // Recent emotions (persisted to localStorage)
  const [recentEmotions, setRecentEmotions] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(RECENT_EMOTIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      logger.warn("hooks", "Failed to parse recent emotions from localStorage");
      return [];
    }
  });

  // Favorite emotions (persisted to localStorage)
  const [favoriteEmotions, setFavoriteEmotions] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(FAVORITE_EMOTIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      logger.warn("hooks", "Failed to parse favorite emotions from localStorage");
      return [];
    }
  });

  const addToRecent = useCallback((emotionId: string) => {
    setRecentEmotions((prev) => {
      const filtered = prev.filter((id) => id !== emotionId);
      const updated = [emotionId, ...filtered].slice(0, MAX_RECENT);
      if (typeof window !== "undefined") {
        localStorage.setItem(RECENT_EMOTIONS_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const toggleFavorite = useCallback((emotionId: string) => {
    setFavoriteEmotions((prev) => {
      const updated = prev.includes(emotionId)
        ? prev.filter((id) => id !== emotionId)
        : [...prev, emotionId];
      if (typeof window !== "undefined") {
        localStorage.setItem(FAVORITE_EMOTIONS_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const isRecent = useCallback(
    (emotionId: string) => recentEmotions.includes(emotionId),
    [recentEmotions]
  );

  const isFavorite = useCallback(
    (emotionId: string) => favoriteEmotions.includes(emotionId),
    [favoriteEmotions]
  );

  return {
    recentEmotions,
    favoriteEmotions,
    addToRecent,
    toggleFavorite,
    isRecent,
    isFavorite,
  };
}
