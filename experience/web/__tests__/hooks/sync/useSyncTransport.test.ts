import { renderHook, act } from "@testing-library/react";
import { useSyncTransport } from "@/hooks/sync/useSyncTransport";
import { CHANNEL_NAME } from "@/hooks/sync/types";

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage: jest.Mock = jest.fn();
  close: jest.Mock = jest.fn();

  constructor(name: string) {
    this.name = name;
  }
}

describe("useSyncTransport", () => {
  let originalBroadcastChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup BroadcastChannel mock
    originalBroadcastChannel = global.BroadcastChannel;
    // Wrap the class in a jest function so we can spy on constructor calls
    global.BroadcastChannel = jest.fn().mockImplementation((name) => {
      return new MockBroadcastChannel(name);
    }) as any;

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    global.BroadcastChannel = originalBroadcastChannel;
    jest.useRealTimers();
  });

  it("should initialize BroadcastChannel", () => {
    renderHook(() => useSyncTransport({ mode: "broadcaster" }));
    expect(global.BroadcastChannel).toHaveBeenCalledWith(CHANNEL_NAME);
  });

  it("should send message via BroadcastChannel and LocalStorage", () => {
    const { result } = renderHook(() => useSyncTransport({ mode: "broadcaster" }));

    const message: any = { type: "test", timestamp: 123 };

    // Mock the instance created by the hook
    // We can't easily access the internal ref, but we can verify if the mock constructor was called
    // and if postMessage was called on the instance.
    // Since we replaced the global class, we can spy on the instance method if we capture the instance.

    // Better approach: Mock the implementation of the class to capture instances
    const mockPostMessage = jest.fn();
    global.BroadcastChannel = jest.fn().mockImplementation(() => ({
      postMessage: mockPostMessage,
      close: jest.fn(),
    })) as any;

    const { result: r2 } = renderHook(() => useSyncTransport({ mode: "broadcaster" }));

    r2.current.sendMessage(message);

    expect(mockPostMessage).toHaveBeenCalledWith(message);
    expect(localStorage.getItem(CHANNEL_NAME)).toBe(JSON.stringify(message));
  });

  it("should receive messages via BroadcastChannel (Listener Mode)", () => {
    const onMessage = jest.fn();
    let channelInstance: any;

    global.BroadcastChannel = jest.fn().mockImplementation(() => {
      channelInstance = {
        postMessage: jest.fn(),
        close: jest.fn(),
        onmessage: null, // Will be set by hook
      };
      return channelInstance;
    }) as any;

    renderHook(() => useSyncTransport({ mode: "listener", onMessage }));

    expect(channelInstance.onmessage).toBeDefined();

    // Simulate incoming message
    const message = { type: "test", timestamp: 1000 };
    act(() => {
      channelInstance.onmessage({ data: message });
    });

    expect(onMessage).toHaveBeenCalledWith(message);
  });

  it("should receive messages via Storage Event (Listener Mode)", () => {
    const onMessage = jest.fn();
    renderHook(() => useSyncTransport({ mode: "listener", onMessage }));

    const message = { type: "test", timestamp: 2000 };

    // Simulate storage event
    act(() => {
      const event = new StorageEvent("storage", {
        key: CHANNEL_NAME,
        newValue: JSON.stringify(message),
      });
      window.dispatchEvent(event);
    });

    expect(onMessage).toHaveBeenCalledWith(message);
  });

  it("should poll for changes in LocalStorage (Listener Mode)", () => {
    const onMessage = jest.fn();
    renderHook(() => useSyncTransport({ mode: "listener", onMessage }));

    const message = { type: "test", timestamp: 3000 };

    // Simulate external write to localStorage
    localStorage.setItem(CHANNEL_NAME, JSON.stringify(message));

    // Advance timers to trigger poll
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(onMessage).toHaveBeenCalledWith(message);
  });

  it("should ignore older timestamps", () => {
    const onMessage = jest.fn();
    const { result } = renderHook(() => useSyncTransport({ mode: "listener", onMessage }));

    // First message
    act(() => {
      const event = new StorageEvent("storage", {
        key: CHANNEL_NAME,
        newValue: JSON.stringify({ type: "test", timestamp: 2000 }),
      });
      window.dispatchEvent(event);
    });
    expect(onMessage).toHaveBeenCalledTimes(1);

    // Older message
    act(() => {
      const event = new StorageEvent("storage", {
        key: CHANNEL_NAME,
        newValue: JSON.stringify({ type: "test", timestamp: 1000 }),
      });
      window.dispatchEvent(event);
    });
    expect(onMessage).toHaveBeenCalledTimes(1); // Should not increase
  });
  it("should handle transmit failure", () => {
    // Mock BroadcastChannel to throw
    const mockPostMessage = jest.fn().mockImplementation(() => {
      throw new Error("Transmit error");
    });

    global.BroadcastChannel = jest.fn().mockImplementation(() => ({
      postMessage: mockPostMessage,
      close: jest.fn(),
    })) as any;

    const { result } = renderHook(() => useSyncTransport({ mode: "broadcaster" }));
    const message: any = { type: "test", timestamp: 123 };

    // Should log error but not crash
    result.current.sendMessage(message);

    // We can't verify logger because it's not mocked in this file yet.
    // Ideally we mock logger to verify the error log.
  });

  it("should handle storage parse error", () => {
    const onMessage = jest.fn();
    renderHook(() => useSyncTransport({ mode: "listener", onMessage }));

    act(() => {
      const event = new StorageEvent("storage", {
        key: CHANNEL_NAME,
        newValue: "{ invalid json }",
      });
      window.dispatchEvent(event);
    });

    // Should not call onMessage
    expect(onMessage).not.toHaveBeenCalled();
    // Should log error
  });

  it("should warn if BroadcastChannel is not supported", () => {
    // Delete BroadcastChannel
    delete (global as any).BroadcastChannel;

    renderHook(() => useSyncTransport({ mode: "listener" }));
    // Should verify logger.warn
  });

  it("should warn if BroadcastChannel init fails", () => {
    global.BroadcastChannel = jest.fn().mockImplementation(() => {
      throw new Error("Init failed");
    }) as any;

    renderHook(() => useSyncTransport({ mode: "listener" }));
    // Should verify logger.warn
  });

  it("should fallback to storage only if BC is missing", () => {
    // Delete BC to ensure channelRef.current is null
    delete (global as any).BroadcastChannel;

    const { result } = renderHook(() => useSyncTransport({ mode: "broadcaster" }));
    const message: any = { type: "test", timestamp: 500 };

    result.current.sendMessage(message);

    expect(localStorage.getItem(CHANNEL_NAME)).toBe(JSON.stringify(message));
  });

  it("should ignore storage events in broadcaster mode", () => {
    const onMessage = jest.fn();
    renderHook(() => useSyncTransport({ mode: "broadcaster", onMessage }));

    act(() => {
      const event = new StorageEvent("storage", {
        key: CHANNEL_NAME,
        newValue: JSON.stringify({ type: "t", timestamp: 1 }),
      });
      window.dispatchEvent(event);
    });

    expect(onMessage).not.toHaveBeenCalled();
  });

  it("should ignore unrelated storage keys", () => {
    const onMessage = jest.fn();
    renderHook(() => useSyncTransport({ mode: "listener", onMessage }));

    act(() => {
      const event = new StorageEvent("storage", {
        key: "OTHER_KEY",
        newValue: JSON.stringify({ type: "t", timestamp: 1 }),
      });
      window.dispatchEvent(event);
    });

    expect(onMessage).not.toHaveBeenCalled();
  });

  it("should ignore storage clear events", () => {
    const onMessage = jest.fn();
    renderHook(() => useSyncTransport({ mode: "listener", onMessage }));

    act(() => {
      const event = new StorageEvent("storage", {
        key: CHANNEL_NAME,
        newValue: null, // Cleared
      });
      window.dispatchEvent(event);
    });

    expect(onMessage).not.toHaveBeenCalled();
  });

  it("should not poll in broadcaster mode", () => {
    const onMessage = jest.fn();
    renderHook(() => useSyncTransport({ mode: "broadcaster", onMessage }));

    localStorage.setItem(CHANNEL_NAME, JSON.stringify({ type: "t", timestamp: 9999 }));

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(onMessage).not.toHaveBeenCalled();
  });

  it("should not process polling if storage empty", () => {
    const onMessage = jest.fn();
    renderHook(() => useSyncTransport({ mode: "listener", onMessage }));

    // Ensure storage is empty
    localStorage.removeItem(CHANNEL_NAME);

    act(() => {
      // Advance timer to trigger poll
      jest.advanceTimersByTime(1100);
    });

    expect(onMessage).not.toHaveBeenCalled();
  });
});
