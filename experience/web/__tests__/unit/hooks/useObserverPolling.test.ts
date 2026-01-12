/**
 * Tests for useObserverPolling Hook
 *
 * Tests the custom hook that polls Observer API for emotional state updates.
 */

import { renderHook } from "@testing-library/react";
import { act } from "@testing-library/react";
import { useObserverPolling } from "@/hooks/useObserverPolling";
import { useExperienceStore } from "@/stores/useExperienceStore";
import * as SharedAPI from "@love/experience-shared";

// Mock the polling manager
jest.mock("@love/experience-shared", () => ({
  ...jest.requireActual("@love/experience-shared"),
  createPollingManager: jest.fn(),
}));

const mockCreatePollingManager = SharedAPI.createPollingManager as jest.MockedFunction<
  typeof SharedAPI.createPollingManager
>;

describe("useObserverPolling", () => {
  let mockPollingManager: any;

  beforeEach(() => {
    // Reset store
    const { reset } = useExperienceStore.getState();
    act(() => {
      reset();
    });

    // Create mock polling manager
    mockPollingManager = {
      start: jest.fn(),
      stop: jest.fn(),
    };

    mockCreatePollingManager.mockReturnValue(mockPollingManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    it("does not start polling when disabled", () => {
      renderHook(() =>
        useObserverPolling({
          userId: "test-user",
          enabled: false,
        })
      );

      expect(mockCreatePollingManager).not.toHaveBeenCalled();
      expect(mockPollingManager.start).not.toHaveBeenCalled();
    });

    it("creates polling manager when enabled", () => {
      renderHook(() =>
        useObserverPolling({
          userId: "test-user",
          enabled: true,
        })
      );

      expect(mockCreatePollingManager).toHaveBeenCalledWith({
        baseUrl: "http://localhost:8000",
        pollingInterval: 5000,
      });
    });

    it("starts polling with correct parameters", () => {
      renderHook(() =>
        useObserverPolling({
          userId: "test-user-123",
          enabled: true,
        })
      );

      expect(mockPollingManager.start).toHaveBeenCalledWith(
        "test-user-123",
        expect.any(Function), // onData callback
        expect.any(Function), // onError callback
        5000 // interval
      );
    });

    it("uses custom baseUrl when provided", () => {
      renderHook(() =>
        useObserverPolling({
          userId: "test-user",
          enabled: true,
          baseUrl: "http://custom:9000",
        })
      );

      expect(mockCreatePollingManager).toHaveBeenCalledWith({
        baseUrl: "http://custom:9000",
        pollingInterval: 5000,
      });
    });

    it("uses custom interval when provided", () => {
      renderHook(() =>
        useObserverPolling({
          userId: "test-user",
          enabled: true,
          intervalMs: 10000,
        })
      );

      expect(mockCreatePollingManager).toHaveBeenCalledWith({
        baseUrl: "http://localhost:8000",
        pollingInterval: 10000,
      });
    });
  });

  describe("Polling State", () => {
    it("reports isPolling as false when disabled", () => {
      const { result } = renderHook(() =>
        useObserverPolling({
          userId: "test-user",
          enabled: false,
        })
      );

      expect(result.current.isPolling).toBe(false);
    });

    it("provides stop function", () => {
      const { result } = renderHook(() =>
        useObserverPolling({
          userId: "test-user",
          enabled: true,
        })
      );

      expect(result.current.stop).toBeDefined();
      expect(typeof result.current.stop).toBe("function");
    });
  });

  describe("Enable/Disable Toggling", () => {
    it("starts polling when enabled changes to true", () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useObserverPolling({
            userId: "test-user",
            enabled,
          }),
        { initialProps: { enabled: false } }
      );

      expect(mockPollingManager.start).not.toHaveBeenCalled();

      rerender({ enabled: true });

      expect(mockPollingManager.start).toHaveBeenCalled();
    });

    it("stops polling when enabled changes to false", () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useObserverPolling({
            userId: "test-user",
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      expect(mockPollingManager.start).toHaveBeenCalled();

      rerender({ enabled: false });

      expect(mockPollingManager.stop).toHaveBeenCalled();
    });
  });

  describe("Cleanup", () => {
    it("stops polling on unmount", () => {
      const { unmount } = renderHook(() =>
        useObserverPolling({
          userId: "test-user",
          enabled: true,
        })
      );

      unmount();

      expect(mockPollingManager.stop).toHaveBeenCalled();
    });

    it("cleans up when userId changes", () => {
      const { rerender } = renderHook(
        ({ userId }) =>
          useObserverPolling({
            userId,
            enabled: true,
          }),
        { initialProps: { userId: "user-1" } }
      );

      const firstManager = mockPollingManager;

      // Reset mock to create new manager
      mockPollingManager = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      mockCreatePollingManager.mockReturnValue(mockPollingManager);

      rerender({ userId: "user-2" });

      expect(firstManager.stop).toHaveBeenCalled();
      expect(mockPollingManager.start).toHaveBeenCalled();
    });
  });

  describe("Stop Function", () => {
    it("can manually stop polling", () => {
      const { result } = renderHook(() =>
        useObserverPolling({
          userId: "test-user",
          enabled: true,
        })
      );

      act(() => {
        result.current.stop();
      });

      expect(mockPollingManager.stop).toHaveBeenCalled();
    });

    it("stop function is safe to call when not polling", () => {
      const { result } = renderHook(() =>
        useObserverPolling({
          userId: "test-user",
          enabled: false,
        })
      );

      expect(() => {
        act(() => {
          result.current.stop();
        });
      }).not.toThrow();
    });
  });
});
