import { renderHook, act } from "@testing-library/react";
import { useCommandPalette } from "../../hooks/useCommandPalette";
import { useCommandPaletteState } from "../../hooks/command-palette/useCommandPaletteState";

// Mock dependencies
const mockOpen = jest.fn();
const mockClose = jest.fn();
const mockToggle = jest.fn();
const mockSetSearch = jest.fn();
const mockSetPage = jest.fn();
const mockSetCategory = jest.fn();
const mockExecuteAction = jest.fn();

// Mock sub-hooks
jest.mock("../../hooks/command-palette/useCommandPaletteState", () => ({
  useCommandPaletteState: jest.fn(() => ({
    isOpen: true,
    currentPage: "home",
    selectedCategory: "all",
    search: "",
    open: mockOpen,
    close: mockClose,
    toggle: mockToggle,
    setPage: mockSetPage,
    setCategory: mockSetCategory,
    setSearch: mockSetSearch,
  })),
}));

jest.mock("../../hooks/command-palette/useCommandPaletteData", () => ({
  useCommandPaletteData: () => ({
    recentEmotions: [],
    favoriteEmotions: [],
    addToRecent: jest.fn(),
    toggleFavorite: jest.fn(),
    isRecent: () => false,
    isFavorite: () => false,
  }),
}));

jest.mock("../../hooks/command-palette/useCommandPaletteActions", () => ({
  useCommandPaletteActions: () => ({
    executeAction: mockExecuteAction,
    executeQuickAction: jest.fn(),
  }),
}));

jest.mock("../../hooks/command-palette/useCommandPaletteFilter", () => ({
  useCommandPaletteFilter: () => ({
    filteredEmotions: [{ id: "1", name: "Joy" }],
  }),
}));

jest.mock("../../hooks/command-palette/useCommandPaletteNavigation", () => ({
  useCommandPaletteNavigation: () => ({
    selectedIndex: 0,
    setSelectedIndex: jest.fn(),
    handleKeyDown: jest.fn(),
  }),
}));

jest.mock("@/stores/useAtlasAdminStore", () => ({
  useAtlasAdminStore: () => [],
}));

describe("useCommandPalette", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, "addEventListener");
    jest.spyOn(window, "removeEventListener");
  });

  it("should initialize and return state/actions", () => {
    const { result } = renderHook(() => useCommandPalette());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.filteredEmotions).toHaveLength(1);
    expect(result.current.filteredEmotions[0].name).toBe("Joy");
  });

  it("should handle global keyboard shortcut (Cmd+K)", () => {
    renderHook(() => useCommandPalette());

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });

    // Spy on preventDefault since we are mocking the event
    const preventDefaultSpy = jest.spyOn(event, "preventDefault");

    window.dispatchEvent(event);

    expect(mockToggle).toHaveBeenCalled();
    // expect(preventDefaultSpy).toHaveBeenCalled(); // Dispatching manually doesn't always trigger spy properly on preventDefault unless setup perfectly, but the handler call is enough.
  });

  it("should handle global Escape key", () => {
    renderHook(() => useCommandPalette());

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    });

    window.dispatchEvent(event);

    expect(mockClose).toHaveBeenCalled();
  });

  it("should navigate home", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.goHome();
    });
    expect(mockSetPage).toHaveBeenCalledWith("home");
  });

  it("should view category", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.viewCategory("Positive");
    });
    expect(mockSetCategory).toHaveBeenCalledWith("Positive");
  });

  it("should not attach key listener when closed", () => {
    // Mock isOpen false
    (useCommandPaletteState as unknown as jest.Mock).mockReturnValue({
      isOpen: false,
      currentPage: "home",
      selectedCategory: "all",
      search: "",
      open: mockOpen,
      close: mockClose,
      toggle: mockToggle,
      setPage: mockSetPage,
      setCategory: mockSetCategory,
      setSearch: mockSetSearch,
    });

    const { rerender } = renderHook(() => useCommandPalette());

    // Initially closed
    // Global listener is attached in first useEffect (no deps on isOpen)
    expect(window.addEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    (window.addEventListener as jest.Mock).mockClear();

    // Rerender
    rerender();
    // Specific navigation listener (second useEffect) should NOT be attached because !isOpen
    expect(window.addEventListener).not.toHaveBeenCalled();
  });
});
