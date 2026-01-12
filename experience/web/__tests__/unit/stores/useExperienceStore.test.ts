/**
 * Tests for useExperienceStore (Zustand State Management)
 *
 * This test suite validates the core state management functionality
 * of the Experience web application.
 */

import { renderHook, act } from "@testing-library/react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { NEUTRAL_VAC, IDENTITY_QUATERNION } from "@love/experience-shared";

describe("useExperienceStore", () => {
  // Reset store before each test
  beforeEach(() => {
    const { reset } = useExperienceStore.getState();
    act(() => {
      reset();
    });
    localStorage.clear();
  });

  describe("Initial State", () => {
    it("should have neutral initial values", () => {
      const { result } = renderHook(() => useExperienceStore());

      expect(result.current.currentVAC).toEqual(NEUTRAL_VAC);
      expect(result.current.targetVAC).toEqual(NEUTRAL_VAC);
      expect(result.current.currentQuaternion).toEqual(IDENTITY_QUATERNION);
      expect(result.current.targetQuaternion).toEqual(IDENTITY_QUATERNION);
      expect(result.current.activeJourney).toBeNull();
      expect(result.current.transitionPath).toBeNull();
    });

    it("should not be animating initially", () => {
      const { result } = renderHook(() => useExperienceStore());
      expect(result.current.isAnimating).toBe(false);
    });
  });

  describe("setTarget", () => {
    it("should update target VAC", () => {
      const { result } = renderHook(() => useExperienceStore());
      const newVAC: [number, number, number] = [0.9, 0.7, 0.8];

      act(() => {
        result.current.setTarget(newVAC);
      });

      expect(result.current.targetVAC).toEqual(newVAC);
      expect(result.current.isAnimating).toBe(true);
    });

    it("should auto-convert VAC to quaternion", () => {
      const { result } = renderHook(() => useExperienceStore());
      const joyVAC: [number, number, number] = [0.9, 0.7, 0.8];

      act(() => {
        result.current.setTarget(joyVAC);
      });

      // Quaternion should be set (not identity)
      expect(result.current.targetQuaternion).not.toEqual(IDENTITY_QUATERNION);
    });

    it("should accept custom quaternion", () => {
      const { result } = renderHook(() => useExperienceStore());
      const vac: [number, number, number] = [0.5, 0.5, 0.5];
      const customQuat: [number, number, number, number] = [0.7, 0.1, 0.2, 0.3];

      act(() => {
        result.current.setTarget(vac, customQuat);
      });

      expect(result.current.targetQuaternion).toEqual(customQuat);
    });
  });

  describe("updateCurrent", () => {
    it("should update current state", () => {
      const { result } = renderHook(() => useExperienceStore());
      const vac: [number, number, number] = [0.6, 0.4, 0.7];
      const quat: [number, number, number, number] = [0.8, 0.1, 0.2, 0.3];

      act(() => {
        result.current.updateCurrent(vac, quat);
      });

      expect(result.current.currentVAC).toEqual(vac);
      expect(result.current.currentQuaternion).toEqual(quat);
    });
  });

  describe("Animation State", () => {
    it("should set animation flag", () => {
      const { result } = renderHook(() => useExperienceStore());

      act(() => {
        result.current.setIsAnimating(true);
      });

      expect(result.current.isAnimating).toBe(true);
    });

    it("should set angular velocity", () => {
      const { result } = renderHook(() => useExperienceStore());

      act(() => {
        result.current.setAngularVelocity(2.5);
      });

      expect(result.current.angularVelocity).toBe(2.5);
    });
  });

  describe("Transition Path", () => {
    it("should set transition path", () => {
      const { result } = renderHook(() => useExperienceStore());
      const mockPath = {
        path_id: "path-123",
        current_state: { valence: -0.5, arousal: 0.7, connection: -0.4 },
        goal_state: { valence: 0.7, arousal: -0.5, connection: 0.6 },
        waypoints: [],
        strategies: [],
        total_distance: 2.5,
        estimated_duration_minutes: 60,
        difficulty_level: "moderate",
        success_rate_estimate: 0.75,
        created_at: new Date().toISOString(),
        quaternion_path: [],
      };

      act(() => {
        result.current.setTransitionPath(mockPath as any);
      });

      expect(result.current.transitionPath).toEqual(mockPath);
      expect(result.current.showPath).toBe(true);
    });

    it("should clear path when set to null", () => {
      const { result } = renderHook(() => useExperienceStore());

      act(() => {
        result.current.setTransitionPath(null);
      });

      expect(result.current.transitionPath).toBeNull();
      expect(result.current.showPath).toBe(false);
    });

    it("should toggle path visibility", () => {
      const { result } = renderHook(() => useExperienceStore());

      act(() => {
        result.current.setShowPath(true);
      });
      expect(result.current.showPath).toBe(true);

      act(() => {
        result.current.setShowPath(false);
      });
      expect(result.current.showPath).toBe(false);
    });
  });

  describe("Journey Management", () => {
    it("should start a journey", () => {
      const { result } = renderHook(() => useExperienceStore());

      act(() => {
        result.current.startJourney("journey-123", "path-456", 2);
      });

      const journey = result.current.activeJourney;
      expect(journey).not.toBeNull();
      expect(journey?.journey_id).toBe("journey-123");
      expect(journey?.path_id).toBe("path-456");
      expect(journey?.total_waypoints).toBe(2);
      expect(journey?.current_waypoint).toBe(0);
      expect(journey?.status).toBe("in_progress");
      expect(journey?.waypoints_reached).toEqual([]);
    });

    it("should persist journey to localStorage", () => {
      const { result } = renderHook(() => useExperienceStore());

      act(() => {
        result.current.startJourney("journey-123", "path-456", 2);
      });

      const stored = localStorage.getItem("activeJourney");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.journey_id).toBe("journey-123");
    });

    it("should mark waypoint as reached", () => {
      const { result } = renderHook(() => useExperienceStore());

      // Start journey first
      act(() => {
        result.current.startJourney("journey-123", "path-456", 2);
      });

      // Mark first waypoint as reached
      act(() => {
        result.current.markWaypointReached(0);
      });

      expect(result.current.activeJourney?.waypoints_reached).toContain(0);
      expect(result.current.activeJourney?.current_waypoint).toBe(1);
    });

    it("should complete journey when all waypoints reached", () => {
      const { result } = renderHook(() => useExperienceStore());

      // Start journey with 2 waypoints
      act(() => {
        result.current.startJourney("journey-123", "path-456", 2);
      });

      // Mark first waypoint
      act(() => {
        result.current.markWaypointReached(0);
      });

      // Mark second waypoint
      act(() => {
        result.current.markWaypointReached(1);
      });

      expect(result.current.activeJourney?.status).toBe("completed");
    });

    it("should complete journey manually", () => {
      const { result } = renderHook(() => useExperienceStore());

      act(() => {
        result.current.startJourney("journey-123", "path-456", 2);
      });

      act(() => {
        result.current.completeJourney();
      });

      expect(result.current.activeJourney?.status).toBe("completed");
    });

    it("should abandon journey", () => {
      const { result } = renderHook(() => useExperienceStore());

      // Start journey
      act(() => {
        result.current.startJourney("journey-123", "path-456", 2);
      });

      // Abandon it
      act(() => {
        result.current.abandonJourney();
      });

      expect(result.current.activeJourney).toBeNull();
      expect(localStorage.getItem("activeJourney")).toBeNull();
    });
  });

  describe("reset", () => {
    it("should reset all state to initial values", () => {
      const { result } = renderHook(() => useExperienceStore());

      // Set some state
      act(() => {
        result.current.setTarget([0.9, 0.7, 0.8] as [number, number, number]);
        result.current.startJourney("journey-123", "path-456", 2);
        result.current.setAngularVelocity(5.0);
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.currentVAC).toEqual(NEUTRAL_VAC);
      expect(result.current.targetVAC).toEqual(NEUTRAL_VAC);
      expect(result.current.isAnimating).toBe(false);
      expect(result.current.angularVelocity).toBe(0);
      expect(result.current.activeJourney).toBeNull();
      expect(result.current.transitionPath).toBeNull();
    });

    it("should clear localStorage on reset", () => {
      const { result } = renderHook(() => useExperienceStore());

      // Create journey
      act(() => {
        result.current.startJourney("journey-123", "path-456", 2);
      });

      expect(localStorage.getItem("activeJourney")).not.toBeNull();

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(localStorage.getItem("activeJourney")).toBeNull();
    });
  });
});
