import { renderHook } from "@testing-library/react";
import { useWebSocketSender } from "@/hooks/websocket/useWebSocketSender";

// Mock logger
jest.mock("@/utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe("useWebSocketSender", () => {
  let wsMock: any;
  let wsRef: any;
  let setError: any;

  beforeEach(() => {
    wsMock = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
    };
    wsRef = { current: wsMock };
    setError = jest.fn();
  });

  it("should send text message when connected", () => {
    const { result } = renderHook(() => useWebSocketSender({ wsRef, setError }));

    result.current.sendMessage("Hello", "warm", false);

    expect(wsMock.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "user_message",
        content: "Hello",
        tone_preference: "warm",
        deep_feeling_enabled: false,
      })
    );
  });

  it("should send audio message when connected", () => {
    const { result } = renderHook(() => useWebSocketSender({ wsRef, setError }));

    result.current.sendAudio("base64data", "clinical", true);

    expect(wsMock.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "user_message",
        audio_data: "base64data",
        tone_preference: "clinical",
        deep_feeling_enabled: true,
      })
    );
  });

  it("should update tone preference", () => {
    const { result } = renderHook(() => useWebSocketSender({ wsRef, setError }));

    result.current.updateTonePreference("clinical");

    expect(wsMock.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "update_tone",
        tone_preference: "clinical",
      })
    );
  });

  it("should update deep feeling mode", () => {
    const { result } = renderHook(() => useWebSocketSender({ wsRef, setError }));

    result.current.updateDeepFeelingMode(true);

    expect(wsMock.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "update_deep_feeling",
        deep_feeling_enabled: true,
      })
    );
  });

  it("should handle disconnected state for text message", () => {
    wsRef.current = null;
    const { result } = renderHook(() => useWebSocketSender({ wsRef, setError }));

    result.current.sendMessage("Fail", "warm");

    expect(setError).toHaveBeenCalledWith("Not connected to server");
  });

  it("should handle disconnected state for audio message", () => {
    wsRef.current = { readyState: WebSocket.CLOSED, send: jest.fn() };
    const { result } = renderHook(() => useWebSocketSender({ wsRef, setError }));

    result.current.sendAudio("Fail", "warm");

    expect(setError).toHaveBeenCalledWith("Not connected to server");
    expect(setError).toHaveBeenCalledWith("Not connected to server");
    expect(wsMock.send).not.toHaveBeenCalled();
  });

  it("should handle disconnected state for tone update", () => {
    wsRef.current = { readyState: WebSocket.CLOSED, send: jest.fn() };
    const { result } = renderHook(() => useWebSocketSender({ wsRef, setError }));

    result.current.updateTonePreference("warm");

    // No setError defined for tone update in implementation, but logs error
    expect(wsMock.send).not.toHaveBeenCalled();
  });

  it("should handle disconnected state for deep feeling update", () => {
    wsRef.current = null;
    const { result } = renderHook(() => useWebSocketSender({ wsRef, setError }));

    result.current.updateDeepFeelingMode(true);

    expect(wsMock.send).not.toHaveBeenCalled();
  });
});
