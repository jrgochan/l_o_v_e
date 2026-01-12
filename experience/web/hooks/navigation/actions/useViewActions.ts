import { useCallback } from "react";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { logger } from "@/utils/logger";
import type { AtlasEmotion } from "@/types/atlas-admin";
import { useSelectionActions } from "./useSelectionActions";

interface UseViewActionsOptions {
  findEmotionByName: (name: string) => AtlasEmotion | null;
  onNavigate?: () => void;
}

export function useViewActions({ findEmotionByName, onNavigate }: UseViewActionsOptions) {
  const selectEmotion = useAtlasAdminStore((state) => state.selectEmotion);
  const setFocusedEmotion = useAtlasAdminStore((state) => state.setFocusedEmotion);

  const { selectMultipleEmotions } = useSelectionActions({ findEmotionByName });

  const viewInSphere = useCallback(
    (emotionName: string) => {
      const emotion = findEmotionByName(emotionName);
      if (!emotion) {
        logger.warn("hooks", `Emotion "${emotionName}" not found in atlas`);
        return false;
      }

      logger.debug("hooks", `Viewing in sphere: ${emotion.name}`);

      selectEmotion(emotion.id);
      setFocusedEmotion(emotion.id);

      onNavigate?.();

      return true;
    },
    [findEmotionByName, selectEmotion, setFocusedEmotion, onNavigate]
  );

  const viewMultipleInSphere = useCallback(
    (emotionNames: string[]) => {
      const emotionIds = selectMultipleEmotions(emotionNames);

      if (!emotionIds || emotionIds.length === 0) {
        return false;
      }

      logger.debug("hooks", `Viewing multiple in sphere: ${emotionIds.length} emotions`);

      if (emotionIds[0]) {
        setFocusedEmotion(emotionIds[0]);
      }

      onNavigate?.();

      return true;
    },
    [selectMultipleEmotions, setFocusedEmotion, onNavigate]
  );

  return {
    viewInSphere,
    viewMultipleInSphere,
  };
}
