import { useCallback } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { logger } from "@/utils/logger";
import type { Emotion } from "@/types/visualization";

interface UseSelectionActionsOptions {
  findEmotionByName: (name: string) => Emotion | null;
  onNavigate?: () => void;
}

export function useSelectionActions({ findEmotionByName, onNavigate }: UseSelectionActionsOptions) {
  const selectEmotion = useVisualizationStore((state) => state.selectEmotion);
  const setFocusedEmotion = useVisualizationStore((state) => state.setFocusedEmotion);
  const selectMultiple = useVisualizationStore((state) => state.selectMultiple);

  const selectEmotionByName = useCallback(
    (emotionName: string, navigate: boolean = false) => {
      const emotion = findEmotionByName(emotionName);
      if (!emotion) {
        logger.warn("hooks", `Emotion "${emotionName}" not found in atlas`);
        return false;
      }

      logger.debug("hooks", `Selecting: ${emotion.name}`);
      selectEmotion(emotion.id);
      setFocusedEmotion(emotion.id);

      if (navigate) {
        onNavigate?.();
      }

      return true;
    },
    [findEmotionByName, selectEmotion, setFocusedEmotion, onNavigate]
  );

  const addToSelection = useCallback(
    (emotionName: string) => {
      const emotion = findEmotionByName(emotionName);
      if (!emotion) {
        logger.warn("hooks", `Emotion "${emotionName}" not found in atlas`);
        return false;
      }

      logger.debug("hooks", `Adding to selection: ${emotion.name}`);
      selectEmotion(emotion.id);
      return true;
    },
    [findEmotionByName, selectEmotion]
  );

  const selectMultipleEmotions = useCallback(
    (emotionNames: string[]) => {
      const emotionIds: string[] = [];

      emotionNames.forEach((name) => {
        const emotion = findEmotionByName(name);
        if (emotion) {
          emotionIds.push(emotion.id);
        }
      });

      if (emotionIds.length === 0) {
        logger.warn("hooks", `No emotions found for: ${emotionNames.join(", ")}`);
        return false;
      }

      selectMultiple(emotionIds);
      return emotionIds;
    },
    [findEmotionByName, selectMultiple]
  );

  return {
    selectEmotionByName,
    addToSelection,
    selectMultipleEmotions,
  };
}
