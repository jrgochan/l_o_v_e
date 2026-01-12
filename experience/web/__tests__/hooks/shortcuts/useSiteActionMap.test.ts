import { renderHook, act } from "@testing-library/react";
import { useSiteActionMap } from "@/hooks/shortcuts/useSiteActionMap";
import { useRouter } from "next/navigation";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { logger } from "@/utils/logger";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/stores/useExperienceStore");
jest.mock("@/utils/logger");

jest.mock("@/hooks/shortcuts/useShortcutUtils", () => ({
  useShortcutGuards: () => ({ shouldExecuteShortcut: () => true }),
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
    transitionPath: null,
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

  it("should handle 't' for toggle flying (Admin)", () => {
    // Setup state where selectedPathId is present
    mockStore.selectedPathId = "path-1";
    const { result } = renderHook(() => useSiteActionMap());
    const actions = result.current.getActions({} as KeyboardEvent);

    actions.t();
    expect(mockStore.setIsFlying).toHaveBeenCalledWith(true);
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
});
