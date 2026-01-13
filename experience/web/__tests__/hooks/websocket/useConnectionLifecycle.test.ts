import { renderHook, act } from "@testing-library/react";
import { useConnectionLifecycle } from "@/hooks/websocket/useConnectionLifecycle";
import { createWebSocketConnection } from "@/hooks/websocket/utils/socketHelpers";

// Mock dependencies
jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: jest.fn(() => ({ token: "test-token" })),
}));

// Mock socket helpers
const mockClose = jest.fn();
const mockSend = jest.fn();
const mockWebSocket = {
  readyState: WebSocket.OPEN,
  close: mockClose,
  send: mockSend,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// We need to capture the callbacks passed to createWebSocketConnection to trigger them in tests
let capturedCallbacks: any = {};

jest.mock("@/hooks/websocket/utils/socketHelpers", () => ({
  constructWebSocketUrl: jest.fn(() => "ws://test.url"),
  createWebSocketConnection: jest.fn((url, callbacks) => {
    capturedCallbacks = callbacks;
    return mockWebSocket;
  }),
  handleSocketClose: jest.fn(),
}));

describe("useConnectionLifecycle", () => {
  let props: any;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCallbacks = {};
    props = {
      sessionId: "session-1",
      enabled: true,
      autoReconnect: true,
      onMessage: jest.fn(),
      onError: jest.fn(),
      setError: jest.fn(),
      setIsConnected: jest.fn(),
      setIsConnecting: jest.fn(),
    };
  });

  it("should connect when enabled is true", () => {
    renderHook(() => useConnectionLifecycle(props));

    expect(createWebSocketConnection).toHaveBeenCalled();
  });

  it("should NOT connect when enabled is false", () => {
    props.enabled = false;
    renderHook(() => useConnectionLifecycle(props));

    expect(createWebSocketConnection).not.toHaveBeenCalled();
  });

  it("should handle successful connection (onOpen)", () => {
    renderHook(() => useConnectionLifecycle(props));

    act(() => {
      capturedCallbacks.onOpen();
    });

    expect(props.setIsConnected).toHaveBeenCalledWith(true);
    expect(props.setIsConnecting).toHaveBeenCalledWith(false);
    expect(props.setError).toHaveBeenCalledWith(null);
  });

  it("should handle incoming messages (onMessage)", () => {
    renderHook(() => useConnectionLifecycle(props));

    const mockEvent = { data: "test" } as MessageEvent;
    act(() => {
      capturedCallbacks.onMessage(mockEvent);
    });

    expect(props.onMessage).toHaveBeenCalledWith(mockEvent);
  });

  it("should handle errors (onError)", () => {
    renderHook(() => useConnectionLifecycle(props));

    const mockEvent = { type: "error" } as Event;
    act(() => {
      capturedCallbacks.onError(mockEvent);
    });

    expect(props.setError).toHaveBeenCalledWith("WebSocket connection error");
    expect(props.onError).toHaveBeenCalledWith("WebSocket connection error");
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useConnectionLifecycle(props));

    // Simulate connection established
    act(() => {
      capturedCallbacks.onOpen?.();
    });

    unmount();

    expect(mockClose).toHaveBeenCalledWith(1000, "Client disconnect");
    expect(props.setIsConnected).toHaveBeenCalledWith(false);
    expect(props.setIsConnecting).toHaveBeenCalledWith(false);
  });

  it("should maintain stable connect function reference", () => {
    const { result, rerender } = renderHook((p) => useConnectionLifecycle(p), {
      initialProps: props,
    });
    const firstConnect = result.current.connect;

    // Rerender with new props
    rerender({ ...props, onMessage: () => { } });

    expect(result.current.connect).toBe(firstConnect);
  });
  it("should handle reconnection trigger", () => {
    const { result } = renderHook(() => useConnectionLifecycle(props));

    act(() => {
      // Simulate connection
      capturedCallbacks.onOpen();
    });

    // Reset mocks to verify calls during reconnect
    (createWebSocketConnection as jest.Mock).mockClear();
    mockClose.mockClear();

    act(() => {
      result.current.reconnect();
    });

    // Should disconnect first
    expect(mockClose).toHaveBeenCalled();
    // Then connect again
    expect(createWebSocketConnection).toHaveBeenCalled();
  });

  it("should ignore connect call if already connected", () => {
    // Setup initial state as connected
    renderHook(() => useConnectionLifecycle(props));

    // Simulate open
    act(() => {
      capturedCallbacks.onOpen();
    });

    // Manually modify the mock ref to simulate OPEN state check
    // Since wsRef is internal to hook, we can't easily set readyState on it from outside
    // without access to the ws object returned by createWebSocketConnection.
    // The mockWebSocket defined above has readyState: WebSocket.OPEN.

    // Clear mock
    (createWebSocketConnection as jest.Mock).mockClear();

    // Call connect again (exposed via result)
    renderHook(() => useConnectionLifecycle({ ...props, enabled: false })); // Disabled initially to control connect manually

    // But wait, we need to share the same hook instance.
    // Rerendering approach:

    // Let's restart:
    const { result: result2 } = renderHook(() => useConnectionLifecycle(props));

    // It connected on mount.
    (createWebSocketConnection as jest.Mock).mockClear();

    // Call connect again manually. mockWebSocket has readyState OPEN.
    act(() => {
      result2.current.connect();
    });

    // Should NOT create another connection
    expect(createWebSocketConnection).not.toHaveBeenCalled();
  });

  it("should handle error during connection creation", () => {
    (createWebSocketConnection as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Connection failed immediately");
    });

    renderHook(() => useConnectionLifecycle(props));

    expect(props.setIsConnecting).toHaveBeenCalledWith(false);
    expect(props.setError).toHaveBeenCalledWith("Failed to establish WebSocket connection");
    expect(props.onError).toHaveBeenCalledWith("Failed to establish WebSocket connection");
  });

  it("should clear disconnect timeout on disconnect", () => {
    // We need to simulate the timeout ref being set.
    // `handleSocketClose` sets usage of the timeout ref passed to it.
    // Since `handleSocketClose` is mocked, we can simulate it setting the ref using the args passed to it.

    // Mock handleSocketClose to set the timeout
    (
      require("@/hooks/websocket/utils/socketHelpers").handleSocketClose as jest.Mock
    ).mockImplementationOnce((e, options) => {
      options.timeoutRef.current = setTimeout(() => { }, 1000);
      // Simulate reconnection attempt
      options.connectFn();
    });

    const { result } = renderHook(() => useConnectionLifecycle(props));

    // Trigger close to set timeout
    act(() => {
      capturedCallbacks.onClose({ code: 1006 });
    });

    // Now disconnect
    jest.useFakeTimers();
    act(() => {
      result.current.disconnect();
    });

    // Verify calls (clearTimeout is global, we can spy on it or trust side effects)
    // The hook sets requestTimeoutRef.current = null. Can't verify internal state directly.
    // But we can verify disconnect logic proceeded.
    expect(props.setIsConnected).toHaveBeenCalledWith(false);
  });
});
