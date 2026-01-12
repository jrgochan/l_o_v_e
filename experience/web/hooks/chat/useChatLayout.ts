/**
 * Custom hook for managing chat panel layout state
 */
import { useState, useCallback } from "react";
import type { AnalysisExpandState } from "@/types/chat";
import { useChatResize } from "./layout/useChatResize";
import { useChatShortcuts } from "./layout/useChatShortcuts";

export function useChatLayout() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previousHeight, setPreviousHeight] = useState(400); // Store height before fullscreen
  const [analysisExpandState, setAnalysisExpandState] = useState<AnalysisExpandState>("normal");

  const { height, setHeight, isResizing, handleMouseDown } = useChatResize({
    isExpanded,
    defaultHeight: 70,
  });

  /**
   * Toggle expansion (collapsed/expanded)
   */
  const handleToggleExpand = useCallback(() => {
    if (isExpanded) {
      // Collapse
      setIsExpanded(false);
      setIsFullscreen(false);
      setHeight(70);
    } else {
      // Expand
      setIsExpanded(true);
      setHeight(400);
    }
  }, [isExpanded, setHeight]);

  /**
   * Toggle fullscreen mode
   */
  const handleToggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      // Exit fullscreen - restore previous height
      setIsFullscreen(false);
      setHeight(previousHeight);
    } else {
      // Enter fullscreen - store current height (if > 70) and set to full viewport
      if (height > 70) setPreviousHeight(height);
      setIsFullscreen(true);
      setHeight(window.innerHeight);
    }
  }, [isFullscreen, previousHeight, height, setHeight]);

  /**
   * Toggle analysis panel expansion
   */
  const handleToggleExpansion = useCallback(() => {
    setAnalysisExpandState((prev) => {
      if (prev === "normal") return "expanded";
      if (prev === "expanded") return "fullscreen";
      return "normal";
    });
  }, []);

  // Use extracted shortcuts logic
  useChatShortcuts({
    isExpanded,
    isFullscreen,
    analysisExpandState,
    handleToggleExpand,
    handleToggleFullscreen,
    handleToggleExpansion,
    setAnalysisExpandState,
  });

  return {
    isExpanded,
    isFullscreen,
    height,
    isResizing,
    analysisExpandState,
    handleToggleExpand,
    handleToggleFullscreen,
    handleToggleExpansion,
    handleMouseDown,
    setAnalysisExpandState,
  };
}
