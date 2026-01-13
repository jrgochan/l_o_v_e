import { renderHook, waitFor } from "@testing-library/react";
import { useLoadCachedPaths } from "@/hooks/useLoadCachedPaths";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { logger } from "@/utils/logger";

jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/utils/logger");

describe("useLoadCachedPaths", () => {
  const mockAddComputedPath = jest.fn();
  const mockUpdateCacheStatus = jest.fn();

  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();

    // Manual global fetch mock
    global.fetch = jest.fn();

    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: [{ id: "e1" }, { id: "e2" }],
        addComputedPath: mockAddComputedPath,
      };
      return selector(state);
    });

    (useAtlasAdminStore.getState as jest.Mock).mockReturnValue({
      updateCacheStatus: mockUpdateCacheStatus,
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("should load cached paths if emotions exist", async () => {
    const mockResponse = {
      paths: [
        {
          from_emotion: { id: "e1" },
          to_emotion: { id: "e2" },
          waypoints: [],
          distance: 1,
          estimated_time: 1,
          difficulty: "easy",
          requires_bridge: false,
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useLoadCachedPaths());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockAddComputedPath).toHaveBeenCalled();
    expect(result.current.loadedCount).toBe(1);
    expect(result.current.error).toBeNull();
    expect(mockUpdateCacheStatus).toHaveBeenCalled();
  });

  it("should skip if no emotions loaded", async () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: [], // Empty
        addComputedPath: mockAddComputedPath,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useLoadCachedPaths());

    expect(result.current.isLoading).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should handle error", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useLoadCachedPaths());

    await waitFor(() => {
      expect(result.current.error).toBe("Network Error");
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle api returning not ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    }); // 404 or 500

    const { result } = renderHook(() => useLoadCachedPaths());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockAddComputedPath).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith("api", "No cached paths available yet");
  });

  it("should handle empty paths response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ paths: [] }),
    });

    const { result } = renderHook(() => useLoadCachedPaths());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockAddComputedPath).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith("api", "No cached paths found");
  });

  it("should verify waypoint mapping", async () => {
    const mockResponse = {
      paths: [
        {
          from_emotion: { id: "e1" },
          to_emotion: { id: "e2" },
          waypoints: [
            { emotion: { id: "w1", name: "W1" }, vac: { v: 1, a: 1, c: 1 } }
          ],
          distance: 1,
          estimated_time: 1,
          difficulty: "easy",
          requires_bridge: false,
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(() => useLoadCachedPaths());

    await waitFor(() => {
      expect(mockAddComputedPath).toHaveBeenCalledWith(
        expect.objectContaining({
          waypoints: expect.arrayContaining([
            expect.objectContaining({
              emotion: expect.objectContaining({ id: "w1", name: "W1" }),
              reasoning: "",
            })
          ])
        })
      );
    });
  });

  it("should skip paths with missing emotions", async () => {
    // e3 does not exist in store mock
    const mockResponse = {
      paths: [
        {
          from_emotion: { id: "e1" },
          to_emotion: { id: "e3" },
          waypoints: [],
          distance: 1,
          estimated_time: 1,
          difficulty: "easy",
          requires_bridge: false,
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useLoadCachedPaths());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockAddComputedPath).not.toHaveBeenCalled();
  });

  it("should handle non-Error throws", async () => {
    (global.fetch as jest.Mock).mockRejectedValue("String Error"); // Not an Error object

    const { result } = renderHook(() => useLoadCachedPaths());

    await waitFor(() => {
      expect(result.current.error).toBe("Unknown error");
    });
    expect(result.current.isLoading).toBe(false);
  });
});
