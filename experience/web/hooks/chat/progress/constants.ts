import type { ToneMode, ProgressStage } from "@/types/chat";

/**
 * Initialize progress stages based on mode
 */
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

/**
 * Get adaptive message based on stage and tone
 */
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
