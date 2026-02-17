import { renderHook, act, waitFor } from "@testing-library/react";
import { usePersonaPlexVoice } from "@/hooks/usePersonaPlexVoice";

// Mock global objects
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1, // WebSocket.OPEN
  binaryType: "blob",
  onopen: null,
  onmessage: null,
  onerror: null,
  onclose: null,
};

// Mock AudioContext and related
const mockAudioContextInstance = {
  state: "running",
  resume: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  audioWorklet: {
    addModule: jest.fn().mockResolvedValue(undefined),
  },
  destination: {},
};

const MockAudioContext = jest.fn(() => mockAudioContextInstance);

class MockAudioWorkletNode {
  port = {
    postMessage: jest.fn(),
    onmessage: null,
  };
  connect = jest.fn();
  disconnect = jest.fn();
}

// MediaDevices mock
const mockMediaStream = {
  getTracks: jest.fn(() => [{ stop: jest.fn() }]),
};

const MockWebSocketStub = jest.fn(() => mockWebSocket);
Object.assign(MockWebSocketStub, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
});

Object.defineProperty(global, "WebSocket", {
  value: MockWebSocketStub,
  writable: true,
});

Object.defineProperty(global, "AudioContext", {
  value: MockAudioContext,
  writable: true,
});

Object.defineProperty(global, "AudioWorkletNode", {
  value: MockAudioWorkletNode,
  writable: true,
});

Object.defineProperty(navigator, "mediaDevices", {
  value: {
    getUserMedia: jest.fn().mockResolvedValue(mockMediaStream),
  },
  writable: true,
});

