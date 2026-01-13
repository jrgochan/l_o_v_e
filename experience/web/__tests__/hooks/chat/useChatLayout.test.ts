import { renderHook, act } from "@testing-library/react";
import { useChatLayout } from "../../../hooks/chat/useChatLayout";

// Mock sub-hooks
const mockSetHeight = jest.fn();
const mockHandleMouseDown = jest.fn();
const mockHandleToggleExpand = jest.fn();
const mockHandleToggleFullscreen = jest.fn();
const mockHandleToggleExpansion = jest.fn();

jest.mock("../../../hooks/chat/layout/useChatResize", () => ({
  useChatResize: ({ isExpanded }: any) => ({
    // If isExpanded is true, we simulate height=400 (expanded).
    // If false, height=70 (collapsed).
    // The test logic relies on this to verify setPreviousHeight behavior.
    height: isExpanded ? 400 : 70,
    setHeight: mockSetHeight,
    isResizing: false,
    handleMouseDown: mockHandleMouseDown,
  }),
}));

jest.mock("../../../hooks/chat/layout/useChatShortcuts", () => ({
  useChatShortcuts: () => { }, // No-op, just verify integration
}));

describe("useChatLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useChatLayout());

    expect(result.current.isExpanded).toBe(false);
    expect(result.current.isFullscreen).toBe(false);
    expect(result.current.analysisExpandState).toBe("normal");
  });

  it("should toggle expand", () => {
    const { result } = renderHook(() => useChatLayout());

    // Expand
    act(() => {
      result.current.handleToggleExpand();
    });
    expect(result.current.isExpanded).toBe(true);
    expect(mockSetHeight).toHaveBeenCalledWith(400);

    // Collapse
    act(() => {
      result.current.handleToggleExpand();
    });
    expect(result.current.isExpanded).toBe(false);
    expect(mockSetHeight).toHaveBeenCalledWith(70);
  });

  it("should toggle fullscreen", () => {
    const { result } = renderHook(() => useChatLayout());
    // Set initial height via mock or assumption?
    // The mock returns constant height, but logic uses internal state 'previousHeight'

    // Enter fullscreen
    act(() => {
      result.current.handleToggleFullscreen();
    });
    expect(result.current.isFullscreen).toBe(true);
    expect(mockSetHeight).toHaveBeenCalledWith(window.innerHeight);

    // Exit fullscreen
    act(() => {
      result.current.handleToggleFullscreen();
    });
    expect(result.current.isFullscreen).toBe(false);
    expect(mockSetHeight).toHaveBeenCalledWith(400); // Default previousHeight
  });

  it("should capture height when toggling fullscreen from expanded state", () => {
    const { result, rerender } = renderHook(() => useChatLayout());

    // Expand first
    act(() => {
      result.current.handleToggleExpand();
    });
    // Rerender to picking up new height from mock (which depends on isExpanded)
    rerender();

    // Now height should be 400 (mocked)
    // Toggle fullscreen
    act(() => {
      result.current.handleToggleFullscreen();
    });

    expect(result.current.isFullscreen).toBe(true);
    // Should have captured 400 as previous height?
    // We can't inspect state directly easily, but we can verify restore.

    act(() => {
      result.current.handleToggleFullscreen();
    });
    expect(mockSetHeight).toHaveBeenCalledWith(400); // Restores captured height
  });

  it("should toggle analysis expansion", () => {
    const { result } = renderHook(() => useChatLayout());

    act(() => {
      result.current.handleToggleExpansion();
    });
    expect(result.current.analysisExpandState).toBe("expanded");

    act(() => {
      result.current.handleToggleExpansion();
    });
    expect(result.current.analysisExpandState).toBe("fullscreen");

    act(() => {
      result.current.handleToggleExpansion();
    });
    expect(result.current.analysisExpandState).toBe("normal");
  });
});
