import { renderHook } from "@testing-library/react";
import { useMatrixStats } from "@/hooks/visualization/matrix/useMatrixStats";

describe("useMatrixStats", () => {
  const mockEmotions = [{ id: "1" }, { id: "2" }, { id: "3" }] as any[];

  // Total possible = 3 * 2 = 6

  const mockPaths = new Map();
  mockPaths.set("1-2", { difficulty: "easy" });
  mockPaths.set("1-3", { difficulty: "moderate" });
  mockPaths.set("2-3", { difficulty: "difficult" });

  it("should calculate correct statistics", () => {
    const { result } = renderHook(() =>
      useMatrixStats({ allEmotions: mockEmotions, computedPaths: mockPaths })
    );

    expect(result.current.totalPossible).toBe(6);
    expect(result.current.computed).toBe(3);
    expect(result.current.percentage).toBe("50.0"); // 3/6 * 100

    expect(result.current.byDifficulty.easy).toBe(1);
    expect(result.current.byDifficulty.moderate).toBe(1);
    expect(result.current.byDifficulty.difficult).toBe(1);
  });

  it("should handle empty state", () => {
    const { result } = renderHook(() =>
      useMatrixStats({ allEmotions: [], computedPaths: new Map() })
    );
    expect(result.current.totalPossible).toBe(-0);
    expect(result.current.percentage).toBe("0.0");
  });
});
