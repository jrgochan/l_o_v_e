import { renderHook, act } from "@testing-library/react";
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
      const event = new KeyboardEvent("keydown", { key: "s" });
      window.dispatchEvent(event);
    });

    expect(mockGetActions).toHaveBeenCalled();
    expect(mockAction).toHaveBeenCalled();
  });

  it("should open command palette on Cmd+K", () => {
    const mockOpenCommandPalette = jest.fn();
    Object.defineProperty(window, "openCommandPalette", {
      value: mockOpenCommandPalette,
      writable: true,
    });

    renderHook(() => useSiteShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
      window.dispatchEvent(event);
    });

    expect(mockOpenCommandPalette).toHaveBeenCalled();
  });

  it("should safely handle missing command palette function", () => {
    // Ensure undefined
    // @ts-ignore
    delete window.openCommandPalette;

    renderHook(() => useSiteShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
      jest.spyOn(event, "preventDefault");
      window.dispatchEvent(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    // Should not crash
  });

  it("should ignore keys with no actions", () => {
    mockGetActions.mockReturnValue({}); // No actions

    renderHook(() => useSiteShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "z" });
      window.dispatchEvent(event);
    });

    // Should assume no action called (implicit check)
  });

  it("should treat 'k' as normal key if no modifier", () => {
    // If 'k' is pressed without modifier, it should fallback to action map
    const mockKAction = jest.fn();
    mockGetActions.mockReturnValue({ k: mockKAction });

    renderHook(() => useSiteShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: false, metaKey: false });
      window.dispatchEvent(event);
    });

    expect(mockKAction).toHaveBeenCalled();
  });
});
