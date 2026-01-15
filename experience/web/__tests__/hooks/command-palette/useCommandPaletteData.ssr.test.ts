import { renderHook, act } from "@testing-library/react";
import { useCommandPaletteData } from "@/hooks/command-palette/useCommandPaletteData";
import { isSSR } from "@/utils/ssr";

// Mock the SSR helper
jest.mock("@/utils/ssr", () => ({
  isSSR: jest.fn(),
}));

// Mock logger to avoid noise
jest.mock("@/utils/logger", () => ({
  logger: { warn: jest.fn() },
}));

const mockSetItem = jest.fn();
// We don't need to overwrite window.localStorage because we are testing the SSR bypass path
// where localStorage is NOT accessed.

describe("useCommandPaletteData (SSR Simulation)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isSSR as jest.Mock).mockReturnValue(true);
  });

  it("should initialize with empty arrays when isSSR is true", () => {
    const { result } = renderHook(() => useCommandPaletteData());
    expect(result.current.recentEmotions).toEqual([]);
    expect(result.current.favoriteEmotions).toEqual([]);
    expect(isSSR).toHaveBeenCalled();
  });

  it("should update state but skip localStorage when isSSR is true", () => {
    const { result } = renderHook(() => useCommandPaletteData());

    // Spy on localStorage just in case (JSDOM has it)
    const setItemSpy = jest.spyOn(window.localStorage, "setItem");

    act(() => {
      result.current.addToRecent("joy");
    });

    // State should update (React still works)
    expect(result.current.recentEmotions).toEqual(["joy"]);
    // LocalStorage should NOT be called
    expect(setItemSpy).not.toHaveBeenCalled();

    act(() => {
      result.current.toggleFavorite("hope");
    });
    expect(result.current.favoriteEmotions).toEqual(["hope"]);
    expect(setItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
  });
});
