import { useEffect, useCallback } from "react";
import { useShortcutGuards } from "./useShortcutUtils";
import { useLayerActionMap } from "./useLayerActionMap";

export function useLayerShortcuts() {
  const { shouldExecuteShortcut } = useShortcutGuards();
  const { getActions } = useLayerActionMap();

  const handleLayerKeys = useCallback(
    (e: KeyboardEvent) => {
      if (!shouldExecuteShortcut(e)) return;
      if (e.ctrlKey || e.metaKey) return;

      const actions = getActions(e);
      const action = actions[e.key.toLowerCase()];

      if (action) {
        action();
      }
    },
    [getActions, shouldExecuteShortcut]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleLayerKeys);
    return () => window.removeEventListener("keydown", handleLayerKeys);
  }, [handleLayerKeys]);
}
