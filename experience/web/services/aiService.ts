import { logger } from "@/utils/logger";
import { API_BASE_URL } from "@/utils/api";

const SERVICE_URL = `${API_BASE_URL}/observer/ai`;

export interface ModelAssignments {
  semantic_vac: string;
  multi_emotion: string;
  insight_generation: string;
  atlas_mapping: string;
}

export interface FunctionInfo {
  name: string;
  description: string;
  requirements: string;
}

export interface Recommendation {
  recommended: string[];
  not_recommended: string[];
  reasoning: string;
}

export interface PerformanceStats {
  model: string;
  avg_latency_ms: number | null;
  total_invocations: number;
  last_used: string | null;
}

export const aiService = {
  getAssignments: async (): Promise<ModelAssignments> => {
    try {
      const response = await fetch(`${SERVICE_URL}/assignments`);
      if (!response.ok) {
        throw new Error(`Failed to fetch assignments: ${response.statusText}`);
      }
      const data = await response.json();
      return data.assignments;
    } catch (err) {
      logger.error("api", "Error fetching assignments", err);
      throw err;
    }
  },

  assignModel: async (functionName: string, modelName: string): Promise<void> => {
    try {
      const response = await fetch(`${SERVICE_URL}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          function: functionName,
          ai_model_name: modelName,
          assigned_by: "user",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to assign model: ${response.statusText}`);
      }
    } catch (err) {
      logger.error("api", "Error assigning model", err);
      throw err;
    }
  },

  getRecommendations: async (): Promise<Record<string, Recommendation>> => {
    try {
      const response = await fetch(`${SERVICE_URL}/recommendations`);
      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
      }
      const data = await response.json();
      return data.recommendations;
    } catch (err) {
      logger.error("api", "Error fetching recommendations", err);
      throw err;
    }
  },

  getPerformance: async (): Promise<Record<string, PerformanceStats>> => {
    try {
      const response = await fetch(`${SERVICE_URL}/performance`);
      if (!response.ok) {
        throw new Error(`Failed to fetch performance: ${response.statusText}`);
      }
      const data = await response.json();
      return data.performance;
    } catch (err) {
      logger.error("api", "Error fetching performance", err);
      throw err;
    }
  },

  getFunctions: async (): Promise<FunctionInfo[]> => {
    try {
      const response = await fetch(`${SERVICE_URL}/functions`);
      if (!response.ok) {
        throw new Error(`Failed to fetch functions: ${response.statusText}`);
      }
      const data = await response.json();
      return data.functions;
    } catch (err) {
      logger.error("api", "Error fetching functions", err);
      throw err;
    }
  },
};
