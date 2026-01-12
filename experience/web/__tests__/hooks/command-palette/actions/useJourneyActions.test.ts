import { renderHook } from "@testing-library/react";
import { useJourneyActions } from "@/hooks/command-palette/actions/useJourneyActions";

// Mock sub-hooks
jest.mock("@/hooks/command-palette/actions/useJourneyCommands", () => ({
    useJourneyCommands: () => ({ executeJourneyCommand: "mockJourneyCommand" })
}));
jest.mock("@/hooks/command-palette/actions/useWaypointCommands", () => ({
    useWaypointCommands: () => ({ executeWaypointCommand: "mockWaypointCommand" })
}));

describe("useJourneyActions", () => {
    it("should return composed commands", () => {
        const { result } = renderHook(() => useJourneyActions({ close: jest.fn() }));

        expect(result.current.executeJourneyCommand).toBe("mockJourneyCommand");
        expect(result.current.executeWaypointCommand).toBe("mockWaypointCommand");
    });
});
