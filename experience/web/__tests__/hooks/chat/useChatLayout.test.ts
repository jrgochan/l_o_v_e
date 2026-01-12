import { renderHook, act } from "@testing-library/react";
import { useChatLayout } from "../../../hooks/chat/useChatLayout";

// Mock sub-hooks
const mockSetHeight = jest.fn();
const mockHandleMouseDown = jest.fn();
const mockHandleToggleExpand = jest.fn();
const mockHandleToggleFullscreen = jest.fn();
const mockHandleToggleExpansion = jest.fn();

jest.mock("../../../hooks/chat/layout/useChatResize", () => ({
  useChatResize: ({ defaultHeight }: any) => ({
    height: defaultHeight === 70 ? 70 : 400,
    setHeight: mockSetHeight,
    isResizing: false,
    handleMouseDown: mockHandleMouseDown,
  }),
}));

jest.mock("../../../hooks/chat/layout/useChatShortcuts", () => ({
  useChatShortcuts: () => {}, // No-op, just verify integration
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
