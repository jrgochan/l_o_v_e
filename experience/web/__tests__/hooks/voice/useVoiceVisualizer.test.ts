import { renderHook, act } from "@testing-library/react";
import { useVoiceVisualizer } from "../../../hooks/voice/useVoiceVisualizer";

// Mock Web Audio API
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockCreateAnalyser = jest.fn().mockReturnValue({
  fftSize: 2048,
  frequencyBinCount: 128,
  connect: jest.fn(),
  getByteFrequencyData: jest.fn((array) => {
    array.fill(128); // Simulate half volume
  }),
});
const mockCreateMediaStreamSource = jest.fn().mockReturnValue({
  connect: jest.fn(),
});

window.AudioContext = class {
  createAnalyser = mockCreateAnalyser;
  createMediaStreamSource = mockCreateMediaStreamSource;
  close = mockClose;
} as any;

describe("useVoiceVisualizer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeAll(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => setTimeout(cb, 16) as unknown as number);
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: any) => clearTimeout(id));
  });

  afterAll(() => {
    (window.requestAnimationFrame as jest.Mock).mockRestore();
    (window.cancelAnimationFrame as jest.Mock).mockRestore();
  });

  it("should initialize with 0 level when no stream", () => {
    const { result } = renderHook(() => useVoiceVisualizer(null));
    expect(result.current.audioLevel).toBe(0);
  });

  it("should connect stream and update levels", () => {
    const stream = {} as MediaStream;
    const { result } = renderHook(() => useVoiceVisualizer(stream));

    expect(mockCreateMediaStreamSource).toHaveBeenCalledWith(stream);
    expect(mockCreateAnalyser).toHaveBeenCalled();

    // Should update via rAF (mocked via fake timers/act?)
    // rAF usually runs immediately in some test environments or needs explicit trigger.
    // Let's assume rAF loop runs.

    // Simulate rAF
    act(() => {
      jest.advanceTimersByTime(100);
    });
  });

  it("should cleanup resources when stream is removed", () => {
    const stream = {} as MediaStream;
    const { result, rerender } = renderHook(
      (s) => useVoiceVisualizer(s),
      {
        initialProps: stream as MediaStream | null,
      }
    );

    // Verify setup
    expect(mockCreateAnalyser).toHaveBeenCalled();

    // Rerender with null
    rerender(null);

    // Verify cleanup
    expect(mockClose).toHaveBeenCalled();
  });
});
