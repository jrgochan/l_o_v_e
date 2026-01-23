"use client";

import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import { useMemo } from "react";
import { Emotion } from "@/types/visualization";

export function ActionSuggestions() {
  const selectedEmotionIds = useVisualizationStore((state) => state.selectedEmotionIds);
  const selectedPathId = useVisualizationStore((state) => state.selectedPathId);
  const allEmotions = useVisualizationStore((state) => state.allEmotions);

  const cycleViewMode = useVisualizationStore((state) => state.cycleViewMode);
  const selectEmotion = useVisualizationStore((state) => state.selectEmotion);
  const setSelectedPath = useVisualizationStore((state) => state.setSelectedPath);
  const setFocusedEmotion = useVisualizationStore((state) => state.setFocusedEmotion);
  const setIsFlying = useVisualizationStore((state) => state.setIsFlying);

  const { playClickSound } = useAmbientAudio();

  // Helper to find "opposite" emotion (inverse VAC)
  const findOpposite = useMemo(
    () =>
      (emotion: Emotion | undefined): Emotion | null => {
        if (!emotion) return null;
        const [v, a, c] = emotion.vac;
        // Simple distance check to find furthest available emotion
        // In a perfect sphere, opposite is -v, -a, -c
        let maxDist = 0;
        let opposite: Emotion | null = null;

        allEmotions.forEach((candidate) => {
          if (candidate.id === emotion.id) return;

          // Calculate squared Euclidean distance from the original emotion
          const d =
            Math.pow(candidate.vac[0] - v, 2) +
            Math.pow(candidate.vac[1] - a, 2) +
            Math.pow(candidate.vac[2] - c, 2);

          if (d > maxDist) {
            maxDist = d;
            opposite = candidate;
          }
        });
        return opposite;
      },
    [allEmotions]
  );

  const suggestions = useMemo(() => {
    const activeIds = Array.from(selectedEmotionIds);
    const actions: {
      label: string;
      icon: string;
      onClick: () => void;
      variant: "primary" | "secondary" | "accent";
    }[] = [];

    // CASE 0: Nothing Selected
    if (activeIds.length === 0 && !selectedPathId) {
      actions.push({
        label: "Enter Zen Mode (Z)",
        icon: "🧘",
        onClick: () => cycleViewMode(),
        variant: "primary",
      });
      actions.push({
        label: "Surprise Me",
        icon: "🎲",
        onClick: () => {
          const random = allEmotions[Math.floor(Math.random() * allEmotions.length)];
          if (random) {
            selectEmotion(random.id);
            setFocusedEmotion(random.id);
          }
        },
        variant: "secondary",
      });
    }

    // CASE 1: Single Emotion Selected
    if (activeIds.length === 1 && !selectedPathId) {
      const current = allEmotions.find((e) => e.id === activeIds[0]);
      const opposite = findOpposite(current);

      if (opposite) {
        actions.push({
          label: `Find Path to ${opposite.name}`,
          icon: "↔️",
          onClick: () => selectEmotion(opposite.id),
          variant: "primary",
        });
      }

      actions.push({
        label: "Focus Camera",
        icon: "🔭",
        onClick: () => setFocusedEmotion(activeIds[0]),
        variant: "secondary",
      });
    }

    // CASE 2: Path Selected (or implicity 2 emotions which create a path)
    if (selectedPathId) {
      actions.push({
        label: "Play Journey",
        icon: "▶️",
        onClick: () => setIsFlying(true),
        variant: "accent",
      });
      actions.push({
        label: "Clear Selection",
        icon: "✕",
        onClick: () => {
          setSelectedPath(null);
          // Maybe clear emotions too? kept separate usually
        },
        variant: "secondary",
      });
    }

    return actions;
  }, [
    selectedEmotionIds,
    selectedPathId,
    allEmotions,
    cycleViewMode,
    selectEmotion,
    setFocusedEmotion,
    setIsFlying,
    setSelectedPath,
    findOpposite,
  ]);

  if (suggestions.length === 0) return null;

  return (
    <div className="p-4 bg-gray-900/30 border-b border-gray-800">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Suggested Actions
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => {
              playClickSound();
              action.onClick();
            }}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group
              ${action.variant === "primary" ? "bg-cyan-900/30 text-cyan-200 hover:bg-cyan-900/50 border border-cyan-800/30" : ""}
              ${action.variant === "secondary" ? "bg-gray-800/40 text-gray-300 hover:bg-gray-800/70 border border-gray-700/30" : ""}
              ${action.variant === "accent" ? "bg-purple-900/30 text-purple-200 hover:bg-purple-900/50 border border-purple-800/30" : ""}
            `}
          >
            <span className="text-lg opacity-80 group-hover:scale-110 transition-transform">
              {action.icon}
            </span>
            <span>{action.label}</span>
            <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
