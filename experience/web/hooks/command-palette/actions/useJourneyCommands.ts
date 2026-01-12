import { useCallback } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { logger } from "@/utils/logger";

interface UseJourneyCommandsDependencies {
  close: () => void;
}

export function useJourneyCommands({ close }: UseJourneyCommandsDependencies) {
  const executeJourneyCommand = useCallback(
    (command: string) => {
      logger.info("user-interaction", `Executing journey command: ${command}`);

      const experienceStore = useExperienceStore.getState();
      const { activeJourney, transitionPath } = experienceStore;
      const commandLower = command.toLowerCase();

      if (commandLower === "/journey start" || commandLower === "/journey") {
        if (!transitionPath) {
          logger.warn(
            "user-interaction",
            "No path available to start journey. Please compute a path first."
          );
          return;
        }
        if (activeJourney && activeJourney.status === "in_progress") {
          logger.warn("user-interaction", "Journey already in progress.");
          return;
        }
        const journeyId = `journey-${Date.now()}`;
        const pathId = transitionPath.path_id || `path-${Date.now()}`;
        experienceStore.startJourney(journeyId, pathId, transitionPath.waypoints.length);
        logger.info("user-interaction", `Journey started`);
        close();
        return;
      }

      if (commandLower === "/journey pause") {
        if (!activeJourney || activeJourney.status !== "in_progress") return;
        useExperienceStore.setState({ activeJourney: { ...activeJourney, status: "paused" } });
        logger.info("user-interaction", "Journey paused");
        close();
        return;
      }

      if (commandLower === "/journey resume") {
        if (!activeJourney || activeJourney.status !== "paused") return;
        useExperienceStore.setState({ activeJourney: { ...activeJourney, status: "in_progress" } });
        logger.info("user-interaction", "Journey resumed");
        close();
        return;
      }

      if (commandLower === "/journey complete") {
        if (!activeJourney) return;
        experienceStore.completeJourney();
        logger.info("user-interaction", "Journey completed! 🎉");
        close();
        return;
      }

      if (commandLower === "/journey abandon") {
        if (!activeJourney) return;
        if (window.confirm("Are you sure you want to abandon this journey?")) {
          experienceStore.abandonJourney();
          logger.info("user-interaction", "Journey abandoned");
        }
        close();
        return;
      }
    },
    [close]
  );

  return { executeJourneyCommand };
}
