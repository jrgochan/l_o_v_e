import { useEffect } from "react";
import type { AnalysisExpandState } from "@/types/chat";

interface UseChatShortcutsOptions {
  isExpanded: boolean;
  isFullscreen: boolean;
  analysisExpandState: AnalysisExpandState;
  handleToggleExpand: () => void;
  handleToggleFullscreen: () => void;
  handleToggleExpansion: () => void;
  setAnalysisExpandState: (state: AnalysisExpandState) => void;
}

export function useChatShortcuts({
  isExpanded,
  isFullscreen,
  analysisExpandState,
  handleToggleExpand,
  handleToggleFullscreen,
  handleToggleExpansion,
  setAnalysisExpandState,
}: UseChatShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + A: Cycle Analysis Panel expansion
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleToggleExpansion();
      }

      // Ctrl/Cmd + Shift + F: Toggle fullscreen chat panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (!isExpanded) {
          // First expand if collapsed
          handleToggleExpand();
        } else {
          // Then toggle fullscreen
          handleToggleFullscreen();
        }
      }

      // Escape: Exit fullscreen or return to normal state
      if (e.key === "Escape") {
        if (isFullscreen) {
          e.preventDefault();
          handleToggleFullscreen(); // Exit fullscreen
        } else if (analysisExpandState !== "normal") {
          e.preventDefault();
          setAnalysisExpandState("normal"); // Collapse analysis panel
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isExpanded,
    isFullscreen,
    analysisExpandState,
    handleToggleExpand,
    handleToggleFullscreen,
    handleToggleExpansion,
    setAnalysisExpandState,
  ]);
}
