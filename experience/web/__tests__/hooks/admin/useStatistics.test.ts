import { renderHook, waitFor, act } from "@testing-library/react";
import { useStatistics } from "@/hooks/admin/useStatistics";
import { logger } from "@/utils/logger";

jest.mock("@/utils/logger");

describe("useStatistics", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    // Mock prompt/confirm
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("should fetch statistics on mount", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ total_cached: 100 })
    });

    const { result } = renderHook(() => useStatistics());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toEqual({ total_cached: 100 });
    expect(result.current.error).toBeNull();
  });

  it("should clear cache on request", async () => {
    // First fetch call is init stats. Second call will be delete. Third call will be refresh stats.
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // Init
      .mockResolvedValueOnce({ ok: true, json: async () => ({ deleted_count: 50 }) }) // Delete
      .mockResolvedValueOnce({ ok: true, json: async () => ({ total_cached: 0 }) }); // Refresh

    const { result } = renderHook(() => useStatistics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.clearCache();
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/cache"), expect.objectContaining({ method: "DELETE" }));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("50"));
  });

  it("should handle error", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("API Fail"));

    const { result } = renderHook(() => useStatistics());

    await waitFor(() => {
      expect(result.current.error).toBe("API Fail");
    });
  });
});
