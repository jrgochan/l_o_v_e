import { logger } from "@/utils/logger";

/** Buffer before expiry to trigger refresh (ms). */
/* istanbul ignore next */
export const REFRESH_BUFFER_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Decode the `exp` claim from a JWT without verifying the signature.
 * Returns the expiry as a Unix timestamp (seconds), or null if invalid.
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export interface RefreshDependencies {
  token: string | null;
  refreshToken: () => Promise<boolean>;
  logout: () => void;
  dispatchEvent: (name: string) => void;
}

export function checkAndScheduleRefresh(
  deps: RefreshDependencies,
  setTimer: (fn: () => void, ms: number) => NodeJS.Timeout | number
): NodeJS.Timeout | number | null {
  const { token, refreshToken, logout, dispatchEvent } = deps;

  if (!token) return null;

  const exp = getTokenExpiry(token);
  if (exp === null) return null;

  const now = Date.now();
  const expiresAt = exp * 1000; // convert to ms
  const refreshAt = expiresAt - REFRESH_BUFFER_MS;
  const delay = refreshAt - now;

  const handleRefreshResult = (ok: boolean) => {
    if (!ok) {
      if (delay <= 0) {
        logger.error("api", "Token refresh failed — logging out");
      } else {
        logger.error("api", "Scheduled token refresh failed — logging out");
      }
      logout();
      dispatchEvent("session-expired");
    }
  };

  if (delay <= 0) {
    // Token is already near or past expiry — refresh immediately
    logger.info("api", "Token near expiry, refreshing immediately");
    refreshToken().then(handleRefreshResult);
    return null;
  }

  logger.info("api", `Scheduling token refresh in ${Math.round(delay / 1000)}s`);
  return setTimer(() => {
    refreshToken().then(handleRefreshResult);
  }, delay);
}

export function safeDispatchEvent(name: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name));
  }
}
