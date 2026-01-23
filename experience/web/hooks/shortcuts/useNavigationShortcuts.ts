import { useEffect, useCallback } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { logger } from "@/utils/logger";
import { useShortcutGuards } from "./useShortcutUtils";

export function useNavigationShortcuts() {
  const { shouldExecuteShortcut } = useShortcutGuards();

  const computedPaths = useVisualizationStore((state) => state.computedPaths);
  const selectedPathId = useVisualizationStore((state) => state.selectedPathId);
  const setSelectedPath = useVisualizationStore((state) => state.setSelectedPath);
  const selectedEmotionIds = useVisualizationStore((state) => state.selectedEmotionIds);

  const handleArrowNav = useCallback(
    (key: string, e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey && computedPaths.size > 0 && selectedEmotionIds.size >= 2) {
        e.preventDefault();

        const pathArray = Array.from(computedPaths.values()).filter(
          (path) => selectedEmotionIds.has(path.from.id) && selectedEmotionIds.has(path.to.id)
        );

        if (pathArray.length > 0) {
          const currentIndex = selectedPathId
            ? pathArray.findIndex((p) => p.id === selectedPathId)
            : -1;
          let nextIndex: number;

          if (key === "arrowup") {
            nextIndex = currentIndex <= 0 ? pathArray.length - 1 : currentIndex - 1;
          } else {
            nextIndex = currentIndex >= pathArray.length - 1 ? 0 : currentIndex + 1;
          }

          const nextPath = pathArray[nextIndex];
          setSelectedPath(nextPath.id);
          logger.info(
            "user-interaction",
            `Selected path: ${nextPath.from.name} → ${nextPath.to.name} (${nextPath.difficulty})`
          );
        }
      }
    },
    [computedPaths, selectedEmotionIds, selectedPathId, setSelectedPath]
  );

  const handleNumberJump = useCallback(
    (key: string, e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey && computedPaths.size > 0) {
        const pathArray = Array.from(computedPaths.values()).filter(
          (path) => selectedEmotionIds.has(path.from.id) && selectedEmotionIds.has(path.to.id)
        );
        const index = parseInt(key) - 1;

        if (index < pathArray.length) {
          const path = pathArray[index];
          setSelectedPath(path.id);
          logger.info(
            "user-interaction",
            `Jumped to path ${key}: ${path.from.name} → ${path.to.name}`
          );
        }
      }
    },
    [computedPaths, selectedEmotionIds, setSelectedPath]
  );

  const handleNavKeys = useCallback(
    (e: KeyboardEvent) => {
      if (!shouldExecuteShortcut(e)) return;

      const key = e.key.toLowerCase();

      if (key === "arrowup" || key === "arrowdown") {
        handleArrowNav(key, e);
      } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
        handleNumberJump(e.key, e);
      }
    },
    [shouldExecuteShortcut, handleArrowNav, handleNumberJump]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleNavKeys);
    return () => window.removeEventListener("keydown", handleNavKeys);
  }, [handleNavKeys]);
}
