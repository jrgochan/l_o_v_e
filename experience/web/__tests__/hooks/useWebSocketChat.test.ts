import { renderHook } from "@testing-library/react";
import { useWebSocketChat } from "@/hooks/useWebSocketChat";
import { useWebSocketMessageHandler } from "@/hooks/websocket/useWebSocketMessageHandler";
import { useWebSocketConnection } from "@/hooks/websocket/useWebSocketConnection";
import { useWebSocketSender } from "@/hooks/websocket/useWebSocketSender";

jest.mock("@/hooks/websocket/useWebSocketMessageHandler");
jest.mock("@/hooks/websocket/useWebSocketConnection");
jest.mock("@/hooks/websocket/useWebSocketSender");

describe("useWebSocketChat", () => {
  const mockHandleMessage = jest.fn();
  const mockDisconnect = jest.fn();
  const mockReconnect = jest.fn();
  const mockSendMessage = jest.fn();
  const mockSendAudio = jest.fn();
  const mockUpdateTone = jest.fn();
  const mockUpdateDeep = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useWebSocketMessageHandler as jest.Mock).mockReturnValue({ handleMessage: mockHandleMessage });
    (useWebSocketConnection as jest.Mock).mockReturnValue({
      wsRef: { current: {} },
      isConnected: true,
      isConnecting: false,
      disconnect: mockDisconnect,
      reconnect: mockReconnect,
    });
    (useWebSocketSender as jest.Mock).mockReturnValue({
      sendMessage: mockSendMessage,
      sendAudio: mockSendAudio,
      updateTonePreference: mockUpdateTone,
      updateDeepFeelingMode: mockUpdateDeep,
    });
  });

  it("should compose websocket hooks", () => {
    const options = { sessionId: "sess-1" };
    const { result } = renderHook(() => useWebSocketChat(options));

    expect(useWebSocketMessageHandler).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "sess-1" })
    );
    expect(useWebSocketConnection).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "ws/chat/sess-1", onMessage: mockHandleMessage })
    );
    expect(useWebSocketSender).toHaveBeenCalled();

    expect(result.current.isConnected).toBe(true);
    expect(result.current.sendMessage).toBe(mockSendMessage);
  });
});
