
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionSuggestions } from "@/components/admin/panels/InfoPanel/ActionSuggestions";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";

// Mock hooks
jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/hooks/useAmbientAudio");

describe("ActionSuggestions", () => {
  const mockCycleViewMode = jest.fn();
  const mockSelectEmotion = jest.fn();
  const mockSetSelectedPath = jest.fn();
  const mockSetFocusedEmotion = jest.fn();
  const mockSetIsFlying = jest.fn();
  const mockPlayClickSound = jest.fn();

  const mockEmotions = [
    { id: "joy", name: "Joy", vac: [0.8, 0.5, 0.5] },
    { id: "sadness", name: "Sadness", vac: [-0.8, -0.5, -0.5] }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAmbientAudio as jest.Mock).mockReturnValue({ playClickSound: mockPlayClickSound });
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        selectedEmotionIds: new Set(),
        selectedPathId: null,
        allEmotions: mockEmotions,
        cycleViewMode: mockCycleViewMode,
        selectEmotion: mockSelectEmotion,
        setSelectedPath: mockSetSelectedPath,
        setFocusedEmotion: mockSetFocusedEmotion,
        setIsFlying: mockSetIsFlying,
      };
      return selector(state);
    });
  });

  it("renders default suggestions (Zen/Surprise) when nothing selected", () => {
    render(<ActionSuggestions />);
    expect(screen.getByText("Enter Zen Mode (Z)")).toBeInTheDocument();
    expect(screen.getByText("Surprise Me")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Enter Zen Mode (Z)"));
    expect(mockCycleViewMode).toHaveBeenCalled();
    expect(mockPlayClickSound).toHaveBeenCalled();

    // Test Surprise Me
    const surpriseBtn = screen.getByText("Surprise Me");
    fireEvent.click(surpriseBtn);
    expect(mockSelectEmotion).toHaveBeenCalled();
    expect(mockSetFocusedEmotion).toHaveBeenCalled();
  });

  it("renders context actions for single emotion", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      selectedEmotionIds: new Set(["joy"]),
      selectedPathId: null,
      allEmotions: mockEmotions,
      cycleViewMode: mockCycleViewMode,
      selectEmotion: mockSelectEmotion,
      setFocusedEmotion: mockSetFocusedEmotion,
    }));

    render(<ActionSuggestions />);
    // Find opposite logic check: Joy (0.8) -> Sadness (-0.8) is far
    expect(screen.getByText("Find Path to Sadness")).toBeInTheDocument();
    expect(screen.getByText("Focus Camera")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Find Path to Sadness"));
    expect(mockSelectEmotion).toHaveBeenCalledWith("sadness");

    // Focus Camera
    fireEvent.click(screen.getByText("Focus Camera"));
    expect(mockSetFocusedEmotion).toHaveBeenCalledWith("joy");
  });

  it("renders actions for selected path", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      selectedEmotionIds: new Set(["joy", "sadness"]),
      selectedPathId: "path-1",
      allEmotions: mockEmotions,
      setIsFlying: mockSetIsFlying,
      setSelectedPath: mockSetSelectedPath,
    }));

    render(<ActionSuggestions />);
    expect(screen.getByText("Play Journey")).toBeInTheDocument();
    expect(screen.getByText("Clear Selection")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Play Journey"));
    expect(mockSetIsFlying).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText("Clear Selection"));
    expect(mockSetSelectedPath).toHaveBeenCalledWith(null);
  });

  it("renders null (empty) when multiple emotions selected but no path active", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      selectedEmotionIds: new Set(["joy", "sadness"]),
      selectedPathId: null, // explicit null
      allEmotions: mockEmotions,
    }));

    const { container } = render(<ActionSuggestions />);
    expect(container).toBeEmptyDOMElement();
  });

  it("omits 'Find Path' if no opposite emotion exists", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      selectedEmotionIds: new Set(["joy"]),
      selectedPathId: null,
      allEmotions: [mockEmotions[0]], // Only Joy exists, so no opposite
      cycleViewMode: mockCycleViewMode,
      selectEmotion: mockSelectEmotion,
      setFocusedEmotion: mockSetFocusedEmotion,
    }));

    render(<ActionSuggestions />);
    expect(screen.queryByText(/Find Path/)).not.toBeInTheDocument();
    expect(screen.getByText("Focus Camera")).toBeInTheDocument();
  });

  it("does nothing when Surprise Me clicked with empty emotions list", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      selectedEmotionIds: new Set(),
      selectedPathId: null,
      allEmotions: [], // Empty list
      cycleViewMode: mockCycleViewMode,
      selectEmotion: mockSelectEmotion,
      setFocusedEmotion: mockSetFocusedEmotion,
    }));

    render(<ActionSuggestions />);
    const surpriseBtn = screen.getByText("Surprise Me");
    fireEvent.click(surpriseBtn);
    expect(mockSelectEmotion).not.toHaveBeenCalled();
  });

  it("handles invalid emotion selection gracefully (no crash)", () => {
    // Case where selected ID is not in allEmotions
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      selectedEmotionIds: new Set(["invalid-id"]),
      selectedPathId: null,
      allEmotions: mockEmotions,
    }));

    // Should behave like single selection but findOpposite returns null early
    render(<ActionSuggestions />);
    // Since current is undefined, findOpposite returns null (line 25 covered)
    // opposite is null, so "Find Path" not added.
    expect(screen.queryByText(/Find Path/)).not.toBeInTheDocument();
    // "Focus Camera" is still added because it uses activeIds[0] directly
    expect(screen.getByText("Focus Camera")).toBeInTheDocument();
  });

  it("selects the furthest opposite among multiple candidates", () => {
    const multiEmotions = [
      { id: "joy", name: "Joy", vac: [0.8, 0.5, 0.5] as [number, number, number], category: "joy", definition: "def", color: "#FF0" },
      { id: "sadness", name: "Sadness", vac: [-0.8, -0.5, -0.5] as [number, number, number], category: "sadness", definition: "def", color: "#00F" }, // Far (First to set maxDist)
      { id: "meh", name: "Meh", vac: [0.7, 0.4, 0.4] as [number, number, number], category: "neutral", definition: "def", color: "#888" }, // Close (Should trigger else branch)
    ];

    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      selectedEmotionIds: new Set(["joy"]),
      selectedPathId: null,
      allEmotions: multiEmotions, // Order matters: Sadness (Far) -> Meh (Near)? No, map/forEach order.
      // If we pass array: [Joy, Sadness, Meh]
      // 1. Joy (skipped)
      // 2. Sadness (Far). maxDist = High.
      // 3. Meh (Near). Dist < maxDist. Else branch taken.
      selectEmotion: mockSelectEmotion,
      setFocusedEmotion: mockSetFocusedEmotion,
    }));

    render(<ActionSuggestions />);
    // Verify it picked Sadness, not Meh
    expect(screen.getByText("Find Path to Sadness")).toBeInTheDocument();
  });
});
