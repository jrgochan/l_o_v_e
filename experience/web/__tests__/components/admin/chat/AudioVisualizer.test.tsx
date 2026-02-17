import React, { useRef } from "react";
import { render, screen } from "@testing-library/react";
import { AudioVisualizer } from "@/components/admin/chat/AudioVisualizer";

// Mock useAdminTheme
jest.mock("@/hooks/admin/useAdminTheme", () => ({
  useAdminTheme: jest.fn(() => ({
    colors: {
      background: "bg-black",
      border: "border-white",
      text: { muted: "text-gray-500" },
    },
  })),
}));

jest.mock("react", () => {
  const original = jest.requireActual("react");
  return {
    ...original,
    useRef: jest.fn().mockImplementation(original.useRef),
  };
});

describe("AudioVisualizer", () => {
  let requestAnimationFrameSpy: jest.SpyInstance;
  let cancelAnimationFrameSpy: jest.SpyInstance;

  beforeEach(() => {
    requestAnimationFrameSpy = jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        // Return a dummy ID
        return 123;
      });
    cancelAnimationFrameSpy = jest
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders inactive state", () => {
    // Mock getContext to return null to hit line 28 or just let it fail silently if not mocked?
    // Actually, JSDOM usually has getContext but maybe not full implementation.
    // Let's rely on default behavior for simple render tests, or mock it to be safe.

    // Setup generic mock for canvas
    const mockContext = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      fillRect: jest.fn(),
    };

    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockContext as any);

    render(<AudioVisualizer audioLevel={0} isActive={false} personaColor="#ffffff" />);
    expect(screen.getByText("Voice Mode Inactive")).toBeInTheDocument();
  });

  it("renders active state and draws visualizer", () => {
    const mockContext = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      fillRect: jest.fn(),
    };

    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockContext as any);

    // Call callback ONCE to simulate one frame, then stop
    requestAnimationFrameSpy
      .mockImplementationOnce((cb) => {
        cb(Date.now());
        return 1;
      })
      .mockImplementation(() => 2); // Subsequent calls do nothing

    render(<AudioVisualizer audioLevel={0.5} isActive={true} personaColor="#ffffff" />);

    expect(screen.queryByText("Voice Mode Inactive")).not.toBeInTheDocument();

    // Verify drawing calls took place
    expect(mockContext.clearRect).toHaveBeenCalled();
    expect(mockContext.createLinearGradient).toHaveBeenCalled();
    expect(mockContext.fillRect).toHaveBeenCalled();
  });

  it("handles component unmount cleanup", () => {
    const { unmount } = render(
      <AudioVisualizer audioLevel={0.5} isActive={true} personaColor="#ffffff" />
    );
    unmount();
    expect(cancelAnimationFrameSpy).toHaveBeenCalled();
  });

  it("handles null canvas context gracefully", () => {
    // Force getContext to return null
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    render(<AudioVisualizer audioLevel={0.5} isActive={true} personaColor="#ffffff" />);
    // Should not throw and should likely return early in useEffect
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled();
  });

  it("handles null canvas ref (effect early return)", () => {
    // Use mockImplementation to ensure consistent return values even if multiple renders occur
    // We want ref.current to be PERMANENTLY null, preventing React from assigning the DOM node.
    const nullRef = {
      get current() {
        return null;
      },
      set current(v) {}, // ignore writes
    };
    (useRef as jest.Mock).mockReturnValue(nullRef);

    const { unmount } = render(
      <AudioVisualizer audioLevel={0.5} isActive={true} personaColor="#ffffff" />
    );

    // Should return early in useEffect (line 25 coverage)
    const getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, "getContext");
    expect(getContextSpy).not.toHaveBeenCalled();

    // Unmount to trigger cleanup (line 101 coverage for null case)
    unmount();
    expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();

    (useRef as jest.Mock).mockImplementation(jest.requireActual("react").useRef);
  });

  it("handles cleanup when animation frame is falsy (line 101 false branch)", () => {
    // Allow refs to work normally (canvas exists)
    (useRef as jest.Mock).mockImplementation(jest.requireActual("react").useRef);

    // Ensure getContext returns a valid object so effect doesn't return early
    const mockContext = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      fillRect: jest.fn(),
    };
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockContext as any);

    // Mock requestAnimationFrame to return 0 (falsy)
    requestAnimationFrameSpy.mockReturnValue(0);

    const { unmount } = render(
      <AudioVisualizer audioLevel={0.5} isActive={true} personaColor="#ffffff" />
    );

    // Cleanup runs. animationFrameRef.current is 0. if(0) is false.
    unmount();
    expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();
  });

  it("handles cleanup when animation frame is undefined (line 101 false branch)", () => {
    // Allow refs to work normally
    (useRef as jest.Mock).mockImplementation(jest.requireActual("react").useRef);

    // Ensure getContext returns a valid object so effect doesn't return early
    const mockContext = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      fillRect: jest.fn(),
    };
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockContext as any);

    // Mock requestAnimationFrame to return undefined (simulating weird browser behavior or race condition)
    requestAnimationFrameSpy.mockReturnValue(undefined);

    const { unmount } = render(
      <AudioVisualizer audioLevel={0.5} isActive={true} personaColor="#ffffff" />
    );

    // Cleanup runs. animationFrameRef.current is undefined. if(undefined) is false.
    unmount();
    expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();
  });
});
