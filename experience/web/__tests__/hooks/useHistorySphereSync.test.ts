import { renderHook } from "@testing-library/react";
import { useHistorySphereSync } from "@/hooks/useHistorySphereSync";
import { useEmotionHistoryStore } from "@/stores/useEmotionHistoryStore";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

jest.mock("@/stores/useEmotionHistoryStore");
jest.mock("@/stores/useAtlasAdminStore");

describe("useHistorySphereSync", () => {
  const mockSelectEmotion = jest.fn();
  const mockDeselectEmotion = jest.fn();
  const mockSetVisibility = jest.fn();

  // Stable References
  const joyId = "e1";
  const joyHistoryId = "h1";
  const joyName = "Joy";
  const joyEmotion = { id: joyId, name: joyName };

  let currentAtlasState: any;
  let currentHistoryState: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default State: Consistent (Hidden in both)
    currentAtlasState = {
      allEmotions: [joyEmotion],
      selectedEmotionIds: new Set(),
      selectEmotion: mockSelectEmotion,
      deselectEmotion: mockDeselectEmotion,
    };

    currentHistoryState = {
      entries: [{ id: joyHistoryId, emotion: joyName, isVisibleInSphere: false }],
      setVisibility: mockSetVisibility,
    };

    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector(currentAtlasState);
    });

    (useEmotionHistoryStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector(currentHistoryState);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should sync visible history entry to sphere selection", () => {
    // Init with default (Hidden/Hidden)
    const { rerender } = renderHook(() => useHistorySphereSync());

    // Update: User toggles Joy VISIBLE in history (History change)
    // Keep Atlas State ref same (implied no change)
    currentHistoryState = {
      ...currentHistoryState,
      entries: [{ id: joyHistoryId, emotion: joyName, isVisibleInSphere: true }],
    };

    // Force rerender
    rerender();

    expect(mockSelectEmotion).toHaveBeenCalledWith(joyId);
  });

  it("should sync sphere selection back to history visibility (enable)", () => {
    // Init with default (Hidden/Hidden)
    const { rerender } = renderHook(() => useHistorySphereSync());

    // Update: User Selects Joy in Sphere (Sphere change)
    // Keep History State ref same (implied no change)
    currentAtlasState = {
      ...currentAtlasState,
      selectedEmotionIds: new Set([joyId]),
    };

    rerender();

    expect(mockSetVisibility).toHaveBeenCalledWith(joyHistoryId, true);
  });

  it("should sync sphere deselection back to history visibility (disable)", () => {
    // Start consistent (Selected/Visible)
    currentAtlasState = {
      ...currentAtlasState,
      selectedEmotionIds: new Set([joyId]),
    };
    currentHistoryState = {
      ...currentHistoryState,
      entries: [{ id: joyHistoryId, emotion: joyName, isVisibleInSphere: true }],
    };

    const { rerender } = renderHook(() => useHistorySphereSync());

    // Update: User Deselects Joy in Sphere
    currentAtlasState = {
      ...currentAtlasState,
      selectedEmotionIds: new Set(),
    };

    rerender();

    expect(mockSetVisibility).toHaveBeenCalledWith(joyHistoryId, false);
    expect(mockSetVisibility).toHaveBeenCalledWith(joyHistoryId, false);
  });

  it("should sync hidden history entry to sphere deselection", () => {
    // Start consistent (Selected/Visible)
    currentAtlasState = {
      ...currentAtlasState,
      selectedEmotionIds: new Set([joyId]),
    };
    currentHistoryState = {
      ...currentHistoryState,
      entries: [{ id: joyHistoryId, emotion: joyName, isVisibleInSphere: true }],
    };

    const { rerender } = renderHook(() => useHistorySphereSync());

    // Update: User toggles Joy HIDDEN in history
    currentHistoryState = {
      ...currentHistoryState,
      entries: [{ id: joyHistoryId, emotion: joyName, isVisibleInSphere: false }],
    };

    rerender();

    expect(mockDeselectEmotion).toHaveBeenCalledWith(joyId);
  });

  it("should NOT deselect sphere if another history entry keeps it visible", () => {
    // Start with 2 entries for Joy (Both Visible, or one Visible)
    // Actually, let's say one is visible, one is about to be hidden.
    const joyHistoryId2 = "h2";

    currentAtlasState = {
      ...currentAtlasState,
      selectedEmotionIds: new Set([joyId]),
    };
    currentHistoryState = {
      ...currentHistoryState,
      entries: [
        { id: joyHistoryId, emotion: joyName, isVisibleInSphere: true },
        { id: joyHistoryId2, emotion: joyName, isVisibleInSphere: true },
      ],
    };

    const { rerender } = renderHook(() => useHistorySphereSync());

    // Update: Hide the first one
    currentHistoryState = {
      ...currentHistoryState,
      entries: [
        { id: joyHistoryId, emotion: joyName, isVisibleInSphere: false },
        { id: joyHistoryId2, emotion: joyName, isVisibleInSphere: true },
      ],
    };

    rerender();

    // Should NOT call deselect because the second entry keeps it alive
    expect(mockDeselectEmotion).not.toHaveBeenCalled();
  });
});
