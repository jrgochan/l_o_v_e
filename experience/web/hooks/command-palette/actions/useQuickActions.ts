import { useCallback } from "react";
import { CommandPage } from "@/types/command-palette";
import { logger } from "@/utils/logger";
import { useLocalQuickActions } from "./useLocalQuickActions";

interface UseQuickActionsDependencies {
  close: () => void;
  setCurrentPage: (page: CommandPage) => void;
  setSearch: (term: string) => void;
  executeSessionCommand: (cmd: string) => void;
  executeJourneyCommand: (cmd: string) => void;
  executeWaypointCommand: (cmd: string) => void;
  executeTemplateCommand: (cmd: string) => void;
}

export function useQuickActions({
  close,
  setCurrentPage,
  setSearch,
  executeSessionCommand,
  executeJourneyCommand,
  executeWaypointCommand,
  executeTemplateCommand,
}: UseQuickActionsDependencies) {
  const { executeLocalAction } = useLocalQuickActions({
    close,
    setCurrentPage,
    setSearch,
  });

  const executeQuickAction = useCallback(
    (command: string) => {
      const commandLower = command.toLowerCase();

      // Delegate to other handlers
      if (commandLower.startsWith("/session")) return executeSessionCommand(command);
      if (commandLower.startsWith("/template")) return executeTemplateCommand(command);
      if (commandLower.startsWith("/journey")) return executeJourneyCommand(command);
      if (
        commandLower.startsWith("/waypoint") ||
        ["/next", "/previous", "/prev", "/waypoints"].includes(commandLower)
      ) {
        return executeWaypointCommand(command);
      }

      // Handle local quick actions
      const handled = executeLocalAction(commandLower);

      if (!handled) {
        logger.warn("user-interaction", `Unknown command: ${command}`);
      }
    },
    [
      executeSessionCommand,
      executeJourneyCommand,
      executeWaypointCommand,
      executeTemplateCommand,
      executeLocalAction,
    ]
  );

  return { executeQuickAction };
}
