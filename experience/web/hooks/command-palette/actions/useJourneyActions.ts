import { useJourneyCommands } from "./useJourneyCommands";
import { useWaypointCommands } from "./useWaypointCommands";

interface UseJourneyActionsDependencies {
  close: () => void;
}

export function useJourneyActions({ close }: UseJourneyActionsDependencies) {
  const { executeJourneyCommand } = useJourneyCommands({ close });
  const { executeWaypointCommand } = useWaypointCommands({ close });

  return { executeJourneyCommand, executeWaypointCommand };
}
