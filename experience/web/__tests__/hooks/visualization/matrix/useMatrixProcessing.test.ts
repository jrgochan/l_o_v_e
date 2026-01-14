import { renderHook } from "@testing-library/react";
import { useMatrixProcessing } from "@/hooks/visualization/matrix/useMatrixProcessing";
import { DIFFICULTY_COLORS } from "@/types/atlas-admin";

describe("useMatrixProcessing", () => {
  const mockEmotions = [
    { id: "1", name: "Awe", category: "Calm" },
    { id: "2", name: "Boredom", category: "Low" },
    { id: "3", name: "Calmness", category: "Calm" },
  ] as any[];

  const mockPaths = new Map();
  mockPaths.set("1-2", { difficulty: "moderate", total_distance: 1.5 });
  mockPaths.set("1-3", { difficulty: "easy", total_distance: 0.5 });
  // reverse key not needed if hook logic checks both, but let's test that too implicitly

  it("should sort emotions alphabetically", () => {
    const { result } = renderHook(() =>
      useMatrixProcessing({ allEmotions: mockEmotions, computedPaths: mockPaths })
    );
    expect(result.current.sortedEmotions[0].name).toBe("Awe");
    expect(result.current.sortedEmotions[1].name).toBe("Boredom");
    expect(result.current.sortedEmotions[2].name).toBe("Calmness");
  });

  it("should get unique sorted categories", () => {
    const { result } = renderHook(() =>
      useMatrixProcessing({ allEmotions: mockEmotions, computedPaths: mockPaths })
    );
    expect(result.current.categories).toEqual(["Calm", "Low"]);
  });

  it("should get path for pair regardless of order", () => {
    const { result } = renderHook(() =>
      useMatrixProcessing({ allEmotions: mockEmotions, computedPaths: mockPaths })
    );
    const emo1 = mockEmotions[0]; // Awe
    const emo2 = mockEmotions[1]; // Boredom

    expect(result.current.getPathForPair(emo1, emo2)).toBeDefined();
    expect(result.current.getPathForPair(emo2, emo1)).toBeDefined();
  });

  it("should return correct cell color", () => {
    const { result } = renderHook(() =>
      useMatrixProcessing({ allEmotions: mockEmotions, computedPaths: mockPaths })
    );
    const emo1 = mockEmotions[0];
    const emo2 = mockEmotions[1];

    // Same emotion
    expect(result.current.getCellColor(emo1, emo1)).toBe("#1a1a1a");

    // Existing path
    expect(result.current.getCellColor(emo1, emo2)).toBe(DIFFICULTY_COLORS["moderate"]);

    // Non-existing path
    const emo3 = { id: "99", name: "Unknown" } as any;
    expect(result.current.getCellColor(emo1, emo3)).toBe("#2a2a2a");
  });

  it("should calculate category average difficulty", () => {
    const { result } = renderHook(() =>
      useMatrixProcessing({ allEmotions: mockEmotions, computedPaths: mockPaths })
    );

    // Calm to Low (Awe -> Boredom is 1.5, Calmness -> Boredom is undefined/assume difficult?)
    // The mock only has 1-2. 1-3 is Calm-Calm.

    const stats = result.current.getCategoryAverageDifficulty("Calm", "Low");
    // Paths: Awe(Calm)->Boredom(Low) = 1.5. Calmness(Calm)->Boredom(Low) = not found.
    // If not found, it skips.
    // So avg distance = 1.5 / 1 = 1.5 -> moderate

    expect(stats).not.toBeNull();
    expect(stats?.avgDistance).toBe(1.5);
    expect(stats?.difficulty).toBe("moderate");

    // Test Easy (< 1.0)
    // Awe(Calm) -> Calmness(Calm) is same category, skipped by logic usually, 
    // but logic says if fromCategory == toCategory return null.
    // So we need DIFFERENT category with short path.
    // Mock paths has 1-3 (Awe -> Calmness). But they are same category in mockEmotions.
    // Let's create a new mock data specifically for this test scope or expand mockEmotions?
    // We can just rely on the fact that existing logic uses the passed props.
  });

  it("should classify easy and difficult category averages", () => {
    const emotions = [
      { id: "e1", name: "E1", category: "C1" },
      { id: "e2", name: "E2", category: "C2" },
      { id: "e3", name: "E3", category: "C3" },
    ] as any[];

    const paths = new Map();
    paths.set("e1-e2", { total_distance: 0.5 }); // Easy
    paths.set("e1-e3", { total_distance: 2.5 }); // Difficult

    const { result } = renderHook(() =>
      useMatrixProcessing({ allEmotions: emotions, computedPaths: paths })
    );

    const easyStats = result.current.getCategoryAverageDifficulty("C1", "C2");
    expect(easyStats?.difficulty).toBe("easy");

    const diffStats = result.current.getCategoryAverageDifficulty("C1", "C3");
    expect(diffStats?.difficulty).toBe("difficult");
  });

  it("should return null stats for same category", () => {
    const { result } = renderHook(() =>
      useMatrixProcessing({ allEmotions: mockEmotions, computedPaths: mockPaths })
    );
    expect(result.current.getCategoryAverageDifficulty("Calm", "Calm")).toBeNull();
  });

  it("should return null for empty intersection", () => {
    const { result } = renderHook(() =>
      useMatrixProcessing({ allEmotions: mockEmotions, computedPaths: mockPaths })
    );
    expect(result.current.getCategoryAverageDifficulty("Low", "NonExistent")).toBeNull();
  });

  it("should get category cell color", () => {
    const { result } = renderHook(() =>
      useMatrixProcessing({ allEmotions: mockEmotions, computedPaths: mockPaths })
    );

    // Same category -> dark gray
    expect(result.current.getCategoryCellColor("Calm", "Calm")).toBe("#1a1a1a");

    // Existing path avg (Calm -> Low) = moderate
    expect(result.current.getCategoryCellColor("Calm", "Low")).toBe(DIFFICULTY_COLORS["moderate"]);

    // No paths (Low -> NonExistent or just empty intersection) -> fallback gray
    expect(result.current.getCategoryCellColor("Low", "NonExistent")).toBe("#2a2a2a");
  });
});
