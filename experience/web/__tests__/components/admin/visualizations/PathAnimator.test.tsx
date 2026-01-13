
import { render, screen, fireEvent } from "@testing-library/react";
import { PathAnimator, PathAnimationControls } from "@/components/admin/visualizations/PathAnimator";
import * as THREE from "three";
import React from "react";

// Mock types
import type { EmotionPath } from "@/types/atlas-admin";

const mockEmotionPath: EmotionPath = {
  id: "p1",
  from: { id: "e1", name: "Joy", category: "Happy", vac: [1, 1, 1], description: "" },
  to: { id: "e2", name: "Trust", category: "Happy", vac: [2, 2, 2], description: "" },
  waypoints: [
    { emotion: "Peace", vac: [1.5, 1.5, 1.5], reasoning: "" }
  ],
  description: "Test Path"
};

// Mock THREE
jest.mock("three", () => {
  const originalThree = jest.requireActual("three");
  return {
    ...originalThree,
    CatmullRomCurve3: jest.fn().mockImplementation(() => ({
      getPoint: jest.fn().mockReturnValue(new originalThree.Vector3(1, 2, 3)),
    })),
    Vector3: originalThree.Vector3,
  };
});

// Mock R3F
const mockUseFrame = jest.fn();
jest.mock("@react-three/fiber", () => ({
  useFrame: (cb: any) => mockUseFrame(cb),
}));

// Mock React useRef
const mockUseRef = jest.fn();
jest.mock("react", () => {
  const original = jest.requireActual("react");
  return {
    ...original,
    useRef: (initialVal: any) => mockUseRef(initialVal) || { current: initialVal },
  };
});

// Helper for immutable ref (prevent R3F overwrite)
const createImmutableRef = (val: any) => ({
  get current() { return val; },
  set current(_v: any) { /* ignore assignment */ }
});

describe("PathAnimationControls", () => {
  const defaultProps = {
    isPlaying: false,
    speed: 1,
    currentEmotion: "Joy",
    progress: 0.5,
    onPlayPause: jest.fn(),
    onSpeedChange: jest.fn(),
    onReset: jest.fn(),
  };

  // Clear mocks for cleaner run
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders status and controls", () => {
    render(<PathAnimationControls {...defaultProps} />);
    expect(screen.getByText("Path Animation")).toBeInTheDocument();
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("1x")).toBeInTheDocument();
  });

  it("calls onPlayPause when button clicked", () => {
    render(<PathAnimationControls {...defaultProps} />);
    fireEvent.click(screen.getByText("▶️ Play"));
    expect(defaultProps.onPlayPause).toHaveBeenCalled();
  });

  it("shows Pause when playing", () => {
    render(<PathAnimationControls {...defaultProps} isPlaying={true} />);
    expect(screen.getByText("⏸️ Pause")).toBeInTheDocument();
  });

  it("calls onReset when reset clicked", () => {
    render(<PathAnimationControls {...defaultProps} />);
    fireEvent.click(screen.getByText("Reset"));
    expect(defaultProps.onReset).toHaveBeenCalled();
  });

  it("calls onSpeedChange when slider moved", () => {
    render(<PathAnimationControls {...defaultProps} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "2" } });
    expect(defaultProps.onSpeedChange).toHaveBeenCalledWith(2);
  });
});

describe("PathAnimator (R3F Component)", () => {
  const mockTraveler = {
    position: { copy: jest.fn() }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize curve and animate progress", () => {
    // Refs sequence:
    // 1. travelerRef
    // 2. progressRef
    // 3. curve
    // 4. emotions

    const progressRefObj = { current: 0 };
    const curveRefObj = { current: undefined as any };
    const emotionsRefObj = { current: [] as string[] };

    mockUseRef
      .mockReturnValueOnce(createImmutableRef(mockTraveler))
      .mockReturnValueOnce(progressRefObj)
      .mockReturnValueOnce(curveRefObj)
      .mockReturnValueOnce(emotionsRefObj);

    let frameCallback: any;
    mockUseFrame.mockImplementation((cb) => {
      frameCallback = cb;
    });

    render(<PathAnimator path={mockEmotionPath} isPlaying={true} speed={1} onProgress={jest.fn()} />);

    // Assert initialization (useEffect should run)
    expect(THREE.CatmullRomCurve3).toHaveBeenCalled();
    expect(curveRefObj.current).toBeDefined();
    expect(emotionsRefObj.current.length).toBeGreaterThan(0); // Joy, Peace, Trust

    // Run loop
    if (frameCallback) {
      frameCallback({ clock: { elapsedTime: 1 } }, 0.1); // delta 0.1
    }

    // Assert progress update
    // Delta 0.1 * speed 1 * 0.1 (hardcoded multiplier) = 0.01
    expect(progressRefObj.current).toBeCloseTo(0.01);

    // Assert traveler moved
    expect(mockTraveler.position.copy).toHaveBeenCalled();
  });

  it("should loop progress when reaching 1.0", () => {
    // Start with progress near 1.0
    const progressRefObj = { current: 0.99 };
    const curveRefObj = { current: new THREE.CatmullRomCurve3([], false, "catmullrom", 0.5) }; // Pre-init curve

    // Initialize emotions manually for the logic
    const emotionsRefObj = { current: ["Joy", "Trust"] };

    mockUseRef
      .mockReturnValueOnce(createImmutableRef(mockTraveler))
      .mockReturnValueOnce(progressRefObj)
      .mockReturnValueOnce(curveRefObj)
      .mockReturnValueOnce(emotionsRefObj);

    let frameCallback: any;
    mockUseFrame.mockImplementation((cb) => frameCallback = cb);

    render(<PathAnimator path={mockEmotionPath} isPlaying={true} speed={2} />); // Speed 2

    // Effect resets progress to 0. Manually set to 0.99 to test loop.
    progressRefObj.current = 0.99;

    // Run loop. Delta 0.1. Increase = 0.1 * 2 * 0.1 = 0.02.
    // 0.99 + 0.02 = 1.01. >= 1.0. Should reset to 0.

    if (frameCallback) frameCallback({}, 0.1);

    expect(progressRefObj.current).toBe(0);
  });

  it("should not animate if not playing", () => {
    const progressRefObj = { current: 0 };
    mockUseRef
      .mockReturnValueOnce(createImmutableRef(mockTraveler))
      .mockReturnValueOnce(progressRefObj)
      .mockReturnValueOnce({ current: {} }) // curve exists
      .mockReturnValueOnce({ current: [] });

    let frameCallback: any;
    mockUseFrame.mockImplementation((cb) => frameCallback = cb);

    render(<PathAnimator path={mockEmotionPath} isPlaying={false} speed={1} />);

    if (frameCallback) frameCallback({}, 0.1);

    expect(progressRefObj.current).toBe(0);
  });
});
