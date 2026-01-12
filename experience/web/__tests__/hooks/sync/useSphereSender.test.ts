import { renderHook, act } from "@testing-library/react";
import { useSphereSender } from "@/hooks/sync/useSphereSender";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { HEARTBEAT_INTERVAL } from "@/hooks/sync/types";

jest.mock("@/stores/useExperienceStore");
jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/utils/logger", () => ({
    logger: {
        debug: jest.fn(),
        warn: jest.fn(),
    }
}));

describe("useSphereSender", () => {
    let sendMessage: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        sendMessage = jest.fn();

        (useExperienceStore.getState as jest.Mock) = jest.fn().mockReturnValue({
            targetVAC: [0, 0, 0],
            transitionPath: null,
            showPath: false
        });

        (useAtlasAdminStore.getState as jest.Mock) = jest.fn().mockReturnValue({
            selectedEmotionIds: new Set(["1"])
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("should broadcast state periodically in broadcaster mode", () => {
        renderHook(() => useSphereSender("broadcaster", sendMessage));

        // Initial immediate calls
        act(() => {
            jest.advanceTimersByTime(110);
        });
        expect(sendMessage).toHaveBeenCalled(); // Initial broadcast

        sendMessage.mockClear();

        // Heartbeat interval
        act(() => {
            jest.advanceTimersByTime(HEARTBEAT_INTERVAL + 100);
        });

        expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
            type: "sphere_update",
            vac: [0, 0, 0],
            selectedEmotionIds: ["1"]
        }));
    });

    it("should NOT broadcast in listener mode", () => {
        renderHook(() => useSphereSender("listener", sendMessage));

        act(() => {
            jest.advanceTimersByTime(HEARTBEAT_INTERVAL * 2);
        });

        expect(sendMessage).not.toHaveBeenCalled();
    });

    it("should broadcast on demand via return function", () => {
        const { result } = renderHook(() => useSphereSender("listener", sendMessage));

        act(() => {
            result.current.broadcast();
        });

        expect(sendMessage).toHaveBeenCalled();
    });
});
