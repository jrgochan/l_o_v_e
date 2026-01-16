import { useState, useCallback, useEffect, useRef } from "react";
import type { AnalysisExpandState, ToneMode } from "@/types/chat";

export function useChatPanelState() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [height, setHeight] = useState(70); // Collapsed height
  const [previousHeight, setPreviousHeight] = useState(400); // Store height before fullscreen
  const [isResizing, setIsResizing] = useState(false);
  const [toneMode, setToneMode] = useState<ToneMode>("warm");
  const [useAtlasMapping, setUseAtlasMapping] = useState(true);
  const [deepFeelingMode, setDeepFeelingMode] = useState(false);
  const [analysisExpandState, setAnalysisExpandState] = useState<AnalysisExpandState>("normal");

  const startYRef = useRef(0);
  const startHeightRef = useRef(60);

  // Handle expansion toggle
  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => {
      const newState = !prev;
      if (!newState) {
        setIsFullscreen(false);
        setHeight(60);
      } else {
        setHeight(400);
      }
      return newState;
    });
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      setIsFullscreen(false);
      setHeight(previousHeight);
    } else {
      setPreviousHeight(height);
      setIsFullscreen(true);
      setHeight(window.innerHeight);
    }
  }, [isFullscreen, height, previousHeight]);

  const handleToggleAnalysisExpansion = useCallback(() => {
    setAnalysisExpandState((prev) => {
      if (prev === "normal") return "expanded";
      if (prev === "expanded") return "fullscreen";
      return "normal";
    });
  }, []);

  const toggleToneMode = useCallback((checked: boolean) => {
    const newTone = checked ? "clinical" : "warm";
    setToneMode(newTone);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isExpanded) return; // Only resize when expanded

      setIsResizing(true);
      startYRef.current = e.clientY;
      startHeightRef.current = height;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [isExpanded, height]
  );

  // Handle resizing effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      // Calculate new height (drag up = increase height)
      const deltaY = startYRef.current - e.clientY;
      const newHeight = Math.max(200, Math.min(700, startHeightRef.current + deltaY));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "auto";
      document.body.style.userSelect = "auto";
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing]);

  // Re-adding the keydown logic properly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Toggle Chat (C)
      if (e.key.toLowerCase() === "c" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        handleToggleExpand();
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleToggleAnalysisExpansion();
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (!isExpanded) {
          setIsExpanded(true);
          setHeight(400);
        } else {
          handleToggleFullscreen();
        }
      }

      if (e.key === "Escape") {
        if (isFullscreen) {
          e.preventDefault();
          handleToggleFullscreen();
        } else if (analysisExpandState !== "normal") {
          e.preventDefault();
          setAnalysisExpandState("normal");
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
    handleToggleAnalysisExpansion,
    handleToggleFullscreen,
  ]);

  return {
    isExpanded,
    setIsExpanded,
    isFullscreen,
    setIsFullscreen,
    height,
    setHeight,
    isResizing,
    toneMode,
    setToneMode,
    useAtlasMapping,
    setUseAtlasMapping,
    deepFeelingMode,
    setDeepFeelingMode,
    analysisExpandState,
    setAnalysisExpandState,
    handleToggleExpand,
    handleToggleFullscreen,
    handleToggleAnalysisExpansion,
    handleMouseDown,
    toggleToneMode,
  };
}
