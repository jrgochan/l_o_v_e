import { render } from "@testing-library/react";
import { VACAnimator } from "../../components/VACAnimator";
import { useExperienceStore } from "@/stores/useExperienceStore";

// Mock Three.js
jest.mock("three", () => ({
  MathUtils: {
    lerp: (a: number, b: number, t: number) => a + (b - a) * t,
  },
}));

// Mock R3F
const mockUseFrame = jest.fn();
jest.mock("@react-three/fiber", () => ({
  useFrame: (cb: any) => mockUseFrame(cb),
}));

// Mock Store
jest.mock("@/stores/useExperienceStore", () => {
  const updateCurrent = jest.fn();
  const setIsAnimating = jest.fn();
  const getState = jest.fn();

  // The store hook
  const useExperienceStore = jest.fn((selector) =>
    selector({
      targetVAC: [1, 1, 1],
      updateCurrent,
      setIsAnimating,
      isAnimating: true,
    })
  );

  // Attach static methods to the hook
  Object.assign(useExperienceStore, {
    getState,
    // Expose inner mocks for testing
    updateCurrent,
    setIsAnimating,
  });

  return {
    useExperienceStore,
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

  it("should skip update if close and not animating", () => {
    // Override isAnimating to false
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        targetVAC: [1, 1, 1],
        updateCurrent: mockStore.updateCurrent,
        setIsAnimating: mockStore.setIsAnimating,
        isAnimating: false,
      })
    );

    mockStore.getState.mockReturnValue({ currentVAC: [1, 1, 1] }); // Already at target
    render(<VACAnimator />);

    expect(mockStore.updateCurrent).not.toHaveBeenCalled();
  });
  it("should finish animating but not snap if not close enough", () => {
    // Distance roughly sqrt(0.00005) ~= 0.007
    // distSq = 0.00005 < 0.0001 but > 0.0000001

    // Override store
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        targetVAC: [1, 1, 1],
        updateCurrent: mockStore.updateCurrent,
        setIsAnimating: mockStore.setIsAnimating,
        isAnimating: true,
      })
    );

    // Current: [0.995, 1, 1] -> diff 0.005. sq = 0.000025.
    mockStore.getState.mockReturnValue({ currentVAC: [0.995, 1, 1] });
    render(<VACAnimator />);

    expect(mockStore.setIsAnimating).toHaveBeenCalledWith(false);

    // Check updateCurrent was called with lerped values, not target
    expect(mockStore.updateCurrent).toHaveBeenCalled();
    const args = mockStore.updateCurrent.mock.calls[0][0]; // [v, a, c]
    // Should NOT be exactly [1, 1, 1] because delta lerp moves it closer but maybe not 1.0 (lerpSpeed = 3 * 0.016 = 0.048)
    // Should NOT be exactly [1, 1, 1] because delta lerp moves it closer but maybe not 1.0 (lerpSpeed = 3 * 0.016 = 0.048)
    expect(args).not.toEqual([1, 1, 1]);
  });

  it("should not stop animating if not animating (redundant check)", () => {
    // distSq < 0.0001 but > 0.000001 AND !isAnimating

    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        targetVAC: [1, 1, 1],
        updateCurrent: mockStore.updateCurrent,
        setIsAnimating: mockStore.setIsAnimating,
        isAnimating: false,
      })
    );

    mockStore.getState.mockReturnValue({ currentVAC: [0.995, 1, 1] });
    render(<VACAnimator />);

    expect(mockStore.setIsAnimating).not.toHaveBeenCalled();
    expect(mockStore.updateCurrent).toHaveBeenCalled();
  });
});
