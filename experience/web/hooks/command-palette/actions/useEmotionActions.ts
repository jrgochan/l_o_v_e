import { useCallback } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { logger } from "@/utils/logger";
import type { CommandAction, CommandActionResult, KeyModifiers } from "@/types/command-palette";
import type { Emotion } from "@/types/visualization";

interface UseEmotionActionsDependencies {
  addToRecent: (id: string) => void;
  close: () => void;
}

export function useEmotionActions({ addToRecent, close }: UseEmotionActionsDependencies) {
  const selectEmotion = useVisualizationStore((state) => state.selectEmotion);
  const selectMultiple = useVisualizationStore((state) => state.selectMultiple);
  const toggleEmotionSelection = useVisualizationStore((state) => state.toggleEmotion);
  const selectedEmotionIds = useVisualizationStore((state) => state.selectedEmotionIds);
  const setFocusedEmotion = useVisualizationStore((state) => state.setFocusedEmotion);
  const setTarget = useExperienceStore((state) => state.setTarget);

  const executeAction = useCallback(
    (
      emotion: Emotion,
      action: CommandAction,
      modifiers: KeyModifiers
    ): CommandActionResult => {
      logger.info(
        "user-interaction",
        `Command palette action: ${action} on ${emotion.name}`,
        modifiers
      );

      try {
        switch (action) {
          case "select":
            selectEmotion(emotion.id);
            setTarget(emotion.vac, emotion.quaternion);
            addToRecent(emotion.id);
            close();
            return { success: true, action, emotionId: emotion.id };

          case "add":
            if (!selectedEmotionIds.has(emotion.id)) {
              selectMultiple([...Array.from(selectedEmotionIds), emotion.id]);
            }
            addToRecent(emotion.id);
            close();
            return { success: true, action, emotionId: emotion.id };

          case "toggle":
            toggleEmotionSelection(emotion.id);
            addToRecent(emotion.id);
            return { success: true, action, emotionId: emotion.id };

          case "focus":
            setFocusedEmotion(emotion.id);
            setTarget(emotion.vac, emotion.quaternion);
            addToRecent(emotion.id);
            close();
            return { success: true, action, emotionId: emotion.id };

          case "isolate":
            selectEmotion(emotion.id);
            setFocusedEmotion(emotion.id);
            setTarget(emotion.vac, emotion.quaternion);
            addToRecent(emotion.id);
            close();
            return { success: true, action, emotionId: emotion.id };

          case "navigate":
            setTarget(emotion.vac, emotion.quaternion);
            addToRecent(emotion.id);
            close();
            return { success: true, action, emotionId: emotion.id };

          case "compute-paths":
            selectEmotion(emotion.id);
            addToRecent(emotion.id);
            close();
            return { success: true, action, emotionId: emotion.id };

          default:
            logger.warn("user-interaction", `Unknown action: ${action}`);
            return { success: false, action, message: "Unknown action" };
        }
      } catch (error) {
        logger.error("user-interaction", "Failed to execute command palette action", error);
        return {
          success: false,
          action,
          message: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    [
      selectEmotion,
      selectMultiple,
      toggleEmotionSelection,
      setFocusedEmotion,
      setTarget,
      selectedEmotionIds,
      addToRecent,
      close,
    ]
  );

  return { executeAction };
}
