import { logger } from "@/utils/logger";
import { API_BASE_URL } from "@/utils/api";

const SERVICE_URL = `${API_BASE_URL}/observer`;

// Types based on the backend schemas
export interface TransitionPathRequest {
  user_id: string;
  current_vac: number[];
  goal_vac: number[];
  max_waypoints?: number;
  context?: Record<string, any>;
}

export interface StrategyFilters {
  type?: string | null;
  evidence?: string | null;
  difficulty_min?: number | null;
  difficulty_max?: number | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}

export const therapeuticService = {
  /**
   * Generate an optimal transition path
   */
  generatePath: async (request: TransitionPathRequest) => {
    try {
      const response = await fetch(`${SERVICE_URL}/transition-path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate path: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      logger.error("api", "Error generating transition path", err);
      throw err;
    }
  },

  /**
   * Find alternative transition paths
   */
  findAlternativePaths: async (request: TransitionPathRequest) => {
    try {
      const response = await fetch(`${SERVICE_URL}/transition-path/alternatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to find alternative paths: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      logger.error("api", "Error finding alternative paths", err);
      throw err;
    }
  },

  /**
   * Get detailed therapeutic explanation for a path
   */
  explainPath: async (fromEmotionId: string, toEmotionId: string, userId: string) => {
    try {
      const params = new URLSearchParams({
        from_emotion_id: fromEmotionId,
        to_emotion_id: toEmotionId,
        user_id: userId,
      });

      const response = await fetch(`${SERVICE_URL}/transition-path/explain?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to explain path: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      logger.error("api", "Error explaining path", err);
      throw err;
    }
  },

  /**
   * Search strategies
   */
  searchStrategies: async (filters: StrategyFilters) => {
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append("strategy_type", filters.type);
      if (filters.evidence) params.append("evidence_level", filters.evidence);
      if (filters.difficulty_min) params.append("difficulty_min", filters.difficulty_min.toString());
      if (filters.difficulty_max) params.append("difficulty_max", filters.difficulty_max.toString());
      if (filters.search) params.append("search", filters.search);
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.offset) params.append("offset", filters.offset.toString());

      const response = await fetch(`${SERVICE_URL}/strategies?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to search strategies: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      logger.error("api", "Error searching strategies", err);
      throw err;
    }
  },

  /**
   * Get alternate options for a specific step
   */
  getStepAlternatives: async (currentEmotionId: string, goalEmotionId: string) => {
    try {
      const response = await fetch(`${SERVICE_URL}/transition-path/alternatives/${currentEmotionId}?goal_emotion_id=${goalEmotionId}&limit=5`);

      if (!response.ok) {
        throw new Error(`Failed to get step alternatives: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      logger.error("api", "Error getting step alternatives", err);
      throw err;
    }
  }
};
