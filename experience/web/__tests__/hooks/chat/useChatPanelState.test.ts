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

  // --- Resize Tests ---
  it("should handle resize interaction", () => {
    const { result } = renderHook(() => useChatPanelState());

    // Expand first
    act(() => {
      result.current.handleToggleExpand();
    });
    expect(result.current.isExpanded).toBe(true);

    const initialHeight = result.current.height;

    // Simulate MouseDown
    act(() => {
      const event = { clientY: 500, preventDefault: jest.fn() };
      result.current.handleMouseDown(event as any);
    });

    expect(result.current.isResizing).toBe(true);

    // Simulate MouseMove (drag up by 50px -> dy = 500 - 450 = 50)
    // New height = initial + 50
    act(() => {
      const moveEvent = new MouseEvent("mousemove", { clientY: 450, bubbles: true });
      document.dispatchEvent(moveEvent);
    });

    // Height should increase
    expect(result.current.height).toBeGreaterThan(initialHeight);

    // Simulate MouseUp
    act(() => {
      const upEvent = new MouseEvent("mouseup", { bubbles: true });
      document.dispatchEvent(upEvent);
    });

    expect(result.current.isResizing).toBe(false);
  });

  // --- Keyboard Tests ---
  it("should handle keyboard shortcuts", () => {
    const { result } = renderHook(() => useChatPanelState());

    // Ctrl+Shift+A -> Analysis toggle
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "a", ctrlKey: true, shiftKey: true });
      window.dispatchEvent(event);
    });
    expect(result.current.analysisExpandState).toBe("expanded");

    // Toggle again -> fullscreen
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "a", ctrlKey: true, shiftKey: true });
      window.dispatchEvent(event);
    });
    expect(result.current.analysisExpandState).toBe("fullscreen");

    // Escape -> Exit fullscreen analysis
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "Escape" });
      window.dispatchEvent(event);
    });
    expect(result.current.analysisExpandState).toBe("normal");

    // Ctrl+Shift+F from collapsed -> Expand first
    act(() => {
      // Collapse
      result.current.setIsExpanded(false);
    });

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "f", ctrlKey: true, shiftKey: true });
      window.dispatchEvent(event);
    });
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.height).toBe(400);

    // Ctrl+Shift+F from expanded -> Fullscreen toggle
    // First, expand (already expanded)

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "f", ctrlKey: true, shiftKey: true });
      window.dispatchEvent(event);
    });
    expect(result.current.isFullscreen).toBe(true);

    // Escape -> Exit fullscreen
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "Escape" });
      window.dispatchEvent(event);
    });
    expect(result.current.isFullscreen).toBe(false);

    // Escape when normal -> No-op
    // Ensure we are in normal state
    act(() => {
      result.current.setAnalysisExpandState("normal");
    });

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "Escape" });
      window.dispatchEvent(event);
    });
    expect(result.current.analysisExpandState).toBe("normal");
  });

  it("should ignore resize when collapsed", () => {
    const { result } = renderHook(() => useChatPanelState());
    // Ensure collapsed
    expect(result.current.isExpanded).toBe(false);

    act(() => {
      const event = { clientY: 100, preventDefault: jest.fn() };
      result.current.handleMouseDown(event as any);
    });

    expect(result.current.isResizing).toBe(false);
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
