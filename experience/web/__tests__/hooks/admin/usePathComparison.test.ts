import { renderHook } from "@testing-library/react";
import { usePathComparison } from "@/hooks/admin/usePathComparison";
import type { EmotionPath } from "@/types/atlas-admin";

describe("usePathComparison", () => {
  const mockPaths: EmotionPath[] = [
    {
      id: "p1",
      total_distance: 10,
      waypoints: [],
      difficulty: "easy",
      requires_bridge: false,
      from: { id: "a" } as any,
      to: { id: "b" } as any,
      estimated_time: 1
    },
    {
      id: "p2",
      total_distance: 20,
      waypoints: [],
      difficulty: "difficult",
      requires_bridge: true,
      from: { id: "a" } as any,
      to: { id: "c" } as any,
      estimated_time: 2
    }
  ];

  it("should calculate metrics correctly", () => {
    const { result } = renderHook(() => usePathComparison(mockPaths));

    expect(result.current.shortestDistance).toBe(10);
    expect(result.current.longestDistance).toBe(20);
    expect(result.current.hasEasyPath).toBe(true);
    // p1 is no bridge, p2 is bridge. so 1 path without bridge.
    expect(result.current.noBridgePaths).toBe(1);
  });

  it("should handle empty paths", () => {
    const { result } = renderHook(() => usePathComparison([]));

    expect(result.current.shortestDistance).toBe(0);
    expect(result.current.longestDistance).toBe(0);
    expect(result.current.hasEasyPath).toBe(false);
    expect(result.current.noBridgePaths).toBe(0);
  });
});
