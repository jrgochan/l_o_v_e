import { useCallback } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { CommandPage } from "@/types/command-palette";

interface UseLocalQuickActionsDependencies {
  close: () => void;
  setCurrentPage: (page: CommandPage) => void;
  setSearch: (term: string) => void;
}

export function useLocalQuickActions({
  close,
  setCurrentPage,
  setSearch,
}: UseLocalQuickActionsDependencies) {
  const clearSelection = useVisualizationStore((state) => state.clearSelection);
  const selectMultiple = useVisualizationStore((state) => state.selectMultiple);
  const updateSetting = useVisualizationStore((state) => state.updateSetting);
  const toggleLayer = useVisualizationStore((state) => state.toggleLayer);
  const settings = useVisualizationStore((state) => state.settings);

  const executeLocalAction = useCallback(
    (commandLower: string): boolean => {
      switch (commandLower) {
        case "/clear":
          clearSelection();
          close();
          return true;
        case "/bridge":
          {
            const { getBridgeEmotions } = useVisualizationStore.getState();
            const bridgeEmotions = getBridgeEmotions();
            const ids = bridgeEmotions.map((e) => e.id);
            selectMultiple(ids);
            close();
          }
          return true;
        case "/reset":
          clearSelection();
          useExperienceStore.getState().reset();
          close();
          return true;
        case "/help":
          setCurrentPage("help");
          setSearch("");
          return true;
        case "/debug":
          updateSetting("dataVisualizationMode", !settings.dataVisualizationMode);
          close();
          return true;
        case "/performance":
          updateSetting("enableAnimations", !settings.enableAnimations);
          close();
          return true;
        // Toggles
        case "/toggle legend":
          toggleLayer("legend");
          close();
          return true;
        case "/toggle labels":
          toggleLayer("emotionLabels");
          close();
          return true;
        case "/toggle paths":
          toggleLayer("transitionPaths");
          close();
          return true;
        case "/toggle sphere":
          toggleLayer("soulSphere");
          close();
          return true;
        case "/toggle waypoints":
          toggleLayer("waypoints");
          close();
          return true;
        default:
          return false;
      }
    },
    [
      clearSelection,
      close,
      selectMultiple,
      settings,
      toggleLayer,
      updateSetting,
      setCurrentPage,
      setSearch,
    ]
  );

  return { executeLocalAction };
}
