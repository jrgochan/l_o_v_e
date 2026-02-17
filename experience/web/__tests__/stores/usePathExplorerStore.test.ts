import { act } from "@testing-library/react";
import { usePathExplorerStore, EmotionState, Waypoint } from "@/stores/usePathExplorerStore";

describe("usePathExplorerStore", () => {
  const mockPath = {
    path_id: "path-1",
    current_state: {
      emotion: "Neutral",
      category: "Neutral",
      vac: [0, 0, 0] as [number, number, number],
    },
    goal_state: {
      emotion: "Joy",
      category: "Positive",
      vac: [1, 1, 1] as [number, number, number],
    },
    waypoints: [
      {
        order: 0,
        emotion: "Hope",
        category: "Positive",
        vac: [0.5, 0.5, 0.5] as [number, number, number],
        reasoning: "r",
        estimated_time: "5m",
        difficulty: "Easy",
      },
    ],
    path_metrics: {
      total_distance: 1,
      estimated_time: "5m",
      difficulty: "Easy",
      requires_bridge: false,
    },
    steps: [{ type: "cognitive", name: "Step 1", description: "Desc", rationale: "Why" }] as any[],
  };

  beforeEach(() => {
    usePathExplorerStore.getState().reset();
  });

  it("sets actions correctly", () => {
    const emotion: EmotionState = { emotion: "Joy", category: "Positive", vac: [1, 1, 1] };

    act(() => {
      usePathExplorerStore.getState().setStartEmotion(emotion);
      usePathExplorerStore.getState().setGoalEmotion(emotion);
      usePathExplorerStore.getState().setAlternativePaths([mockPath]);
      usePathExplorerStore.getState().selectStep(1);
      usePathExplorerStore.getState().setExplanationMode("detailed");
      usePathExplorerStore.getState().setLoading(true);
      usePathExplorerStore.getState().setError("err");
    });

    const state = usePathExplorerStore.getState();
    expect(state.startEmotion).toEqual(emotion);
    expect(state.goalEmotion).toEqual(emotion);
    expect(state.alternativePaths).toEqual([mockPath]);
    expect(state.selectedStepIndex).toBe(1);
    expect(state.explanationMode).toBe("detailed");
    expect(state.isLoading).toBe(true);
    expect(state.error).toBe("err");

    act(() => {
      usePathExplorerStore.getState().toggleExplanation(true);
    });
    expect(usePathExplorerStore.getState().showExplanation).toBe(true);
  });

  it("reset clears state", () => {
    act(() => {
      usePathExplorerStore.getState().setStartEmotion({ emotion: "Joy" } as any);
      usePathExplorerStore.getState().setError("err");
      usePathExplorerStore.getState().reset();
    });

    const state = usePathExplorerStore.getState();
    expect(state.startEmotion).toBeNull();
    expect(state.error).toBeNull();
  });

  describe("updateWaypoint", () => {
    it("updates waypoint and clears steps when primaryPath exists", () => {
      act(() => {
        usePathExplorerStore.getState().setPrimaryPath(mockPath);
      });

      const newWaypoint: Waypoint = {
        ...mockPath.waypoints[0],
        emotion: "Optimism",
      };

      act(() => {
        usePathExplorerStore.getState().updateWaypoint(0, newWaypoint);
      });

      const state = usePathExplorerStore.getState();
      expect(state.primaryPath?.waypoints[0].emotion).toBe("Optimism");
      expect(state.primaryPath?.steps).toEqual([]); // Should be cleared
    });

    it("does nothing if no primaryPath", () => {
      act(() => {
        usePathExplorerStore.getState().updateWaypoint(0, {} as any);
      });
      // Should not crash
      expect(usePathExplorerStore.getState().primaryPath).toBeNull();
    });

    it("ignores invalid index", () => {
      act(() => {
        usePathExplorerStore.getState().setPrimaryPath(mockPath);
        usePathExplorerStore.getState().updateWaypoint(99, {} as any);
      });
      expect(usePathExplorerStore.getState().primaryPath).toEqual(mockPath);
    });
  });
});
