import { renderHook } from "@testing-library/react";
import { useCommandPaletteFilter } from "@/hooks/command-palette/useCommandPaletteFilter";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Mock store
jest.mock("@/stores/useAtlasAdminStore");

const MOCK_EMOTIONS = [
  { id: "1", name: "Joy", category: "positive", vac: [1, 1, 1], definition: "Happy" },
  { id: "2", name: "Sadness", category: "negative", vac: [-1, -1, -1], definition: "Sad" },
  { id: "3", name: "Anger", category: "negative", vac: [-1, 1, -0.5], definition: "Angry" },
  { id: "4", name: "Peace", category: "positive", vac: [0.5, -0.5, 0.5], definition: "Peaceful" },
];

const MOCK_PATHS = new Map([
  ["path1", { id: "path1", from: MOCK_EMOTIONS[0], to: MOCK_EMOTIONS[1] }],
]);

describe("useCommandPaletteFilter", () => {
  beforeEach(() => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: MOCK_EMOTIONS,
        computedPaths: MOCK_PATHS,
      };
      return selector(state);
    });
  });

  it("should filter by category prefix", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: ">negative",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );

    expect(result.current.filteredEmotions).toHaveLength(2);
    expect(result.current.filteredEmotions.map((e: any) => e.name)).toEqual(["Sadness", "Anger"]);
  });

  it("should filter by fuzzy text", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "hap", // "Happy" definition or "Peace" which has 'p'? No, Joy definition is Happy
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );

    expect(result.current.filteredEmotions).toHaveLength(1);
    expect(result.current.filteredEmotions[0].name).toBe("Joy");
  });

  it("should filter by VAC filters", () => {
    // valence > 0.8
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "valence > 0.8",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );

    // Joy (1) is > 0.8. Peace (0.5) is not.
    expect(result.current.filteredEmotions).toHaveLength(1);
    expect(result.current.filteredEmotions[0].name).toBe("Joy");
  });

  it("should find opposite emotions", () => {
    // !Joy (VAC [1,1,1]) -> Inverse [-1,-1,-1] -> Sadness is closest
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "!Joy",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );

    expect(result.current.filteredEmotions.length).toBeGreaterThan(0);
    // Sadness should be first as it matches [-1,-1,-1] perfectly
    expect(result.current.filteredEmotions[0].name).toBe("Sadness");
  });

  it("should find similar emotions", () => {
    // Add a close neighbor to Joy
    jest.clearAllMocks();
    const EXTENDED_MOCK = [
      ...MOCK_EMOTIONS,
      {
        id: "5",
        name: "Bliss",
        category: "positive",
        vac: [0.95, 0.95, 0.95],
        definition: "Pure bliss",
      },
    ];
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ allEmotions: EXTENDED_MOCK, computedPaths: MOCK_PATHS })
    );

    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "~Joy",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );

    expect(result.current.filteredEmotions).toHaveLength(1);
    expect(result.current.filteredEmotions[0].name).toBe("Bliss");
  });

  it("should filter paths by context (single selection)", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(["1"]), // Joy selected
      })
    );

    // Should return paths starting from Joy
    expect(result.current.filteredPaths).toHaveLength(1);
    expect(result.current.filteredPaths[0].id).toBe("path1");
  });

  it("should filter paths by explicit 'to' query", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "Joy to Sadness",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );

    expect(result.current.filteredPaths).toHaveLength(1);
    expect(result.current.filteredPaths[0].id).toBe("path1");
  });

  it("should return empty if 'from' matches but 'to' does not", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "Joy to Anger", // Joy exists, Anger exists (as emotion), but path Joy->Anger might not
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    // MOCK_PATHS has path1: Joy -> Sadness.
    // Joy to Anger: match 'Joy'(from) && 'Anger'(to).
    // fromName(Joy) includes 'Joy'. toName(Sadness) NO include 'Anger'.
    // 191: return true && false -> false.
    expect(result.current.filteredPaths).toEqual([]);
  });

  it("should return empty if 'from' fails match", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "Anger to Sadness", // Anger does not start path
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    // fromName(Joy) includes 'Anger'? No.
    // 191: return false && ... -> false (short circuit)
    expect(result.current.filteredPaths).toEqual([]);
  });

  it("should filter favorites via @favorite", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "@favorite",
        selectedCategory: null,
        favoriteEmotions: ["1"],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );

    expect(result.current.filteredEmotions).toHaveLength(1);
    expect(result.current.filteredEmotions[0].name).toBe("Joy");
  });

  it("should handle VAC operators", () => {
    // Test logic <, <=, >=, =
    const cases = [
      { query: "valence < 0", expected: ["Sadness", "Anger"] },
      { query: "valence = 1", expected: ["Joy"] }, // Exact match
      { query: "arousal >= 1", expected: ["Joy", "Anger"] }, // Joy(1), Anger(1)
    ];

    cases.forEach(({ query, expected }) => {
      const { result } = renderHook(() =>
        useCommandPaletteFilter({
          search: query,
          selectedCategory: null,
          favoriteEmotions: [],
          recentEmotions: [],
          selectedEmotionIds: new Set(),
        })
      );
      const names = result.current.filteredEmotions.map((e: any) => e.name);
      expect(names.sort()).toEqual(expected.sort());
    });
  });

  it("should handle all VAC coords correctly for ternary coverage", () => {
    // Test "arousal" and "connection"
    const cases = [
      { query: "arousal > 0.9", expected: ["Joy", "Anger"] }, // Joy(1), Anger(1)
      { query: "connection > 0.9", expected: ["Joy"] }, // Joy(1)
      { query: "connection < -0.9", expected: ["Sadness"] } // Sadness(-1)
    ];

    cases.forEach(({ query, expected }) => {
      const { result } = renderHook(() =>
        useCommandPaletteFilter({
          search: query,

          selectedCategory: null,
          favoriteEmotions: [],
          recentEmotions: [],
          selectedEmotionIds: new Set(),
        })
      );
      const names = result.current.filteredEmotions.map((e: any) => e.name);
      expect(names.sort()).toEqual(expected.sort());
    });
  });

  it("should handle invalid X to Y search patterns", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "Joy to", // Missing end part
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    // Should return empty list (filteredPaths)
    expect(result.current.filteredPaths).toEqual([]);
  });

  it("should handle ' to target' (missing start) search pattern", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: " to Sadness",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredPaths).toEqual([]);
  });

  it("should handle ' to ' (missing both) search pattern", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: " to ",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredPaths).toEqual([]);
  });

  it("should group emotions by category", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );

    const groups = result.current.emotionsByCategory;
    expect(groups.get("positive")).toHaveLength(2); // Joy, Peace
    expect(groups.get("negative")).toHaveLength(2); // Sadness, Anger
  });

  it("should filter by selectedCategory with empty search", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "",
        selectedCategory: "positive",
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredEmotions).toHaveLength(2);
    expect(result.current.filteredEmotions.every((e) => e.category === "positive")).toBe(true);
  });

  it("should enforce selectedCategory during search", () => {
    // "Sad" matches "Sadness" (negative) but we filter for "positive"
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "Sad",
        selectedCategory: "positive",
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredEmotions).toHaveLength(0);
  });

  it("should handle invalid VAC operator gracefully (fallthrough)", () => {
    // "===" is captured by regex but not in switch
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "valence === 1",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    // Should match everything (default: return true)
    expect(result.current.filteredEmotions).toHaveLength(MOCK_EMOTIONS.length);
  });

  it("should handle <= VAC operator", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "valence <= -0.5",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredEmotions).toHaveLength(2);
  });

  it("should filter recent emotions excluding invalid IDs", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: ["1", "invalid-id"], // "1" is Joy, "invalid-id" doesn't exist
        selectedEmotionIds: new Set(),
      })
    );

    expect(result.current.recentEmotionsList).toHaveLength(1);
    expect(result.current.recentEmotionsList[0].name).toBe("Joy");
  });

  it("should handle unknown emotion for similarity search (~Unknown)", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "~Unknown",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredEmotions).toEqual([]);
  });

  it("should handle unknown emotion for opposite search (!Unknown)", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "!Unknown",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredEmotions).toEqual([]);
  });

  it("should handle partial to query", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "Joy to ",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    // Should filter paths but maybe return empty if not enough context
    expect(result.current.filteredPaths).toEqual([]);
  });
  it("should return empty paths for short search queries", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "a", // length 1 < 2
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredPaths).toEqual([]);
  });
});
