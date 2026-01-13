import { renderHook, act } from "@testing-library/react";
import { useExperienceStore } from "../../stores/useExperienceStore";

describe("useExperienceStore", () => {
  beforeEach(() => {
    useExperienceStore.getState().reset();
    localStorage.clear();
  });

  it("should set target and animate", () => {
    const { result } = renderHook(() => useExperienceStore());
    // VACVector is [valence, arousal, connection]
    const target: any = [0.5, 0.5, 0.5];

    act(() => {
      result.current.setTarget(target);
    });

    expect(result.current.targetVAC).toEqual(target);
    expect(result.current.isAnimating).toBe(true);
  });

  it("should manage session lifecycle", () => {
    const { result } = renderHook(() => useExperienceStore());

    // Start
    act(() => {
      result.current.startSession();
    });
    expect(result.current.activeSession?.status).toBe("active");
    expect(localStorage.getItem("activeSession")).toBeTruthy();

    // Pause
    act(() => {
      result.current.pauseSession();
    });
    expect(result.current.activeSession?.status).toBe("paused");

    // Resume
    act(() => {
      result.current.resumeSession();
    });
    expect(result.current.activeSession?.status).toBe("active");

    // Add Note
    act(() => {
      result.current.addSessionNote("test note");
    });
    expect(result.current.activeSession?.notes).toContain("test note");

    // End
    act(() => {
      result.current.endSession();
    });
    expect(result.current.activeSession).toBeNull();
    expect(localStorage.getItem("activeSession")).toBeNull();
  });

  it("should manage journey lifecycle", () => {
    const { result } = renderHook(() => useExperienceStore());

    // Start
    act(() => {
      result.current.startJourney("journey-1", "path-1", 3);
    });
    expect(result.current.activeJourney).toEqual(
      expect.objectContaining({
        journey_id: "journey-1",
        status: "in_progress",
        total_waypoints: 3,
      })
    );

    // Waypoint 1
    act(() => {
      result.current.markWaypointReached(0);
    });
    expect(result.current.activeJourney?.current_waypoint).toBe(1);
    expect(result.current.activeJourney?.waypoints_reached).toContain(0);

    // Complete
    act(() => {
      result.current.markWaypointReached(1);
      result.current.markWaypointReached(2);
    });
    expect(result.current.activeJourney?.status).toBe("completed");

    // Clear
    act(() => {
      result.current.completeJourney();
    });
    // The store logic keeps the completed journey in state but removes it from localStorage
    // Let's verify localStorage removal
    expect(localStorage.getItem("activeJourney")).toBeNull();
  });

  it("should handle flyover and path visibility", () => {
    const { result } = renderHook(() => useExperienceStore());

    act(() => {
      result.current.setIsFlying(true);
      result.current.setShowPath(true);
    });

    expect(result.current.isFlying).toBe(true);
    expect(result.current.showPath).toBe(true);
  });

  it("should handle flyover details", () => {
    const { result } = renderHook(() => useExperienceStore());

    act(() => {
      result.current.setFlyoverSpeed(2.0);
      result.current.setFlyoverProgress(0.5);
      result.current.setFlyoverCurrentWaypointIndex(2);
    });

    expect(result.current.flyoverSpeed).toBe(2.0);
    expect(result.current.flyoverProgress).toBe(0.5);
    expect(result.current.flyoverCurrentWaypointIndex).toBe(2);
  });
  it("should handle remaining setters", () => {
    const { result } = renderHook(() => useExperienceStore());

    act(() => {
      result.current.updateCurrent([0, 0, 0], [0, 0, 0, 1]);
      result.current.setAngularVelocity(5.0);
      result.current.setIsAnimating(false);
      result.current.setTransitionPath({} as any);
    });

    expect(result.current.currentVAC).toEqual([0, 0, 0]);
    expect(result.current.angularVelocity).toBe(5.0);
    expect(result.current.isAnimating).toBe(false);
    expect(result.current.transitionPath).toBeDefined();
    expect(result.current.showPath).toBe(true);
  });

  it("should abandon journey", () => {
    const { result } = renderHook(() => useExperienceStore());
    act(() => {
      result.current.startJourney("j1", "p1", 5);
      result.current.abandonJourney();
    });
    expect(result.current.activeJourney).toBeNull();
    expect(localStorage.getItem("activeJourney")).toBeNull();
  });

  it("should set target with explicit quaternion", () => {
    const { result } = renderHook(() => useExperienceStore());
    const target: any = [1, 0, 0];
    const quat: any = [0, 1, 0, 0];
    act(() => {
      result.current.setTarget(target, quat);
    });
    expect(result.current.targetQuaternion).toEqual(quat);
  });
});
