import { logger } from "@/utils/logger";
import { API_BASE_URL } from "@/utils/api";

const SERVICE_URL = `${API_BASE_URL}/observer/atlas`;

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

export const atlasService = {
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
};
