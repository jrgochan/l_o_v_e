import { useState, useCallback } from "react";
import { logger } from "@/utils/logger";
import { ModelInfo, ModelDetails } from "./types";

export function useOllamaCRUD() {
  const [localModels, setLocalModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocalModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_LISTENER_URL || "http://localhost:8002"}/listener/ai/models/local`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const models = await response.json();
      setLocalModels(models);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch models";
      setError(message);
      logger.error("api", "Error fetching local models", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteModel = useCallback(
    async (modelName: string) => {
      setError(null);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_LISTENER_URL || "http://localhost:8002"}/listener/ai/models/${encodeURIComponent(modelName)}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          throw new Error(`Failed to delete model: ${response.statusText}`);
        }

        await fetchLocalModels();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete model";
        setError(message);
        logger.error("api", "Error deleting model", err);
      }
    },
    [fetchLocalModels]
  );

  const getModelDetails = useCallback(async (modelName: string): Promise<ModelDetails | null> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_LISTENER_URL || "http://localhost:8002"}/listener/ai/models/${encodeURIComponent(modelName)}/details`
      );

      if (!response.ok) {
        throw new Error(`Failed to get model details: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      logger.error("api", "Error getting model details", err);
      return null;
    }
  }, []);

  const checkOllamaHealth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_LISTENER_URL || "http://localhost:8002"}/listener/ai/models/health`
      );
      const data = await response.json();
      return data.status === "ok" && data.ollama === "running";
    } catch {
      return false;
    }
  }, []);

  return {
    localModels,
    loading,
    error,
    setError, // Exposed so Pull hook can set it
    fetchLocalModels,
    deleteModel,
    getModelDetails,
    checkOllamaHealth,
  };
}
