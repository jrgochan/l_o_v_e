import { renderHook } from "@testing-library/react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useVoiceTransport } from "@/hooks/voice/useVoiceTransport";
import { useVoiceVisualizer } from "@/hooks/voice/useVoiceVisualizer";

jest.mock("@/hooks/voice/useVoiceTransport");
jest.mock("@/hooks/voice/useVoiceVisualizer");

describe("useVoiceRecording", () => {
  const mockStart = jest.fn();
  const mockStop = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    global.URL.revokeObjectURL = jest.fn();

    (useVoiceTransport as jest.Mock).mockReturnValue({
      isRecording: true,
      audioUrl: "blob:url",
      stream: {},
      startMediaRecorder: mockStart,
      stopMediaRecorder: mockStop,
    });
    (useVoiceVisualizer as jest.Mock).mockReturnValue({
      audioLevel: 0.5,
    });
  });

  it("should compose transport and visualizer", () => {
    const { result } = renderHook(() => useVoiceRecording());

    expect(useVoiceTransport).toHaveBeenCalled();
    expect(useVoiceVisualizer).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(true);
    expect(result.current.audioLevel).toBe(0.5);
  });

  it("should revoke object url on unmount", () => {
    const { unmount } = renderHook(() => useVoiceRecording());
    unmount();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:url");
  });
});
