import { renderHook, act } from "@testing-library/react";
import { useCommandPaletteNavigation } from "@/hooks/command-palette/useCommandPaletteNavigation";

describe("useCommandPaletteNavigation", () => {
  const mockEmotions: any[] = [{ id: "1" }, { id: "2" }, { id: "3" }];

  it("should initialize selection at 0", () => {
    const { result } = renderHook(() =>
      useCommandPaletteNavigation({
        filteredEmotions: mockEmotions,
        isOpen: true,
        search: "",
      })
    );
    expect(result.current.selectedIndex).toBe(0);
  });

  it("should reset selection on search change", () => {
    const { result, rerender } = renderHook((props) => useCommandPaletteNavigation(props), {
      initialProps: {
        filteredEmotions: mockEmotions,
        isOpen: true,
        search: "a",
      },
    });

    act(() => {
      result.current.setSelectedIndex(2);
    });

    rerender({
      filteredEmotions: mockEmotions,
      isOpen: true,
      search: "b",
    });

    expect(result.current.selectedIndex).toBe(0);
  });

  it("should handle arrow down", () => {
    const { result } = renderHook(() =>
      useCommandPaletteNavigation({ filteredEmotions: mockEmotions, isOpen: true, search: "" })
    );

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      result.current.handleKeyDown(event);
    });

    expect(result.current.selectedIndex).toBe(1);
  });

  it("should handle arrow up (wrapping)", () => {
    const { result } = renderHook(() =>
      useCommandPaletteNavigation({ filteredEmotions: mockEmotions, isOpen: true, search: "" })
    );

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
      result.current.handleKeyDown(event);
    });

    expect(result.current.selectedIndex).toBe(2); // Wrap to last
  });

  it("should ignore keydown when not open", () => {
    const { result } = renderHook(() =>
      useCommandPaletteNavigation({ filteredEmotions: mockEmotions, isOpen: false, search: "" })
    );

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      result.current.handleKeyDown(event);
    });

    // Should stay at 0
    expect(result.current.selectedIndex).toBe(0);
  });
});
