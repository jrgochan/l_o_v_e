import { renderHook, act } from "@testing-library/react";
import { useSiteActionMap } from "@/hooks/shortcuts/useSiteActionMap";
import { useRouter } from "next/navigation";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { logger } from "@/utils/logger";
import { useShortcutGuards } from "@/hooks/shortcuts/useShortcutUtils";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/stores/useExperienceStore");
jest.mock("@/utils/logger");

jest.mock("@/hooks/shortcuts/useShortcutUtils", () => ({
  useShortcutGuards: jest.fn(),
}));

describe("useSiteActionMap", () => {
  const mockRouter = { push: jest.fn() };
  const mockStore = {
    clearSelection: jest.fn(),
    allEmotions: [{ id: "1", name: "Awe" }],
    selectMultiple: jest.fn(),
    cycleViewMode: jest.fn(),
    viewMode: "3D",
    setIsFlying: jest.fn(),
    isFlying: false,
    selectedPathId: null as string | null,
  };
  const mockExpStore = {
    setIsFlying: jest.fn(),
    isFlying: false,
    transitionPath: null as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockStore)
    );
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockExpStore)
    );
    (useShortcutGuards as jest.Mock).mockReturnValue({
      shouldExecuteShortcut: () => true
    });
  });

  it("should handle escape for clear selection", () => {
    const { result } = renderHook(() => useSiteActionMap());
    const actions = result.current.getActions({} as KeyboardEvent);

    actions.escape();
    expect(mockStore.clearSelection).toHaveBeenCalled();
  });

  it("should handle 'b' for bridge selection", () => {
    const { result } = renderHook(() => useSiteActionMap());
    const actions = result.current.getActions({} as KeyboardEvent);

    actions.b();
    expect(mockStore.selectMultiple).toHaveBeenCalledWith(["1"]);
  });

  it("should handle 'z' for view mode cycle", () => {
    const { result } = renderHook(() => useSiteActionMap());
    const actions = result.current.getActions({} as KeyboardEvent);

    actions.z();
    expect(mockStore.cycleViewMode).toHaveBeenCalled();
  });

  it("should handle ',' for settings", () => {
    const { result } = renderHook(() => useSiteActionMap());

    // Mock event with preventDefault
    const mockEvent = {
      ctrlKey: true,
      preventDefault: jest.fn(),
      target: document.body,
    } as unknown as KeyboardEvent;

    const actions = result.current.getActions(mockEvent);

    actions[","]();

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/admin/settings");
  });

  it("should handle 't' for toggle flying (Admin) with double toggle", () => {
    // 1. Setup Admin Mode (selectedPathId, no transition)
    mockStore.selectedPathId = "path-1";
    mockExpStore.transitionPath = null;
    mockStore.isFlying = false;

    const { result, rerender } = renderHook(() => useSiteActionMap());
    let actions = result.current.getActions({} as KeyboardEvent);

    // Toggle ON
    actions.t();
    expect(mockStore.setIsFlying).toHaveBeenCalledWith(true);
    expect(logger.info).toHaveBeenCalledWith("user-interaction", expect.stringContaining("ON"));

    // 2. Setup Admin Mode (isFlying = true)
    mockStore.isFlying = true;
    (logger.info as jest.Mock).mockClear();

    // Rerender to picking up new store state
    rerender();
    actions = result.current.getActions({} as KeyboardEvent);

    // Toggle OFF
    actions.t();
    expect(mockStore.setIsFlying).toHaveBeenCalledWith(false);
    expect(logger.info).toHaveBeenCalledWith("user-interaction", expect.stringContaining("OFF"));
  });

  it("should handle 't' for toggle flying (Therapeutic) with double toggle", () => {
    // 1. Setup Therapeutic Mode (transitionPath present)
    mockStore.selectedPathId = null; // or "path-1", transition takes precedence
    mockExpStore.transitionPath = { id: "p1" };
    mockExpStore.isFlying = false;

    const { result, rerender } = renderHook(() => useSiteActionMap());
    let actions = result.current.getActions({} as KeyboardEvent);

    // Toggle ON
    actions.t();
    expect(mockExpStore.setIsFlying).toHaveBeenCalledWith(true);
    expect(logger.info).toHaveBeenCalledWith("user-interaction", expect.stringContaining("ON"));

    // 2. Setup Therapeutic Mode (isFlying = true)
    mockExpStore.isFlying = true;
    (logger.info as jest.Mock).mockClear();

    rerender();
    actions = result.current.getActions({} as KeyboardEvent);

    // Toggle OFF
    actions.t();
    expect(mockExpStore.setIsFlying).toHaveBeenCalledWith(false);
    expect(logger.info).toHaveBeenCalledWith("user-interaction", expect.stringContaining("OFF"));
  });

  it("should handle 'm' for toggle audio", () => {
    const toggleAudio = jest.fn();
    (window as any).toggleAudio = toggleAudio;

    const { result } = renderHook(() => useSiteActionMap());
    const actions = result.current.getActions({} as KeyboardEvent);

    actions.m();
    expect(toggleAudio).toHaveBeenCalled();
    delete (window as any).toggleAudio;
  });

  it("should handle 'i' for toggle zen indicator", () => {
    const toggleZen = jest.fn();
    (window as any).toggleZenIndicator = toggleZen;

    const { result } = renderHook(() => useSiteActionMap());
    const actions = result.current.getActions({} as KeyboardEvent);

    actions.i();
    expect(toggleZen).toHaveBeenCalled();
    delete (window as any).toggleZenIndicator;
  });

  it("should handle '?' and 'h' for help", () => {
    const toggleHelp = jest.fn();
    (window as any).toggleHelp = toggleHelp;

    const { result } = renderHook(() => useSiteActionMap());
    const actions = result.current.getActions({} as KeyboardEvent);

    actions["?"]();
    expect(toggleHelp).toHaveBeenCalledTimes(1);

    actions["h"]();
    expect(toggleHelp).toHaveBeenCalledTimes(2);

    delete (window as any).toggleHelp;
  });

  it("should log help message if toggleHelp is missing", () => {
    const { result } = renderHook(() => useSiteActionMap());
    const actions = result.current.getActions({} as KeyboardEvent);
    actions["?"]();
    expect(logger.info).toHaveBeenCalledWith(
      "user-interaction",
      expect.stringContaining("Check Help Menu")
    );
  });

  it("should ignore shortcuts if guard returns false", () => {
    (useShortcutGuards as jest.Mock).mockReturnValue({
      shouldExecuteShortcut: () => false
    });

    const { result } = renderHook(() => useSiteActionMap());
    const actions = result.current.getActions({} as KeyboardEvent);

    actions.escape();
    expect(mockStore.clearSelection).not.toHaveBeenCalled();

    actions.b();
    expect(mockStore.selectMultiple).not.toHaveBeenCalled();

    // Reset guard
    (useShortcutGuards as jest.Mock).mockReturnValue({
      shouldExecuteShortcut: () => true
    });
  });

  it("should ignore 't' if no path selected", () => {
    mockStore.selectedPathId = null;
    mockExpStore.transitionPath = null;
    const { result } = renderHook(() => useSiteActionMap());
    const actions = result.current.getActions({} as KeyboardEvent);

    actions.t();
    expect(mockStore.setIsFlying).not.toHaveBeenCalled();
    expect(mockExpStore.setIsFlying).not.toHaveBeenCalled();
  });

  it("should ignore non-modifier actions if modifier keys are pressed", () => {
    const { result } = renderHook(() => useSiteActionMap());

    // Actions that should NOT run with Ctrl/Meta: b, t, m, i, ?
    const nonModActions = ["b", "t", "m", "i", "?"];

    // Test Ctrl
    const ctrlEvent = { ctrlKey: true } as KeyboardEvent;
    const actionsCtrl = result.current.getActions(ctrlEvent);

    nonModActions.forEach(key => {
      // Mock window functions to avoid errors if they are called (they shouldn't be)
      (window as any).toggleAudio = jest.fn();
      (window as any).toggleZenIndicator = jest.fn();
      (window as any).toggleHelp = jest.fn();

      actionsCtrl[key]();

      expect(mockStore.selectMultiple).not.toHaveBeenCalled();
      expect(mockStore.setIsFlying).not.toHaveBeenCalled();
      expect((window as any).toggleAudio).not.toHaveBeenCalled();
      expect((window as any).toggleZenIndicator).not.toHaveBeenCalled();
      expect((window as any).toggleHelp).not.toHaveBeenCalled();
    });

    // Test Meta
    const metaEvent = { metaKey: true } as KeyboardEvent;
    const actionsMeta = result.current.getActions(metaEvent);

    nonModActions.forEach(key => {
      actionsMeta[key]();
    });

    expect(mockStore.selectMultiple).not.toHaveBeenCalled();
    expect(mockStore.setIsFlying).not.toHaveBeenCalled();
  });

  it("should ignore modifier actions if modifier keys are missing", () => {
    const { result } = renderHook(() => useSiteActionMap());

    // Actions that REQUIRE Ctrl/Meta: ,
    const modActions = [","];

    const noModEvent = { ctrlKey: false, metaKey: false } as KeyboardEvent;
    const actions = result.current.getActions(noModEvent);

    actions[","]();

    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("should safely handle missing window functions for m and i", () => {
    const { result } = renderHook(() => useSiteActionMap());
    const actions = result.current.getActions({} as KeyboardEvent);

    // Ensure window functions are undefined
    delete (window as any).toggleAudio;
    delete (window as any).toggleZenIndicator;

    // Call actions - should not crash and not log "Toggled"
    actions.m();
    expect(logger.info).not.toHaveBeenCalledWith("user-interaction", "Toggled Audio");

    actions.i();
    expect(logger.info).not.toHaveBeenCalledWith("user-interaction", "Toggled Zen session indicator");
  });
});
