import { useCallback } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { logger } from "@/utils/logger";

interface UseWaypointCommandsDependencies {
  close: () => void;
}

export function useWaypointCommands({ close }: UseWaypointCommandsDependencies) {
  const executeWaypointCommand = useCallback(
    (command: string) => {
      logger.info("user-interaction", `Executing waypoint command: ${command}`);
      const experienceStore = useExperienceStore.getState();
      const { activeJourney, transitionPath } = experienceStore;
      if (!activeJourney || !transitionPath) return;

      const commandLower = command.toLowerCase();

      if (commandLower === "/next") {
        const nextIndex = activeJourney.current_waypoint;
        if (nextIndex >= transitionPath.waypoints.length) return;
        experienceStore.markWaypointReached(nextIndex);
        close();
        return;
      }

      if (commandLower === "/previous" || commandLower === "/prev") {
        const currentIndex = activeJourney.current_waypoint;
        if (currentIndex === 0) return;
        const newReached = activeJourney.waypoints_reached.slice(0, -1);
        useExperienceStore.setState({
          activeJourney: {
            ...activeJourney,
            current_waypoint: currentIndex - 1,
            waypoints_reached: newReached,
          },
        });
        close();
        return;
      }

      const waypointMatch = commandLower.match(/^\/waypoint\s+(\d+)$/);
      if (waypointMatch) {
        const targetIndex = parseInt(waypointMatch[1], 10) - 1;
        if (targetIndex < 0 || targetIndex >= transitionPath.waypoints.length) return;
        if (targetIndex > activeJourney.current_waypoint) return;

        const newReached = activeJourney.waypoints_reached.filter((i) => i < targetIndex);
        useExperienceStore.setState({
          activeJourney: {
            ...activeJourney,
            current_waypoint: targetIndex,
            waypoints_reached: newReached,
          },
        });
        close();
        return;
      }
    },
    [close]
  );

  return { executeWaypointCommand };
}
