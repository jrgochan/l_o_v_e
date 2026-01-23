import { logger } from "@/utils/logger";
import { API_BASE_URL } from "@/utils/api";
import { EmotionCollection } from "@/types";

const SERVICE_URL = `${API_BASE_URL}/observer`;

interface PathResponse {
  paths: Array<{
    from_emotion: { id: string };
    to_emotion: { id: string };
    waypoints: Array<{
      emotion: string;
      vac: [number, number, number];
    }>;
    distance: number;
    estimated_time: string;
    difficulty: string;
    requires_bridge: boolean;
  }>;
}

interface ComputeResponse {
  job_id: string;
  status: string;
}

export const visualizationService = {
  /**
   * Load cached paths from the backend
   */
  getCachedPaths: async (limit: number = 10000): Promise<PathResponse> => {
    try {
      const response = await fetch(`${SERVICE_URL}/paths/all?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to load cached paths: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      logger.error("api", "Error loading cached paths", err);
      throw err;
    }
  },

  /**
   * Start a batch computation job for all paths
   */
  computeAllPaths: async (): Promise<ComputeResponse> => {
    try {
      const response = await fetch(`${SERVICE_URL}/compute-all-paths`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to start batch computation: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      logger.error("api", "Error starting batch computation", err);
      throw err;
    }
  },

  /**
   * Get all emotion collections
   */
  getCollections: async (): Promise<{ collections: EmotionCollection[]; total_count: number }> => {
    try {
      const response = await fetch(`${SERVICE_URL}/collections`);
      if (!response.ok) {
        throw new Error(`Failed to fetch collections: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      logger.error("api", "Error fetching collections", err);
      throw err;
    }
  },

  /**
   * Set active collection
   */
  activateCollection: async (
    id: string
  ): Promise<{ success: boolean; active_collection: { id: string; name: string } }> => {
    try {
      const response = await fetch(`${SERVICE_URL}/collections/${id}/activate`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Failed to activate collection: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      logger.error("api", "Error activating collection", err);
      throw err;
    }
  },
};
