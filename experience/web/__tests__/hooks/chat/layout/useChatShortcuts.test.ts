import { renderHook } from "@testing-library/react";
import { useChatShortcuts } from "@/hooks/chat/layout/useChatShortcuts";
import { fireEvent } from "@testing-library/react";

describe("useChatShortcuts", () => {
    const mockHandleToggleExpand = jest.fn();
    const mockHandleToggleFullscreen = jest.fn();
    const mockHandleToggleExpansion = jest.fn();
    const mockSetAnalysisExpandState = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const getHook = (props: any = {}) => renderHook(() => useChatShortcuts({
        isExpanded: false,
        isFullscreen: false,
        analysisExpandState: "normal",
        handleToggleExpand: mockHandleToggleExpand,
        handleToggleFullscreen: mockHandleToggleFullscreen,
        handleToggleExpansion: mockHandleToggleExpansion,
        setAnalysisExpandState: mockSetAnalysisExpandState,
        ...props
    }));

    it("should handle Ctrl+Shift+A (Toggle Analysis Expansion)", () => {
        getHook();
        fireEvent.keyDown(window, { key: "a", ctrlKey: true, shiftKey: true });
        expect(mockHandleToggleExpansion).toHaveBeenCalled();
    });

    it("should handle Ctrl+Shift+F (Expand then Fullscreen)", () => {
        // If NOT expanded, it should Expand first
        getHook({ isExpanded: false });
        fireEvent.keyDown(window, { key: "f", ctrlKey: true, shiftKey: true });
        expect(mockHandleToggleExpand).toHaveBeenCalled();
        expect(mockHandleToggleFullscreen).not.toHaveBeenCalled();
    });

    it("should handle Ctrl+Shift+F (Toggle Fullscreen if Expanded)", () => {
        // If ALREADY expanded, it should toggle Fullscreen
        getHook({ isExpanded: true });
        fireEvent.keyDown(window, { key: "f", ctrlKey: true, shiftKey: true });
        expect(mockHandleToggleFullscreen).toHaveBeenCalled();
    });

    it("should handle Escape (Exit Fullscreen)", () => {
        getHook({ isFullscreen: true });
        fireEvent.keyDown(window, { key: "Escape" });
        expect(mockHandleToggleFullscreen).toHaveBeenCalled();
    });

    it("should handle Escape (Collapse Analysis Panel)", () => {
        // If not fullscreen but analysis is expanded
        getHook({ isFullscreen: false, analysisExpandState: "expanded" });
        fireEvent.keyDown(window, { key: "Escape" });
        expect(mockSetAnalysisExpandState).toHaveBeenCalledWith("normal");
    });

    it("should ignore Escape if normal state", () => {
        getHook({ isFullscreen: false, analysisExpandState: "normal" });
        fireEvent.keyDown(window, { key: "Escape" });
        expect(mockHandleToggleFullscreen).not.toHaveBeenCalled();
        expect(mockSetAnalysisExpandState).not.toHaveBeenCalled();
    });
});
