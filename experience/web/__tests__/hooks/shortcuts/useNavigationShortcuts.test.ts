import { renderHook, act, fireEvent } from "@testing-library/react";
import { useNavigationShortcuts } from "../../../hooks/shortcuts/useNavigationShortcuts";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Mock store
const mockSetSelectedPath = jest.fn();
jest.mock("@/stores/useAtlasAdminStore", () => ({
  useAtlasAdminStore: jest.fn(),
}));

// Mock utils
const mockShouldExecuteShortcut = jest.fn();
jest.mock("../../../hooks/shortcuts/useShortcutUtils", () => ({
  useShortcutGuards: () => ({
    shouldExecuteShortcut: mockShouldExecuteShortcut,
  }),
}));

describe("useNavigationShortcuts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShouldExecuteShortcut.mockReturnValue(true);
    // Setup store mock behavior
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        computedPaths: new Map([
          [
            "path1",
            {
              id: "path1",
              from: { id: "e1", name: "E1" },
              to: { id: "e2", name: "E2" },
              difficulty: 1,
            },
          ],
          [
            "path2",
            {
              id: "path2",
              from: { id: "e1", name: "E1" },
              to: { id: "e3", name: "E3" },
              difficulty: 2,
            },
          ],
        ]),
        selectedPathId: null,
        selectedEmotionIds: new Set(["e1", "e2", "e3"]),
        setSelectedPath: mockSetSelectedPath,
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
        [
          "path1",
          {
            id: "path1",
            from: { id: "e1", name: "E1" },
            to: { id: "e2", name: "E2" },
            difficulty: 1,
          },
        ],
        [
          "path2",
          {
            id: "path2",
            from: { id: "e1", name: "E1" },
            to: { id: "e3", name: "E3" },
            difficulty: 2,
          },
        ],
      ]),
      selectedPathId: null as string | null,
      selectedEmotionIds: new Set(["e1", "e2", "e3"]),
      setSelectedPath: mockSetSelectedPath,
    };

    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector(currentState);
    });

    const { rerender } = renderHook(() => useNavigationShortcuts());

    // Arrow Down (Next) -> Should select path1 (index 0)
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      jest.spyOn(event, "preventDefault");
      window.dispatchEvent(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    expect(mockSetSelectedPath).toHaveBeenLastCalledWith("path1");

    // Update mock state to reflect selection
    currentState = {
      ...currentState,
      selectedPathId: "path1",
    };

    rerender(); // Force hook to read new state

    // Arrow Down (Next) from path1 -> Should select path2 (index 1)
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      window.dispatchEvent(event);
    });
    expect(mockSetSelectedPath).toHaveBeenLastCalledWith("path2");
  });

  it("should not navigate if paths are empty", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        computedPaths: new Map(),
        selectedPathId: null,
        selectedEmotionIds: new Set(["e1", "e2"]),
        setSelectedPath: mockSetSelectedPath,
      });
    });

    renderHook(() => useNavigationShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      window.dispatchEvent(event);
    });

    expect(mockSetSelectedPath).not.toHaveBeenCalled();
  });

  it("should not navigate if selection is insufficient", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        computedPaths: new Map([["p1", { id: "p1", from: { id: "e1" }, to: { id: "e2" } }]]),
        selectedPathId: null,
        selectedEmotionIds: new Set(["e1"]), // Only 1 selected
        setSelectedPath: mockSetSelectedPath,
      });
    });

    renderHook(() => useNavigationShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      window.dispatchEvent(event);
    });

    expect(mockSetSelectedPath).not.toHaveBeenCalled();
  });

  it("should not jump if invalid number key", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        computedPaths: new Map([["p1", { id: "p1", from: { id: "e1" }, to: { id: "e2" } }]]),
        selectedPathId: null,
        selectedEmotionIds: new Set(["e1", "e2"]),
        setSelectedPath: mockSetSelectedPath,
      });
    });

    renderHook(() => useNavigationShortcuts());

    act(() => {
      // "9" is out of bounds for size 1
      const event = new KeyboardEvent("keydown", { key: "9" });
      window.dispatchEvent(event);
    });

    expect(mockSetSelectedPath).not.toHaveBeenCalled();
  });

  it("should navigate via ArrowUp (Previous)", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        computedPaths: new Map([
          ["p1", { id: "p1", from: { id: "e1" }, to: { id: "e2" } }],
          ["p2", { id: "p2", from: { id: "e1" }, to: { id: "e3" } }],
        ]),
        selectedPathId: "p2",
        selectedEmotionIds: new Set(["e1", "e2", "e3"]),
        setSelectedPath: mockSetSelectedPath,
      });
    });

    renderHook(() => useNavigationShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
      jest.spyOn(event, "preventDefault");
      window.dispatchEvent(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    expect(mockSetSelectedPath).toHaveBeenCalledWith("p1");
  });

  it("should ignore shortcuts if guard fails", () => {
    mockShouldExecuteShortcut.mockReturnValue(false);

    // Setup valid state so it WOULD navigate if not guarded
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        computedPaths: new Map([["p1", { id: "p1", from: { id: "e1" }, to: { id: "e2" } }]]),
        selectedPathId: null,
        selectedEmotionIds: new Set(["e1", "e2"]),
        setSelectedPath: mockSetSelectedPath,
      });
    });

    renderHook(() => useNavigationShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      window.dispatchEvent(event);
    });

    expect(mockSetSelectedPath).not.toHaveBeenCalled();
  });

  it("should navigate via ArrowUp and wrap around", () => {
    let currentState = {
      computedPaths: new Map([
        ["path1", { id: "path1", from: { id: "e1" }, to: { id: "e2" } }],
        ["path2", { id: "path2", from: { id: "e1" }, to: { id: "e3" } }],
        ["path3", { id: "path3", from: { id: "e1" }, to: { id: "e4" } }]
      ]),
      selectedPathId: "path1", // Start at first
      selectedEmotionIds: new Set(["e1", "e2", "e3", "e4"]),
      setSelectedPath: mockSetSelectedPath,
    };

    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector(currentState);
    });

    const { rerender } = renderHook(() => useNavigationShortcuts());

    // Arrow Up (Prev) from path1 (index 0) -> Should wrap to path3 (last)
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowUp" }); // lowercase check in hook
      window.dispatchEvent(event);
    });
    expect(mockSetSelectedPath).toHaveBeenLastCalledWith("path3");

    // Update state to path3
    currentState = { ...currentState, selectedPathId: "path3" };
    rerender();

    // Arrow Up (Prev) from path3 -> Should go to path2
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
      window.dispatchEvent(event);
    });
    expect(mockSetSelectedPath).toHaveBeenLastCalledWith("path2");

    // Update state to path3 (actually let's simulate wrap forward from last)
    currentState = { ...currentState, selectedPathId: "path3" };
    rerender();

    // Arrow Down (Next) from path3 (last) -> Should wrap to path1 (first)
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      window.dispatchEvent(event);
    });
    expect(mockSetSelectedPath).toHaveBeenLastCalledWith("path1");
  });

  it("should ignore invalid number indices", () => {
    renderHook(() => useNavigationShortcuts());
    act(() => {
      // Press '9' but we only have 2 paths in default setup
      const event = new KeyboardEvent("keydown", { key: "9" });
      window.dispatchEvent(event);
    });
    // Should not call setSelectedPath for invalid index
    expect(mockSetSelectedPath).not.toHaveBeenCalled();
  });

  it("should ignore shortcuts with modifier keys (Ctrl/Meta)", () => {
    renderHook(() => useNavigationShortcuts());

    // Ctrl + 1
    act(() => {
      fireEvent.keyDown(window, { key: "1", ctrlKey: true });
    });
    expect(mockSetSelectedPath).not.toHaveBeenCalled();

    // Meta + ArrowDown
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowDown", metaKey: true });
    });
    expect(mockSetSelectedPath).not.toHaveBeenCalled();
  });


});
