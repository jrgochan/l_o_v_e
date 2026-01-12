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
});
