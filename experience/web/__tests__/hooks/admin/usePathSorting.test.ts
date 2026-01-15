import { renderHook } from "@testing-library/react";
import { usePathSorting } from "@/hooks/admin/usePathSorting";
import type { EmotionPath } from "@/types/atlas-admin";

describe("usePathSorting", () => {
  const mockPaths: EmotionPath[] = [
    {
      id: "p1",
      total_distance: 10,
      waypoints: [{ emotion: { id: "w1" } } as any],
      difficulty: "easy",
      requires_bridge: false,
      from: { id: "a" } as any,
      to: { id: "b" } as any,
      estimated_time: "5m",
    },
    {
      id: "p2",
      total_distance: 5,
      waypoints: [{ emotion: { id: "w2" } } as any, { emotion: { id: "w3" } } as any],
      difficulty: "moderate",
      requires_bridge: true,
      from: { id: "a" } as any,
      to: { id: "c" } as any,
      estimated_time: "10m",
    },
    {
      id: "p3",
      total_distance: 20,
      waypoints: [],
      difficulty: "difficult",
      requires_bridge: false,
      from: { id: "a" } as any,
      to: { id: "d" } as any,
      estimated_time: "15m",
    },
  ];

  // Sorted order should be: p2 (dist 5), p1 (dist 10), p3 (dist 20)

  it("should sort paths by distance ascending", () => {
    const { result } = renderHook(() => usePathSorting(mockPaths));

    expect(result.current).toHaveLength(3);
    expect(result.current[0].path.id).toBe("p2");
    expect(result.current[1].path.id).toBe("p1");
    expect(result.current[2].path.id).toBe("p3");
  });

  it("should assign correct badges", () => {
    const { result } = renderHook(() => usePathSorting(mockPaths));

    // p2 is first (shortest), moderate, requires bridge
    // p1 is second, easy, no bridge
    // p3 is last, difficult, no bridge

    // Min waypoints: p3 has 0, p1 has 1, p2 has 2.
    // Logic: minWaypoints = 0.
    // fewestSteps check: path.waypoints.length === min && length > 0.
    // So p3 (0) fails length > 0.
    // Wait, let's verify logic: `path.waypoints.length === minWaypoints && path.waypoints.length > 0`

    const p2Badges = result.current[0].badges;
    expect(p2Badges.isShort).toBe(true);
    expect(p2Badges.isEasy).toBe(false);
    expect(p2Badges.noBridge).toBe(false); // it requires bridge

    const p1Badges = result.current[1].badges;
    expect(p1Badges.isShort).toBe(false);
    expect(p1Badges.isEasy).toBe(true);
    // anyBridge is true because p2 has it. So p1 should get noBridge badge.
    expect(p1Badges.noBridge).toBe(true);
  });

  it("should handle fewest steps logic correctly", () => {
    // Create scenarios where fewest is applicable
    const paths: EmotionPath[] = [
      {
        ...mockPaths[0],
        id: "shortSteps",
        waypoints: [{ emotion: {} } as any],
        total_distance: 100,
      },
      { ...mockPaths[1], id: "longSteps", waypoints: [{}, {}] as any, total_distance: 200 },
    ];

    const { result } = renderHook(() => usePathSorting(paths));
    // sorted by distance: shortSteps, longSteps

    // min waypoints = 1.
    // shortSteps has 1. It should get fewestSteps badge?

    const badge = result.current[0].badges;
    expect(badge.fewestSteps).toBe(true);
  });

  it("does not award noBridge badge if no bridges needed at all", () => {
    // All paths don't need bridge
    const paths = mockPaths.filter((p) => !p.requires_bridge).map((p) => ({ ...p }));
    const { result } = renderHook(() => usePathSorting(paths));

    // For p1 (easy, no bridge):
    // anyBridge should be false.
    // noBridge badge should be false.
    expect(result.current[0].badges.noBridge).toBe(false);
  });

  it("does not award fewestSteps if 0 steps", () => {
    const { result } = renderHook(() => usePathSorting(mockPaths));
    // p3 is index 2. waypoints=[], minWaypoints=0.
    // But >0 check fails.
    expect(result.current[2].badges.fewestSteps).toBe(false);
  });

  it("should handle empty list", () => {
    const { result } = renderHook(() => usePathSorting([]));
    expect(result.current).toEqual([]);
  });
});
