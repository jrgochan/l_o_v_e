import { renderHook, act, waitFor } from "@testing-library/react";
import { useGoalSettingLogic } from "@/components/GoalSettingLogic";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { getObserverClient } from "@love/experience-shared";

// Mock dependencies
jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@love/experience-shared", () => ({
  getObserverClient: jest.fn(),
  NEUTRAL_VAC: [0, 0, 0],
}));

// Mock therapeutic service
jest.mock("@/services/therapeuticService", () => ({
  therapeuticService: {
    findAlternativePaths: jest.fn().mockResolvedValue({ paths: [] }),
  },
}));

describe("useGoalSettingLogic", () => {
  const mockLoadEmotionAtlas = jest.fn();
  const mockGenerateTransitionPath = jest.fn();
  const mockStartJourney = jest.fn();

  const mockPath = {
    path_id: "test",
    waypoints: [],
    path_metrics: {},
    current_state: {},
    goal_state: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useExperienceStore.getState().reset();
    });

    // Mock therapeutic service default response
    const { therapeuticService } = require("@/services/therapeuticService");
    therapeuticService.findAlternativePaths.mockResolvedValue({ paths: [mockPath] });

    (getObserverClient as jest.Mock).mockReturnValue({
      loadEmotionAtlas: mockLoadEmotionAtlas,
      generateTransitionPath: mockGenerateTransitionPath,
      startJourney: mockStartJourney,
    });

    mockLoadEmotionAtlas.mockResolvedValue({
      emotions: [{ id: "joy", name: "Joy", vac: [1, 1, 1], category: "cat" }],
      total_count: 1,
    });
  });

  it("guards generate path when no goal selected", async () => {
    const { result } = renderHook(() => useGoalSettingLogic());

    await act(async () => {
      await result.current.handleGeneratePath();
    });

    expect(mockGenerateTransitionPath).not.toHaveBeenCalled();
  });

  it("guards start journey when no generated path", async () => {
    const { result } = renderHook(() => useGoalSettingLogic());

    await act(async () => {
      await result.current.handleStartJourney();
    });

    expect(mockStartJourney).not.toHaveBeenCalled();
  });

  it("handles non-error objects in loadEmotionAtlas", async () => {
    mockLoadEmotionAtlas.mockRejectedValue("String Error");
    const { result } = renderHook(() => useGoalSettingLogic());

    await act(async () => {
      result.current.setIsOpen(true);
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to load emotions");
    });
  });

  it("handles non-error objects in generatePath", async () => {
    mockGenerateTransitionPath.mockRejectedValue("String Error");
    const { result } = renderHook(() => useGoalSettingLogic());

    act(() => {
      result.current.handleSelectGoal({
        id: "joy",
        name: "Joy",
        vac: [1, 1, 1],
        category: "cat",
      } as any);
    });

    await act(async () => {
      await result.current.handleGeneratePath();
    });

    expect(mockGenerateTransitionPath).toHaveBeenCalled();
    expect(result.current.error).toBe("Failed to generate path");
  });

  it("handles error objects in loadEmotionAtlas", async () => {
    mockLoadEmotionAtlas.mockRejectedValue(new Error("API Fail"));
    const { result } = renderHook(() => useGoalSettingLogic());

    await act(async () => {
      result.current.setIsOpen(true);
    });

    await waitFor(() => {
      expect(result.current.error).toBe("API Fail");
    });
  });

  it("handles error objects in generatePath", async () => {
    mockGenerateTransitionPath.mockRejectedValue(new Error("Gen Fail"));
    const { result } = renderHook(() => useGoalSettingLogic());

    act(() => {
      result.current.handleSelectGoal({
        id: "joy",
        name: "Joy",
        vac: [1, 1, 1],
        category: "cat",
      } as any);
    });

    await act(async () => {
      await result.current.handleGeneratePath();
    });

    expect(mockGenerateTransitionPath).toHaveBeenCalled();
    expect(result.current.error).toBe("Gen Fail");
  });

  it("loads atlas when opened", async () => {
    const { result } = renderHook(() => useGoalSettingLogic());

    await act(async () => {
      result.current.setIsOpen(true);
    });

    expect(mockLoadEmotionAtlas).toHaveBeenCalled();
    expect(result.current.emotions).toHaveLength(1);
  });

  it("does not load atlas if already loaded", async () => {
    const { result } = renderHook(() => useGoalSettingLogic());

    // Load first time
    await act(async () => {
      result.current.setIsOpen(true);
    });
    expect(mockLoadEmotionAtlas).toHaveBeenCalledTimes(1);

    // Close and open again
    act(() => {
      result.current.setIsOpen(false);
    });
    await act(async () => {
      result.current.setIsOpen(true);
    });

    // Should not call again because emotions are populated
    expect(mockLoadEmotionAtlas).toHaveBeenCalledTimes(1);
  });

  it("does not load atlas if closed", async () => {
    const { result } = renderHook(() => useGoalSettingLogic());

    // Initial state is closed
    expect(result.current.isOpen).toBe(false);
    expect(mockLoadEmotionAtlas).not.toHaveBeenCalled();
  });

  it("filters emotions", async () => {
    mockLoadEmotionAtlas.mockResolvedValue({
      emotions: [
        { id: "joy", name: "Joy", vac: [1, 1, 1], category: "Positive" },
        { id: "sad", name: "Sadness", vac: [-1, -1, -1], category: "Negative" },
      ],
      total_count: 2,
    });
    const { result } = renderHook(() => useGoalSettingLogic());

    await act(async () => {
      result.current.setIsOpen(true);
    });

    act(() => {
      result.current.setSearchQuery("sad");
    });

    expect(result.current.filteredEmotions).toHaveLength(1);
    expect(result.current.filteredEmotions[0].name).toBe("Sadness");

    act(() => {
      result.current.setSearchQuery("");
    });
    expect(result.current.filteredEmotions).toHaveLength(2);
  });

  it("generates path successfully", async () => {
    const mockPath = { path_id: "test", waypoints: [] };
    mockGenerateTransitionPath.mockResolvedValue(mockPath);
    const { result } = renderHook(() => useGoalSettingLogic());

    act(() => {
      result.current.handleSelectGoal({
        id: "joy",
        name: "Joy",
        vac: [1, 1, 1],
        category: "cat",
      } as any);
    });

    // Verify state clear
    expect(result.current.generatedPath).toBeNull();
    expect(result.current.selectedGoal).not.toBeNull();

    await act(async () => {
      await result.current.handleGeneratePath();
    });

    expect(result.current.generatedPath).toEqual(mockPath);
  });

  it("starts journey successfully", async () => {
    const mockPath = {
      path_id: "test",
      waypoints: [],
      path_metrics: {},
      current_state: {},
      goal_state: {},
    };
    mockGenerateTransitionPath.mockResolvedValue(mockPath);
    mockStartJourney.mockResolvedValue({ journey_id: "j1" });
    const { result } = renderHook(() => useGoalSettingLogic());

    // Setup state
    act(() => {
      result.current.handleSelectGoal({
        id: "joy",
        name: "Joy",
        vac: [1, 1, 1],
        category: "cat",
      } as any);
    });
    await act(async () => {
      await result.current.handleGeneratePath();
    });

    await act(async () => {
      await result.current.handleStartJourney();
    });

    expect(mockStartJourney).toHaveBeenCalledWith(expect.anything(), "test");
  });

  it("handles start journey error", async () => {
    const mockPath = { path_id: "test", waypoints: [] };
    mockGenerateTransitionPath.mockResolvedValue(mockPath);
    mockStartJourney.mockRejectedValue(new Error("Start failed"));
    const { result } = renderHook(() => useGoalSettingLogic());

    act(() => {
      result.current.handleSelectGoal({
        id: "joy",
        name: "Joy",
        vac: [1, 1, 1],
        category: "cat",
      } as any);
      result.current.setGeneratedPath(mockPath as any); // cheat to set state
    });
    // Or generate it correctly

    await act(async () => {
      await result.current.handleStartJourney();
    });

    expect(result.current.error).toBe("Failed to start journey. Please try again.");
  });

  it("toggles strategy", () => {
    const { result } = renderHook(() => useGoalSettingLogic());

    act(() => {
      result.current.toggleStrategy("s1");
    });
    expect(result.current.expandedStrategy).toBe("s1");

    act(() => {
      result.current.toggleStrategy("s1");
    });
    expect(result.current.expandedStrategy).toBeNull();
  });
});
