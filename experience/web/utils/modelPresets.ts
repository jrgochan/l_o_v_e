/**
 * Model Presets Utility
 *
 * Predefined model configurations for common use cases.
 * Enables one-click setup for different performance/quality profiles.
 */

export interface ModelPreset {
  name: string;
  description: string;
  icon: string;
  model: string;
  requirements: string;
  assignments: {
    semantic_vac: string;
    multi_emotion: string;
    insight_generation: string;
    atlas_mapping: string;
  };
}

export const MODEL_PRESETS: Record<string, ModelPreset> = {
  clinical: {
    name: "Clinical Grade",
    description: "Best quality for therapeutic use",
    icon: "🏥",
    model: "llama3.1:70b-instruct-q4_0",
    requirements: "Requires 48GB+ RAM",
    assignments: {
      semantic_vac: "llama3.1:70b-instruct-q4_0",
      multi_emotion: "llama3.1:70b-instruct-q4_0",
      insight_generation: "llama3.1:70b-instruct-q4_0",
      atlas_mapping: "llama3.1:70b-instruct-q4_0",
    },
  },
  balanced: {
    name: "Balanced",
    description: "Recommended for most users",
    icon: "⚖️",
    model: "llama3.1:8b-instruct-q4_0",
    requirements: "Requires 8GB+ RAM",
    assignments: {
      semantic_vac: "llama3.1:8b-instruct-q4_0",
      multi_emotion: "llama3.1:8b-instruct-q4_0",
      insight_generation: "llama3.1:8b-instruct-q4_0",
      atlas_mapping: "llama3.1:8b-instruct-q4_0",
    },
  },
  fast: {
    name: "Fast & Lightweight",
    description: "Maximum speed, lower resource usage",
    icon: "⚡",
    model: "phi3:mini",
    requirements: "Requires 4GB+ RAM",
    assignments: {
      semantic_vac: "phi3:mini",
      multi_emotion: "phi3:mini",
      insight_generation: "phi3:mini",
      atlas_mapping: "phi3:mini",
    },
  },
};
