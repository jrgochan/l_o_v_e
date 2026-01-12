import { act } from "@testing-library/react";
import { useAtlasAdminStore } from "../../stores/useAtlasAdminStore";
import { AtlasEmotion, EmotionPath } from "../../types";

// Mock data
const mockEmotions: AtlasEmotion[] = [
  {
    id: "1",
    name: "Joy",
    category: "Positive",
    definition: "Happy",

    vac: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
  },
  {
    id: "2",
    name: "Sadness",
    category: "Negative",
    definition: "Sad",

    vac: [1, 1, 1],
    quaternion: [0, 0, 0, 1],
  },
  {
    id: "3",
    name: "Anger",
    category: "Negative",
    definition: "Mad",

    vac: [-1, -1, -1],
    quaternion: [0, 0, 0, 1],
  },
];

const mockPath: EmotionPath = {
  id: "1-2",
  from: {
    id: "1",
    name: "Joy",
    category: "positive",
    definition: "Happy",
    vac: [1, 1, 1],
    quaternion: [0, 0, 0, 1],
  },
  to: {
    id: "2",
    name: "Sadness",
    category: "negative",
    definition: "Sad",
    vac: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
  },

  waypoints: [],
  total_distance: 5.0,
  estimated_time: "5 min",
  difficulty: "moderate",
};

