import { renderHook } from "@testing-library/react";
import { useVoiceTransport } from "@/hooks/voice/useVoiceTransport";
import { useVoiceState } from "@/hooks/voice/useVoiceState";
import { useMediaRecorder } from "@/hooks/voice/useMediaRecorder";

jest.mock("@/hooks/voice/useVoiceState");
jest.mock("@/hooks/voice/useMediaRecorder");

describe("useVoiceTransport", () => {
  const mockState = { isRecording: false, isProcessing: false };
  const mockActions = { startRecording: jest.fn(), stopRecording: jest.fn() };
  const mockRecorder = { start: jest.fn(), stop: jest.fn(), pause: jest.fn(), resume: jest.fn() };

  beforeEach(() => {
    (useVoiceState as jest.Mock).mockReturnValue({ state: mockState, actions: mockActions });
    (useMediaRecorder as jest.Mock).mockReturnValue(mockRecorder);
  });

  it("should combine state and recorder functions", () => {
    const { result } = renderHook(() => useVoiceTransport({}));

    expect(result.current.isRecording).toBe(false);
    expect(result.current.startMediaRecorder).toBeDefined();
    expect(result.current.stopMediaRecorder).toBeDefined();
  });

  it("should pass options to useMediaRecorder", () => {
    const onComplete = jest.fn();
    const onError = jest.fn();

    renderHook(() => useVoiceTransport({ onRecordingComplete: onComplete, onError }));

    expect(useMediaRecorder).toHaveBeenCalledWith(
      expect.objectContaining({
        onRecordingComplete: onComplete,
        onError,
        state: mockState,
        actions: mockActions,
      })
    );
  });
});
