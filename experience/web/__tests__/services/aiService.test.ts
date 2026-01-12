import { aiService } from "../../services/aiService";
import { logger } from "@/utils/logger";
import { API_BASE_URL } from "@/utils/api";

// Mock logger
jest.mock("@/utils/logger", () => ({
    logger: {
        error: jest.fn()
    }
}));

// Mock fetch
global.fetch = jest.fn();

describe("aiService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getAssignments", () => {
        it("should return assignments on success", async () => {
            const mockResponse = { assignments: { semantic_vac: "model1" } };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await aiService.getAssignments();
            expect(result).toEqual(mockResponse.assignments);
            expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/observer/ai/assignments`);
        });

        it("should throw and log error on failure", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: "Server Error"
            });

            await expect(aiService.getAssignments()).rejects.toThrow("Failed to fetch assignments: Server Error");
            expect(logger.error).toHaveBeenCalledWith("api", "Error fetching assignments", expect.any(Error));
        });
    });

    describe("assignModel", () => {
        it("should assign model successfully", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

            await aiService.assignModel("func1", "model1");
            expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/observer/ai/assignments`, expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    function: "func1",
                    ai_model_name: "model1",
                    assigned_by: "user"
                })
            }));
        });

        it("should throw on failure", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: "Bad Request"
            });

            await expect(aiService.assignModel("func1", "model1")).rejects.toThrow("Failed to assign model: Bad Request");
        });
    });

    describe("getRecommendations", () => {
        it("should return recommendations", async () => {
            const mockData = { recommendations: { func1: { recommended: ["m1"], not_recommended: ["m2"], reasoning: "r" } } };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockData
            });

            const result = await aiService.getRecommendations();
            expect(result).toEqual(mockData.recommendations);
        });

        it("should handle error", async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));
            await expect(aiService.getRecommendations()).rejects.toThrow("Network Error");
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe("getPerformance", () => {
        it("should return performance stats", async () => {
            const mockData = { performance: { m1: { model: "m1", avg_latency_ms: 10, total_invocations: 1, last_used: null } } };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockData
            });

            const result = await aiService.getPerformance();
            expect(result).toEqual(mockData.performance);
        });

        it("should handle error response", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, statusText: "Err" });
            await expect(aiService.getPerformance()).rejects.toThrow("Failed to fetch performance: Err");
        });
    });

    describe("getFunctions", () => {
        it("should return functions", async () => {
            const mockData = { functions: [{ name: "f1", description: "d", requirements: "r" }] };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockData
            });

            const result = await aiService.getFunctions();
            expect(result).toEqual(mockData.functions);
        });

        it("should handle error", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, statusText: "Err" });
            await expect(aiService.getFunctions()).rejects.toThrow("Failed to fetch functions: Err");
        });
    });
});
