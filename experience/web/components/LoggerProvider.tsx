/**
 * Logger Provider
 *
 * Client component that initializes the logger on app startup.
 * Also mounts the proactive JWT token refresh hook.
 * Must be used in app layout to ensure logger is ready before any logging occurs.
 */

"use client";

import { useLoggerInit } from "@/hooks/useLoggerInit";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";

export function LoggerProvider({ children }: { children: React.ReactNode }) {
  useLoggerInit();
  useTokenRefresh();
  return <>{children}</>;
}