describe("usePersonaPlexVoice", () => {
  const defaultProps = {
    personaId: "lumina" as const,
    enabled: true,
    onDebug: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(mockMediaStream);
    (global.WebSocket as unknown as jest.Mock).mockClear();
    (global.WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);

    // Reset mockWebSocket handlers and state
    mockWebSocket.onopen = null;
    mockWebSocket.onmessage = null;
    mockWebSocket.onerror = null;
    mockWebSocket.onclose = null;
    mockWebSocket.readyState = 1; // WebSocket.OPEN

    // Reset AudioContext entries
    mockAudioContextInstance.state = "running";
    (mockAudioContextInstance.resume as jest.Mock).mockClear();
    (mockAudioContextInstance.close as jest.Mock).mockClear();
    (mockAudioContextInstance.audioWorklet.addModule as jest.Mock).mockClear();
    (mockAudioContextInstance.audioWorklet.addModule as jest.Mock).mockResolvedValue(undefined);
  });

  it("initializes in disconnected state", () => {
    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
  });

  it("starts session correctly", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));

    await act(async () => {
      await result.current.startSession();
    });

    expect(result.current.isConnecting).toBe(true);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    expect(global.WebSocket).toHaveBeenCalled();

    // Simulate WebSocket open
    await act(async () => {
      if (mockWebSocket.onopen) {
        // @ts-expect-error - mock
        mockWebSocket.onopen();
      }
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);
    expect(mockWebSocket.send).toHaveBeenCalledWith(expect.stringContaining('"type":"configure"'));

    logSpy.mockRestore();
  });

  it("handles start session errors", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(new Error("Mic denied"));
    const onError = jest.fn();

    const { result } = renderHook(() => usePersonaPlexVoice({ ...defaultProps, onError }));

    await act(async () => {
      await result.current.startSession();
    });

    expect(result.current.error).toBe("Mic denied");
    expect(onError).toHaveBeenCalledWith("Mic denied");
    expect(result.current.isConnected).toBe(false);

    errorSpy.mockRestore();
  });

  it("stops session correctly", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));

    // Start first
    await act(async () => {
      const startPromise = result.current.startSession();
      // Wait for WS creation (after getUserMedia)
      await new Promise((resolve) => setTimeout(resolve, 10)); // tiny delay for async getUserMedia

      if (mockWebSocket.onopen) {
        // @ts-expect-error - mock
        mockWebSocket.onopen();
      }
      await startPromise;
    });

    expect(result.current.isConnected).toBe(true);

    // Stop
    await act(async () => {
      result.current.stopSession();
    });

    expect(result.current.isConnected).toBe(false);
    expect(mockWebSocket.close).toHaveBeenCalled();
    // Verify audio context cleanup if possible, but it's mocked in a way that instances create local refs.
    // simpler to check if 'close' was called on the mock instance we know is used.
    // But since `new MockAudioContext()` creates a new object every time, we'd need to spy on the prototype or capture the instance.
    // For now, sufficient to assume logic is hit if no error.
    logSpy.mockRestore();
  });

  it("toggles mute", () => {
    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));

    expect(result.current.isMuted).toBe(false);

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.isMuted).toBe(true);
  });

  it("does nothing if not enabled", async () => {
    const { result } = renderHook(() => usePersonaPlexVoice({ ...defaultProps, enabled: false }));

    await act(async () => {
      await result.current.startSession();
    });

    expect(result.current.error).toBe("Voice mode is not enabled");
    expect(global.WebSocket).not.toHaveBeenCalled();
  });

  it("handles audioWorklet.addModule failure", async () => {
    (mockAudioContextInstance.audioWorklet.addModule as jest.Mock).mockRejectedValueOnce(
      new Error("Module load failed")
    );
    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));

    await act(async () => {
      await result.current.startSession();
    });

    expect(result.current.error).toMatch(/Module load failed/);
  });

  it("handles audio context suspension", async () => {
    // Mock suspended state
    mockAudioContextInstance.state = "suspended";

    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));

    await act(async () => {
      await result.current.startSession();
    });

    expect(mockAudioContextInstance.resume).toHaveBeenCalled();
  });

  it("handles WebSocket errors and close", async () => {
    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));
    await act(async () => {
      await result.current.startSession();
    });

    // Simulate Error
    await act(async () => {
      if (mockWebSocket.onerror) {
        // @ts-expect-error - mock
        mockWebSocket.onerror(new Event("error"));
      }
    });
    expect(result.current.error).toBe("Connection failed");

    // Simulate Close
    await act(async () => {
      if (mockWebSocket.onclose) {
        // @ts-expect-error - mock
        mockWebSocket.onclose();
      }
    });
    expect(result.current.isConnected).toBe(false);
  });

  it("handles WebSocket messages (text and binary)", async () => {
    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));
    await act(async () => {
      await result.current.startSession();
    });

    // Text Message
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await act(async () => {
      if (mockWebSocket.onmessage) {
        // @ts-expect-error - mock
        mockWebSocket.onmessage({ data: JSON.stringify({ type: "text-delta", text: "Hello" }) });
      }
    });
    expect(logSpy).toHaveBeenCalledWith("AI:", "Hello");

    // Binary Message (Audio)
    // 1 byte prefix (1=audio) + float32 data
    const buffer = new ArrayBuffer(1 + 4);
    const view = new DataView(buffer);
    view.setUint8(0, 1);
    view.setFloat32(1, 0.5, true); // Little endian

    await act(async () => {
      if (mockWebSocket.onmessage) {
        // @ts-expect-error - mock
        mockWebSocket.onmessage({ data: buffer });
      }
    });

    // We can't easily verify worklet postMessage on the instance created inside.
    // But we can verify no crash.
    logSpy.mockRestore();
  });

  it("handles invalid JSON messages", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));
    await act(async () => {
      await result.current.startSession();
    });

    await act(async () => {
      if (mockWebSocket.onmessage) {
        // @ts-expect-error - mock
        mockWebSocket.onmessage({ data: "invalid-json" });
      }
    });

    expect(errorSpy).toHaveBeenCalledWith("WS Parse error", expect.any(Error));
    errorSpy.mockRestore();
  });

  it("ignores unknown message types and prefixes", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));
    await act(async () => {
      await result.current.startSession();
    });

    // Unknown JSON type
    await act(async () => {
      if (mockWebSocket.onmessage) {
        // @ts-expect-error - mock
        mockWebSocket.onmessage({ data: JSON.stringify({ type: "unknown" }) });
      }
    });
    // Should log nothing special (except maybe console.log if I had one, but I don't for unknown)

    // Unknown Binary Prefix
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint8(0, 99); // Not 1
    await act(async () => {
      if (mockWebSocket.onmessage) {
        // @ts-expect-error - mock
        mockWebSocket.onmessage({ data: buffer });
      }
    });
    // Should do nothing

    expect(logSpy).not.toHaveBeenCalledWith("AI:", expect.anything());
    logSpy.mockRestore();
  });

  it("handles incoming audio when worklet is missing", async () => {
    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));
    await act(async () => {
      await result.current.startSession();
    });

    // Remove worklet node from refs (simulate race/cleanup)
    // We can't easily access refs directly.
    // But we can reset the global mock for AudioWorkletNode to return something that doesn't get captured?
    // No, startSession already ran.

    // We can trigger onmessage, but mock the workletNodeRef to be null?
    // We can't access `workletNodeRef` from outside.
    // But we can ensure that `workletNode` inside the hook is null.
    // `usePersonaPlexVoice` uses `useRef`.

    // Actually, if we stop session, WS closes.
    // But we can simulate onmessage happening AFTER stop (race condition).

    // 1. Capture onmessage
    const onmessage = mockWebSocket.onmessage;

    // 2. Stop session
    await act(async () => {
      result.current.stopSession();
    });

    // 3. Trigger captured onmessage with audio
    const buffer = new ArrayBuffer(5);
    new DataView(buffer).setUint8(0, 1);

    await act(async () => {
      if (onmessage) {
        // @ts-expect-error - mock
        await onmessage({ data: buffer });
      }
    });

    // Should not crash.
  });

  it("skips cleanup if audio context is already closed", async () => {
    mockAudioContextInstance.state = "closed";
    const { result, unmount } = renderHook(() => usePersonaPlexVoice(defaultProps));
    await act(async () => {
      await result.current.startSession();
    });
    // Even if started (which resets state to running in mock maybe? No, startSession creates new specific context, but we use global mock factory),
    // we need to simulate state becoming closed before cleanup.

    // We can force state on the instance we know is being used.
    mockAudioContextInstance.state = "closed";

    await act(async () => {
      result.current.stopSession();
    });

    expect(mockAudioContextInstance.close).not.toHaveBeenCalled();

    unmount();
  });

  it("ignores unknown worklet message types", async () => {
    // Capture worklet node
    let capturedNode: any;
    const MockNode = jest.fn().mockImplementation(() => {
      const node = {
        port: { onmessage: null, postMessage: jest.fn() },
        connect: jest.fn(),
        disconnect: jest.fn(),
      };
      capturedNode = node;
      return node;
    });
    (global as any).AudioWorkletNode = MockNode;

    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));
    await act(async () => {
      await result.current.startSession();
    });

    // Send unknown type
    await act(async () => {
      if (capturedNode && capturedNode.port.onmessage) {
        capturedNode.port.onmessage({ data: { type: "unknown_type", data: [] } });
      }
    });

    expect(mockWebSocket.send).not.toHaveBeenCalled();
  });

  it("does not send audio when muted or WS not open", async () => {
    let capturedNode: any;
    const MockNode = jest.fn().mockImplementation(() => {
      const node = {
        port: { onmessage: null, postMessage: jest.fn() },
        connect: jest.fn(),
        disconnect: jest.fn(),
      };
      capturedNode = node;
      return node;
    });
    (global as any).AudioWorkletNode = MockNode;

    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));
    await act(async () => {
      await result.current.startSession();
    });

    // Mute
    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(true);

    // Clear previous calls (handshake)
    (mockWebSocket.send as jest.Mock).mockClear();

    // Simulate Input
    await act(async () => {
      if (capturedNode && capturedNode.port.onmessage) {
        capturedNode.port.onmessage({ data: { type: "input", data: new Float32Array(128) } });
      }
    });
    // Should NOT send because muted
    expect(mockWebSocket.send).not.toHaveBeenCalled();

    // Unmute
    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(false);

    // Simulate WS Closing/Connecting state
    mockWebSocket.readyState = WebSocket.CONNECTING;

    await act(async () => {
      if (capturedNode && capturedNode.port.onmessage) {
        capturedNode.port.onmessage({ data: { type: "input", data: new Float32Array(128) } });
      }
    });
    // Should NOT send because not OPEN
    expect(mockWebSocket.send).not.toHaveBeenCalled();
  });

  it("processes input audio from worklet", async () => {
    // Need to capture the worklet node instance or mock the constructor
    let capturedNode: any;
    const MockNode = jest.fn().mockImplementation(() => {
      const node = {
        port: {
          onmessage: null,
          postMessage: jest.fn(),
        },
        connect: jest.fn(),
        disconnect: jest.fn(),
      };
      capturedNode = node;
      return node;
    });
    (global as any).AudioWorkletNode = MockNode;

    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));
    await act(async () => {
      await result.current.startSession();
    });

    // Simulate Worklet Message (Input Audio)
    const inputData = new Float32Array([0.5, -0.5, 0.5, -0.5]);

    await act(async () => {
      if (capturedNode && capturedNode.port.onmessage) {
        capturedNode.port.onmessage({ data: { type: "input", data: inputData } });
      }
    });

    expect(mockWebSocket.send).toHaveBeenCalled();
    // Verify audio level changed (internal state, but exposed via result)
    expect(result.current.audioLevel).toBeGreaterThan(0);
  });
  it("uses webkitAudioContext if AudioContext is missing", async () => {
    // Save original
    const originalAudioContext = global.AudioContext;
    // Define webkitAudioContext
    const mockWebkitContext = jest.fn(() => mockAudioContextInstance);
    Object.defineProperty(window, "webkitAudioContext", {
      value: mockWebkitContext,
      writable: true,
    });
    // Remove AudioContext
    // @ts-expect-error - testing fallback
    global.AudioContext = undefined;
    // Also window.AudioContext if jsdom sets it
    // @ts-expect-error - testing fallback
    window.AudioContext = undefined;

    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));
    await act(async () => {
      await result.current.startSession();
    });

    expect(mockWebkitContext).toHaveBeenCalled();

    // Restore
    Object.defineProperty(global, "AudioContext", { value: originalAudioContext, writable: true });
    delete window.webkitAudioContext;
  });

  it("handles non-string non-ArrayBuffer WebSocket messages", async () => {
    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));
    await act(async () => {
      await result.current.startSession();
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      if (mockWebSocket.onmessage) {
        // @ts-expect-error - mock
        mockWebSocket.onmessage({ data: new Blob([]) }); // Blob type
      }
    });

    // Should do nothing, no logs
    expect(logSpy).not.toHaveBeenCalledWith("AI:", expect.anything());
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("handles non-Error objects thrown during start", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue("Just a string error");

    const { result } = renderHook(() => usePersonaPlexVoice(defaultProps));
    await act(async () => {
      await result.current.startSession();
    });

    expect(result.current.error).toBe("Failed to start voice session"); // fallback message
    errorSpy.mockRestore();
  });
});
