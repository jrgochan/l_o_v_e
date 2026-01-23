/**
 * useCommandPaletteActions Hook
 *
 * Facade hook for all command palette actions.
 * Composes specialized action hooks to reduce complexity.
 */

import { useVisualizationStore } from "@/stores/useVisualizationStore";
import type { CommandPage } from "@/types/command-palette";
import { useEmotionActions } from "./actions/useEmotionActions";
import { useJourneyActions } from "./actions/useJourneyActions";
import { useSessionActions } from "./actions/useSessionActions";
import { useTemplateActions } from "./actions/useTemplateActions";
import { useQuickActions } from "./actions/useQuickActions";

interface ActionDependencies {
  close: () => void;
  addToRecent: (id: string) => void;
  setCurrentPage: (page: CommandPage) => void;
  setSearch: (term: string) => void;
}

export function useCommandPaletteActions({
  close,
  addToRecent,
  setCurrentPage,
  setSearch,
}: ActionDependencies) {
  const selectMultiple = useVisualizationStore((state) => state.selectMultiple);

  // 1. Emotion Actions (Select, Toggle, Add, etc)
  const { executeAction } = useEmotionActions({ addToRecent, close });

  // 2. Journey Actions (Start, Pause, Waypoints)
  const { executeJourneyCommand, executeWaypointCommand } = useJourneyActions({ close });

  // 3. Session Actions (Start, Stop, Notes)
  const { executeSessionCommand } = useSessionActions({ close });

  // 4. Template Actions
  const { executeTemplateCommand } = useTemplateActions({ close, selectMultiple });

  // 5. Quick Actions (Dispatcher & Simple Toggles)
  const { executeQuickAction } = useQuickActions({
    close,
    setCurrentPage,
    setSearch,
    executeSessionCommand,
    executeJourneyCommand,
    executeWaypointCommand,
    executeTemplateCommand,
  });

  return {
    executeAction,
    executeQuickAction,
  };
}
