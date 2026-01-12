import { renderHook, act } from "@testing-library/react";
import { useEmotionSearch } from "@/hooks/admin/useEmotionSearch";
import type { AtlasEmotion } from "@/types/atlas-admin";

describe("useEmotionSearch", () => {
  const mockEmotions: AtlasEmotion[] = [
    {
      id: "1",
      name: "Joy",
      category: "Positive",
      definition: "",
      vac: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      color_hint: "",
    },
    {
      id: "2",
      name: "Sadness",
      category: "Negative",
      definition: "",
      vac: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      color_hint: "",
    },
    {
      id: "3",
      name: "Anger",
      category: "Negative",
      definition: "",
      vac: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      color_hint: "",
    },
  ];

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useEmotionSearch({ allEmotions: mockEmotions }));

    expect(result.current.searchQuery).toBe("");
    expect(result.current.hasActiveSearch).toBe(false);
    expect(result.current.filteredEmotions).toEqual(mockEmotions); // All by default? Or empty? Logic says "if (!searchQuery) return allEmotions"
    expect(result.current.resultCount).toBe(3);
  });

  it("should filter by name (case-insensitive)", () => {
    const { result } = renderHook(() => useEmotionSearch({ allEmotions: mockEmotions }));

    act(() => {
      result.current.setSearchQuery("joy");
    });

    expect(result.current.searchQuery).toBe("joy");
    expect(result.current.hasActiveSearch).toBe(true);
    expect(result.current.filteredEmotions).toHaveLength(1);
    expect(result.current.filteredEmotions[0].name).toBe("Joy");
  });

  it("should filter by category", () => {
    const { result } = renderHook(() => useEmotionSearch({ allEmotions: mockEmotions }));

    act(() => {
      result.current.setSearchQuery("Negative");
    });

    expect(result.current.filteredEmotions).toHaveLength(2); // Sadness, Anger
  });

  it("should handle no results", () => {
    const { result } = renderHook(() => useEmotionSearch({ allEmotions: mockEmotions }));

    act(() => {
      result.current.setSearchQuery("XYZ");
    });

    expect(result.current.filteredEmotions).toHaveLength(0);
    expect(result.current.resultCount).toBe(0);
  });

  it("should handle empty emotions list", () => {
    const { result } = renderHook(() => useEmotionSearch({ allEmotions: [] }));
    expect(result.current.filteredEmotions).toHaveLength(0);
  });
});
