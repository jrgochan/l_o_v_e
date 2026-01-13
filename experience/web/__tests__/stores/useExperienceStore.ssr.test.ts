/**
 * @jest-environment node
 */
import { useExperienceStore } from "../../stores/useExperienceStore";

describe("useExperienceStore (SSR)", () => {
    // No window manipulation needed - running in Node environment where window is undefined by default

    it("should confirm window is undefined", () => {
        // In strict mode or some environments, accessing window might throw if undefined?
        // But typeof check should work.
        expect(typeof window).toBe("undefined");
    });

    it("should handle session actions without window", () => {
        // Start session
        useExperienceStore.getState().startSession();
        expect(useExperienceStore.getState().activeSession?.status).toBe("active");

        // Validate NO localStorage interaction (implicit, as it would crash if tried)

        // Pause
        useExperienceStore.getState().pauseSession();
        expect(useExperienceStore.getState().activeSession?.status).toBe("paused");

        // Resume
        useExperienceStore.getState().resumeSession();
        expect(useExperienceStore.getState().activeSession?.status).toBe("active");

        // Add Note
        useExperienceStore.getState().addSessionNote("ssr note");
        expect(useExperienceStore.getState().activeSession?.notes).toContain("ssr note");

        // End
        useExperienceStore.getState().endSession();
        expect(useExperienceStore.getState().activeSession).toBeNull();

        // Reset (SSR check)
        useExperienceStore.getState().reset();
        // Should not crash
    });

    it("should handle journey persistence checks without window", () => {
        useExperienceStore.getState().startJourney("j1", "p1", 5);
        expect(useExperienceStore.getState().activeJourney).toBeDefined();

        useExperienceStore.getState().markWaypointReached(0);
        expect(useExperienceStore.getState().activeJourney?.current_waypoint).toBe(1);

        useExperienceStore.getState().completeJourney();
        expect(useExperienceStore.getState().activeJourney?.status).toBe("completed");

        useExperienceStore.getState().abandonJourney();
        expect(useExperienceStore.getState().activeJourney).toBeNull();
    });
});
