import { renderHook } from "@testing-library/react";
import { useShortcutGuards } from "@/hooks/shortcuts/useShortcutUtils";

describe("useShortcutUtils", () => {
  it("should allow shortcut normally", () => {
    const { result } = renderHook(() => useShortcutGuards());
    const e = { target: document.body } as unknown as KeyboardEvent;
    expect(result.current.shouldExecuteShortcut(e)).toBe(true);
  });

  it("should block if command palette is open", () => {
    window.__commandPaletteOpen = true;
    const { result } = renderHook(() => useShortcutGuards());
    const e = { target: document.body } as unknown as KeyboardEvent;
    expect(result.current.shouldExecuteShortcut(e)).toBe(false);
    delete window.__commandPaletteOpen;
  });

  it("should block if typing in input", () => {
    const { result } = renderHook(() => useShortcutGuards());
    const input = document.createElement("input");
    const e = { target: input } as unknown as KeyboardEvent;
    expect(result.current.shouldExecuteShortcut(e)).toBe(false);
  });
});
