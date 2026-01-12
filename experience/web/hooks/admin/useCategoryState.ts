/**
 * Category State Hook
 *
 * Manages category expansion and grouping logic including:
 * - Category expansion/collapse state
 * - Grouping emotions by category
 * - Category selection state calculations
 */

import { useState, useMemo } from "react";
import type { AtlasEmotion } from "@/types/atlas-admin";

interface UseCategoryStateOptions {
  allEmotions: AtlasEmotion[];
  selectedIds: Set<string>;
}

interface UseCategoryStateReturn {
  expandedCategories: Set<string>;
  toggleCategoryExpansion: (category: string) => void;
  emotionsByCategory: Map<string, AtlasEmotion[]>;
  getCategorySelectionState: (category: string) => "all" | "some" | "none";
}

/**
 * Custom hook for category state management
 */
export function useCategoryState({
  allEmotions,
  selectedIds,
}: UseCategoryStateOptions): UseCategoryStateReturn {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group emotions by category
  const emotionsByCategory = useMemo(() => {
    const grouped = new Map<string, AtlasEmotion[]>();
    allEmotions.forEach((emotion) => {
      if (!grouped.has(emotion.category)) {
        grouped.set(emotion.category, []);
      }
      grouped.get(emotion.category)!.push(emotion);
    });
    return grouped;
  }, [allEmotions]);

  // Toggle category expansion
  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Get category selection state (all/some/none)
  const getCategorySelectionState = (category: string): "all" | "some" | "none" => {
    const categoryEmotions = emotionsByCategory.get(category) || [];
    const selectedCount = categoryEmotions.filter((e) => selectedIds.has(e.id)).length;

    if (selectedCount === 0) return "none";
    if (selectedCount === categoryEmotions.length) return "all";
    return "some";
  };

  return {
    expandedCategories,
    toggleCategoryExpansion,
    emotionsByCategory,
    getCategorySelectionState,
  };
}
