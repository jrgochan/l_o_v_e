import { renderHook } from "@testing-library/react";
import { useWebSocketMessageHandler } from "@/hooks/websocket/useWebSocketMessageHandler";
import { dispatchMessage } from "@/hooks/websocket/utils/messageDispatcher";

// Mock dispatcher
jest.mock("@/hooks/websocket/utils/messageDispatcher", () => ({
  dispatchMessage: jest.fn(),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe("useWebSocketMessageHandler", () => {
  let props: any;

  beforeEach(() => {
    jest.clearAllMocks();
    props = {
      onMessage: jest.fn(),
      setError: jest.fn(),
      setIsTyping: jest.fn(),
      setMetrics: jest.fn(),
      setDeepFeelingMode: jest.fn(),
      setDeepFeelingState: jest.fn(),
      setRecommendations: jest.fn(),
      addChatMessage: jest.fn(),
    };
  });

  it("should parse JSON and call onMessage + dispatchMessage", () => {
    const { result } = renderHook(() => useWebSocketMessageHandler(props));

    const mockData = { type: "test_message", content: "hello" };
    const event = { data: JSON.stringify(mockData) } as MessageEvent;

    result.current.handleMessage(event);

    expect(props.onMessage).toHaveBeenCalledWith(mockData);
    expect(dispatchMessage).toHaveBeenCalledWith(mockData, props);
  });

  it("should handle parsing errors", () => {
    const { result } = renderHook(() => useWebSocketMessageHandler(props));

    const event = { data: "invalid-json" } as MessageEvent;

    result.current.handleMessage(event);

    expect(props.setError).toHaveBeenCalledWith("Failed to parse server message");
    expect(props.onMessage).not.toHaveBeenCalled();
    expect(dispatchMessage).not.toHaveBeenCalled();
  });
});
