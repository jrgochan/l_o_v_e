/**
 * useOllamaModels Hook
 *
 * Manages Ollama model operations:
 * - List local models
 * - Pull new models
 * - Delete models
 * - Get model details
 *
 * Refactored to compose CRUD and Pull logic.
 */

import { useOllamaCRUD } from "./ollama/useOllamaCRUD";
import { useOllamaPull } from "./ollama/useOllamaPull";
import { ModelInfo, ModelDetails, PullProgress } from "./ollama/types";

export type { ModelInfo, ModelDetails, PullProgress };

export function useOllamaModels() {
  const {
    localModels,
    loading,
    error,
    setError,
    fetchLocalModels,
    deleteModel,
    getModelDetails,
    checkOllamaHealth,
  } = useOllamaCRUD();

  const { pulling, pullModel } = useOllamaPull({
    localModels,
    fetchLocalModels,
    setError,
  });

  return {
    localModels,
    loading,
    error,
    pulling,
    fetchLocalModels,
    pullModel,
    deleteModel,
    getModelDetails,
    checkOllamaHealth,
  };
}
