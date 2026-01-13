import { renderHook, act } from "@testing-library/react";
import { useLayerShortcuts } from "../../../hooks/shortcuts/useLayerShortcuts";

// Mock dependencies
const mockGetActions = jest.fn();
const mockShouldExecuteShortcut = jest.fn();

jest.mock("../../../hooks/shortcuts/useLayerActionMap", () => ({
  useLayerActionMap: () => ({
    getActions: mockGetActions,
  }),
}));

jest.mock("../../../hooks/shortcuts/useShortcutUtils", () => ({
  useShortcutGuards: () => ({
    shouldExecuteShortcut: mockShouldExecuteShortcut,
  }),
}));

describe("useLayerShortcuts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShouldExecuteShortcut.mockReturnValue(true);
  });

  it("should execute action on key press", () => {
    const mockAction = jest.fn();
    mockGetActions.mockReturnValue({ a: mockAction });

    renderHook(() => useLayerShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "a" });
      window.dispatchEvent(event);
    });

    expect(mockShouldExecuteShortcut).toHaveBeenCalled();
    expect(mockGetActions).toHaveBeenCalled();
    expect(mockAction).toHaveBeenCalled();
  });

  it("should not execute if guarded", () => {
    mockShouldExecuteShortcut.mockReturnValue(false);
    const mockAction = jest.fn();
    mockGetActions.mockReturnValue({ a: mockAction });

    renderHook(() => useLayerShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "a" });
      window.dispatchEvent(event);
    });

    expect(mockAction).not.toHaveBeenCalled();
  });

  it("should ignore modifiers", () => {
    const mockAction = jest.fn();
    mockGetActions.mockReturnValue({ a: mockAction });

    renderHook(() => useLayerShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "a", ctrlKey: true });
      window.dispatchEvent(event);
    });

    expect(mockAction).not.toHaveBeenCalled();
  });

  it("should ignore keys without actions", () => {
    mockGetActions.mockReturnValue({}); // empty actions

    renderHook(() => useLayerShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "z" });
      window.dispatchEvent(event);
    });

    // Should verify nothing broke and no calls made
  });
});
