import { renderHook, act } from "@testing-library/react";
import { useChatProgress, initializeProgressStages, getAdaptiveMessage } from "../../../hooks/chat/useChatProgress";

describe("useChatProgress", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe("Helpers", () => {
        it("initializeProgressStages returns correct stages", () => {
            const stages = initializeProgressStages(false); // Deep feeling false
            expect(stages.map(s => s.id)).toEqual(["transcription", "prosody", "emotions", "insights"]);

            const deepStages = initializeProgressStages(true); // Deep feeling true
            expect(deepStages.map(s => s.id)).toContain("relationships");
            expect(deepStages.map(s => s.id)).toContain("aggregate");
        });

        it("getAdaptiveMessage returns correct messages", () => {
            expect(getAdaptiveMessage("started", "pending", "warm", false)).toBe("Beginning analysis...");
            expect(getAdaptiveMessage("started", "pending", "clinical", false)).toBe("Initializing analysis pipeline...");
            expect(getAdaptiveMessage("unknown", "pending", "warm", false)).toBe("Processing...");
        });
    });

    describe("Hook", () => {
        it("should initialize default state", () => {
            const { result } = renderHook(() => useChatProgress());
            expect(result.current.progressState.overallPercentage).toBe(0);
            expect(result.current.showProgress).toBe(false);
        });

        it("should simulate progress", () => {
            const { result } = renderHook(() => useChatProgress());

            act(() => {
                result.current.startProgressSimulation();
            });

            // Fast forward time
            act(() => {
                jest.advanceTimersByTime(1000); // 2 intervals of 500ms
            });

            // Should have incremented 0.5 * 2 = 1%
            expect(result.current.progressState.overallPercentage).toBe(1);
        });

        it("should stop simulation at 90%", () => {
            const { result } = renderHook(() => useChatProgress());

            // Manually set near 90
            act(() => {
                result.current.setProgressState(prev => ({ ...prev, overallPercentage: 89.5 }));
                result.current.startProgressSimulation();
            });

            act(() => {
                jest.advanceTimersByTime(1000); // Should hit 90
            });

            expect(result.current.progressState.overallPercentage).toBe(90);

            act(() => {
                jest.advanceTimersByTime(5000); // Try to go past
            });
            expect(result.current.progressState.overallPercentage).toBe(90);
        });

        it("should cleanup timer on unmount", () => {
            const { result, unmount } = renderHook(() => useChatProgress());
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

            act(() => {
                result.current.startProgressSimulation();
            });

            unmount();
            expect(clearIntervalSpy).toHaveBeenCalled();
        });
    });
});
