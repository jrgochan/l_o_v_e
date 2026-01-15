import { renderHook, act, waitFor } from "@testing-library/react";
import { useModelAssignments } from "../../hooks/useModelAssignments";
import { aiService } from "@/services/aiService";

jest.mock("@/services/aiService");

describe("useModelAssignments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch assignments success", async () => {
    const mockData = { current_model: "gpt-4" };
    (aiService.getAssignments as jest.Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => useModelAssignments());

    await act(async () => {
      await result.current.fetchAssignments();
    });

    expect(result.current.assignments).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch assignments error", async () => {
    (aiService.getAssignments as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    const { result } = renderHook(() => useModelAssignments());

    await act(async () => {
      await result.current.fetchAssignments();
    });

    expect(result.current.assignments).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Fetch failed");
  });

  it("should handle fetch assignments with non-Error failure", async () => {
    (aiService.getAssignments as jest.Mock).mockRejectedValue("String Failure");

    const { result } = renderHook(() => useModelAssignments());

    await act(async () => {
      await result.current.fetchAssignments();
    });

    expect(result.current.assignments).toBeNull();
    expect(result.current.error).toBe("Failed to fetch assignments");
  });

  it("should assign model success", async () => {
    (aiService.assignModel as jest.Mock).mockResolvedValue({});
    (aiService.getAssignments as jest.Mock).mockResolvedValue({ current_model: "new-model" });

    const { result } = renderHook(() => useModelAssignments());

    let success;
    await act(async () => {
      success = await result.current.assignModel("func1", "new-model");
    });

    expect(success).toBe(true);
    expect(aiService.assignModel).toHaveBeenCalledWith("func1", "new-model");
    expect(result.current.assignments).toEqual({ current_model: "new-model" });
  });

  it("should assign model failure", async () => {
    (aiService.assignModel as jest.Mock).mockRejectedValue(new Error("Assign failed"));

    const { result } = renderHook(() => useModelAssignments());

    let success;
    await act(async () => {
      success = await result.current.assignModel("func1", "bad-model");
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe("Assign failed");
  });

  it("should fetch auxiliary data (recommendations, performance, functions)", async () => {
    (aiService.getRecommendations as jest.Mock).mockResolvedValue({ rec: "data" });
    (aiService.getPerformance as jest.Mock).mockResolvedValue({ perf: "stats" });
    (aiService.getFunctions as jest.Mock).mockResolvedValue([{ name: "func1" }]);

    const { result } = renderHook(() => useModelAssignments());

    await act(async () => {
      await result.current.fetchRecommendations();
      await result.current.fetchPerformance();
      await result.current.fetchFunctions();
    });

    expect(result.current.recommendations).toEqual({ rec: "data" });
    expect(result.current.performance).toEqual({ perf: "stats" });
    expect(result.current.functions).toEqual([{ name: "func1" }]);
  });

  it("should handle auxiliary fetch errors gracefully", async () => {
    // Mock rejections - component suppresses errors
    (aiService.getRecommendations as jest.Mock).mockRejectedValue(new Error("Fail"));
    (aiService.getPerformance as jest.Mock).mockRejectedValue(new Error("Fail"));
    // functions not tested for error because implementation swallows it too?
    (aiService.getFunctions as jest.Mock).mockRejectedValue(new Error("Fail"));

    const { result } = renderHook(() => useModelAssignments());

    await act(async () => {
      await result.current.fetchRecommendations();
      await result.current.fetchPerformance();
      await result.current.fetchFunctions();
    });

    // Should not throw, data remains empty/default
    expect(result.current.recommendations).toEqual({});
  });

  it("should return false explicitly on failure", async () => {
    (aiService.assignModel as jest.Mock).mockRejectedValue(new Error("Fail"));
    const { result } = renderHook(() => useModelAssignments());

    let success;
    await act(async () => {
      success = await result.current.assignModel("f", "m");
    });
    expect(success).toBe(false);
  });

  it("should handle non-Error objects in assignModel failure", async () => {
    (aiService.assignModel as jest.Mock).mockRejectedValue("String error");
    const { result } = renderHook(() => useModelAssignments());

    let success;
    await act(async () => {
      success = await result.current.assignModel("f", "m");
    });
    expect(result.current.error).toBe("Failed to assign model");
    expect(success).toBe(false);
  });
});
