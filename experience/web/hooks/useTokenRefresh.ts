/**
 * Proactive JWT Token Refresh Hook
 *
 * Schedules a token refresh BEFORE expiry so the user never hits a 401.
 * Also handles tab-visibility changes (browser throttles timers in
 * background tabs, so we re-check freshness when the tab regains focus).
 */

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { checkAndScheduleRefresh, safeDispatchEvent } from "./utils/tokenRefreshUtils";

/**
 * Mount once at the app root to enable automatic token refresh.
 *
 * Behavior:
 * - Decodes the stored JWT's `exp` claim
 * - Schedules a refresh 2 minutes before expiry
 * - On tab refocus, immediately checks if refresh is needed
 * - Fires `token-refreshed` event on success (consumed by WebSocket hooks)
 * - Logs out if refresh fails
 */
export function useTokenRefresh() {
  const token = useAuthStore((s) => s.token);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);
  const timerRef = useRef<NodeJS.Timeout | number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    clearTimer();

    timerRef.current = checkAndScheduleRefresh(
      { token, refreshToken, logout, dispatchEvent: safeDispatchEvent },
      setTimeout
    );
  }, [token, refreshToken, logout, clearTimer]);

  // Schedule whenever the token changes (login, refresh, etc.)
  useEffect(() => {
    scheduleRefresh();
    return clearTimer;
  }, [scheduleRefresh, clearTimer]);

  // Re-check on tab focus (timers are throttled in background tabs)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [scheduleRefresh]);
}
