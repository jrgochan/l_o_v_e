import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { therapeuticService } from "@/services/therapeuticService";

import { StrategyStep } from "@/services/therapeuticService";

export interface Strategy {
  strategy_id: string;
  name: string;
  type: string;
  description: string;
  evidence_level: string;
  difficulty_level: number;
  time_required?: string;
  steps?: (string | StrategyStep)[];
  effectiveness_rating?: number;
  times_successful_for_user?: number;
}

export interface StrategyFilters {
  type: string | null;
  evidence: string | null;
  difficultyMin: number | null;
  difficultyMax: number | null;
  search: string;
}

interface StrategyBrowserState {
  strategies: Strategy[];
  filters: StrategyFilters;
  isLoading: boolean;
  error: string | null;
  selectedStrategy: Strategy | null;

  // Actions
  setStrategies: (strategies: Strategy[]) => void;
  setFilters: (filters: Partial<StrategyFilters>) => void;
  selectStrategy: (strategy: Strategy | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetFilters: () => void;
  fetchStrategies: () => Promise<void>;
}

export const useStrategyBrowserStore = create<StrategyBrowserState>()(
  devtools(
    (set, get) => ({
      strategies: [],
      filters: {
        type: null,
        evidence: null,
        difficultyMin: null,
        difficultyMax: null,
        search: "",
      },
      isLoading: false,
      error: null,
      selectedStrategy: null,

      setStrategies: (strategies) => set({ strategies }),
      setFilters: (newFilters) => {
        set((state) => ({ filters: { ...state.filters, ...newFilters } }));
        // Auto-fetch when filters change is handled by the component effect,
        // or we could chain it here. For now, we expose fetchStrategies separately.
      },
      selectStrategy: (strategy) => set({ selectedStrategy: strategy }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      resetFilters: () =>
        set({
          filters: {
            type: null,
            evidence: null,
            difficultyMin: null,
            difficultyMax: null,
            search: "",
          },
        }),
      fetchStrategies: async () => {
        const { filters } = get();
        set({ isLoading: true, error: null });
        try {
          const result = await therapeuticService.searchStrategies({
            type: filters.type,
            evidence: filters.evidence,
            difficulty_min: filters.difficultyMin,
            difficulty_max: filters.difficultyMax,
            search: filters.search,
          });
          set({ strategies: result.strategies, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },
    }),
    { name: "StrategyBrowserStore" }
  )
);
