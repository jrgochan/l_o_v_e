import { useState, useRef, useEffect } from "react";

interface UseChatResizeOptions {
  isExpanded: boolean;
  minHeight?: number;
  maxHeight?: number;
  defaultHeight?: number;
}

export function useChatResize({
  isExpanded,
  minHeight = 200,
  maxHeight = 700,
  defaultHeight = 70,
}: UseChatResizeOptions) {
  const [height, setHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);

  const startYRef = useRef(0);
  const startHeightRef = useRef(height);

  /**
   * Start resize operation
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isExpanded) return; // Only resize when expanded

    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  /**
   * Handle mouse move during resize
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();

      // Calculate new height (drag up = increase height)
      const deltaY = startYRef.current - e.clientY;
      const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeightRef.current + deltaY));
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
  }, [isResizing, minHeight, maxHeight]);

  // Update effect to reset height when collapsed if needed,
  // but usually useChatLayout handles that via toggle.
  // We'll let the parent manage explicit height sets if needed (e.g. collapse/expand toggles)
  // by exposing setHeight.

  return {
    height,
    setHeight,
    isResizing,
    handleMouseDown,
  };
}
