/**
 * useAdminTheme Hook
 *
 * Provides the current Admin UI theme based on the active PathAnimationMode.
 * Subscribes to the useSettingsStore to update specifically when pathAnimationMode changes.
 */

import { useSettingsStore } from "@/stores/useSettingsStore";
import { getAdminTheme, AdminUITheme } from "@/utils/adminThemeConfigs";

export function useAdminTheme(): AdminUITheme {
    const mode = useSettingsStore((state) => state.pathAnimationMode);
    return getAdminTheme(mode);
}
