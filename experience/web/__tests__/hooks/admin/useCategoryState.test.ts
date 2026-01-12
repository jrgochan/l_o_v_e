import { renderHook, act } from "@testing-library/react";
import { useCategoryState } from "@/hooks/admin/useCategoryState";
import type { AtlasEmotion } from "@/types/atlas-admin";

describe("useCategoryState", () => {
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
      name: "Excitement",
      category: "Positive",
      definition: "",
      vac: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      color_hint: "",
    },
    {
      id: "3",
      name: "Sadness",
      category: "Negative",
      definition: "",
      vac: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      color_hint: "",
    },
  ];

  it("should group emotions by category", () => {
    const { result } = renderHook(() =>
      useCategoryState({
        allEmotions: mockEmotions,
        selectedIds: new Set(),
      })
    );

    expect(result.current.emotionsByCategory.get("Positive")).toHaveLength(2);
    expect(result.current.emotionsByCategory.get("Negative")).toHaveLength(1);
  });

  it("should toggle category expansion", () => {
    const { result } = renderHook(() =>
      useCategoryState({
        allEmotions: mockEmotions,
        selectedIds: new Set(),
      })
    );

    expect(result.current.expandedCategories.has("Positive")).toBe(false);

    act(() => {
      result.current.toggleCategoryExpansion("Positive");
    });
    expect(result.current.expandedCategories.has("Positive")).toBe(true);

    act(() => {
      result.current.toggleCategoryExpansion("Positive");
    });
    expect(result.current.expandedCategories.has("Positive")).toBe(false);
  });

  it("should calculate category selection state correctly", () => {
    // 1 selected in Positive (some)
    const selectedIds = new Set(["1"]);
    const { result } = renderHook(() =>
      useCategoryState({
        allEmotions: mockEmotions,
        selectedIds,
      })
    );

    expect(result.current.getCategorySelectionState("Positive")).toBe("some");
    expect(result.current.getCategorySelectionState("Negative")).toBe("none");
  });

  it("should return 'all' when all emotions in category selected", () => {
    const selectedIds = new Set(["3"]); // Negative has only id:3
    const { result } = renderHook(() =>
      useCategoryState({
        allEmotions: mockEmotions,
        selectedIds,
      })
    );

    expect(result.current.getCategorySelectionState("Negative")).toBe("all");
  });
});
