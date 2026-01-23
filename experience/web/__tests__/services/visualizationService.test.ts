import { visualizationService } from "../../services/visualizationService";
import { logger } from "@/utils/logger";
import { API_BASE_URL } from "@/utils/api";

// Mock logger
jest.mock("@/utils/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe("visualizationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCachedPaths", () => {
    it("should fetch cached paths with default limit", async () => {
      const mockResponse = { paths: [] };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await visualizationService.getCachedPaths();
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/observer/paths/all?limit=10000`);
    });

    it("should fetch cached paths with custom limit", async () => {
      const mockResponse = { paths: [] };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await visualizationService.getCachedPaths(50);
      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/observer/paths/all?limit=50`);
    });

    it("should throw and log error on failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Server Error",
      });

      await expect(visualizationService.getCachedPaths()).rejects.toThrow(
        "Failed to load cached paths: Server Error"
      );
      expect(logger.error).toHaveBeenCalledWith(
        "api",
        "Error loading cached paths",
        expect.any(Error)
      );
    });
  });

  describe("computeAllPaths", () => {
    it("should start batch computation", async () => {
      const mockResponse = { job_id: "123", status: "started" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await visualizationService.computeAllPaths();
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/observer/compute-all-paths`, {
        method: "POST",
      });
    });

    it("should throw on failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
      });

      await expect(visualizationService.computeAllPaths()).rejects.toThrow(
        "Failed to start batch computation: Bad Request"
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
