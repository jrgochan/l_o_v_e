import { renderHook, act } from "@testing-library/react";
import { useHistorySphereSync } from "@/hooks/useHistorySphereSync";
import { useEmotionHistoryStore } from "@/stores/useEmotionHistoryStore";
import { useVisualizationStore } from "@/stores/useVisualizationStore";

jest.mock("@/stores/useEmotionHistoryStore");
jest.mock("@/stores/useVisualizationStore");

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

    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) => {
      // Basic state shape for selector usage
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

    // Cover timeout callback
    act(() => {
      jest.advanceTimersByTime(200);
    });
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

    // Cover timeout callback
    act(() => {
      jest.advanceTimersByTime(200);
    });
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

  it("should handle unknown emotions in history gracefully", () => {
    // 1. Start with clean state
    const { rerender } = renderHook(() => useHistorySphereSync());

    // 2. Update History with "UnknownEmotion" (triggers entriesChanged)
    currentHistoryState = {
      ...currentHistoryState,
      entries: [{ id: "h99", emotion: "UnknownEmotion", isVisibleInSphere: true }],
    };

    // 3. Rerender to trigger effect
    rerender();

    // Should safely ignore and not throw/call select
    expect(mockSelectEmotion).not.toHaveBeenCalled();
  });

  it("should prevent circular updates (History change -> Sphere sync -> skip History update)", () => {
    // 1. Initial Render
    const { rerender } = renderHook(() => useHistorySphereSync());

    // 2. History change triggers Sphere selection (History -> Sphere)
    currentHistoryState = {
      ...currentHistoryState,
      entries: [{ id: joyHistoryId, emotion: joyName, isVisibleInSphere: true }],
    };

    // Rerender 1: Effect 1 runs, adds to ref, calls selectEmotion
    rerender();

    // 3. Selection updates in Atlas Store (simulated response to history sync)
    // AND we trigger the Sphere -> History sync check
    currentAtlasState = {
      ...currentAtlasState,
      selectedEmotionIds: new Set([joyId]),
    };

    // Rerender 2: Effect 2 runs, sees Ref has ID, skips setVisibility
    rerender();

    // Verify setVisibility was NOT called (circular loop prevented)
    expect(mockSetVisibility).not.toHaveBeenCalled();
  });

  it("should ignore unknown emotions during Sphere -> History sync", () => {
    // 1. Start with history containing unknown emotion
    // Note: We need this to be PRESENT when the Sphere->History effect runs.
    const ghostId = "h_ghost";
    const ghostName = "Ghost";

    // To minimize complexity, we start with it, but we need to trigger SELECTION change to run effect 2.
    currentHistoryState = {
      ...currentHistoryState,
      entries: [{ id: ghostId, emotion: ghostName, isVisibleInSphere: true }],
    };

    const { rerender } = renderHook(() => useHistorySphereSync());

    // 2. Trigger Sphere Selection Change (to force the second effect)
    currentAtlasState = {
      ...currentAtlasState,
      selectedEmotionIds: new Set([joyId]), // Select Joy locally
    };

    rerender();

    // 3. The effect should iterate, find "Ghost" in history, try to find in Atlas -> fail -> return
    // It should NOT crash, and mockSetVisibility should NOT be called for Ghost
    expect(mockSetVisibility).not.toHaveBeenCalledWith(ghostId, expect.any(Boolean));
  });

  it("should no-op when sphere is unselected and history is already hidden", () => {
    // This covers logic where (!isSelectedInSphere && !entry.isVisibleInSphere)
    // The code only handles else if (!isSelectedInSphere && entry.isVisibleInSphere)
    // So !isVisibleInSphere falls through implicit else (no action).

    // Start: Joy Unselected, History Hidden
    currentAtlasState = { ...currentAtlasState, selectedEmotionIds: new Set() };
    currentHistoryState = {
      ...currentHistoryState,
      entries: [{ id: joyHistoryId, emotion: joyName, isVisibleInSphere: false }],
    };

    const { rerender } = renderHook(() => useHistorySphereSync());

    // Trigger an update (e.g. selection change to something else) to run effect
    currentAtlasState = { ...currentAtlasState, selectedEmotionIds: new Set(["other"]) };

    rerender();

    // Should NOT call setVisibility (already hidden)
    expect(mockSetVisibility).not.toHaveBeenCalled();
  });
});
