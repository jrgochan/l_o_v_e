import { renderHook } from "@testing-library/react";
import { useSphereSync } from "@/hooks/useSphereSync";
import { useSyncTransport } from "@/hooks/sync/useSyncTransport";
import { useSphereSender } from "@/hooks/sync/useSphereSender";
import { useSphereReceiver } from "@/hooks/sync/useSphereReceiver";

jest.mock("@/hooks/sync/useSyncTransport");
jest.mock("@/hooks/sync/useSphereSender");
jest.mock("@/hooks/sync/useSphereReceiver");

describe("useSphereSync", () => {
  const mockBroadcast = jest.fn();
  const mockHandleMessage = jest.fn();
  const mockSendMessage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSphereReceiver as jest.Mock).mockReturnValue({
      handleMessage: mockHandleMessage,
      lastUpdate: { type: "test" }
    });
    (useSyncTransport as jest.Mock).mockReturnValue({
      sendMessage: mockSendMessage,
      isConnected: true,
      lastMessageTime: 123
    });
    (useSphereSender as jest.Mock).mockReturnValue({
      broadcast: mockBroadcast
    });
  });

  it("should compose sync elements", () => {
    const { result } = renderHook(() => useSphereSync({ mode: "broadcaster" })); // Use 'broadcaster' which is valid

    expect(useSphereReceiver).toHaveBeenCalledWith("broadcaster", 0, undefined, undefined);
    expect(useSyncTransport).toHaveBeenCalledWith(expect.objectContaining({
      mode: "broadcaster",
      onMessage: mockHandleMessage
    }));
    expect(useSphereSender).toHaveBeenCalledWith("broadcaster", mockSendMessage);

    expect(result.current.isConnected).toBe(true);
    expect(result.current.broadcast).toBe(mockBroadcast);
  });
});
