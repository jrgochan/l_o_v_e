import { useCallback } from "react";

export function useShortcutGuards() {
  const shouldExecuteShortcut = useCallback((e: KeyboardEvent) => {
    // Ignore if command palette is open
    const w = window as Window & { __commandPaletteOpen?: boolean };
    if (w.__commandPaletteOpen === true) {
      return false;
    }

    // Ignore if typing in input field (unless it's a modifier key like CMD which is usually handled before this check in specific cases, e.g. CMD+K)
    // But generic text input should block shortcuts
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return false;
    }

    return true;
  }, []);

  return { shouldExecuteShortcut };
}
