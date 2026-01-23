import { useCallback } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { logger } from "@/utils/logger";
import { Emotion } from "@/types/visualization";

interface UseBatchPathsOptions {
  computePath: (from: Emotion, to: Emotion) => Promise<void>;
}

export function useBatchPaths({ computePath }: UseBatchPathsOptions) {
  const computeAllPaths = useCallback(async () => {
    const store = useVisualizationStore.getState();
    const {
      selectedEmotionIds,
      allEmotions,
      computedPaths,
      settings,
      setComputingPaths,
      setError,
    } = store;

    const selectedEmotions = allEmotions.filter((e) => selectedEmotionIds.has(e.id));

    if (selectedEmotions.length < 2) {
      return;
    }

    const { computeMode } = settings;

    // MANUAL MODE
    if (computeMode === "manual") {
      logger.debug("hooks", "Compute mode is manual - skipping auto-computation");
      return;
    }

    setComputingPaths(true);
    setError(null);

    try {
      logger.info(
        "hooks",
        `Computing paths for ${selectedEmotions.length} selected emotions (mode: ${computeMode})...`
      );

      const pathPromises: Promise<void>[] = [];
      let cachedCount = 0;
      let backendCount = 0;
      let computedCount = 0;

      for (let i = 0; i < selectedEmotions.length; i++) {
        for (let j = 0; j < selectedEmotions.length; j++) {
          if (i === j) continue;

          const from = selectedEmotions[i];
          const to = selectedEmotions[j];
          const pathId = `${from.id}-${to.id}`;

          // ALWAYS MODE
          if (computeMode === "always") {
            if (!computedPaths.has(pathId)) {
              pathPromises.push(computePath(from, to));
              computedCount++;
            }
            continue;
          }

          // CACHE-FIRST MODE
          if (computeMode === "cache-first") {
            // 1. Check local cache
            if (computedPaths.has(pathId)) {
              cachedCount++;
              continue;
            }

            // 2. Try backend API
            const backendPath = await useVisualizationStore
              .getState()
              .fetchPathFromBackend(from.id, to.id);
            if (backendPath) {
              backendCount++;
              continue;
            }

            // 3. Compute fresh
            pathPromises.push(computePath(from, to));
            computedCount++;
          }
        }
      }

      await Promise.all(pathPromises);

      if (computeMode === "cache-first") {
        logger.info(
          "hooks",
          `Path loading complete: ${cachedCount} cached, ${backendCount} from backend, ${computedCount} fresh`
        );
      } else {
        logger.info("hooks", `Computed ${computedCount} fresh paths`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error computing paths";
      logger.error("hooks", "Error computing paths", errorMessage);
      setError(errorMessage);
    } finally {
      setComputingPaths(false);
    }
  }, [computePath]);

  return { computeAllPaths };
}
