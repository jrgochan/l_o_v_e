import { render, act, screen } from "@testing-library/react";
import { IntroSequence } from "@/components/admin/visualization/IntroSequence";
// Interact with R3F state
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVisualizationStore } from "@/stores/useVisualizationStore";

// Mock Hooks
jest.mock("@react-three/fiber", () => ({
  useThree: jest.fn(),
  useFrame: jest.fn(),
}));

jest.mock("@/stores/useVisualizationStore", () => ({
  useVisualizationStore: jest.fn(),
}));

jest.mock("@/hooks/useAmbientAudio", () => ({
  useAmbientAudio: jest.fn(() => ({
    playWhoosh: jest.fn(),
  })),
}));

// Mock Drei Html
jest.mock("@react-three/drei", () => ({
  Html: ({ children }: any) => <div data-testid="drei-html">{children}</div>,
}));

describe("IntroSequence", () => {
  const setIntroActive = jest.fn();
  const mockCamera = {
    position: { copy: jest.fn() },
    lookAt: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ setIntroActive })
    );
    (useThree as jest.Mock).mockReturnValue({ camera: mockCamera });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("initializes camera and plays sound", () => {
    render(<IntroSequence />);
    expect(mockCamera.position.copy).toHaveBeenCalled();
    expect(mockCamera.lookAt).toHaveBeenCalledWith(0, 0, 0);
  });

  it("animates camera and completes", () => {
    render(<IntroSequence />);

    // Grab the frame callback
    const frameCallback = (useFrame as jest.Mock).mock.calls[0][0];

    // Simulate frames
    // 1. Initial
    frameCallback({ clock: { elapsedTime: 0 } });

    // 2. Middle (showTitle true)
    // Advance timers to trigger setTimeout (1000ms delay)
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    // Determine frame update to trigger re-renders if needed?
    // Actually, state update via setTimeout triggers re-render regardless of useFrame.

    // Check if title has opacity-100 class
    expect(screen.getByText("ATLAS").closest("div")).toHaveClass("opacity-100");

    // 3. End
    act(() => {
      frameCallback({ clock: { elapsedTime: 7.0 } });
    });
    expect(setIntroActive).toHaveBeenCalledWith(false);
  });

  it("fades out title after delay", () => {
    render(<IntroSequence />);

    // Advance past fade out time (4500ms)
    act(() => {
      jest.advanceTimersByTime(4600);
    });

    // Should not be visible (opacity 0)
    expect(screen.getByText("ATLAS").closest("div")).toHaveClass("opacity-0");
  });

  it("cleans up timers on unmount", () => {
    const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");
    const { unmount } = render(<IntroSequence />);

    unmount();

    // Should clear 2 timers
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
  });
});
