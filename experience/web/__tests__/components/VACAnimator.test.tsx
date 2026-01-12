import { render } from "@testing-library/react";
import { VACAnimator } from "../../components/VACAnimator";
import { useExperienceStore } from "@/stores/useExperienceStore";

// Mock Three.js
jest.mock("three", () => ({
    MathUtils: {
        lerp: (a: number, b: number, t: number) => a + (b - a) * t
    }
}));

// Mock R3F
const mockUseFrame = jest.fn();
jest.mock("@react-three/fiber", () => ({
    useFrame: (cb: any) => mockUseFrame(cb)
}));

// Mock Store
jest.mock("@/stores/useExperienceStore", () => {
    const updateCurrent = jest.fn();
    const setIsAnimating = jest.fn();
    const getState = jest.fn();

    // The store hook
    const useExperienceStore = jest.fn((selector) => selector({
        targetVAC: [1, 1, 1],
        updateCurrent,
        setIsAnimating,
        isAnimating: true
    }));

    // Attach static methods to the hook
    Object.assign(useExperienceStore, {
        getState,
        // Expose inner mocks for testing
        updateCurrent,
        setIsAnimating
    });

    return {
        useExperienceStore
    };
});

describe("VACAnimator", () => {
    const mockStore = useExperienceStore as any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseFrame.mockImplementation((cb) => {
            const state = {};
            const delta = 0.016;
            cb(state, delta);
        });
    });

    it("should register frame loop", () => {
        mockStore.getState.mockReturnValue({ currentVAC: [0, 0, 0] });
        render(<VACAnimator />);
        expect(mockUseFrame).toHaveBeenCalled();
    });

    it("should interpolate values towards target", () => {
        mockStore.getState.mockReturnValue({ currentVAC: [0, 0, 0] });
        render(<VACAnimator />);

        expect(mockStore.updateCurrent).toHaveBeenCalled();
        const callArgs = mockStore.updateCurrent.mock.calls[0];
        const newVAC = callArgs[0];

        expect(newVAC[0]).toBeGreaterThan(0);
        expect(newVAC[0]).toBeLessThan(1);
    });

    it("should stop animating when close to target", () => {
        mockStore.getState.mockReturnValue({ currentVAC: [0.9999999, 0.9999999, 0.9999999] });
        render(<VACAnimator />);

        expect(mockStore.updateCurrent).toHaveBeenCalledWith([1, 1, 1], expect.any(Array));
        expect(mockStore.setIsAnimating).toHaveBeenCalledWith(false);
    });
});
