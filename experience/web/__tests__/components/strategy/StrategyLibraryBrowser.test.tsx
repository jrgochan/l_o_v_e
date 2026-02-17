import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import {
  StrategyLibraryBrowser,
  ContextualRecommendations,
  GoalSetting,
  useGoalSettingLogic,
  PersonalStrategies,
  StrategyDetailsModal,
  StrategyFeedbackModal,
} from "@/components/strategy";
import { useStrategyBrowserStore } from "@/stores/useStrategyBrowserStore";

// Mock the store
jest.mock("@/stores/useStrategyBrowserStore");

const mockStrategies = [
  {
    strategy_id: "1",
    name: "Strategy One",
    type: "test_type",
    evidence_level: "rct",
    difficulty_level: 2,
    description: "Desc One",
    time_required: "10m",
  },
  {
    strategy_id: "2",
    name: "Strategy Two",
    type: "other_type",
    evidence_level: "meta_analysis",
    difficulty_level: 5,
    description: "Desc Two",
  },
];

describe("StrategyLibraryBrowser", () => {
  let mockStore: any;

  beforeEach(() => {
    mockStore = {
      strategies: [],
      filters: { search: "", type: null, evidence: null },
      isLoading: false,
      selectedStrategy: null,
      fetchStrategies: jest.fn(),
      setFilters: jest.fn(),
      selectStrategy: jest.fn(),
      resetFilters: jest.fn(), // We might need this if the component calls it directly, though the code uses setFilters manually for clear
    };
    (useStrategyBrowserStore as unknown as jest.Mock).mockReturnValue(mockStore);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("renders header and initial state", () => {
    render(<StrategyLibraryBrowser />);
    expect(screen.getByText("Strategy Library")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search strategies/i)).toBeInTheDocument();
  });

  it("fetches strategies on mount", async () => {
    render(<StrategyLibraryBrowser />);

    // The effect has a 300ms debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockStore.fetchStrategies).toHaveBeenCalled();
  });

  it("renders a list of strategies", () => {
    mockStore.strategies = mockStrategies;
    render(<StrategyLibraryBrowser />);

    expect(screen.getByText("Strategy One")).toBeInTheDocument();
    expect(screen.getByText("Strategy Two")).toBeInTheDocument();
    expect(screen.getByText("Desc One")).toBeInTheDocument();
  });

  it("handles empty state", () => {
    mockStore.strategies = [];
    render(<StrategyLibraryBrowser />);
    expect(screen.getByText("No strategies found matching your filters.")).toBeInTheDocument();
  });

  it("updates search filter", () => {
    render(<StrategyLibraryBrowser />);
    const input = screen.getByPlaceholderText(/Search strategies/i);

    fireEvent.change(input, { target: { value: "anxiety" } });
    expect(mockStore.setFilters).toHaveBeenCalledWith({ search: "anxiety" });
  });

  it("updates type filter", () => {
    render(<StrategyLibraryBrowser />);
    // Select is the second one? The code has 3 inputs (search, type select, evidence select)
    // We can find by value or just by order.
    // The select for types has option "All Categories"
    const selects = screen.getAllByRole("combobox");
    const typeSelect = selects[0]; // Assuming order: type, evidence

    fireEvent.change(typeSelect, { target: { value: "situation_selection" } });
    expect(mockStore.setFilters).toHaveBeenCalledWith({ type: "situation_selection" });
  });

  it("updates evidence filter", () => {
    render(<StrategyLibraryBrowser />);
    const selects = screen.getAllByRole("combobox");
    const evidenceSelect = selects[1];

    fireEvent.change(evidenceSelect, { target: { value: "rct" } });
    expect(mockStore.setFilters).toHaveBeenCalledWith({ evidence: "rct" });
  });

  it("clears filters when clear button clicked", () => {
    mockStore.strategies = [];
    render(<StrategyLibraryBrowser />);

    const clearBtn = screen.getByText("Clear all filters");
    fireEvent.click(clearBtn);

    expect(mockStore.setFilters).toHaveBeenCalledWith({ type: null, evidence: null, search: "" });
  });

  it("selects a strategy on click", () => {
    mockStore.strategies = mockStrategies;
    render(<StrategyLibraryBrowser />);

    fireEvent.click(screen.getByText("Strategy One"));
    expect(mockStore.selectStrategy).toHaveBeenCalledWith(mockStrategies[0]);
  });

  it("renders details modal when strategy is selected", () => {
    mockStore.selectedStrategy = mockStrategies[0];
    render(<StrategyLibraryBrowser />);

    // Modal should be visible (it checks for selectedStrategy)
    expect(screen.getByText("Strategy One")).toBeInTheDocument();
    // Check for close button to confirm modal presence vs card presence
    // Cards don't have a "Close" button.
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("closes modal", () => {
    mockStore.selectedStrategy = mockStrategies[0];
    render(<StrategyLibraryBrowser />);

    fireEvent.click(screen.getByText("Close"));
    expect(mockStore.selectStrategy).toHaveBeenCalledWith(null);
  });

  it("renders correct styles for different evidence levels", () => {
    const mixedStrategies = [
      {
        ...mockStrategies[0],
        strategy_id: "3",
        evidence_level: "clinical",
        name: "Clinical Strat",
      },
      {
        ...mockStrategies[0],
        strategy_id: "4",
        evidence_level: "unknown_type",
        name: "Unknown Strat",
      },
    ];
    mockStore.strategies = mixedStrategies;
    render(<StrategyLibraryBrowser />);

    // Clinical - amber
    const clinicalTag = screen.getByText("CLINICAL").closest("span");
    expect(clinicalTag).toHaveClass("bg-amber-500/10");

    // Unknown - default white/5
    const unknownTag = screen.getByText("UNKNOWN_TYPE").closest("span");
    expect(unknownTag).toHaveClass("bg-white/5");
  });

  it("sets filter to null when empty value selected", () => {
    render(<StrategyLibraryBrowser />);
    const selects = screen.getAllByRole("combobox");
    const typeSelect = selects[0];
    const evidenceSelect = selects[1];

    // Simulate clearing type
    fireEvent.change(typeSelect, { target: { value: "" } });
    expect(mockStore.setFilters).toHaveBeenCalledWith({ type: null });

    // Simulate clearing evidence
    fireEvent.change(evidenceSelect, { target: { value: "" } });
    expect(mockStore.setFilters).toHaveBeenCalledWith({ evidence: null });
  });
  it("exports all components from barrel file", () => {
    expect(StrategyLibraryBrowser).toBeDefined();
    expect(ContextualRecommendations).toBeDefined();
    expect(GoalSetting).toBeDefined();
    expect(useGoalSettingLogic).toBeDefined();
    expect(PersonalStrategies).toBeDefined();
    expect(StrategyDetailsModal).toBeDefined();
    expect(StrategyFeedbackModal).toBeDefined();
  });
});
