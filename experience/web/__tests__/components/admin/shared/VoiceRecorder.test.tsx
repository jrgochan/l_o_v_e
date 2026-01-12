import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoiceRecorder } from "@/components/admin/shared/VoiceRecorder";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";

// Mock dependencies
jest.mock("@/hooks/useVoiceRecording", () => ({
  useVoiceRecording: jest.fn(),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/components/admin/visualizations/AudioVisualizer", () => ({
  AudioVisualizer: () => <div data-testid="audio-visualizer" />,
}));

describe("VoiceRecorder", () => {
  const mockOnClose = jest.fn();
  const mockOnSend = jest.fn();

  const mockStart = jest.fn();
  const mockStop = jest.fn();
  const mockPause = jest.fn();
  const mockResume = jest.fn();
  const mockCancel = jest.fn();

  const defaultHookState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    audioBlob: null,
    audioUrl: null,
    startRecording: mockStart,
    stopRecording: mockStop,
    pauseRecording: mockPause,
    resumeRecording: mockResume,
    cancelRecording: mockCancel,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useVoiceRecording as jest.Mock).mockReturnValue(defaultHookState);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders start button when idle", () => {
    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    expect(screen.getByRole("heading", { name: /Voice Recording/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start Recording/i })).toBeInTheDocument();
    expect(screen.getByTestId("audio-visualizer")).toBeInTheDocument();
  });

  it("starts recording on click", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    await user.click(screen.getByRole("button", { name: /Start Recording/i }));

    expect(mockStart).toHaveBeenCalled();
  });

  it("shows controls while recording", () => {
    (useVoiceRecording as jest.Mock).mockReturnValue({
      ...defaultHookState,
      isRecording: true,
      duration: 125, // 2:05
    });

    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    expect(screen.getByText("02:05")).toBeInTheDocument(); // Duration check
    expect(screen.getByRole("button", { name: /Pause/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stop/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Cancel/i })).toHaveLength(1);
  });

  it("handles pause and resume", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    // Test Pause
    (useVoiceRecording as jest.Mock).mockReturnValue({
      ...defaultHookState,
      isRecording: true,
      isPaused: false,
    });
    const { rerender } = render(
      <VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />
    );
    await user.click(screen.getByRole("button", { name: /Pause/i }));
    expect(mockPause).toHaveBeenCalled();

    // Test Resume
    (useVoiceRecording as jest.Mock).mockReturnValue({
      ...defaultHookState,
      isRecording: true,
      isPaused: true,
    });
    rerender(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);
    await user.click(screen.getByRole("button", { name: /Resume/i }));
    expect(mockResume).toHaveBeenCalled();
  });

  it("sends recording", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mockBlob = new Blob(["audio data"], { type: "audio/webm" });

    (useVoiceRecording as jest.Mock).mockReturnValue({
      ...defaultHookState,
      audioBlob: mockBlob,
      audioUrl: "blob:test",
    });

    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    expect(screen.getByText("✓ Recording complete - ready to send!")).toBeInTheDocument();

    // Create mock FileReader
    const mockFileReader = {
      readAsDataURL: jest.fn(),
      result: "data:audio/webm;base64,mockbase64data",
      onloadend: null as any,
    };
    window.FileReader = jest.fn(() => mockFileReader) as any;

    // User click triggers handleStopAndSend which has a setTimeout
    await user.click(screen.getByRole("button", { name: /Send Recording/i }));

    // Advance timer to trigger the timeout callback
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Now onloadend should be assigned and we can trigger it
    act(() => {
      if (mockFileReader.onloadend) {
        mockFileReader.onloadend();
      } else {
        throw new Error("onloadend not assigned");
      }
    });

    // Use waitFor because state updates might be async
    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledWith("mockbase64data", mockBlob);
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockCancel).toHaveBeenCalled();
    });
  });

  it("handles cancel", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockCancel).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });
});
