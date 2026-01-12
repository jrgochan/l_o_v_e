import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";

// Mock sub-hooks
const mockLayerShortcuts = jest.fn();
const mockNavigationShortcuts = jest.fn();
const mockSiteShortcuts = jest.fn();

jest.mock("../../hooks/shortcuts/useLayerShortcuts", () => ({
    useLayerShortcuts: () => mockLayerShortcuts()
}));

jest.mock("../../hooks/shortcuts/useNavigationShortcuts", () => ({
    useNavigationShortcuts: () => mockNavigationShortcuts()
}));

jest.mock("../../hooks/shortcuts/useSiteShortcuts", () => ({
    useSiteShortcuts: () => mockSiteShortcuts()
}));

describe("useKeyboardShortcuts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should initialize all shortcut groups", () => {
        renderHook(() => useKeyboardShortcuts());

        expect(mockLayerShortcuts).toHaveBeenCalled();
        expect(mockNavigationShortcuts).toHaveBeenCalled();
        expect(mockSiteShortcuts).toHaveBeenCalled();
    });
});
