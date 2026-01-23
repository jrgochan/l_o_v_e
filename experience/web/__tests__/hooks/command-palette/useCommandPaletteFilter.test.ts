import { renderHook } from "@testing-library/react";
import { useCommandPaletteFilter } from "@/hooks/command-palette/useCommandPaletteFilter";
import { useVisualizationStore } from "@/stores/useVisualizationStore";

// Mock store
jest.mock("@/stores/useVisualizationStore");

const MOCK_EMOTIONS = [
  { id: "1", name: "Joy", category: "positive", vac: [1, 1, 1], definition: "Happy" },
  { id: "2", name: "Sadness", category: "negative", vac: [-1, -1, -1], definition: "Sad" },
  { id: "3", name: "Anger", category: "high-energy", vac: [-0.5, 0.8, -0.2], definition: "Mad" },
];

const MOCK_PATHS_STRUCT = new Map([
  [
    "path1",
    {
      id: "path1",
      from: MOCK_EMOTIONS[0],
      to: MOCK_EMOTIONS[1],
      fromName: "Joy",
      toName: "Sadness",
    },
  ],
]);

describe("useCommandPaletteFilter coverage sweep", () => {
  beforeEach(() => {
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        allEmotions: MOCK_EMOTIONS,
        computedPaths: MOCK_PATHS_STRUCT,
      });
    });
  });

  // 1. Core Fuzzy & Category Combination
  it("filters by fuzzy text + category selection (Line 152)", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "Joy",
        selectedCategory: "positive",
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredEmotions.length).toBe(1);
    expect(result.current.filteredEmotions[0].name).toBe("Joy");

    // Negative case: Match name but wrong category
    const { result: result2 } = renderHook(() =>
      useCommandPaletteFilter({
        search: "Joy",
        selectedCategory: "negative",
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result2.current.filteredEmotions.length).toBe(0);
  });

  // 1a. Recent Emotions Filtering (Lines 34-41)
  it("filters recent emotions correctly, ignoring unknown IDs", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: ["1", "999"], // "1" exists (Joy), "999" does not
        selectedEmotionIds: new Set(),
      })
    );
    // Should return Joy, and verify length is 1 (999 filtered out)
    expect(result.current.recentEmotionsList).toHaveLength(1);
    expect(result.current.recentEmotionsList[0].name).toBe("Joy");
  });

  // 1b. Browsing Category (Empty Search)
  it("filters by category only (Empty Search)", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "",
        selectedCategory: "positive",
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredEmotions.length).toBe(1);
    expect(result.current.filteredEmotions[0].name).toBe("Joy");
  });

  // 2. Tilde ~ Similar Logic (Lines 59-72)
  it("filters by similarity (~)", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "~Joy",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredEmotions).toBeDefined();

    // Mock close emotion
    const MOCK_CLOSE = {
      id: "4",
      name: "Elation",
      category: "positive",
      vac: [0.9, 0.9, 0.9],
      definition: "Very happy",
    };
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        allEmotions: [...MOCK_EMOTIONS, MOCK_CLOSE],
        computedPaths: MOCK_PATHS_STRUCT,
      });
    });

    const { result: result3 } = renderHook(() =>
      useCommandPaletteFilter({
        search: "~Joy",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result3.current.filteredEmotions[0].name).toBe("Elation");
  });

  it("handles unknown emotion in similarity search (~)", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "~Unknown",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    // Should fall through to fuzzy search (returning nothing for "Unknown")
    expect(result.current.filteredEmotions).toEqual([]);
  });

  // 3. Bang ! Opposite Logic (Lines 78-97)
  it("filters by opposite (!)", () => {
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
    expect(result.current.filteredEmotions[0].name).toBe("Sadness");
  });

  it("handles unknown emotion in opposite search (!)", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "!Unknown",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    // Should fall through to fuzzy search
    expect(result.current.filteredEmotions).toEqual([]);
  });

  // 4. @favorite Logic (Line 109)
  it("filters by @favorite exact match", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "@favorite",
        selectedCategory: null,
        favoriteEmotions: ["1"], // Joy
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredEmotions).toHaveLength(1);
    expect(result.current.filteredEmotions[0].name).toBe("Joy");
  });

  it("filters by @favorites (plural)", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "@favorites",
        selectedCategory: null,
        favoriteEmotions: ["1"],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredEmotions[0].name).toBe("Joy");
  });

  // 5. VAC Logic coverage (Default switch / Operators)
  it("handles VAC equality operators", () => {
    // =
    const { result: eq } = renderHook(() =>
      useCommandPaletteFilter({
        search: "valence = 1",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(eq.current.filteredEmotions.find((e) => e.name === "Joy")).toBeTruthy();

    // ==
    const { result: eq2 } = renderHook(() =>
      useCommandPaletteFilter({
        search: "valence == 1",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(eq2.current.filteredEmotions.find((e) => e.name === "Joy")).toBeTruthy();

    // >=
    const { result: gte } = renderHook(() =>
      useCommandPaletteFilter({
        search: "valence >= 0.8",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(gte.current.filteredEmotions.find((e) => e.name === "Joy")).toBeTruthy();

    // <=
    const { result: lte } = renderHook(() =>
      useCommandPaletteFilter({
        search: "valence <= -0.5",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(lte.current.filteredEmotions.find((e) => e.name === "Sadness")).toBeTruthy();

    // < (Missing from previous report)
    const { result: lt } = renderHook(() =>
      useCommandPaletteFilter({
        search: "valence < 0",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(lt.current.filteredEmotions.find((e) => e.name === "Sadness")).toBeTruthy();

    // > (Missing from previous report)
    const { result: gt } = renderHook(() =>
      useCommandPaletteFilter({
        search: "valence > 0.5",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(gt.current.filteredEmotions.find((e) => e.name === "Joy")).toBeTruthy();

    // Arousal coverage
    const { result: arousal } = renderHook(() =>
      useCommandPaletteFilter({
        search: "arousal > 0.5",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(arousal.current.filteredEmotions.some((e) => e.name === "Anger")).toBe(true);

    // Connection coverage
    const { result: connection } = renderHook(() =>
      useCommandPaletteFilter({
        search: "connection < 0",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(connection.current.filteredEmotions.some((e) => e.name === "Anger")).toBe(true);

    // Default switch case (pass '>>' which matches regex [<>]+ but isn't a case)
    const { result: def } = renderHook(() =>
      useCommandPaletteFilter({
        search: "valence >> 0",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    // With default returning true, should include all
    expect(def.current.filteredEmotions.length).toBeGreaterThan(0);
  });

  // 6. Category > prefix Logic
  it("filters by > Category (Lines 101-105)", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: ">pos",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredEmotions[0].name).toBe("Joy"); // positive
  });

  // 7. Path Logic Edge Cases
  it("handles path suggestions context (1 selected)", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(["1"]),
      })
    );
    expect(result.current.filteredPaths.length).toBe(1);
  });

  it("handles empty path search scenarios", () => {
    // "Joy to"
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "Joy to",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredPaths).toEqual([]);

    // " to Sadness"
    const { result: res2 } = renderHook(() =>
      useCommandPaletteFilter({
        search: " to Sadness",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(res2.current.filteredPaths).toEqual([]);

    // "/"
    const { result: res3 } = renderHook(() =>
      useCommandPaletteFilter({
        search: "/",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(res3.current.filteredPaths).toEqual([]);

    // " to "
    const { result: res4 } = renderHook(() =>
      useCommandPaletteFilter({
        search: " to ",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(res4.current.filteredPaths).toEqual([]);
  });

  it("filters paths by X to Y check", () => {
    // Ensure lines 189-191 are hit
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

    // Mismatching end (enters if block, returns false)
    const { result: res2 } = renderHook(() =>
      useCommandPaletteFilter({
        search: "Joy to Anger",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(res2.current.filteredPaths).toHaveLength(0);

    // Mismatching start (enters if block, returns false immediately at line 193)
    const { result: res5 } = renderHook(() =>
      useCommandPaletteFilter({
        search: "Anger to Sadness",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(res5.current.filteredPaths).toHaveLength(0);
  });

  it("handles paths with ' to ' in the name (fallthrough logic)", () => {
    const MOCK_SPECIAL_PATH = {
      id: "p2",
      from: { ...MOCK_EMOTIONS[0], name: "Joy to World" },
      to: MOCK_EMOTIONS[1],
      fromName: "Joy to World",
      toName: "Sadness",
    };
    const SPECIAL_PATHS = new Map([["p2", MOCK_SPECIAL_PATH]]);

    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        allEmotions: MOCK_EMOTIONS,
        computedPaths: SPECIAL_PATHS,
      });
    });

    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "Joy to",
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    expect(result.current.filteredPaths).toHaveLength(1);
    expect(result.current.filteredPaths[0].from.name).toBe("Joy to World");
    expect(result.current.filteredPaths[0].from.name).toBe("Joy to World");
  });

  it("handles partial strict match input (Valid Start, Invalid End)", () => {
    const { result } = renderHook(() =>
      useCommandPaletteFilter({
        search: "Joy to ", // Note the trailing space
        selectedCategory: null,
        favoriteEmotions: [],
        recentEmotions: [],
        selectedEmotionIds: new Set(),
      })
    );
    // Should split to ["Joy", ""]. start="Joy", end="". strictMatch block skipped.
    // Fallback to deep match. "Joy to " not found in names unless mock data has it.
    expect(result.current.filteredPaths).toEqual([]);
  });
});
