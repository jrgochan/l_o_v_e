
import { render, screen, fireEvent, act } from "@testing-library/react";
import { VoiceRecorder } from "@/components/admin/shared/VoiceRecorder";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { logger } from "@/utils/logger";

// Mock the hook
jest.mock("@/hooks/useVoiceRecording");
const mockUseVoiceRecording = useVoiceRecording as jest.Mock;

// Mock logger
jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock AudioVisualizer to avoid canvas issues
jest.mock("@/components/admin/visualizations/AudioVisualizer", () => ({
  AudioVisualizer: () => <div data-testid="audio-visualizer" />
}));

describe("VoiceRecorder", () => {
  const mockOnClose = jest.fn();
  const mockOnSend = jest.fn();

  const defaultHookReturn = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    audioBlob: null,
    audioUrl: null,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    pauseRecording: jest.fn(),
    resumeRecording: jest.fn(),
    cancelRecording: jest.fn(),
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseVoiceRecording.mockReturnValue(defaultHookReturn);
  });

  it("does not render when closed", () => {
    const { container } = render(<VoiceRecorder isOpen={false} onClose={mockOnClose} onSend={mockOnSend} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders correctly when open", () => {
    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);
    expect(screen.getByText("🎤 Voice Recording")).toBeInTheDocument();
  });

  it("handles start recording", async () => {
    const startRecording = jest.fn().mockResolvedValue(undefined);
    mockUseVoiceRecording.mockReturnValue({
      ...defaultHookReturn,
      startRecording
    });

    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Start Recording"));
    });

    expect(startRecording).toHaveBeenCalled();
  });

  it("displays recording state", () => {
    mockUseVoiceRecording.mockReturnValue({
      ...defaultHookReturn,
      isRecording: true,
      duration: 125, // 2:05
    });

    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    expect(screen.getByText("Recording in progress...")).toBeInTheDocument();
  });

  it("handles pause and resume", () => {
    const pauseRecording = jest.fn();
    const resumeRecording = jest.fn();

    // First render: Recording, not paused
    mockUseVoiceRecording.mockReturnValue({
      ...defaultHookReturn,
      isRecording: true,
      isPaused: false,
      pauseRecording,
      resumeRecording,
    });

    const { rerender } = render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    fireEvent.click(screen.getByText("⏸ Pause"));
    expect(pauseRecording).toHaveBeenCalled();

    // Rerender: Paused
    mockUseVoiceRecording.mockReturnValue({
      ...defaultHookReturn,
      isRecording: true,
      isPaused: true,
      pauseRecording,
      resumeRecording,
    });
    rerender(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    expect(screen.getByText("Recording paused")).toBeInTheDocument();
    fireEvent.click(screen.getByText("▶️ Resume"));
    expect(resumeRecording).toHaveBeenCalled();
  });

  it("handles stop recording", () => {
    const stopRecording = jest.fn();
    mockUseVoiceRecording.mockReturnValue({
      ...defaultHookReturn,
      isRecording: true,
      stopRecording,
    });

    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    fireEvent.click(screen.getByText("⏹ Stop"));
    expect(stopRecording).toHaveBeenCalled();
  });

  it("handles cancel recording", () => {
    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("verifies cancel logic fully", () => {
    const cancelRecording = jest.fn();
    mockUseVoiceRecording.mockReturnValue({
      ...defaultHookReturn,
      cancelRecording
    });

    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);
    fireEvent.click(screen.getByText("Cancel"));

    expect(cancelRecording).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("handles send recording flow", () => {
    const mockFileReader = {
      readAsDataURL: jest.fn(),
      onloadend: null as any,
      result: "data:audio/webm;base64,mockbase64string",
      onerror: null as any,
    };
    (global as any).FileReader = jest.fn(() => mockFileReader);

    jest.useFakeTimers();

    const stopRecording = jest.fn();
    const cancelRecording = jest.fn();
    const mockBlob = new Blob(["test"], { type: "audio/webm" });

    mockUseVoiceRecording.mockReturnValue({
      ...defaultHookReturn,
      isRecording: false,
      audioBlob: mockBlob,
      audioUrl: "blob:url",
      stopRecording,
      cancelRecording,
    });

    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    fireEvent.click(screen.getByText("Send Recording"));

    expect(stopRecording).toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockBlob);

    act(() => {
      mockFileReader.onloadend();
    });

    expect(mockOnSend).toHaveBeenCalledWith("mockbase64string", mockBlob);

    jest.useRealTimers();
  });

  it("handles record again", () => {
    const cancelRecording = jest.fn();
    mockUseVoiceRecording.mockReturnValue({
      ...defaultHookReturn,
      isRecording: false,
      audioBlob: new Blob(),
      cancelRecording,
    });

    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    fireEvent.click(screen.getByText("🔄 Record Again"));
    expect(cancelRecording).toHaveBeenCalled();
  });

  it("displays error", () => {
    mockUseVoiceRecording.mockReturnValue({
      ...defaultHookReturn,
      error: "Microphone denied",
    });

    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);
    expect(screen.getByText("⚠️ Microphone denied")).toBeInTheDocument();
  });

  it("executes usage callbacks", () => {
    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);
    expect(mockUseVoiceRecording).toHaveBeenCalled();
    const options = mockUseVoiceRecording.mock.calls[mockUseVoiceRecording.mock.calls.length - 1][0];

    options.onRecordingComplete();
    expect(logger.info).toHaveBeenCalledWith("hooks", expect.stringContaining("complete"));

    const err = new Error("msg");
    options.onError(err);
    expect(logger.error).toHaveBeenCalledWith("hooks", expect.stringContaining("error"), err);
  });

  it("handles stop recording and processing safety (race condition)", () => {
    jest.useFakeTimers();
    const stopRecording = jest.fn();

    // 1. Render where we are ready to send
    const { rerender } = render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    mockUseVoiceRecording.mockReturnValue({
      ...defaultHookReturn,
      audioBlob: new Blob(),
      stopRecording,
    });
    rerender(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    // 2. Click send
    fireEvent.click(screen.getByText("Send Recording"));
    expect(stopRecording).toHaveBeenCalled();

    // 3. Rerender with NO blob (simulating loss or race condition before timeout)
    mockUseVoiceRecording.mockReturnValue({
      ...defaultHookReturn,
      audioBlob: null,
      stopRecording,
    });
    rerender(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);

    // 4. Advance time
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // 5. Should NOT send because blob check failed
    expect(mockOnSend).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("handles FileReader error", () => {
    const mockFileReader = {
      readAsDataURL: jest.fn(),
      onloadend: null as any,
      onerror: null as any,
      error: new Error("Read failed")
    };
    (global as any).FileReader = jest.fn(() => mockFileReader);
    jest.useFakeTimers();

    const stopRecording = jest.fn();
    mockUseVoiceRecording.mockReturnValue({
      ...defaultHookReturn,
      audioBlob: new Blob(),
      stopRecording,
    });

    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);
    fireEvent.click(screen.getByText("Send Recording"));

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockFileReader.readAsDataURL).toHaveBeenCalled();

    act(() => {
      mockFileReader.onerror(new Event("error"));
    });

    expect(logger.error).toHaveBeenCalledWith("general", "Error reading audio blob", expect.any(Object));
    jest.useRealTimers();
  });

  it("handles empty FileReader result", () => {
    const mockFileReader = {
      readAsDataURL: jest.fn(),
      onloadend: null as any,
      result: "", // Empty result
    };
    (global as any).FileReader = jest.fn(() => mockFileReader);
    jest.useFakeTimers();

    const stopRecording = jest.fn();
    mockUseVoiceRecording.mockReturnValue({
      ...defaultHookReturn,
      audioBlob: new Blob(),
      stopRecording,
    });

    render(<VoiceRecorder isOpen={true} onClose={mockOnClose} onSend={mockOnSend} />);
    fireEvent.click(screen.getByText("Send Recording"));

    act(() => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      mockFileReader.onloadend();
    });

    expect(logger.error).toHaveBeenCalledWith("general", "FileReader result is empty");
    expect(mockOnSend).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
