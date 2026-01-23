import { render, screen } from "@testing-library/react";
import { AggregateVACHeaderDisplay } from "../../../../components/admin/state-display/AggregateVACHeaderDisplay";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useExperienceStore } from "@/stores/useExperienceStore";

// Mock stores
jest.mock("@/stores/useVisualizationStore");
jest.mock("@/stores/useExperienceStore");

describe("AggregateVACHeaderDisplay", () => {
  const mockAllEmotions = [
    { id: "joy", name: "Joy", vac: [0.8, 0.6, 0.4] },
    { id: "sadness", name: "Sadness", vac: [-0.6, -0.4, -0.2] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        selectedEmotionIds: new Set(),
        allEmotions: mockAllEmotions,
      })
    );
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        targetVAC: [0, 0, 0],
      })
    );
  });

  it("renders empty state when no emotions selected", () => {
    render(<AggregateVACHeaderDisplay />);
    expect(screen.getByText("No selection")).toBeInTheDocument();
    expect(screen.getByText("Soul Sphere:")).toBeInTheDocument();
  });

  it("renders single emotion label", () => {
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        selectedEmotionIds: new Set(["joy"]),
        allEmotions: mockAllEmotions,
      })
    );
    render(<AggregateVACHeaderDisplay />);
    expect(screen.getByText("Emotion:")).toBeInTheDocument();
  });

  it("renders aggregate label and count for multiple emotions", () => {
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        selectedEmotionIds: new Set(["joy", "sadness"]),
        allEmotions: mockAllEmotions,
      })
    );
    render(<AggregateVACHeaderDisplay />);
    expect(screen.getByText("Aggregate:")).toBeInTheDocument();
    expect(screen.getByText("(2 emotions)")).toBeInTheDocument();
  });

  describe("VAC Formatting", () => {
    const testRender = (vac: [number, number, number]) => {
      (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) =>
        selector({
          selectedEmotionIds: new Set(["joy"]),
          allEmotions: mockAllEmotions,
        })
      );
      (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) =>
        selector({
          targetVAC: vac,
        })
      );
      render(<AggregateVACHeaderDisplay />);
    };

    it("formats positive values with + sign", () => {
      testRender([0.5, 0.5, 0.5]);
      const values = screen.getAllByText("+0.50");
      expect(values.length).toBe(3); // V, A, C
    });

    it("formats negative values normally", () => {
      testRender([-0.5, -0.5, -0.5]);
      const values = screen.getAllByText("-0.50");
      expect(values.length).toBe(3);
    });

    // Valence
    it("renders correct Valence descriptions and colors", () => {
      // Positive (> 0.3)
      testRender([0.4, 0, 0]);
      expect(screen.getByText("Positive")).toBeInTheDocument();
      expect(screen.getByText("+0.40")).toHaveClass("text-cyan-400");

      // Negative (< -0.3) - cleanup previous render
      jest.clearAllMocks(); // Actually render creates new DOM, testing library handles cleanup usually but mocks persistence might issue.

      // Re-render approach or checking separate elements if test fails due to accumulation?
      // Testing Library cleans up DOM. Mocks need resetting if changed per test.
    });

    it("renders Negative Valence", () => {
      testRender([-0.4, 0, 0]);
      expect(screen.getByText("Negative")).toBeInTheDocument();
      expect(screen.getByText("-0.40")).toHaveClass("text-red-400");
    });

    it("renders Neutral Valence", () => {
      testRender([0.2, 0, 0]);
      const neutrals = screen.getAllByText("Neutral");
      expect(neutrals.length).toBeGreaterThan(0);
      expect(screen.getByText("+0.20")).toHaveClass("text-yellow-400");
    });

    // Arousal
    it("renders Intense Arousal (> 0.6)", () => {
      testRender([0, 0.7, 0]);
      expect(screen.getByText("Intense")).toBeInTheDocument();
    });

    it("renders Active Arousal (> 0.3)", () => {
      testRender([0, 0.4, 0]);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders Very Calm Arousal (< -0.6)", () => {
      testRender([0, -0.7, 0]);
      expect(screen.getByText("Very Calm")).toBeInTheDocument();
    });

    it("renders Calm Arousal (< -0.3)", () => {
      testRender([0, -0.4, 0]);
      expect(screen.getByText("Calm")).toBeInTheDocument();
    });

    it("renders Neutral Arousal", () => {
      testRender([0, 0.2, 0]);
      const neutrals = screen.getAllByText("Neutral");
      expect(neutrals.length).toBeGreaterThan(0); // Might match V and C too
    });

    // Connection
    it("renders Deeply Connected (> 0.6)", () => {
      testRender([0, 0, 0.7]);
      expect(screen.getByText("Deeply Connected")).toBeInTheDocument();
    });

    it("renders Connected (> 0.3)", () => {
      testRender([0, 0, 0.4]);
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });

    it("renders Isolated (< -0.6)", () => {
      testRender([0, 0, -0.7]);
      expect(screen.getByText("Isolated")).toBeInTheDocument();
    });

    it("renders Disconnected (< -0.3)", () => {
      testRender([0, 0, -0.4]);
      expect(screen.getByText("Disconnected")).toBeInTheDocument();
    });
  });
});
