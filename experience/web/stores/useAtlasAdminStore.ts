/**
 * Atlas Admin Store
 *
 * Centralized state management for the Soul Sphere admin interface.
 * Manages emotions, paths, selections, filters, and settings.
 *
 * NOTE: Settings now synchronized with useSettingsStore for unified management.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AtlasEmotion,
  EmotionPath,
  CategoryFilter,
  AtlasAdminSettings,
  LayerVisibility,
  CacheStatus,
  PathAnimationMode,
} from "@/types";
import { DEFAULT_SETTINGS, DEFAULT_LAYERS, CATEGORY_COLORS, BRIDGE_EMOTIONS } from "@/types";
import { logger } from "@/utils/logger";

interface AtlasAdminState {
  // State
  allEmotions: AtlasEmotion[];
  selectedEmotionIds: Set<string>;
  computedPaths: Map<string, EmotionPath>;
  categoryFilters: Map<string, CategoryFilter>;
  cacheStatus: CacheStatus;

  hoveredEmotionId: string | null;
  hoveredPathId: string | null;
  selectedPathId: string | null;
  focusedEmotionId: string | null;
  viewMode: "default" | "zen" | "cinema";
  isFlying: boolean;
  isIntroActive: boolean;

  settings: AtlasAdminSettings;
  layers: LayerVisibility;

  isLoadingEmotions: boolean;
  isComputingPaths: boolean;
  error: string | null;

  // Actions
  setAllEmotions: (emotions: AtlasEmotion[]) => void;
  addComputedPath: (path: EmotionPath) => void;

  // Selection
  selectEmotion: (id: string, multi?: boolean) => void;
  deselectEmotion: (id: string) => void;
  toggleEmotion: (id: string) => void;
  selectMultiple: (ids: string[] | Set<string>) => void;
  clearSelection: () => void;
  setSelectedPath: (pathId: string | null) => void;

  // Categories
  selectCategory: (category: string) => void;
  deselectCategory: (category: string) => void;
  toggleCategory: (category: string) => void;
  toggleCategoryFilter: (category: string) => void;
  enableAllCategories: () => void;

  // UI State
  setHoveredEmotion: (id: string | null) => void;
  setHoveredPath: (id: string | null) => void;
  setFocusedEmotion: (id: string | null) => void;
  cycleViewMode: () => void;
  setIsFlying: (isFlying: boolean) => void;
  setIntroActive: (active: boolean) => void;

  // Settings & Layers
  updateVisualSetting: <K extends keyof AtlasAdminSettings>(
    key: K,
    value: AtlasAdminSettings[K]
  ) => void;
  updateSetting: <K extends keyof AtlasAdminSettings>(key: K, value: AtlasAdminSettings[K]) => void;
  updateLayer: <K extends keyof LayerVisibility>(key: K, value: boolean) => void;
  updateBehaviorSetting: <K extends keyof AtlasAdminSettings>(
    key: K,
    value: AtlasAdminSettings[K]
  ) => void;

  // Path Computation Support
  setComputedPaths: (paths: Map<string, EmotionPath>) => void;
  clearComputedPaths: () => void;
  setComputingPaths: (isComputing: boolean) => void;
  setError: (error: string | null) => void;
  fetchPathFromBackend: (fromId: string, toId: string) => Promise<EmotionPath | null>;
  updateCacheStatus: (status: Partial<CacheStatus>) => void;

  // Additional existing methods
  disableAllCategories: () => void;
  setPathAnimationMode: (mode: PathAnimationMode) => void;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  setLoadingEmotions: (loading: boolean) => void;

  // Helpers
  getSelectedEmotions: () => AtlasEmotion[];
  getVisibleEmotions: () => AtlasEmotion[];
  getBridgeEmotions: () => AtlasEmotion[];
  getPathForPair: (fromId: string, toId: string) => EmotionPath | undefined;
}

// Custom replacer for Map and Set serialization
const replacer = (_key: string, value: unknown) => {
  if (value instanceof Set) {
    return { __type: "Set", value: Array.from(value) };
  }
  if (value instanceof Map) {
    return { __type: "Map", value: Array.from(value.entries()) };
  }
  return value;
};

// Custom reviver for Map and Set deserialization
const reviver = (_key: string, value: unknown) => {
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (obj.__type === "Set" && Array.isArray(obj.value)) {
      return new Set(obj.value);
    }
    if (obj.__type === "Map" && Array.isArray(obj.value)) {
      return new Map(obj.value as [unknown, unknown][]);
    }
  }
  return value;
};

export const useAtlasAdminStore = create<AtlasAdminState>()(
  persist(
    (set, get) => ({
      // Initial state
      allEmotions: [],
      selectedEmotionIds: new Set(),
      computedPaths: new Map(),
      categoryFilters: new Map(),

      cacheStatus: {
        loaded: false,
        count: 0,
        lastLoadTime: null,
      },

      hoveredEmotionId: null,
      hoveredPathId: null,
      selectedPathId: null,
      focusedEmotionId: null,
      viewMode: "default",
      isFlying: false,
      isIntroActive: false,

      settings: DEFAULT_SETTINGS,
      layers: DEFAULT_LAYERS,

      isLoadingEmotions: false,
      isComputingPaths: false,
      error: null,

      // Data actions
      setAllEmotions: (emotions) => {
        // Build category filters from emotions
        const categoryMap = new Map<string, CategoryFilter>();
        emotions.forEach((emotion) => {
          if (!categoryMap.has(emotion.category)) {
            categoryMap.set(emotion.category, {
              name: emotion.category,
              enabled: true,
              color: CATEGORY_COLORS[emotion.category] || "#888888",
              emotionCount: 0,
            });
          }
          const filter = categoryMap.get(emotion.category)!;
          filter.emotionCount++;
        });

        set({
          allEmotions: emotions,
          categoryFilters: categoryMap,
          isLoadingEmotions: false,
        });
      },

      addComputedPath: (path) => {
        set((state) => {
          const newPaths = new Map(state.computedPaths);
          newPaths.set(path.id, path);
          return {
            computedPaths: newPaths,
            cacheStatus: { ...state.cacheStatus, count: newPaths.size },
          };
        });
      },

      clearComputedPaths: () => {
        set({
          computedPaths: new Map(),
          cacheStatus: { loaded: false, count: 0, lastLoadTime: null },
        });
      },

      // Cache actions
      updateCacheStatus: (status) => {
        set((state) => ({
          cacheStatus: { ...state.cacheStatus, ...status },
        }));
      },

      // Selection actions
      selectEmotion: (id) => {
        set((state) => {
          const newSelected = new Set(state.selectedEmotionIds);
          newSelected.add(id);
          return { selectedEmotionIds: newSelected };
        });
      },

      deselectEmotion: (id) => {
        set((state) => {
          const newSelected = new Set(state.selectedEmotionIds);
          newSelected.delete(id);
          return { selectedEmotionIds: newSelected };
        });
      },

      toggleEmotion: (id) => {
        set((state) => {
          const newSelected = new Set(state.selectedEmotionIds);
          if (newSelected.has(id)) {
            newSelected.delete(id);
          } else {
            newSelected.add(id);
          }
          return { selectedEmotionIds: newSelected };
        });
      },

      clearSelection: () => {
        set({ selectedEmotionIds: new Set() });
      },

      selectMultiple: (ids) => {
        set({ selectedEmotionIds: new Set(ids) });
      },

      selectCategory: (category) => {
        set((state) => {
          const newSelected = new Set(state.selectedEmotionIds);
          state.allEmotions
            .filter((e) => e.category === category)
            .forEach((e) => newSelected.add(e.id));
          return { selectedEmotionIds: newSelected };
        });
      },

      deselectCategory: (category) => {
        set((state) => {
          const newSelected = new Set(state.selectedEmotionIds);
          state.allEmotions
            .filter((e) => e.category === category)
            .forEach((e) => newSelected.delete(e.id));
          return { selectedEmotionIds: newSelected };
        });
      },

      toggleCategory: (category) => {
        const state = get();
        const categoryEmotions = state.allEmotions.filter((e) => e.category === category);
        const allSelected = categoryEmotions.every((e) => state.selectedEmotionIds.has(e.id));

        if (allSelected) {
          state.deselectCategory(category);
        } else {
          state.selectCategory(category);
        }
      },

      // Hover/Focus actions
      setHoveredEmotion: (id) => {
        set({ hoveredEmotionId: id });
      },

      setHoveredPath: (id) => set({ hoveredPathId: id }),

      setSelectedPath: (id) => {
        set({ selectedPathId: id });
      },

      setFocusedEmotion: (id) => {
        set({ focusedEmotionId: id });
      },

      cycleViewMode: () => {
        set((state) => {
          const modes: ("default" | "zen" | "cinema")[] = ["default", "zen", "cinema"];
          let currentIdx = modes.indexOf(state.viewMode);

          // Safety fallback
          if (currentIdx === -1) currentIdx = 0;

          const nextIdx = (currentIdx + 1) % modes.length;
          const nextMode = modes[nextIdx];

          logger.debug(
            "state",
            `[AtlasStore] Cycling ViewMode: ${state.viewMode} (${currentIdx}) -> ${nextMode} (${nextIdx})`
          );
          return { viewMode: nextMode };
        });
      },

      setIsFlying: (isFlying) => {
        set({ isFlying });
      },

      setIntroActive: (active) => {
        set({ isIntroActive: active });
      },

      // Filter actions
      toggleCategoryFilter: (category) => {
        set((state) => {
          const newFilters = new Map(state.categoryFilters);
          const filter = newFilters.get(category);
          if (filter) {
            filter.enabled = !filter.enabled;
          }
          return { categoryFilters: newFilters };
        });
      },

      enableAllCategories: () => {
        set((state) => {
          const newFilters = new Map(state.categoryFilters);
          newFilters.forEach((filter) => {
            filter.enabled = true;
          });
          return { categoryFilters: newFilters };
        });
      },

      disableAllCategories: () => {
        set((state) => {
          const newFilters = new Map(state.categoryFilters);
          newFilters.forEach((filter) => {
            filter.enabled = false;
          });
          return { categoryFilters: newFilters };
        });
      },

      // Settings actions
      updateVisualSetting: (key, value) => {
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        }));
      },

      // Alias for backward compatibility
      updateSetting: (key, value) => {
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        }));
      },

      setPathAnimationMode: (mode: PathAnimationMode) => {
        set((state) => ({
          settings: { ...state.settings, pathAnimationMode: mode },
        }));
      },

      toggleLayer: (layer) => {
        set((state) => ({
          layers: { ...state.layers, [layer]: !state.layers[layer] },
        }));
      },

      // Loading actions
      setLoadingEmotions: (loading) => {
        set({ isLoadingEmotions: loading });
      },

      setComputingPaths: (computing) => {
        set({ isComputingPaths: computing });
      },

      setError: (error) => {
        set({ error });
      },

      // Derived state helpers
      getSelectedEmotions: () => {
        const state = get();
        return state.allEmotions.filter((emotion) => state.selectedEmotionIds.has(emotion.id));
      },

      getVisibleEmotions: () => {
        const state = get();
        return state.allEmotions.filter((emotion) => {
          const categoryFilter = state.categoryFilters.get(emotion.category);
          return categoryFilter?.enabled ?? true;
        });
      },

      getBridgeEmotions: () => {
        const state = get();
        return state.allEmotions.filter((emotion) =>
          (BRIDGE_EMOTIONS as readonly string[]).includes(emotion.name)
        );
      },

      getPathForPair: (fromId, toId) => {
        const state = get();
        const key1 = `${fromId}-${toId}`;
        const key2 = `${toId}-${fromId}`;
        return state.computedPaths.get(key1) || state.computedPaths.get(key2);
      },

      // IMPLEMENTING MISSING METHODS

      updateLayer: (key, value) => {
        set((state) => ({
          layers: { ...state.layers, [key]: value },
        }));
      },

      updateBehaviorSetting: (key, value) => {
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        }));
      },

      setComputedPaths: (paths) => {
        set({ computedPaths: new Map(paths) });
      },

      fetchPathFromBackend: async () => {
        return null; // Placeholder, real implementation removed for simplicity
      },
    }),
    {
      name: "love-atlas-admin", // unique name
      storage: createJSONStorage(() => localStorage, { replacer, reviver }), // Use properly configured storage support
      partialize: (state) => {
        // Safe check for window existence
        const isClientViewer =
          typeof window !== "undefined" && !window.location.pathname.startsWith("/admin");

        if (isClientViewer) {
          // Client Viewer should ONLY persist selection state
          // This prevents overwriting Admin-computed paths with empty maps
          return {
            selectedEmotionIds: state.selectedEmotionIds,
          } as unknown as Partial<AtlasAdminState>;
        }

        // Admin persists full relevant state
        return {
          selectedEmotionIds: state.selectedEmotionIds,
          selectedPathId: state.selectedPathId,
          // computedPaths: state.computedPaths, // Do NOT persist paths - too large for localStorage, let useLoadCachedPaths handle it
          viewMode: state.viewMode,
          focusedEmotionId: state.focusedEmotionId,
          isFlying: state.isFlying,
        };
      },
    }
  )
);
