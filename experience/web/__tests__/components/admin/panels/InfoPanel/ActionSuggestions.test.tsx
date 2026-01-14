
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
});
