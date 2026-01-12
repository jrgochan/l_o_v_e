import { useCallback } from "react";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { logger } from "@/utils/logger";
import { JOURNEY_TEMPLATES, getTemplateById } from "@/data/journey-templates";

interface UseTemplateActionsDependencies {
  close: () => void;
  selectMultiple: (ids: string[]) => void;
}

export function useTemplateActions({ close, selectMultiple }: UseTemplateActionsDependencies) {
  const executeTemplateCommand = useCallback(
    async (command: string) => {
      const commandLower = command.toLowerCase();

      if (commandLower === "/template list" || commandLower === "/templates") {
        JOURNEY_TEMPLATES.forEach((t) =>
          logger.info("user-interaction", `${t.name}: /template ${t.id}`)
        );
        close();
        return;
      }

      const templateMatch = commandLower.match(/^\/template\s+(.+)$/);
      if (templateMatch) {
        const templateId = templateMatch[1].trim();
        const template = getTemplateById(templateId);
        if (!template) return;

        const allEmotions = useAtlasAdminStore.getState().allEmotions;
        const fromEmotion = allEmotions.find((e) => e.name === template.from_emotion);
        const toEmotion = allEmotions.find((e) => e.name === template.to_emotion);

        if (fromEmotion && toEmotion) {
          selectMultiple([fromEmotion.id, toEmotion.id]);
          close();
        }
      }
    },
    [close, selectMultiple]
  );
  return { executeTemplateCommand };
}
