/**
 * Logger Initialization Hook
 *
 * Initializes the logger utility with settings from the store on app startup.
 * Syncs logger configuration whenever development settings change.
 */

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { logger, LogCategory } from "@/utils/logger";

export function useLoggerInit() {
  const development = useSettingsStore((state) => state.development);

  useEffect(() => {
    // Initialize logger with current settings
    logger.setEnabled(development.enabled);
    logger.setLevel(development.frontendLogLevel);

    // Set categories
    Object.entries(development.frontendCategories).forEach(([category, enabled]) => {
      logger.setCategory(category as LogCategory, enabled);
    });

    // Log initialization (this will only show if logging is enabled)
    logger.info("general", "🚀 Logger initialized", {
      enabled: development.enabled,
      level: development.frontendLogLevel,
      categories: Object.entries(development.frontendCategories)
        .filter(([, enabled]) => enabled)
        .map(([cat]) => cat),
    });
  }, [development.enabled, development.frontendLogLevel, development.frontendCategories]);
}
