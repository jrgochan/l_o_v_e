
import { render, screen } from "@testing-library/react";
import { AggregateVACDisplay } from "@/components/admin/state-display/AggregateVACDisplay";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useExperienceStore } from "@/stores/useExperienceStore";

// Mock Stores
jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/stores/useExperienceStore");

describe("AggregateVACDisplay", () => {
  const mockAllEmotions = [
    { id: "1", name: "Joy", vac: [0.8, 0.5, 0.7] },
    { id: "2", name: "Sadness", vac: [-0.8, -0.2, -0.4] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      allEmotions: mockAllEmotions,
      selectedEmotionIds: new Set(),
    }));
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      targetVAC: [0, 0, 0],
    }));
  });

  it("renders empty state when no emotions selected", () => {
    render(<AggregateVACDisplay />);
    expect(screen.getByText("No emotions selected")).toBeInTheDocument();
    expect(screen.getByText("Sphere at neutral position (0, 0, 0)")).toBeInTheDocument();
  });

  it("renders single emotion state", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      allEmotions: mockAllEmotions,
      selectedEmotionIds: new Set(["1"]),
    }));
    // Mock targetVAC matching Joy
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      targetVAC: [0.8, 0.5, 0.7],
    }));

    render(<AggregateVACDisplay />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
    // Check Valence display
    expect(screen.getByText("0.80")).toBeInTheDocument();
    expect(screen.getByText("Valence")).toBeInTheDocument();
    expect(screen.getByText("Positive")).toBeInTheDocument(); // > 0
  });

  it("renders aggregate state for multiple emotions", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      allEmotions: mockAllEmotions,
      selectedEmotionIds: new Set(["1", "2"]),
    }));
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      targetVAC: [0.0, 0.15, 0.15], // Averaged ish
    }));

    render(<AggregateVACDisplay />);
    expect(screen.getByText("(Aggregate of 2 emotions)")).toBeInTheDocument();
    expect(screen.getByText("Sphere showing emotional blend of selected emotions")).toBeInTheDocument();
  });

  it("displays correct descriptions based on values", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      allEmotions: mockAllEmotions,
      selectedEmotionIds: new Set(["1"]),
    }));

    // Test different values for descriptions
    // 1. Negative Valence, Low Arousal, Disconnected
    // USE UNIQUE VALUES TO AVOID AMBIGUITY
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      targetVAC: [-0.5, 0.2, -0.4],
    }));

    const { rerender } = render(<AggregateVACDisplay />);
    expect(screen.getByText("-0.50")).toHaveClass("text-red-400"); // Negative valence color
    expect(screen.getByText("Negative")).toBeInTheDocument();

    expect(screen.getByText("0.20")).toBeInTheDocument();
    expect(screen.getByText("Calm")).toBeInTheDocument(); // Arousal < 0.3

    expect(screen.getByText("-0.40")).toBeInTheDocument();
    expect(screen.getByText("Disconnected")).toBeInTheDocument(); // Connection < -0.3

    // 2. High Arousal, Connected
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      targetVAC: [0.0, 0.8, 0.88], // Unique
    }));

    rerender(<AggregateVACDisplay />);
    expect(screen.getByText("Very Intense")).toBeInTheDocument(); // Arousal > 0.6
    expect(screen.getByText("Connected")).toBeInTheDocument(); // Connection > 0.3
  });
});