describe("useAtlasAdminStore", () => {
  beforeEach(() => {
    // Reset store before each test
    const initialState = useAtlasAdminStore.getInitialState();
    useAtlasAdminStore.setState(initialState, true);
  });

  describe("Emotions & Categories", () => {
    it("should set all emotions and initialize category filters", () => {
      const { setAllEmotions } = useAtlasAdminStore.getState();

      act(() => {
        setAllEmotions(mockEmotions);
      });

      const state = useAtlasAdminStore.getState();
      expect(state.allEmotions).toHaveLength(3);
      expect(state.categoryFilters.size).toBe(2); // Positive, Negative
      expect(state.categoryFilters.get("Positive")?.emotionCount).toBe(1);
      expect(state.categoryFilters.get("Negative")?.emotionCount).toBe(2);
    });

    it("should toggle category filters", () => {
      const { setAllEmotions, toggleCategoryFilter } = useAtlasAdminStore.getState();

      act(() => {
        setAllEmotions(mockEmotions);
        toggleCategoryFilter("Positive");
      });

      const state = useAtlasAdminStore.getState();
      expect(state.categoryFilters.get("Positive")?.enabled).toBe(false);
      expect(state.categoryFilters.get("Negative")?.enabled).toBe(true);
    });

    it("should enable/disable all categories", () => {
      const { setAllEmotions, disableAllCategories, enableAllCategories } =
        useAtlasAdminStore.getState();

      act(() => {
        setAllEmotions(mockEmotions);
        disableAllCategories();
      });

      let state = useAtlasAdminStore.getState();
      expect(Array.from(state.categoryFilters.values()).every((f) => !f.enabled)).toBe(true);

      act(() => {
        enableAllCategories();
      });

      state = useAtlasAdminStore.getState();
      expect(Array.from(state.categoryFilters.values()).every((f) => f.enabled)).toBe(true);
    });
  });

  describe("Selection Logic", () => {
    it("should select single emotion", () => {
      const { selectEmotion } = useAtlasAdminStore.getState();

      act(() => {
        selectEmotion("1");
      });

      const state = useAtlasAdminStore.getState();
      expect(state.selectedEmotionIds.has("1")).toBe(true);
      expect(state.selectedEmotionIds.size).toBe(1);
    });

    it("should select multiple emotions", () => {
      const { selectMultiple } = useAtlasAdminStore.getState();

      act(() => {
        selectMultiple(["1", "2"]);
      });

      const state = useAtlasAdminStore.getState();
      expect(state.selectedEmotionIds.has("1")).toBe(true);
      expect(state.selectedEmotionIds.has("2")).toBe(true);
      expect(state.selectedEmotionIds.size).toBe(2);
    });

    it("should toggle emotion selection", () => {
      const { toggleEmotion } = useAtlasAdminStore.getState();

      act(() => {
        toggleEmotion("1");
      });
      expect(useAtlasAdminStore.getState().selectedEmotionIds.has("1")).toBe(true);

      act(() => {
        toggleEmotion("1");
      });
      expect(useAtlasAdminStore.getState().selectedEmotionIds.has("1")).toBe(false);
    });

    it("should select/deselect by category", () => {
      const { setAllEmotions, selectCategory, deselectCategory } = useAtlasAdminStore.getState();

      act(() => {
        setAllEmotions(mockEmotions);
        selectCategory("Negative");
      });

      let state = useAtlasAdminStore.getState();
      expect(state.selectedEmotionIds.has("2")).toBe(true);
      expect(state.selectedEmotionIds.has("3")).toBe(true);
      expect(state.selectedEmotionIds.has("1")).toBe(false);

      act(() => {
        deselectCategory("Negative");
      });

      state = useAtlasAdminStore.getState();
      expect(state.selectedEmotionIds.size).toBe(0);
    });
  });

  describe("Path Management", () => {
    it("should add and retrieve computed paths", () => {
      const { addComputedPath, getPathForPair } = useAtlasAdminStore.getState();

      act(() => {
        addComputedPath(mockPath);
      });

      const state = useAtlasAdminStore.getState();
      expect(state.computedPaths.has("1-2")).toBe(true);
      expect(getPathForPair("1", "2")).toEqual(mockPath);
      expect(getPathForPair("2", "1")).toEqual(mockPath); // Should handle reverse key
    });

    it("should clear computed paths", () => {
      const { addComputedPath, clearComputedPaths } = useAtlasAdminStore.getState();

      act(() => {
        addComputedPath(mockPath);
        clearComputedPaths();
      });

      const state = useAtlasAdminStore.getState();
      expect(state.computedPaths.size).toBe(0);
    });
  });

  describe("View & Settings", () => {
    it("should cycle view modes", () => {
      const { cycleViewMode } = useAtlasAdminStore.getState();

      expect(useAtlasAdminStore.getState().viewMode).toBe("default");

      act(() => cycleViewMode());
      expect(useAtlasAdminStore.getState().viewMode).toBe("zen");

      act(() => cycleViewMode());
      expect(useAtlasAdminStore.getState().viewMode).toBe("cinema");

      act(() => cycleViewMode());
      expect(useAtlasAdminStore.getState().viewMode).toBe("default");
    });

    it("should update settings", () => {
      const { updateVisualSetting, updateLayer } = useAtlasAdminStore.getState();

      act(() => {
        updateVisualSetting("showAllPaths", false);
        updateLayer("transitionPaths", false);
      });

      const state = useAtlasAdminStore.getState();
      expect(state.settings.showAllPaths).toBe(false);
      expect(state.layers.transitionPaths).toBe(false);
    });
  });

  describe("Derived State Helpers", () => {
    it("should get selected emotions", () => {
      const { setAllEmotions, selectEmotion, getSelectedEmotions } = useAtlasAdminStore.getState();

      act(() => {
        setAllEmotions(mockEmotions);
        selectEmotion("1");
      });

      const selected = getSelectedEmotions();
      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe("1");
    });

    it("should get visible emotions respecting filters", () => {
      const { setAllEmotions, toggleCategoryFilter, getVisibleEmotions } =
        useAtlasAdminStore.getState();

      act(() => {
        setAllEmotions(mockEmotions);
        toggleCategoryFilter("Negative"); // Disable Negative
      });

      const visible = getVisibleEmotions();
      expect(visible).toHaveLength(1); // Only 'Joy' (Positive)
      expect(visible[0].name).toBe("Joy");
    });
  });
});

