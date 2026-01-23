import { useState, useCallback, useEffect } from "react";
import type { Emotion } from "@/types/visualization";

interface NavigationProps {
  filteredEmotions: Emotion[];
  isOpen: boolean;
  search: string;
}

export function useCommandPaletteNavigation({ filteredEmotions, isOpen, search }: NavigationProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when search changes or opens
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(0);
  }, [search, isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredEmotions.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(
            (prev) => (prev - 1 + filteredEmotions.length) % filteredEmotions.length
          );
          break;
      }
    },
    [isOpen, filteredEmotions.length]
  );

  return {
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
  };
}
