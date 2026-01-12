import { useEffect, useCallback } from "react";
import { useSiteActionMap } from "./useSiteActionMap";

export function useSiteShortcuts() {
  const { getActions } = useSiteActionMap();

  const handleSiteKeys = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const actions = getActions(e);

      // CMD+K
      if (key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const w = window as Window & { openCommandPalette?: () => void };
        if (typeof w.openCommandPalette === "function") {
          w.openCommandPalette();
        }
        return;
      }

      const action = actions[key];
      if (action) {
        action();
      }
    },
    [getActions]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleSiteKeys);
    return () => window.removeEventListener("keydown", handleSiteKeys);
  }, [handleSiteKeys]);
}
