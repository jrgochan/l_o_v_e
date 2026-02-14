/**
 * Proactive JWT Token Refresh Hook
 *
 * Schedules a token refresh BEFORE expiry so the user never hits a 401.
 * Also handles tab-visibility changes (browser throttles timers in
 * background tabs, so we re-check freshness when the tab regains focus).
 */

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { logger } from "@/utils/logger";

/** Buffer before expiry to trigger refresh (ms). */
const REFRESH_BUFFER_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Decode the `exp` claim from a JWT without verifying the signature.
 * Returns the expiry as a Unix timestamp (seconds), or null if invalid.
 */
function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    clearTimer();

    if (!token) return;

    const exp = getTokenExpiry(token);
    if (exp === null) return;

    const now = Date.now();
    const expiresAt = exp * 1000; // convert to ms
    const refreshAt = expiresAt - REFRESH_BUFFER_MS;
    const delay = refreshAt - now;

    if (delay <= 0) {
      // Token is already near or past expiry — refresh immediately
      logger.info("api", "Token near expiry, refreshing immediately");
      refreshToken().then((ok) => {
        if (!ok) {
          logger.error("api", "Token refresh failed — logging out");
          logout();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("session-expired"));
          }
        }
      });
      return;
    }

    logger.info("api", `Scheduling token refresh in ${Math.round(delay / 1000)}s`);
    timerRef.current = setTimeout(() => {
      refreshToken().then((ok) => {
        if (!ok) {
          logger.error("api", "Scheduled token refresh failed — logging out");
          logout();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("session-expired"));
          }
        }
      });
    }, delay);
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
