import { useMemo } from "react";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import type { AtlasEmotion } from "@/types/atlas-admin";

interface UseCommandPaletteFilterOptions {
  search: string;
  selectedCategory: string | null;
  favoriteEmotions: string[];
  recentEmotions: string[];
  selectedEmotionIds: Set<string>;
}

// Calculate VAC distance between two emotions
const calculateVACDistance = (
  vac1: [number, number, number],
  vac2: [number, number, number]
): number => {
  const [v1, a1, c1] = vac1;
  const [v2, a2, c2] = vac2;
  return Math.sqrt(Math.pow(v1 - v2, 2) + Math.pow(a1 - a2, 2) + Math.pow(c1 - c2, 2));
};

export function useCommandPaletteFilter({
  search,
  selectedCategory,
  favoriteEmotions,
  recentEmotions,
  selectedEmotionIds,
}: UseCommandPaletteFilterOptions) {
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const computedPaths = useAtlasAdminStore((state) => state.computedPaths);

  // Filter recent emotions
  const recentEmotionsList = useMemo(() => {
    return recentEmotions
      .map((id) => allEmotions.find((e) => e.id === id))
      .filter((e): e is AtlasEmotion => {
        return e !== undefined;
      })
      .slice(0, 5);
  }, [recentEmotions, allEmotions]);

  // Filter favorite emotions
  const favoriteEmotionsList = useMemo(() => {
    return favoriteEmotions
      .map((id) => allEmotions.find((e) => e.id === id))
      .filter((e): e is AtlasEmotion => e !== undefined);
  }, [favoriteEmotions, allEmotions]);

  const filteredEmotions = useMemo(() => {
    const searchTerm = search.trim();

    // No search or slash command - return all or category filter
    if (!searchTerm || searchTerm.startsWith("/")) {
      if (!selectedCategory) return allEmotions;
      return allEmotions.filter((emotion) => emotion.category === selectedCategory);
    }

    // ~emotion - Find similar emotions (VAC distance)
    if (searchTerm.startsWith("~")) {
      const emotionName = searchTerm.slice(1).trim();
      const targetEmotion = allEmotions.find(
        (e) => e.name.toLowerCase() === emotionName.toLowerCase()
      );

      if (targetEmotion) {
        return [...allEmotions]
          .map((e) => ({
            emotion: e,
            distance: calculateVACDistance(e.vac, targetEmotion.vac),
          }))
          .sort((a, b) => a.distance - b.distance)
          .filter((item) => item.distance < 0.5 && item.emotion.id !== targetEmotion.id)
          .map((item) => item.emotion);
      }
    }

    // !emotion - Find opposite emotions
    if (searchTerm.startsWith("!")) {
      const emotionName = searchTerm.slice(1).trim();
      const targetEmotion = allEmotions.find(
        (e) => e.name.toLowerCase() === emotionName.toLowerCase()
      );

      if (targetEmotion) {
        const invertedVAC: [number, number, number] = [
          -targetEmotion.vac[0],
          -targetEmotion.vac[1],
          -targetEmotion.vac[2],
        ];

        return [...allEmotions]
          .map((e) => ({
            emotion: e,
            distance: calculateVACDistance(e.vac, invertedVAC),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10) // Top 10 opposite emotions
          .map((item) => item.emotion);
      }
    }

    // >category - Filter by category prefix
    if (searchTerm.startsWith(">")) {
      const categoryPrefix = searchTerm.slice(1).trim().toLowerCase();
      return allEmotions.filter((e) => e.category.toLowerCase().startsWith(categoryPrefix));
    }

    // @favorite - Show only favorites
    if (searchTerm === "@favorite" || searchTerm === "@favorites") {
      return favoriteEmotionsList;
    }

    // VAC filters: valence>0.5, arousal<0, connection>0.8
    const vacFilterMatch = searchTerm.match(
      /^(valence|arousal|connection)\s*([<>=]+)\s*(-?\d+\.?\d*)$/i
    );
    if (vacFilterMatch) {
      const [, coord, operator, valueStr] = vacFilterMatch;
      const value = parseFloat(valueStr);
      const coordIndex =
        coord.toLowerCase() === "valence" ? 0 : coord.toLowerCase() === "arousal" ? 1 : 2;

      return allEmotions.filter((e) => {
        const coordValue = e.vac[coordIndex];
        switch (operator) {
          case ">":
            return coordValue > value;
          case "<":
            return coordValue < value;
          case ">=":
            return coordValue >= value;
          case "<=":
            return coordValue <= value;
          case "=":
          case "==":
            return Math.abs(coordValue - value) < 0.1;
          default:
            return true;
        }
      });
    }

    // Default: fuzzy search
    const searchLower = searchTerm.toLowerCase();

    return allEmotions.filter((emotion) => {
      const matchesSearch =
        emotion.name.toLowerCase().includes(searchLower) ||
        emotion.definition.toLowerCase().includes(searchLower) ||
        emotion.category.toLowerCase().includes(searchLower);

      if (selectedCategory) {
        return matchesSearch && emotion.category === selectedCategory;
      }
      return matchesSearch;
    });
  }, [allEmotions, search, selectedCategory, favoriteEmotionsList]);

  // Filter computed paths with smart logic
  const filteredPaths = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const paths = Array.from(computedPaths.values());
    const selectedIds = Array.from(selectedEmotionIds);

    // Scenario 1: Context-aware suggestions (No search, 1 emotion selected)
    if (!searchTerm && selectedIds.length === 1) {
      const activeEmotionId = selectedIds[0];
      return paths.filter((p) => p.from.id === activeEmotionId).slice(0, 5);
    }

    // Scenario 2: Active Search
    // Only search paths if query is valid
    if (
      !searchTerm ||
      searchTerm.length < 2 ||
      searchTerm.startsWith("/") ||
      searchTerm.match(/^[~!>@]/) ||
      searchTerm.match(/^(valence|arousal|connection)/i)
    ) {
      return [];
    }

    return paths
      .filter((path) => {
        const fromName = path.from.name.toLowerCase();
        const toName = path.to.name.toLowerCase();

        // Check for explicit "X to Y" format
        const parts = searchTerm.split(" to ");
        let strictMatch = null;

        if (parts.length >= 2) {
          const [start, end] = parts.map((s) => s.trim());
          if (start && end) {
            strictMatch = fromName.includes(start) && toName.includes(end);
          }
        }

        if (strictMatch !== null) {
          return strictMatch;
        }

        // Check for deep match
        return fromName.includes(searchTerm) || toName.includes(searchTerm);
      })
      .slice(0, 5);
  }, [search, computedPaths, selectedEmotionIds]);

  // Group emotions by category for list view
  const emotionsByCategory = useMemo(() => {
    const groups = new Map<string, AtlasEmotion[]>();

    allEmotions.forEach((emotion) => {
      const category = emotion.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(emotion);
    });

    return groups;
  }, [allEmotions]);

  return {
    filteredEmotions,
    filteredPaths,
    recentEmotionsList,
    favoriteEmotionsList,
    emotionsByCategory,
  };
}
