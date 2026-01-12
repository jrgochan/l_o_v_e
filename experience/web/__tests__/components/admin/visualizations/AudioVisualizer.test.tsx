import { render, screen } from "@testing-library/react";
import { AudioVisualizer } from "@/components/admin/visualizations/AudioVisualizer";

// Mock canvas and context
const mockContext = {
  fillStyle: "",
  strokeStyle: "",
  shadowBlur: 0,
  shadowColor: "",
  lineWidth: 0,
  fillRect: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  beginPath: jest.fn(),
};

beforeAll(() => {
  // @ts-ignore
  HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext);
});

describe("AudioVisualizer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders canvas and level meter", () => {
    render(<AudioVisualizer audioLevel={0.5} isRecording={false} />);

    // Check specific HTML elements
    expect(screen.getByText("Level:")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("initializes canvas context", () => {
    render(<AudioVisualizer audioLevel={0.5} isRecording={false} />);

    // Should verify getContext was called, but checking exact call on prototype is hard.
    // We can infer it by checking if drawing occurred.
    // In "isRecording=false", it draws ONCE using useEffect.

    expect(mockContext.fillRect).toHaveBeenCalled(); // Clear canvas
    expect(mockContext.stroke).toHaveBeenCalled(); // Draw center line
  });

  it("updates drawing loop when recording", () => {
    // We need to mock requestAnimationFrame for tight control
    let capturedCb: FrameRequestCallback | null = null;
    const rafSpy = jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      capturedCb = cb;
      return 1;
    });

    render(<AudioVisualizer audioLevel={0.8} isRecording={true} />);

    expect(rafSpy).toHaveBeenCalled();

    // Manually trigger the draw loop once
    if (capturedCb) {
      // @ts-ignore
      capturedCb(0);
    }

    // It should draw bars
    expect(mockContext.fillStyle).toBeDefined();
    expect(mockContext.fillRect).toHaveBeenCalled();

    rafSpy.mockRestore();
  });

  it("shows accurate level percentage", () => {
    const { rerender } = render(<AudioVisualizer audioLevel={0.234} isRecording={true} />);
    expect(screen.getByText("23%")).toBeInTheDocument();

    rerender(<AudioVisualizer audioLevel={0.99} isRecording={true} />);
    expect(screen.getByText("99%")).toBeInTheDocument();
  });
});
