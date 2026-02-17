import { act } from "@testing-library/react";
import { useStrategyBrowserStore } from "@/stores/useStrategyBrowserStore";
import { therapeuticService } from "@/services/therapeuticService";

jest.mock("@/services/therapeuticService", () => ({
  therapeuticService: {
    searchStrategies: jest.fn(),
  },
}));

describe("useStrategyBrowserStore", () => {
  const mockStrategies = [
    {
      strategy_id: "s1",
      name: "Breathing",
      type: "Somatic",
      description: "Breathe deeply",
      evidence_level: "High",
      difficulty_level: 1,
    },
  ];

  beforeEach(() => {
    useStrategyBrowserStore.getState().resetFilters();
    jest.clearAllMocks();
  });

  it("sets basic state", () => {
    act(() => {
      useStrategyBrowserStore.getState().setStrategies(mockStrategies);
      useStrategyBrowserStore.getState().setLoading(true);
      useStrategyBrowserStore.getState().setError("err");
    });

    const state = useStrategyBrowserStore.getState();
    expect(state.strategies).toEqual(mockStrategies);
    expect(state.isLoading).toBe(true);
    expect(state.error).toBe("err");
  });

  it("sets filters", () => {
    act(() => {
      useStrategyBrowserStore.getState().setFilters({ search: "breathe" });
    });
    expect(useStrategyBrowserStore.getState().filters.search).toBe("breathe");
  });

  it("fetches strategies success", async () => {
    (therapeuticService.searchStrategies as jest.Mock).mockResolvedValue({
      strategies: mockStrategies,
    });

    await act(async () => {
      await useStrategyBrowserStore.getState().fetchStrategies();
    });

    expect(useStrategyBrowserStore.getState().strategies).toEqual(mockStrategies);
    expect(useStrategyBrowserStore.getState().isLoading).toBe(false);
  });

  it("handles fetch errors", async () => {
    (therapeuticService.searchStrategies as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    await act(async () => {
      await useStrategyBrowserStore.getState().fetchStrategies();
    });

    expect(useStrategyBrowserStore.getState().error).toBe("Fetch failed");
    expect(useStrategyBrowserStore.getState().isLoading).toBe(false);
  });

  it("selects strategy", () => {
    act(() => {
      useStrategyBrowserStore.getState().selectStrategy(mockStrategies[0]);
    });
    expect(useStrategyBrowserStore.getState().selectedStrategy).toEqual(mockStrategies[0]);
  });

  it("resetFilters resets all filters", () => {
    act(() => {
      useStrategyBrowserStore.getState().setFilters({ search: "foo", type: "bar" });
      useStrategyBrowserStore.getState().resetFilters();
    });

    const filters = useStrategyBrowserStore.getState().filters;
    expect(filters.search).toBe("");
    expect(filters.type).toBeNull();
  });
});
