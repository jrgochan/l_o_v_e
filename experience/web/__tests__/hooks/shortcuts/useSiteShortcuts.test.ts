import { renderHook, act } from "@testing-library/react";
import { useSiteShortcuts } from "../../../hooks/shortcuts/useSiteShortcuts";

// Mock dependencies
const mockGetActions = jest.fn();

jest.mock("../../../hooks/shortcuts/useSiteActionMap", () => ({
    useSiteActionMap: () => ({
        getActions: mockGetActions
    })
}));

describe("useSiteShortcuts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should execute action on key press", () => {
        const mockAction = jest.fn();
        mockGetActions.mockReturnValue({ "s": mockAction });

        renderHook(() => useSiteShortcuts());

        act(() => {
            const event = new KeyboardEvent("keydown", { key: "s" });
            window.dispatchEvent(event);
        });

        expect(mockGetActions).toHaveBeenCalled();
        expect(mockAction).toHaveBeenCalled();
    });

    it("should open command palette on Cmd+K", () => {
        const mockOpenCommandPalette = jest.fn();
        Object.defineProperty(window, 'openCommandPalette', {
            value: mockOpenCommandPalette,
            writable: true
        });

        renderHook(() => useSiteShortcuts());

        act(() => {
            const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
            window.dispatchEvent(event);
        });

        expect(mockOpenCommandPalette).toHaveBeenCalled();
    });
});
