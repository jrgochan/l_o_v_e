import { renderHook, act } from "@testing-library/react";
import { useOllamaCRUD } from "../../../hooks/ollama/useOllamaCRUD";

describe("useOllamaCRUD", () => {
  beforeEach(() => {
    // Manually mock fetch to ensure no network calls
    (global.fetch as any) = jest.fn();
    jest.clearAllMocks();
  });

  it("should fetch local models", async () => {
    const mockModels = [{ name: "llama3", size: 1000 }];
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockModels,
    });

    const { result } = renderHook(() => useOllamaCRUD());

    await act(async () => {
      await result.current.fetchLocalModels();
    });

    expect(result.current.localModels).toEqual(mockModels);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch error", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network erro"));

    const { result } = renderHook(() => useOllamaCRUD());

    await act(async () => {
      await result.current.fetchLocalModels();
    });

    expect(result.current.error).toContain("Network erro");
    expect(result.current.loading).toBe(false);
  });

  it("should delete model", async () => {
    // Mock delete response then fetch list response
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true }) // Delete
      .mockResolvedValueOnce({ ok: true, json: async () => [] }); // Fetch list

    const { result } = renderHook(() => useOllamaCRUD());

    await act(async () => {
      await result.current.deleteModel("llama3");
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/listener/ai/models/llama3"),
      expect.objectContaining({ method: "DELETE" })
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("should check health", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", ollama: "running" }),
    });

    const { result } = renderHook(() => useOllamaCRUD());

    const health = await result.current.checkOllamaHealth();
    expect(health).toBe(true);
  });

  it("should handle check health failure", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Down"));

    const { result } = renderHook(() => useOllamaCRUD());

    const health = await result.current.checkOllamaHealth();
    expect(health).toBe(false);
  });

  it("should get model details", async () => {
    const mockDetails = { params: {} };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockDetails,
    });

    const { result } = renderHook(() => useOllamaCRUD());
    const details = await result.current.getModelDetails("llama3");

    expect(details).toEqual(mockDetails);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/details"));
  });

  it("should handle get model details API error", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: "Not Found",
    });

    const { result } = renderHook(() => useOllamaCRUD());
    const details = await result.current.getModelDetails("bad-model");

    expect(details).toBeNull();
  });

  it("should handle get model details network error", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network"));

    const { result } = renderHook(() => useOllamaCRUD());
    const details = await result.current.getModelDetails("llama3");

    expect(details).toBeNull();
  });

  it("should handle delete model API error", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: "Forbidden",
    });

    const { result } = renderHook(() => useOllamaCRUD());
    await act(async () => {
      await result.current.deleteModel("protected");
    });

    expect(result.current.error).toContain("Forbidden");
  });

  it("should handle fetchLocalModels API error", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: "Server Error",
    });

    const { result } = renderHook(() => useOllamaCRUD());
    await act(async () => {
      await result.current.fetchLocalModels();
    });

    expect(result.current.error).toContain("Server Error");
  });

  it("should allow manual error setting", () => {
    const { result } = renderHook(() => useOllamaCRUD());

    act(() => {
      result.current.setError("Manual Error");
    });

    expect(result.current.error).toBe("Manual Error");
  });
});
