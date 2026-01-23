/**
 * Emotion Search Hook
 *
 * Manages emotion search functionality including:
 * - Search query state
 * - Filtering emotions by name or category
 * - Search result counts
 */

import { useState, useMemo } from "react";
import type { Emotion } from "@/types/visualization";

interface UseEmotionSearchOptions {
  allEmotions: Emotion[];
}

interface UseEmotionSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredEmotions: Emotion[];
  hasActiveSearch: boolean;
  resultCount: number;
}

/**
 * Custom hook for emotion search functionality
 */
export function useEmotionSearch({ allEmotions }: UseEmotionSearchOptions): UseEmotionSearchReturn {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter emotions by search query
  const filteredEmotions = useMemo(() => {
    if (!searchQuery) return allEmotions;

    const query = searchQuery.toLowerCase();
    return allEmotions.filter(
      (emotion) =>
        emotion.name.toLowerCase().includes(query) || emotion.category.toLowerCase().includes(query)
    );
  }, [allEmotions, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredEmotions,
    hasActiveSearch: searchQuery.length > 0,
    resultCount: filteredEmotions.length,
  };
}
