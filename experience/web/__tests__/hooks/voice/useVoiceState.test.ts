import { renderHook, act } from "@testing-library/react";
import { useVoiceState } from "../../../hooks/voice/useVoiceState";

describe("useVoiceState", () => {
  it("should initialize default state", () => {
    const { result } = renderHook(() => useVoiceState());
    expect(result.current.state.isRecording).toBe(false);
    expect(result.current.state.duration).toBe(0);
    expect(result.current.state.audioBlob).toBeNull();
  });

  it("should update state actions", () => {
    const { result } = renderHook(() => useVoiceState());

    act(() => {
      result.current.actions.setIsRecording(true);
      result.current.actions.setDuration(10);
    });

    expect(result.current.state.isRecording).toBe(true);
    expect(result.current.state.duration).toBe(10);
  });

  it("should reset state", () => {
    const { result } = renderHook(() => useVoiceState());

    act(() => {
      result.current.actions.setDuration(10);
      result.current.actions.setAudioBlob(new Blob());
      result.current.actions.resetState();
    });

    expect(result.current.state.duration).toBe(0);
    expect(result.current.state.audioBlob).toBeNull();
  });
});
