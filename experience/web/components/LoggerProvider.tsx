/**
 * Logger Provider
 *
 * Client component that initializes the logger on app startup.
 * Must be used in app layout to ensure logger is ready before any logging occurs.
 */

"use client";

import { useLoggerInit } from "@/hooks/useLoggerInit";

export function LoggerProvider({ children }: { children: React.ReactNode }) {
  useLoggerInit();
  return <>{children}</>;
}
