import { renderHook, act } from "@testing-library/react";
import { useCommandPaletteState } from "@/hooks/command-palette/useCommandPaletteState";

jest.mock("@/utils/logger", () => ({
  logger: { info: jest.fn() },
}));

describe("useCommandPaletteState", () => {
  it("should initialize closed", () => {
    const { result } = renderHook(() => useCommandPaletteState());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.currentPage).toBe("home");
  });

  it("should open and close", () => {
    const { result } = renderHook(() => useCommandPaletteState());

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("should toggle", () => {
    const { result } = renderHook(() => useCommandPaletteState());

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("should set page and category", () => {
    const { result } = renderHook(() => useCommandPaletteState());

    act(() => {
      result.current.setPage("home");
      result.current.setCategory("Joy");
    });

    expect(result.current.currentPage).toBe("emotions");
    expect(result.current.selectedCategory).toBe("Joy");
  });

  it("should reset state on open", () => {
    const { result } = renderHook(() => useCommandPaletteState());

    act(() => {
      result.current.setPage("home");
      result.current.setSearch("test");
      result.current.open(); // Should reset
    });

    expect(result.current.currentPage).toBe("home");
    expect(result.current.search).toBe("");
    expect(result.current.selectedCategory).toBeNull();
  });
});
