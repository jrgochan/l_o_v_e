/**
 * Experience Store for Web Version
 *
 * Uses Zustand for state management with types from shared package.
 * This is the web-specific implementation that imports from @love/experience-shared.
 */

import { create } from "zustand";
import {
  VACVector,
  Quaternion,
  CANONICAL_EMOTIONS,
  NEUTRAL_VAC,
  IDENTITY_QUATERNION,
  vacToQuaternion,
  TransitionPathResponse,
} from "@love/experience-shared";

interface ExperienceStore {
  // Target state (from Observer API or user selection)
  targetVAC: VACVector;
  targetQuaternion: Quaternion;

  // Current animated state
  currentVAC: VACVector;
  currentQuaternion: Quaternion;

  // Animation state
  isAnimating: boolean;
  angularVelocity: number;

  // Transition path (for 3D visualization)
  transitionPath: TransitionPathResponse | null;
  showPath: boolean;

  // Active journey tracking
  activeJourney: {
    journey_id: string;
    path_id: string;
    current_waypoint: number;
    total_waypoints: number;
    status: "in_progress" | "completed" | "abandoned" | "paused";
    started_at: string;
    waypoints_reached: number[];
  } | null;

  // Active session tracking
  activeSession: {
    session_id: string;
    started_at: string;
    status: "active" | "paused" | "ended";
    duration: number; // seconds
    journeys: string[]; // journey_ids
    notes: string[];
  } | null;

  // Actions
  setTarget: (vac: VACVector, quaternion?: Quaternion) => void;
  updateCurrent: (vac: VACVector, quaternion: Quaternion) => void;
  setAngularVelocity: (velocity: number) => void;
  setIsAnimating: (animating: boolean) => void;
  // Flyover mode
  isFlying: boolean;
  setIsFlying: (flying: boolean) => void;
  setTransitionPath: (path: TransitionPathResponse | null) => void;
  setShowPath: (show: boolean) => void;
  startJourney: (journey_id: string, path_id: string, total_waypoints: number) => void;
  markWaypointReached: (waypointIndex: number) => void;
  completeJourney: () => void;
  abandonJourney: () => void;
  startSession: () => void;
  endSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  addSessionNote: (note: string) => void;
  reset: () => void;
}

export const useExperienceStore = create<ExperienceStore>((set) => ({
  // Initial state
  targetVAC: NEUTRAL_VAC,
  targetQuaternion: IDENTITY_QUATERNION,
  currentVAC: NEUTRAL_VAC,
  currentQuaternion: IDENTITY_QUATERNION,
  isAnimating: false,
  angularVelocity: 0,
  transitionPath: null,
  showPath: false,
  activeJourney: null,
  activeSession: null,

  // Set target state (with automatic quaternion conversion if not provided)
  setTarget: (vac, quaternion) => {
    const quat = quaternion || vacToQuaternion(vac);
    set({
      targetVAC: vac,
      targetQuaternion: quat,
      isAnimating: true,
    });
  },

  // Update current animated state
  updateCurrent: (vac, quaternion) => {
    set({
      currentVAC: vac,
      currentQuaternion: quaternion,
    });
  },

  // Set angular velocity (for metrics)
  setAngularVelocity: (velocity) => {
    set({ angularVelocity: velocity });
  },

  // Set animation state
  setIsAnimating: (animating) => {
    set({ isAnimating: animating });
  },

  // Flyover mode
  isFlying: false,
  setIsFlying: (flying) => {
    set({ isFlying: flying });
  },

  // Set transition path for 3D visualization
  setTransitionPath: (path) => {
    set({
      transitionPath: path,
      showPath: path !== null,
    });
  },

  // Toggle path visibility
  setShowPath: (show) => {
    set({ showPath: show });
  },

  // Start a new journey
  startJourney: (journey_id, path_id, total_waypoints) => {
    const journey = {
      journey_id,
      path_id,
      current_waypoint: 0,
      total_waypoints,
      status: "in_progress" as const,
      started_at: new Date().toISOString(),
      waypoints_reached: [],
    };

    set({ activeJourney: journey });

    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("activeJourney", JSON.stringify(journey));
    }
  },

  // Mark a waypoint as reached
  markWaypointReached: (waypointIndex) => {
    set((state) => {
      if (!state.activeJourney) return state;

      const reached = [...state.activeJourney.waypoints_reached, waypointIndex];
      const isComplete = reached.length >= state.activeJourney.total_waypoints;

      const updated = {
        ...state.activeJourney,
        current_waypoint: waypointIndex + 1,
        waypoints_reached: reached,
        status: isComplete ? ("completed" as const) : ("in_progress" as const),
      };

      // Persist to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("activeJourney", JSON.stringify(updated));
      }

      return { activeJourney: updated };
    });
  },

  // Complete the journey
  completeJourney: () => {
    set((state) => {
      if (!state.activeJourney) return state;

      const completed = {
        ...state.activeJourney,
        status: "completed" as const,
      };

      // Clear from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeJourney");
      }

      return { activeJourney: completed };
    });
  },

  // Abandon the journey
  abandonJourney: () => {
    // Clear from localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("activeJourney");
    }

    set({ activeJourney: null });
  },

  // Start a new session
  startSession: () => {
    const session = {
      session_id: `session-${Date.now()}`,
      started_at: new Date().toISOString(),
      status: "active" as const,
      duration: 0,
      journeys: [],
      notes: [],
    };

    set({ activeSession: session });

    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("activeSession", JSON.stringify(session));
    }
  },

  // End the session
  endSession: () => {
    // Clear from localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("activeSession");
    }

    set({ activeSession: null });
  },

  // Pause session
  pauseSession: () => {
    set((state) => {
      if (!state.activeSession) return state;

      const updated = {
        ...state.activeSession,
        status: "paused" as const,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("activeSession", JSON.stringify(updated));
      }

      return { activeSession: updated };
    });
  },

  // Resume session
  resumeSession: () => {
    set((state) => {
      if (!state.activeSession) return state;

      const updated = {
        ...state.activeSession,
        status: "active" as const,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("activeSession", JSON.stringify(updated));
      }

      return { activeSession: updated };
    });
  },

  // Add note to session
  addSessionNote: (note: string) => {
    set((state) => {
      if (!state.activeSession) return state;

      const updated = {
        ...state.activeSession,
        notes: [...state.activeSession.notes, note],
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("activeSession", JSON.stringify(updated));
      }

      return { activeSession: updated };
    });
  },

  // Reset to neutral
  reset: () => {
    // Clear journey and session from localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("activeJourney");
      localStorage.removeItem("activeSession");
    }

    set({
      targetVAC: NEUTRAL_VAC,
      targetQuaternion: IDENTITY_QUATERNION,
      currentVAC: NEUTRAL_VAC,
      currentQuaternion: IDENTITY_QUATERNION,
      isAnimating: false,
      angularVelocity: 0,
      transitionPath: null,
      showPath: false,
      activeJourney: null,
      activeSession: null,
    });
  },
}));

// Export canonical emotions for easy access
export { CANONICAL_EMOTIONS };
