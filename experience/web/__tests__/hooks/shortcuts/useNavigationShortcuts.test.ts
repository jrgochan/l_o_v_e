import { renderHook, act } from "@testing-library/react";
import { useNavigationShortcuts } from "../../../hooks/shortcuts/useNavigationShortcuts";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Mock store
const mockSetSelectedPath = jest.fn();
jest.mock("@/stores/useAtlasAdminStore", () => ({
    useAtlasAdminStore: jest.fn()
}));

// Mock utils
const mockShouldExecuteShortcut = jest.fn();
jest.mock("../../../hooks/shortcuts/useShortcutUtils", () => ({
    useShortcutGuards: () => ({
        shouldExecuteShortcut: mockShouldExecuteShortcut
    })
}));

describe("useNavigationShortcuts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockShouldExecuteShortcut.mockReturnValue(true);
        // Setup store mock behavior
        (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
            const state = {
                computedPaths: new Map([
                    ["path1", { id: "path1", from: { id: "e1", name: "E1" }, to: { id: "e2", name: "E2" }, difficulty: 1 }],
                    ["path2", { id: "path2", from: { id: "e1", name: "E1" }, to: { id: "e3", name: "E3" }, difficulty: 2 }]
                ]),
                selectedPathId: null,
                selectedEmotionIds: new Set(["e1", "e2", "e3"]),
                setSelectedPath: mockSetSelectedPath
            };
            return selector(state);
        });
    });

    it("should navigate via numbers", () => {
        renderHook(() => useNavigationShortcuts());

        act(() => {
            const event = new KeyboardEvent("keydown", { key: "1" });
            window.dispatchEvent(event);
        });

        expect(mockSetSelectedPath).toHaveBeenCalledWith("path1");
    });

    it("should navigate via arrows", () => {
        // Setup initial state: selectedPathId is null
        let currentState = {
            computedPaths: new Map([
                ["path1", { id: "path1", from: { id: "e1", name: "E1" }, to: { id: "e2", name: "E2" }, difficulty: 1 }],
                ["path2", { id: "path2", from: { id: "e1", name: "E1" }, to: { id: "e3", name: "E3" }, difficulty: 2 }]
            ]),
            selectedPathId: null as string | null,
            selectedEmotionIds: new Set(["e1", "e2", "e3"]),
            setSelectedPath: mockSetSelectedPath
        };

        (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
            return selector(currentState);
        });

        const { rerender } = renderHook(() => useNavigationShortcuts());

        // Arrow Down (Next) -> Should select path1 (index 0)
        act(() => {
            const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
            window.dispatchEvent(event);
        });

        expect(mockSetSelectedPath).toHaveBeenLastCalledWith("path1");

        // Update mock state to reflect selection
        currentState = {
            ...currentState,
            selectedPathId: "path1"
        };

        rerender(); // Force hook to read new state

        // Arrow Down (Next) from path1 -> Should select path2 (index 1)
        act(() => {
            const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
            window.dispatchEvent(event);
        });
        expect(mockSetSelectedPath).toHaveBeenLastCalledWith("path2");
    });
});
