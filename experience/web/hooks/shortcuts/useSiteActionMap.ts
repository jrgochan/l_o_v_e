import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { logger } from "@/utils/logger";
import { useShortcutGuards } from "./useShortcutUtils";

export function useSiteActionMap() {
  const router = useRouter();
  const { shouldExecuteShortcut } = useShortcutGuards();

  // Atlas data operations
  const clearSelection = useAtlasAdminStore((state) => state.clearSelection);
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const selectMultiple = useAtlasAdminStore((state) => state.selectMultiple);

  // View Modes
  const cycleViewMode = useAtlasAdminStore((state) => state.cycleViewMode);
  const viewMode = useAtlasAdminStore((state) => state.viewMode);

  // Flying state
  const setAdminFlying = useAtlasAdminStore((state) => state.setIsFlying);
  const adminIsFlying = useAtlasAdminStore((state) => state.isFlying);
  const setClientFlying = useExperienceStore((state) => state.setIsFlying);
  const clientIsFlying = useExperienceStore((state) => state.isFlying);
  const transitionPath = useExperienceStore((state) => state.transitionPath);
  const selectedPathId = useAtlasAdminStore((state) => state.selectedPathId);

  const getActions = useCallback(
    (e: KeyboardEvent) => {
      const actions: Record<string, () => void> = {
        escape: () => {
          if (shouldExecuteShortcut(e)) clearSelection();
        },
        b: () => {
          if (shouldExecuteShortcut(e) && !e.ctrlKey && !e.metaKey) {
            const BRIDGE_NAMES = [
              "Vulnerability",
              "Awe",
              "Compassion",
              "Curiosity",
              "Acceptance",
              "Gratitude",
            ];
            const bridgeIds = allEmotions
              .filter((ev) => BRIDGE_NAMES.includes(ev.name))
              .map((ev) => ev.id);
            selectMultiple(bridgeIds);
          }
        },
        t: () => {
          if (shouldExecuteShortcut(e) && !e.ctrlKey && !e.metaKey) {
            if (selectedPathId && !transitionPath) {
              setAdminFlying(!adminIsFlying);
              logger.info("user-interaction", `Admin Flyover: ${!adminIsFlying ? "ON" : "OFF"}`);
            } else if (transitionPath) {
              setClientFlying(!clientIsFlying);
              logger.info(
                "user-interaction",
                `Therapeutic Flyover: ${!clientIsFlying ? "ON" : "OFF"}`
              );
            } else if (selectedPathId) {
              setAdminFlying(!adminIsFlying);
            }
          }
        },
        m: () => {
          if (shouldExecuteShortcut(e) && !e.ctrlKey && !e.metaKey) {
            const w = window as Window & { toggleAudio?: () => void };
            if (typeof w.toggleAudio === "function") {
              w.toggleAudio();
              logger.info("user-interaction", "Toggled Audio");
            }
          }
        },
        ",": () => {
          if (shouldExecuteShortcut(e) && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            router.push("/admin/settings");
            logger.info("user-interaction", "Opening settings page...");
          }
        },
        i: () => {
          if (shouldExecuteShortcut(e) && !e.ctrlKey && !e.metaKey) {
            const w = window as Window & { toggleZenIndicator?: () => void };
            if (typeof w.toggleZenIndicator === "function") {
              w.toggleZenIndicator();
              logger.info("user-interaction", "Toggled Zen session indicator");
            }
          }
        },
        z: () => {
          if (shouldExecuteShortcut(e)) {
            cycleViewMode();
            logger.info("user-interaction", `Cycled View Mode from ${viewMode}`);
          }
        },
        "?": () => {
          if (shouldExecuteShortcut(e) && !e.ctrlKey && !e.metaKey) {
            const w = window as Window & { toggleHelp?: () => void };
            if (typeof w.toggleHelp === "function") {
              w.toggleHelp();
              logger.info("user-interaction", "Opened Help Modal");
            } else {
              logger.info("user-interaction", "Keyboard Shortcuts: Check Help Menu");
            }
          }
        },
      };

      // Handle 'h' same as '?'
      actions["h"] = actions["?"];

      return actions;
    },
    [
      shouldExecuteShortcut,
      clearSelection,
      allEmotions,
      selectMultiple,
      adminIsFlying,
      setAdminFlying,
      clientIsFlying,
      setClientFlying,
      transitionPath,
      selectedPathId,
      cycleViewMode,
      viewMode,
      router,
    ]
  );

  return { getActions };
}
