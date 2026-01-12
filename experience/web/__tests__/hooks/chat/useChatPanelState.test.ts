import { renderHook, act } from "@testing-library/react";
import { useChatPanelState } from "../../../hooks/chat/useChatPanelState";

describe("useChatPanelState", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset body style
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    });

    it("should initialize default values", () => {
        const { result } = renderHook(() => useChatPanelState());
        expect(result.current.isExpanded).toBe(false);
        expect(result.current.height).toBe(70);
        expect(result.current.toneMode).toBe("warm");
    });

    it("should toggle expand", () => {
        const { result } = renderHook(() => useChatPanelState());

        act(() => {
            result.current.handleToggleExpand();
        });
        expect(result.current.isExpanded).toBe(true);
        expect(result.current.height).toBe(400);

        act(() => {
            result.current.handleToggleExpand();
        });
        expect(result.current.isExpanded).toBe(false);
        expect(result.current.height).toBe(60); // Collapsed logic in this hook sets 60
    });

    it("should toggle fullscreen", () => {
        const { result } = renderHook(() => useChatPanelState());

        act(() => {
            result.current.handleToggleFullscreen();
        });
        expect(result.current.isFullscreen).toBe(true);
        expect(result.current.height).toBe(window.innerHeight);

        act(() => {
            result.current.handleToggleFullscreen();
        });
        expect(result.current.isFullscreen).toBe(false);
        expect(result.current.height).toBe(70); // Restores captured previous height (which was 70)
    });

    it("should handle analyis panel expansion toggle", () => {
        const { result } = renderHook(() => useChatPanelState());
        act(() => {
            result.current.handleToggleAnalysisExpansion();
        });
        expect(result.current.analysisExpandState).toBe("expanded");

        act(() => {
            result.current.handleToggleAnalysisExpansion();
        });
        expect(result.current.analysisExpandState).toBe("fullscreen");

        act(() => {
            result.current.handleToggleAnalysisExpansion();
        });
        expect(result.current.analysisExpandState).toBe("normal");
    });

    it("should toggle tone mode", () => {
        const { result } = renderHook(() => useChatPanelState());

        act(() => {
            result.current.toggleToneMode(true);
        });
        expect(result.current.toneMode).toBe("clinical");

        act(() => {
            result.current.toggleToneMode(false);
        });
        expect(result.current.toneMode).toBe("warm");
    });

    it("should handle resize start", () => {
        const { result } = renderHook(() => useChatPanelState());

        // Must be expanded to resize
        act(() => {
            result.current.setIsExpanded(true);
        });

        act(() => {
            result.current.handleMouseDown({ clientY: 100 } as any);
        });

        expect(result.current.isResizing).toBe(true);
        expect(document.body.style.cursor).toBe("row-resize");
    });
});
