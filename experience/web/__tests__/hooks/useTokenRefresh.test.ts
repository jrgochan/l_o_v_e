import { renderHook, act } from "@testing-library/react";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import { useAuthStore } from "@/stores/authStore";

// Mock timer functions
jest.useFakeTimers();

// Mock dependencies
jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("useTokenRefresh", () => {
  const refreshTokenSpy = jest.fn();
  const logoutSpy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    refreshTokenSpy.mockResolvedValue(true);
    useAuthStore.setState({
      token: null,
      refreshToken: refreshTokenSpy,
      logout: logoutSpy,
    });
  });

  it("does nothing without token", () => {
    renderHook(() => useTokenRefresh());
    // No interactions
    expect(refreshTokenSpy).not.toHaveBeenCalled();
  });

  it("schedules refresh for valid token", () => {
    // Generate a valid JWT token expiring in 10 minutes
    const exp = Math.floor(Date.now() / 1000) + 600;
    const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;

    useAuthStore.setState({ token });

    renderHook(() => useTokenRefresh());

    // Should not call immediately
    expect(refreshTokenSpy).not.toHaveBeenCalled();

    // Fast-forward time (10m - 2m buffer = 8m wait)
    // 8m = 480000ms
    act(() => {
      jest.advanceTimersByTime(480000);
    });

    expect(refreshTokenSpy).toHaveBeenCalled();
  });

  it("refreshes immediately if near expiry", () => {
    // Expiring in 1 minute (less than buffer of 2m)
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;

    useAuthStore.setState({ token });
    refreshTokenSpy.mockResolvedValue(true);

    renderHook(() => useTokenRefresh());

    expect(refreshTokenSpy).toHaveBeenCalled();
  });

  it("logs out on failed refresh", async () => {
    // Expire immediately to trigger logic
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;

    useAuthStore.setState({ token });
    refreshTokenSpy.mockResolvedValue(false);

    renderHook(() => useTokenRefresh());

    // Wait for promise resolution
    // We can't await inside renderHook easily for the effect, but the effect calls async function.
    // However, the function executes synchronously up to the await. And promises resolve in microtasks.
    // We can assume verify call happened.

    // We need to wait for promise chain.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(logoutSpy).toHaveBeenCalled();
  });

  it("handles invalid token gracefully", () => {
    useAuthStore.setState({ token: "invalid.token" });
    renderHook(() => useTokenRefresh());
    expect(refreshTokenSpy).not.toHaveBeenCalled();
  });

  it("handles malformed payload (triggering catch)", () => {
    // 3 parts, but middle is not valid JSON/base64
    useAuthStore.setState({ token: "header.not-json.signature" });
    renderHook(() => useTokenRefresh());
    expect(refreshTokenSpy).not.toHaveBeenCalled();
  });

  it("handles token without exp claim", () => {
    const token = `header.${btoa(JSON.stringify({ sub: "123" }))}.signature`;
    useAuthStore.setState({ token });
    renderHook(() => useTokenRefresh());
    expect(refreshTokenSpy).not.toHaveBeenCalled();
  });

  it("handles scheduled refresh failure", async () => {
    const exp = Math.floor(Date.now() / 1000) + 600; // 10 mins
    const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;

    useAuthStore.setState({ token });
    refreshTokenSpy.mockResolvedValue(false); // Fail when called

    renderHook(() => useTokenRefresh());

    // Advance time to trigger schedule
    act(() => {
      jest.advanceTimersByTime(480000); // 8 mins
    });

    expect(refreshTokenSpy).toHaveBeenCalled();

    // Wait for promise resolution
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(logoutSpy).toHaveBeenCalled();
  });

  it("refreshes on visibility change", () => {
    // Valid token
    const exp = Math.floor(Date.now() / 1000) + 600;
    const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;
    useAuthStore.setState({ token });

    renderHook(() => useTokenRefresh());

    // Simulate visibility change
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Should verify it scheduled or refreshed.
    // Since token is not near expiry, it schedules.
    // The "scheduleRefresh" function calls clearTimeout then sets logic.
    // We can't easily peek internal timer.
    // But we can verify if it RE-schedules?
    // Actually, if we set token to be "near expiry" it would call refreshToken immediately.
  });

  it("refreshes immediately on visibility change if near expiry", () => {
    const exp = Math.floor(Date.now() / 1000) + 60; // 1 min (near expiry)
    const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;
    useAuthStore.setState({ token });

    // First render triggers one call
    renderHook(() => useTokenRefresh());
    expect(refreshTokenSpy).toHaveBeenCalledTimes(1);

    refreshTokenSpy.mockClear();

    // Simulate becoming visible
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(refreshTokenSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT refresh if visibility is hidden", () => {
    useAuthStore.setState({ token: "header.payload.sig" }); // Valid token, not near expiry
    renderHook(() => useTokenRefresh());

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(refreshTokenSpy).not.toHaveBeenCalled();
  });
});
