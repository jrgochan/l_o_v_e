import { renderHook, act } from "@testing-library/react";
import { useCommandPaletteData } from "@/hooks/command-palette/useCommandPaletteData";
import { logger } from "@/utils/logger";

jest.mock("@/utils/logger", () => ({
  logger: { warn: jest.fn() },
}));

const mockSetItem = jest.fn();
const mockGetItem = jest.fn();

Object.defineProperty(window, "localStorage", {
  value: {
    getItem: mockGetItem,
    setItem: mockSetItem,
  },
  writable: true,
});

describe("useCommandPaletteData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockReturnValue(null);
  });

  it("should initialize with empty arrays if no storage", () => {
    const { result } = renderHook(() => useCommandPaletteData());
    expect(result.current.recentEmotions).toEqual([]);
    expect(result.current.favoriteEmotions).toEqual([]);
  });

  it("should load from local storage", () => {
    mockGetItem.mockReturnValueOnce(JSON.stringify(["joy"]));
    mockGetItem.mockReturnValueOnce(JSON.stringify(["fear"]));

    const { result } = renderHook(() => useCommandPaletteData());
    expect(result.current.recentEmotions).toEqual(["joy"]);
    expect(result.current.favoriteEmotions).toEqual(["fear"]);
  });

  it("should add to recent", () => {
    const { result } = renderHook(() => useCommandPaletteData());

    act(() => {
      result.current.addToRecent("joy");
    });

    expect(result.current.recentEmotions).toContain("joy");
    expect(mockSetItem).toHaveBeenCalledWith("love-recent-emotions", expect.any(String));
  });

  it("should limit recent emotions", () => {
    const { result } = renderHook(() => useCommandPaletteData());

    act(() => {
      for (let i = 0; i < 15; i++) {
        result.current.addToRecent(`emotion-${i}`);
      }
    });

    expect(result.current.recentEmotions).toHaveLength(10);
    // Should contain latest
    expect(result.current.recentEmotions[0]).toBe("emotion-14");
  });

  it("should toggle favorites", () => {
    const { result } = renderHook(() => useCommandPaletteData());

    act(() => {
      result.current.toggleFavorite("joy"); // Add
    });
    expect(result.current.isFavorite("joy")).toBe(true);

    act(() => {
      result.current.toggleFavorite("joy"); // Remove
    });
    expect(result.current.isFavorite("joy")).toBe(false);
  });

  it("should handle corrupt local storage for recent emotions", () => {
    // Mock getItem to return invalid JSON
    mockGetItem.mockImplementation((key) => {
      if (key.includes("recent")) return "{invalid json}";
      return null;
    });
    const loggerWarnSpy = jest.spyOn(logger, "warn").mockImplementation();

    const { result } = renderHook(() => useCommandPaletteData());
    expect(result.current.recentEmotions).toEqual([]);
    expect(loggerWarnSpy).toHaveBeenCalled();

    loggerWarnSpy.mockRestore();
  });

  it("should handle corrupt local storage for favorite emotions", () => {
    mockGetItem.mockImplementation((key) => {
      if (key.includes("favorite")) return "{invalid json}";
      return null;
    });
    const loggerWarnSpy = jest.spyOn(logger, "warn").mockImplementation();

    const { result } = renderHook(() => useCommandPaletteData());
    expect(result.current.favoriteEmotions).toEqual([]);
    expect(loggerWarnSpy).toHaveBeenCalled();

    loggerWarnSpy.mockRestore();
  });

  it("should correctly identify recent and favorite emotions", () => {
    const { result } = renderHook(() => useCommandPaletteData());

    act(() => {
      result.current.addToRecent("joy");
      result.current.toggleFavorite("sadness");
    });

    expect(result.current.isRecent("joy")).toBe(true);
    expect(result.current.isRecent("unknown")).toBe(false);
    expect(result.current.isFavorite("sadness")).toBe(true);
    expect(result.current.isFavorite("unknown")).toBe(false);
  });
});
