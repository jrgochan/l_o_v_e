import { renderHook, act, fireEvent } from "@testing-library/react";
import { useSiteShortcuts } from "../../../hooks/shortcuts/useSiteShortcuts";

// Mock dependencies
const mockGetActions = jest.fn();

jest.mock("../../../hooks/shortcuts/useSiteActionMap", () => ({
  useSiteActionMap: () => ({
    getActions: mockGetActions,
  }),
}));

describe("useSiteShortcuts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should execute action on key press", () => {
    const mockAction = jest.fn();
    mockGetActions.mockReturnValue({ s: mockAction });

    renderHook(() => useSiteShortcuts());

    act(() => {
      fireEvent.keyDown(window, { key: "s" });
    });

    expect(mockGetActions).toHaveBeenCalled();
    expect(mockAction).toHaveBeenCalled();
  });

  it("should open command palette on Cmd+K (Meta)", () => {
    const mockOpenCommandPalette = jest.fn();
    Object.defineProperty(window, "openCommandPalette", {
      value: mockOpenCommandPalette,
      writable: true,
      configurable: true, // Allow deletion
    });

    renderHook(() => useSiteShortcuts());

    act(() => {
      fireEvent.keyDown(window, { key: "k", metaKey: true });
    });

    expect(mockOpenCommandPalette).toHaveBeenCalled();
  });

  it("should open command palette on Ctrl+K", () => {
    const mockOpenCommandPalette = jest.fn();
    Object.defineProperty(window, "openCommandPalette", {
      value: mockOpenCommandPalette,
      writable: true,
      configurable: true,
    });

    renderHook(() => useSiteShortcuts());

    act(() => {
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    });

    expect(mockOpenCommandPalette).toHaveBeenCalled();
  });

  it("should safely handle missing command palette function", () => {
    // Ensure undefined
    // @ts-ignore
    delete window.openCommandPalette;

    renderHook(() => useSiteShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true, cancelable: true });
      jest.spyOn(event, "preventDefault");
      window.dispatchEvent(event);
      // We check if preventDefault was called, implying it entered the block
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  it("should ignore keys with no actions", () => {
    mockGetActions.mockReturnValue({}); // No actions

    renderHook(() => useSiteShortcuts());

    act(() => {
      fireEvent.keyDown(window, { key: "z" });
    });

    // Should assume no action called (implicit check via mockGetActions call but no execution)
    expect(mockGetActions).toHaveBeenCalled();
  });

  it("should treat 'k' as normal key if no modifier", () => {
    // If 'k' is pressed without modifier, it should fallback to action map
    const mockKAction = jest.fn();
    mockGetActions.mockReturnValue({ k: mockKAction });

    renderHook(() => useSiteShortcuts());

    act(() => {
      fireEvent.keyDown(window, { key: "k", ctrlKey: false, metaKey: false });
    });

    expect(mockKAction).toHaveBeenCalled();
  });
});
