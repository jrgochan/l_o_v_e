import { renderHook, act } from "@testing-library/react";
import { useAnimationModeTransition, lerp, getTransitionOpacity } from "../../hooks/useAnimationModeTransition";

describe("useAnimationModeTransition", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("should initialize with default state", () => {
        const { result } = renderHook(() => useAnimationModeTransition("flow"));

        expect(result.current).toEqual({
            isTransitioning: false,
            progress: 1.0,
            fromMode: "flow",
            toMode: "flow"
        });
    });

    it("should start transition on mode change", () => {
        const { result, rerender } = renderHook(
            ({ mode }) => useAnimationModeTransition(mode as any),
            { initialProps: { mode: "flow" } }
        );

        // Change mode
        rerender({ mode: "network" });

        expect(result.current.isTransitioning).toBe(true);
        expect(result.current.fromMode).toBe("flow");
        expect(result.current.toMode).toBe("network");
        expect(result.current.progress).toBe(0);
    });

    it("should progress through transition over time", () => {
        const { result, rerender } = renderHook(
            ({ mode }) => useAnimationModeTransition(mode as any, 1000),
            { initialProps: { mode: "flow" } }
        );

        rerender({ mode: "network" });

        // Advance halfway
        act(() => {
            jest.advanceTimersByTime(500);
        });

        // Easing function makes it exact value hard to predict without calc, 
        // but it should be > 0 and < 1
        expect(result.current.progress).toBeGreaterThan(0);
        expect(result.current.progress).toBeLessThan(1);
        expect(result.current.isTransitioning).toBe(true);
    });

    it("should complete transition", () => {
        const { result, rerender } = renderHook(
            ({ mode }) => useAnimationModeTransition(mode as any, 1000),
            { initialProps: { mode: "flow" } }
        );

        rerender({ mode: "network" });

        act(() => {
            jest.advanceTimersByTime(1000); // 1.5s to be safe
        });

        // Should ideally be done, but sometimes requestAnimationFrame logic needs extra tick
        act(() => {
            jest.advanceTimersByTime(100);
        });

        expect(result.current.isTransitioning).toBe(false);
        expect(result.current.progress).toBe(1);
        expect(result.current.fromMode).toBe("network");
        expect(result.current.toMode).toBe("network");
    });
});

describe("Helper Functions", () => {
    describe("lerp", () => {
        it("should interpolate values", () => {
            expect(lerp(0, 10, 0.5)).toBe(5);
            expect(lerp(10, 20, 0.25)).toBe(12.5);
            expect(lerp(0, 100, 0)).toBe(0);
            expect(lerp(0, 100, 1)).toBe(100);
        });
    });

    describe("getTransitionOpacity", () => {
        it("should return static opacity when not transitioning", () => {
            const state = {
                isTransitioning: false,
                progress: 1,
                fromMode: "flow" as any,
                toMode: "flow" as any
            };
            const result = getTransitionOpacity(state);
            expect(result.fromOpacity).toBe(0);
            expect(result.toOpacity).toBe(1);
        });

        it("should blend opacities during transition", () => {
            const state = {
                isTransitioning: true,
                progress: 0.5,
                fromMode: "flow" as any,
                toMode: "network" as any
            };
            const result = getTransitionOpacity(state);
            expect(result.fromOpacity).toBeCloseTo(0.5);
            expect(result.toOpacity).toBeCloseTo(0.5);
        });

        it("should respect base opacity", () => {
            const state = {
                isTransitioning: true,
                progress: 0.5,
                fromMode: "flow" as any,
                toMode: "network" as any
            };
            const result = getTransitionOpacity(state, 0.5);
            expect(result.fromOpacity).toBeCloseTo(0.25);
            expect(result.toOpacity).toBeCloseTo(0.25);
        });
    });
});
