import { useCallback } from "react";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { logger } from "@/utils/logger";
import type { AtlasEmotion } from "@/types/atlas-admin";

interface UseFocusActionsOptions {
  findEmotionByName: (name: string) => AtlasEmotion | null;
  onNavigate?: () => void;
}

export function useFocusActions({ findEmotionByName, onNavigate }: UseFocusActionsOptions) {
  const setFocusedEmotion = useAtlasAdminStore((state) => state.setFocusedEmotion);

  const focusEmotion = useCallback(
    (emotionName: string, navigate: boolean = false) => {
      const emotion = findEmotionByName(emotionName);
      if (!emotion) {
        logger.warn("hooks", `Emotion "${emotionName}" not found in atlas`);
        return false;
      }

      logger.debug("hooks", `Focusing on: ${emotion.name}`);
      setFocusedEmotion(emotion.id);

      if (navigate) {
        onNavigate?.();
      }

      return true;
    },
    [findEmotionByName, setFocusedEmotion, onNavigate]
  );

  const autoFocusEmotion = useCallback(
    (emotionName: string) => {
      const emotion = findEmotionByName(emotionName);
      if (!emotion) {
        logger.warn("hooks", `Auto-focus: Emotion "${emotionName}" not found in atlas`);
        return false;
      }

      logger.debug("hooks", `Auto-focusing: ${emotion.name}`);
      setFocusedEmotion(emotion.id);

      return true;
    },
    [findEmotionByName, setFocusedEmotion]
  );

  return {
    focusEmotion,
    autoFocusEmotion,
  };
}