describe("Additional Actions & Helpers", () => {
  it("should update cache status", () => {
    const { updateCacheStatus } = useAtlasAdminStore.getState();
    act(() => updateCacheStatus({ count: 50, loaded: true }));
    const state = useAtlasAdminStore.getState();
    expect(state.cacheStatus.count).toBe(50);
    expect(state.cacheStatus.loaded).toBe(true);
  });

  it("should deselect emotion", () => {
    const { selectEmotion, deselectEmotion } = useAtlasAdminStore.getState();
    act(() => {
      selectEmotion("1");
      deselectEmotion("1");
    });
    expect(useAtlasAdminStore.getState().selectedEmotionIds.has("1")).toBe(false);
  });

  it("should toggle layer", () => {
    const { toggleLayer } = useAtlasAdminStore.getState();
    const initial = useAtlasAdminStore.getState().layers;
    act(() => toggleLayer("transitionPaths"));
    expect(useAtlasAdminStore.getState().layers.transitionPaths).toBe(!initial.transitionPaths);
  });

  it("should update behavior setting", () => {
    const { updateBehaviorSetting } = useAtlasAdminStore.getState();
    act(() => updateBehaviorSetting("focusMode", true));
    expect(useAtlasAdminStore.getState().settings.focusMode).toBe(true);
  });

  it("should toggle category selection logic (all selected vs partial)", () => {
    const { setAllEmotions, selectEmotion, toggleCategory } = useAtlasAdminStore.getState();
    act(() => {
      setAllEmotions(mockEmotions);
      // Select only one in Negative category
      selectEmotion("2");
      toggleCategory("Negative");
    });
    // Should select ALL in Negative now because it wasn't fully selected
    const state = useAtlasAdminStore.getState();
    expect(state.selectedEmotionIds.has("2")).toBe(true);
    expect(state.selectedEmotionIds.has("3")).toBe(true); // The other negative one

    // Now toggle again -> should deselect all
    act(() => toggleCategory("Negative"));
    const state2 = useAtlasAdminStore.getState();
    expect(state2.selectedEmotionIds.has("2")).toBe(false);
    expect(state2.selectedEmotionIds.has("3")).toBe(false);
  });

  it("should get bridge emotions", () => {
    const { setAllEmotions, getBridgeEmotions } = useAtlasAdminStore.getState();
    // 'Joy' is NOT a bridge emotion in default list. "Awe" is.
    const aweEmotion = { ...mockEmotions[0], name: "Awe" };

    act(() => setAllEmotions([aweEmotion]));

    const bridges = getBridgeEmotions();
    const awe = bridges.find((e) => e.name === "Awe");
    expect(awe).toBeDefined();
  });

  it("should handle simple setters", () => {
    const store = useAtlasAdminStore.getState();
    act(() => {
      store.setHoveredEmotion("1");
      store.setHoveredPath("path-1");
      store.setSelectedPath("path-1");
      store.setFocusedEmotion("1");
      store.setIsFlying(true);
      store.setIntroActive(true);
      store.setLoadingEmotions(true);
      store.setComputingPaths(true);
      store.setError("Test Error");
      store.setPathAnimationMode("dynamic");
    });

    const state = useAtlasAdminStore.getState();
    expect(state.hoveredEmotionId).toBe("1");
    expect(state.hoveredPathId).toBe("path-1");
    expect(state.selectedPathId).toBe("path-1");
    expect(state.focusedEmotionId).toBe("1");
    expect(state.isFlying).toBe(true);
    expect(state.isIntroActive).toBe(true);
    expect(state.isLoadingEmotions).toBe(true);
    expect(state.isComputingPaths).toBe(true);
    expect(state.error).toBe("Test Error");
    expect(state.settings.pathAnimationMode).toBe("dynamic");
  });

  it("should handle placeholder fetchPathFromBackend", async () => {
    const { fetchPathFromBackend } = useAtlasAdminStore.getState();
    const result = await fetchPathFromBackend("1", "2");
    expect(result).toBeNull();
  });
});
