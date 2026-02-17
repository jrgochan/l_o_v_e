/**
 * @jest-environment node
 */

import {
  checkAndScheduleRefresh,
  getTokenExpiry,
  REFRESH_BUFFER_MS,
  safeDispatchEvent,
} from "@/hooks/utils/tokenRefreshUtils";

// Mock dependencies
const mockRefreshToken = jest.fn();
const mockLogout = jest.fn();
const mockDispatchEvent = jest.fn();
const mockSetTimer = jest.fn();

jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("tokenRefreshUtils (Node Environment)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshToken.mockResolvedValue(true);
  });

  it("should return null if no token", () => {
    const result = checkAndScheduleRefresh(
      {
        token: null,
        refreshToken: mockRefreshToken,
        logout: mockLogout,
        dispatchEvent: mockDispatchEvent,
      },
      mockSetTimer
    );

    expect(result).toBeNull();
    expect(mockRefreshToken).not.toHaveBeenCalled();
  });

  it("should return null if invalid token", () => {
    const result = checkAndScheduleRefresh(
      {
        token: "invalid",
        refreshToken: mockRefreshToken,
        logout: mockLogout,
        dispatchEvent: mockDispatchEvent,
      },
      mockSetTimer
    );

    expect(result).toBeNull();
  });

  it("should return null if malformed token (triggering catch)", () => {
    const result = checkAndScheduleRefresh(
      {
        token: "header.malformed-payload.sig",
        refreshToken: mockRefreshToken,
        logout: mockLogout,
        dispatchEvent: mockDispatchEvent,
      },
      mockSetTimer
    );

    expect(result).toBeNull();
  });

  it("should return null if exp claim is missing or invalid type", () => {
    // Valid JSON but no exp
    const token = `header.${btoa(JSON.stringify({ sub: "123" }))}.signature`;
    const result = checkAndScheduleRefresh(
      {
        token,
        refreshToken: mockRefreshToken,
        logout: mockLogout,
        dispatchEvent: mockDispatchEvent,
      },
      mockSetTimer
    );

    expect(result).toBeNull();
  });

  it("should export correct constant", () => {
    expect(REFRESH_BUFFER_MS).toBe(120000);
  });

  it("should schedule refresh if valid token", () => {
    const exp = Math.floor(Date.now() / 1000) + 600; // 10 mins
    const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;

    checkAndScheduleRefresh(
      {
        token,
        refreshToken: mockRefreshToken,
        logout: mockLogout,
        dispatchEvent: mockDispatchEvent,
      },
      mockSetTimer
    );

    expect(mockSetTimer).toHaveBeenCalled();
    // delay should be around 8 mins (480000ms)
    // 600s = 10m. Buffer = 2m. Refresh at 8m.
    const delay = mockSetTimer.mock.calls[0][1];
    expect(delay).toBeGreaterThan(470000);
    expect(delay).toBeLessThan(490000);
  });

  it("should refresh immediately if near expiry", () => {
    const exp = Math.floor(Date.now() / 1000) + 60; // 1 min
    const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;

    checkAndScheduleRefresh(
      {
        token,
        refreshToken: mockRefreshToken,
        logout: mockLogout,
        dispatchEvent: mockDispatchEvent,
      },
      mockSetTimer
    );

    expect(mockRefreshToken).toHaveBeenCalled();
    expect(mockSetTimer).not.toHaveBeenCalled();
  });

  it("should handle refresh failure (logout and dispatch)", async () => {
    const exp = Math.floor(Date.now() / 1000) + 60; // 1 min
    const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;

    mockRefreshToken.mockResolvedValue(false);

    checkAndScheduleRefresh(
      {
        token,
        refreshToken: mockRefreshToken,
        logout: mockLogout,
        dispatchEvent: mockDispatchEvent,
      },
      mockSetTimer
    );

    expect(mockRefreshToken).toHaveBeenCalled();

    // Wait for promise
    await new Promise(process.nextTick);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockDispatchEvent).toHaveBeenCalledWith("session-expired");
  });

  it("should handle scheduled refresh callbacks", async () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;

    let capturedCallback: () => void;
    mockSetTimer.mockImplementation((cb) => {
      capturedCallback = cb;
      return "timer-id";
    });

    checkAndScheduleRefresh(
      {
        token,
        refreshToken: mockRefreshToken,
        logout: mockLogout,
        dispatchEvent: mockDispatchEvent,
      },
      mockSetTimer
    );

    // Trigger callback
    capturedCallback!();

    expect(mockRefreshToken).toHaveBeenCalled();
  });

  it("should handle scheduled refresh failure (logging)", async () => {
    const exp = Math.floor(Date.now() / 1000) + 600; // 10 mins (scheduled)
    const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;

    let capturedCallback: () => void;
    mockSetTimer.mockImplementation((cb) => {
      capturedCallback = cb;
      return "timer-id";
    });

    mockRefreshToken.mockResolvedValue(false);

    checkAndScheduleRefresh(
      {
        token,
        refreshToken: mockRefreshToken,
        logout: mockLogout,
        dispatchEvent: mockDispatchEvent,
      },
      mockSetTimer
    );

    // Trigger callback
    capturedCallback!();

    expect(mockRefreshToken).toHaveBeenCalled();
    // Wait for promise
    await new Promise(process.nextTick);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  describe("safeDispatchEvent", () => {
    it("should do nothing if window is undefined", () => {
      // Node env: window is undefined
      expect(() => safeDispatchEvent("test")).not.toThrow();
    });

    it("should dispatch event if window is defined", () => {
      const dispatchSpy = jest.fn();
      // Mock window
      const mockWindow = {
        dispatchEvent: dispatchSpy,
        CustomEvent: class CustomEvent {},
      };

      Object.defineProperty(global, "window", {
        value: mockWindow,
        writable: true,
      });

      (global as any).CustomEvent = class CustomEvent {};

      safeDispatchEvent("test-event");
      expect(dispatchSpy).toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Object));

      // Cleanup
      // @ts-ignore
      delete global.window;
      delete (global as any).CustomEvent;
    });
  });

  describe("getTokenExpiry", () => {
    it("should return correct expiry for valid token", () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;
      expect(getTokenExpiry(token)).toBe(exp);
    });

    it("should return null for malformed token", () => {
      expect(getTokenExpiry("invalid")).toBeNull();
      expect(getTokenExpiry("a.b")).toBeNull();
    });

    it("should return null if payload is not base64 json", () => {
      expect(getTokenExpiry("a.not-json.c")).toBeNull();
    });

    it("should return null if exp is missing", () => {
      const token = `header.${btoa(JSON.stringify({ sub: "123" }))}.signature`;
      expect(getTokenExpiry(token)).toBeNull();
    });
  });
});
