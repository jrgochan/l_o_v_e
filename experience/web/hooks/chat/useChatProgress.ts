import { useState, useEffect, useRef } from "react";
import type { ProgressStage, ToneMode } from "@/types/chat";

// Helper functions for Heartbeat Analyzer
export const initializeProgressStages = (deepFeeling: boolean): ProgressStage[] => {
  const stages: ProgressStage[] = [
    { id: "transcription", label: "Transcription", icon: "🎙️", status: "pending", percentage: 0 },
    { id: "prosody", label: "Voice Analysis", icon: "🎵", status: "pending", percentage: 0 },
    {
      id: "emotions",
      label: deepFeeling ? "Multi-Emotion Detection" : "Emotion Detection",
      icon: "🧠",
      status: "pending",
      percentage: 0,
    },
  ];

  if (deepFeeling) {
    stages.push(
      {
        id: "relationships",
        label: "Relationships",
        icon: "🔗",
        status: "pending",
        percentage: 0,
      },
      { id: "aggregate", label: "Aggregate State", icon: "📊", status: "pending", percentage: 0 }
    );
  }

  stages.push({
    id: "insights",
    label: "Insights",
    icon: "💡",
    status: "pending",
    percentage: 0,
  });
  return stages;
};

export const getAdaptiveMessage = (
  stage: string,
  status: string,
  tone: ToneMode,
  deepFeeling: boolean
): string => {
  const messages: Record<string, Record<ToneMode, string>> = {
    started: { warm: "Beginning analysis...", clinical: "Initializing analysis pipeline..." },
    transcription: {
      warm: "Listening carefully to your words...",
      clinical: "Processing audio transcription...",
    },
    prosody: {
      warm: "Understanding how you're expressing yourself...",
      clinical: "Analyzing prosody features...",
    },
    emotions: {
      warm: deepFeeling
        ? "Exploring the layers of what you're feeling..."
        : "Identifying your emotional state...",
      clinical: deepFeeling
        ? "Executing multi-emotion detection..."
        : "Running semantic emotion analysis...",
    },
    relationships: {
      warm: "Understanding how your emotions interact...",
      clinical: "Classifying emotion relationships...",
    },
    aggregate: {
      warm: "Bringing it all together...",
      clinical: "Computing aggregate emotional state...",
    },
    three_way: {
      warm: "Comparing what you said vs how you sounded...",
      clinical: "Executing 3-way discrepancy analysis...",
    },
    insights: {
      warm: "Crafting personalized guidance for you...",
      clinical: "Generating AI-powered clinical insights...",
    },
  };
  return messages[stage]?.[tone] || "Processing...";
};

export function useChatProgress() {
  const [progressState, setProgressState] = useState({
    stages: [] as ProgressStage[],
    currentStage: "",
    overallPercentage: 0,
    currentMessage: "",
  });
  const [showProgress, setShowProgress] = useState(false);
  const progressSimulationRef = useRef<NodeJS.Timeout | null>(null);

  // Simulated progress to fill gaps between backend updates
  const startProgressSimulation = () => {
    if (progressSimulationRef.current) {
      clearInterval(progressSimulationRef.current);
    }

    progressSimulationRef.current = setInterval(() => {
      setProgressState((prev) => {
        // Don't simulate past 90% - wait for real completion
        if (prev.overallPercentage >= 90) {
          if (progressSimulationRef.current) {
            clearInterval(progressSimulationRef.current);
            progressSimulationRef.current = null;
          }
          return prev;
        }

        // Slowly increment percentage (0.5% per 500ms = 1% per second)
        const newPercentage = Math.min(90, prev.overallPercentage + 0.5);

        return {
          ...prev,
          overallPercentage: newPercentage,
        };
      });
    }, 500); // Update every 500ms
  };

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (progressSimulationRef.current) {
        clearInterval(progressSimulationRef.current);
      }
    };
  }, []);

  return {
    progressState,
    setProgressState,
    showProgress,
    setShowProgress,
    startProgressSimulation,
    progressSimulationRef,
  };
}
