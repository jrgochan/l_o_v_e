import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { SmartRecommendations } from "@/components/admin/shared/SmartRecommendations";
import { useVisualizationStore } from "@/stores/useVisualizationStore";

// Mock store module
jest.mock("@/stores/useVisualizationStore", () => {
  const mockGetState = jest.fn();
  const mockStore = jest.fn();
  (mockStore as any).getState = mockGetState;
  return {
    useVisualizationStore: mockStore,
  };
});

const mockUseAtlasAdminStore = useVisualizationStore as unknown as jest.Mock & { getState: jest.Mock };

const mockRecommendations = {
  curated_journeys: [
    {
      id: "j1",
      name: "Calm Journey",
      difficulty: "easy",
      description: "A calming path",
      emotion_count: 5,
      estimated_time: "10m",
      research: "Based on CBT",
      icon: "🌊",
      emotion_ids: ["e1", "e2"],
    },
  ],
  complementary_suggestions: [
    {
      id: "s1",
      name: "Joy",
      type: "Complementary",
      reason: "Balances sadness",
    },
  ],
  problematic_transitions: [
    {
      from_name: "Anger",
      to_name: "Joy",
      from_id: "e6",
      to_id: "e1",
      distance: 15,
      waypoint_count: 3,
      requires_bridge: true,
    },
  ],
};

describe("SmartRecommendations", () => {
  const selectMultipleMock = jest.fn();
  const clearSelectionMock = jest.fn();
  const updateSettingMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    // Default hook implementation
    mockUseAtlasAdminStore.mockImplementation((selector: any) => {
      return selector({
        selectedEmotionIds: new Set(),
        selectMultiple: selectMultipleMock,
        clearSelection: clearSelectionMock,
        updateSetting: updateSettingMock,
        settings: { computeMode: "manual" },
      });
    });

    // Default getState implementation
    mockUseAtlasAdminStore.getState.mockImplementation(() => ({
      settings: { computeMode: "manual" },
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fetches and displays recommendations", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    });

    render(<SmartRecommendations />);

    await waitFor(() => expect(screen.getByText(/Calm Journey/)).toBeInTheDocument());
    expect(screen.getByText(/Smart Suggestions/)).toBeInTheDocument();
  });

  it("switches context to all types", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    });

    render(<SmartRecommendations />);
    await waitFor(() => expect(screen.getByText(/Calm Journey/)).toBeInTheDocument());

    // Switch to Healing
    fireEvent.click(screen.getByText(/Healing/i));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("context=healing"));
    });

    // Switch to Growth
    fireEvent.click(screen.getByText(/Growth/i));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("context=growth"));
    });
    expect(screen.getByText("🌱 Growth Paths")).toBeInTheDocument();

    // Switch back to Exploration
    fireEvent.click(screen.getByText(/Explore/i));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("context=exploration"));
    });
    expect(screen.getByText("🎯 Curated Journeys")).toBeInTheDocument();
  });

  it("displays correct difficulty colors", async () => {
    const mixedDifficultyRecs = {
      curated_journeys: [
        { ...mockRecommendations.curated_journeys[0], id: "j1", difficulty: "easy" },
        { ...mockRecommendations.curated_journeys[0], id: "j2", difficulty: "moderate" },
        { ...mockRecommendations.curated_journeys[0], id: "j3", difficulty: "hard" },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mixedDifficultyRecs }),
    });

    render(<SmartRecommendations />);
    await waitFor(() => expect(screen.getAllByText(/Calm Journey/).length).toBe(3));

    // Check for class presence. Note: tailwind classes might be compiled, so check for bg values
    const badges = screen.getAllByText(/(easy|moderate|hard)/);
    // Rough check or specific check
    expect(screen.getByText("easy")).toHaveClass("bg-green-600");
    expect(screen.getByText("moderate")).toHaveClass("bg-yellow-600");
    expect(screen.getByText("hard")).toHaveClass("bg-red-600");
  });

  it("displays empty state when no recommendations", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: null }),
    });

    render(<SmartRecommendations />);
    await waitFor(() =>
      expect(screen.getByText("No recommendations available")).toBeInTheDocument()
    );
  });

  it("applies curated journey in manual mode", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    });

    // Explicitly mock getState again to be sure
    mockUseAtlasAdminStore.getState.mockImplementation(() => ({
      settings: { computeMode: "manual" },
    }));

    render(<SmartRecommendations />);
    // Wait for data with REAL timers first
    await waitFor(() => expect(screen.getByText(/Calm Journey/)).toBeInTheDocument());

    // Switch to FAKE timers for the timeout/click logic
    jest.useFakeTimers();

    fireEvent.click(screen.getByText(/Calm Journey/));

    expect(updateSettingMock).toHaveBeenCalledWith("computeMode", "cache-first");
    expect(clearSelectionMock).toHaveBeenCalled();
    expect(selectMultipleMock).toHaveBeenCalledWith(["e1", "e2"]);

    act(() => {
      jest.runAllTimers();
    });
    expect(updateSettingMock).toHaveBeenCalledWith("computeMode", "manual");
  });

  it("applies curated journey in cache-first mode", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    });

    mockUseAtlasAdminStore.getState.mockImplementation(() => ({
      settings: { computeMode: "cache-first" },
    }));

    render(<SmartRecommendations />);
    await waitFor(() => expect(screen.getByText(/Calm Journey/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Calm Journey/));

    expect(updateSettingMock).not.toHaveBeenCalled();
    expect(selectMultipleMock).toHaveBeenCalledWith(["e1", "e2"]);
  });

  it("applies complementary suggestion", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    });

    mockUseAtlasAdminStore.mockImplementation((selector: any) => {
      return selector({
        selectedEmotionIds: new Set(["existing"]),
        selectMultiple: selectMultipleMock,
        clearSelection: clearSelectionMock,
        updateSetting: updateSettingMock,
        settings: { computeMode: "manual" },
      });
    });

    render(<SmartRecommendations />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Joy"));

    expect(selectMultipleMock).toHaveBeenCalledWith(["existing", "s1"]);
  });

  it("applies problematic transition", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    });

    render(<SmartRecommendations />);
    await waitFor(() => expect(screen.getByText(/Anger.*Joy/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Anger.*Joy/));

    expect(clearSelectionMock).toHaveBeenCalled();
    expect(selectMultipleMock).toHaveBeenCalledWith(["e6", "e1"]);
  });

  it("displays error", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    });

    render(<SmartRecommendations />);
    await waitFor(() => expect(screen.getByText(/Error: Failed to fetch/)).toBeInTheDocument());
  });

  it("handles unknown error type", async () => {
    (global.fetch as jest.Mock).mockRejectedValue("Some string error");

    render(<SmartRecommendations />);
    await waitFor(() => expect(screen.getByText(/Error: Unknown error/)).toBeInTheDocument());
  });

  it("displays loading spinner", async () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { container } = render(<SmartRecommendations />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
