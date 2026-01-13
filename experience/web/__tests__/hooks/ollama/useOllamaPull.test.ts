import { renderHook, act } from "@testing-library/react";
import { useOllamaPull } from "../../../hooks/ollama/useOllamaPull";

class MockWebSocket {
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = 1; // OPEN
  url: string;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => this.onopen && this.onopen(), 0);
    MockWebSocket.instances.push(this);
  }

  send(data: string) { }
  close() {
    if (this.onclose) this.onclose();
  }

  // Helper to simulate message from server
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  onopen() { }

  static instances: MockWebSocket[] = [];
  static clear() {
    this.instances = [];
  }
}

global.WebSocket = MockWebSocket as any;

describe("useOllamaPull", () => {
  const mockFetchLocalModels = jest.fn();
  const mockSetError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    MockWebSocket.clear();
    (global.fetch as any) = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should pull model successfully", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ task_id: "task-123" }),
    });

    const { result } = renderHook(() =>
      useOllamaPull({
        localModels: [],
        fetchLocalModels: mockFetchLocalModels,
        setError: mockSetError,
      })
    );

    await act(async () => {
      await result.current.pullModel("llama3");
    });

    const ws = MockWebSocket.instances[0];
    expect(ws).toBeDefined();

    act(() => {
      ws.simulateMessage({ status: "pulling", percentage: 50 });
    });

    expect(result.current.pulling["llama3"].status).toBe("pulling");

    act(() => {
      ws.simulateMessage({ status: "success", percentage: 100 });
    });

    expect(result.current.pulling["llama3"].status).toBe("success");
    expect(mockFetchLocalModels).toHaveBeenCalled();

    // Wait for cleanup timeout
    act(() => {
      jest.runAllTimers();
    });

    expect(result.current.pulling["llama3"]).toBeUndefined();
  });

  it("should handle pull error via websocket", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ task_id: "task-123" }),
    });

    const { result } = renderHook(() =>
      useOllamaPull({
        localModels: [],
        fetchLocalModels: mockFetchLocalModels,
        setError: mockSetError,
      })
    );

    await act(async () => {
      await result.current.pullModel("llama3");
    });

    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateMessage({ status: "error", error: "Failed" });
    });

    expect(mockSetError).toHaveBeenCalledWith("Failed to pull llama3");
  });

  it("should handle fetch start failure", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: "Server Error",
    });

    const { result } = renderHook(() =>
      useOllamaPull({
        localModels: [],
        fetchLocalModels: mockFetchLocalModels,
        setError: mockSetError,
      })
    );

    await act(async () => {
      await result.current.pullModel("llama3");
    });

    expect(mockSetError).toHaveBeenCalledWith(expect.stringContaining("Failed to start pull"));
  });

  it("should handle fetch exception", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() =>
      useOllamaPull({
        localModels: [],
        fetchLocalModels: mockFetchLocalModels,
        setError: mockSetError,
      })
    );

    await act(async () => {
      await result.current.pullModel("llama3");
    });

    expect(mockSetError).toHaveBeenCalledWith("Network Error");
  });

  it("should handle non-Error object rejection in pull", async () => {
    (global.fetch as any).mockRejectedValue("String Error");

    const { result } = renderHook(() =>
      useOllamaPull({
        localModels: [],
        fetchLocalModels: mockFetchLocalModels,
        setError: mockSetError,
      })
    );

    await act(async () => {
      await result.current.pullModel("llama3");
    });

    expect(mockSetError).toHaveBeenCalledWith("Failed to pull model");
  });

  it("should handle websocket connection error", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ task_id: "task-123" }),
    });

    const { result } = renderHook(() =>
      useOllamaPull({
        localModels: [],
        fetchLocalModels: mockFetchLocalModels,
        setError: mockSetError,
      })
    );

    await act(async () => {
      await result.current.pullModel("llama3");
    });

    const ws = MockWebSocket.instances[0];
    act(() => {
      if (ws.onerror) ws.onerror(new Event("error"));
    });

    expect(mockSetError).toHaveBeenCalledWith(expect.stringContaining("WebSocket error"));
  });

  it("should handle already installed model logic", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ task_id: "task-123" }),
    });

    // Mock model as already installed in the prop
    const { result } = renderHook(() =>
      useOllamaPull({
        localModels: [
          {
            name: "llama3",
            size: 1000,
            modified_at: "",
            digest: "",
            parameter_size: "8b",
            quantization: "q4",
            family: "llama",
          },
        ],
        fetchLocalModels: mockFetchLocalModels,
        setError: mockSetError,
      })
    );

    await act(async () => {
      await result.current.pullModel("llama3");
    });

    const ws = MockWebSocket.instances[0];

    // Send 4 'unknown' status messages to trigger determination
    act(() => {
      ws.simulateMessage({ status: "unknown" });
      ws.simulateMessage({ status: "unknown" });
      ws.simulateMessage({ status: "unknown" });
      ws.simulateMessage({ status: "unknown" });
    });

    expect(result.current.pulling["llama3"].status).toBe("already_installed");
    expect(mockFetchLocalModels).toHaveBeenCalled();

    // Cleanup
    act(() => {
      jest.runAllTimers();
    });
    expect(result.current.pulling["llama3"]).toBeUndefined();
  });
});
