import { renderHook, act } from "@testing-library/react";
import { useWebSocketConnection } from "@/hooks/websocket/useWebSocketConnection";
import { useConnectionLifecycle } from "@/hooks/websocket/useConnectionLifecycle";

jest.mock("@/hooks/websocket/useConnectionLifecycle");
jest.useFakeTimers();

describe("useWebSocketConnection", () => {
    const mockConnect = jest.fn();
    const mockDisconnect = jest.fn();
    const mockReconnect = jest.fn();
    let mockWsRef = { current: { readyState: 1, send: jest.fn() } };

    beforeEach(() => {
        jest.clearAllMocks();
        mockWsRef = { current: { readyState: 1, send: jest.fn() } };

        // Default mock that DOES NOT auto-connect
        (useConnectionLifecycle as jest.Mock).mockImplementation(({ setIsConnected }) => {
            return {
                wsRef: mockWsRef,
                connect: () => {
                    // Simulate async connection to avoid render loop
                    setIsConnected(true);
                },
                disconnect: () => setIsConnected(false),
                reconnect: mockReconnect
            };
        });
    });

    it("should delegate lifecycle methods", () => {
        const { result } = renderHook(() => useWebSocketConnection({
            sessionId: "123",
            onMessage: jest.fn(),
            setError: jest.fn()
        }));

        expect(result.current.connect).toBeDefined();
        expect(result.current.disconnect).toBeDefined();
    });

    it("should send heartbeat when connected", () => {
        const { result } = renderHook(() => useWebSocketConnection({
            sessionId: "123",
            onMessage: jest.fn(),
            setError: jest.fn()
        }));

        // Trigger connection
        act(() => {
            result.current.connect();
        });

        // Fast forward 30s
        act(() => {
            jest.advanceTimersByTime(30000);
        });

        expect(mockWsRef.current.send).toHaveBeenCalledWith(JSON.stringify({ type: "ping" }));
    });

    it("should start disconnected", () => {
        const { result } = renderHook(() => useWebSocketConnection({
            sessionId: "123",
            onMessage: jest.fn(),
            setError: jest.fn()
        }));

        expect(result.current.isConnected).toBe(false);
    });
});
