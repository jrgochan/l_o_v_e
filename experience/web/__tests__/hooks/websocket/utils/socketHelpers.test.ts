import {
  getWebSocketUrl,
  scheduleReconnect,
  createWebSocketConnection,
  handleSocketClose,
} from "@/hooks/websocket/utils/socketHelpers";
import { logger } from "@/utils/logger";

describe("socketHelpers", () => {
  describe("getWebSocketUrl", () => {
    it("should construct url without token", () => {
      const url = getWebSocketUrl("/test/endpoint");
      expect(url).toContain("/test/endpoint");
      expect(url).not.toContain("?token=");
    });

    it("should construct url with token", () => {
      const url = getWebSocketUrl("/test/endpoint", "abc");
      expect(url).toContain("?token=abc");
    });
  });

  describe("scheduleReconnect", () => {
    jest.useFakeTimers();

    it("should schedule reconnect if under max attempts", () => {
      const connectFn = jest.fn();
      const timeoutRef = { current: null };
      const setError = jest.fn();

      scheduleReconnect(1, 5, connectFn, timeoutRef, undefined, setError);

      expect(timeoutRef.current).toBeDefined();
      jest.runAllTimers();
      expect(connectFn).toHaveBeenCalled();
    });

    it("should stop and error if max attempts reached", () => {
      const connectFn = jest.fn();
      const timeoutRef = { current: null };
      const setError = jest.fn();
      const onError = jest.fn();

      scheduleReconnect(5, 5, connectFn, timeoutRef, onError, setError);

      expect(timeoutRef.current).toBeNull();
      expect(connectFn).not.toHaveBeenCalled();
      expect(setError).toHaveBeenCalledWith(expect.stringContaining("Failed to reconnect"));
    });
  });

  describe("createWebSocketConnection", () => {
    it("should create and configure websocket", () => {
      // Mock WebSocket global
      const mockWS = {
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
      };
      (global as any).WebSocket = jest.fn(() => mockWS);

      const callbacks = {
        onOpen: jest.fn(),
        onMessage: jest.fn(),
        onError: jest.fn(),
        onClose: jest.fn(),
      };

      const ws = createWebSocketConnection("ws://test", callbacks);

      expect(global.WebSocket).toHaveBeenCalledWith("ws://test");
      expect(ws.onopen).toBe(callbacks.onOpen);
      expect(ws.onmessage).toBe(callbacks.onMessage);
      expect(ws.onerror).toBe(callbacks.onError);
      expect(ws.onclose).toBe(callbacks.onClose);
    });
  });

  describe("handleSocketClose", () => {
    it("should trigger reconnect if autoReconnect is true and code != 1000", () => {
      const options = {
        autoReconnect: true,
        maxAttempts: 5,
        reconnectAttempts: { current: 0 },
        timeoutRef: { current: null },
        connectFn: jest.fn(),
        setError: jest.fn(),
      };
      const mockLogger = { info: jest.fn() };

      handleSocketClose({ code: 1006 } as CloseEvent, options, mockLogger);

      expect(options.reconnectAttempts.current).toBe(1);
    });

    it("should NOT trigger reconnect if code is 1000 (normal close)", () => {
      const options = {
        autoReconnect: true,
        maxAttempts: 5,
        reconnectAttempts: { current: 0 },
        timeoutRef: { current: null },
        connectFn: jest.fn(),
        setError: jest.fn(),
      };
      const mockLogger = { info: jest.fn() };

      handleSocketClose({ code: 1000 } as CloseEvent, options, mockLogger);

      expect(options.reconnectAttempts.current).toBe(0);
    });
  });
});
