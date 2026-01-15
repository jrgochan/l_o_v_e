import { render, screen, fireEvent } from "@testing-library/react";
import { VACTrajectoryPlot } from "@/components/admin/clinical/VACTrajectoryPlot";
import type { VACHistoryPoint } from "@/types/chat";

const mockHistory: VACHistoryPoint[] = [
  {
    timestamp: new Date("2024-01-01T10:00:00"),
    vac: { valence: 0.1, arousal: 0.2, connection: 0.5 },
    emotion: "Neutral",
    confidence: 0.8,
  },
  {
    timestamp: new Date("2024-01-01T10:05:00"),
    vac: { valence: 0.3, arousal: 0.4, connection: 0.6 },
    emotion: "Calm",
    confidence: 0.85,
  },
  {
    timestamp: new Date("2024-01-01T10:10:00"),
    vac: { valence: 0.8, arousal: 0.7, connection: 0.9 },
    emotion: "Joy",
    confidence: 0.9,
  },
];

describe("VACTrajectoryPlot", () => {
  it("renders nothing if insufficient history", () => {
    const { container } = render(<VACTrajectoryPlot vacHistory={[mockHistory[0]]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders chart with correct points and stats", () => {
    render(<VACTrajectoryPlot vacHistory={mockHistory} />);

    // Check header
    expect(screen.getByText(/Emotional Journey/)).toBeInTheDocument();
    expect(screen.getByText("3 points")).toBeInTheDocument();

    // Check summary stats using regex for flexibility
    expect(screen.getByText(/\+\s*0\.70/)).toBeInTheDocument(); // Valence 0.8 - 0.1
    expect(screen.getByText(/\+\s*0\.50/)).toBeInTheDocument(); // Arousal 0.7 - 0.2
  });

  it("renders negative stats correctly", () => {
    // Create decreasing trend
    const decreaseHistory = [
      { ...mockHistory[0], vac: { valence: 0.8, arousal: 0.8, connection: 0 } },
      { ...mockHistory[1], vac: { valence: 0.5, arousal: 0.5, connection: 0 } },
      { ...mockHistory[2], vac: { valence: 0.2, arousal: 0.3, connection: 0 } },
    ];
    render(<VACTrajectoryPlot vacHistory={decreaseHistory} />);
    // Valence: 0.2 - 0.8 = -0.6
    expect(screen.getByText("-0.60")).toBeInTheDocument();
    // Arousal: 0.3 - 0.8 = -0.5
    expect(screen.getByText("-0.50")).toBeInTheDocument();

    // Should have red color class text-red-400
    expect(screen.getByText("-0.60").className).toContain("text-red-400");
  });

  describe("Pattern Detection", () => {
    it("detects rapid shifts", () => {
      const jerkyHistory: VACHistoryPoint[] = [
        {
          timestamp: new Date(),
          vac: { valence: 0, arousal: 0, connection: 0 },
          emotion: "A",
          confidence: 1,
        },
        {
          timestamp: new Date(),
          vac: { valence: 0.9, arousal: 0.9, connection: 0 },
          emotion: "B",
          confidence: 1,
        }, // >0.5 diff
        {
          timestamp: new Date(),
          vac: { valence: -0.9, arousal: -0.9, connection: 0 },
          emotion: "C",
          confidence: 1,
        }, // >0.5 diff
      ];
      render(<VACTrajectoryPlot vacHistory={jerkyHistory} />);
      expect(screen.getByText("Rapid emotional shifts detected")).toBeInTheDocument();
    });

    it("detects negative bias", () => {
      // 3 points, 3 negative (< -0.2) -> 100% > 70%
      const negativeHistory = mockHistory.map((p) => ({
        ...p,
        vac: { ...p.vac, valence: -0.5 },
      }));
      render(<VACTrajectoryPlot vacHistory={negativeHistory} />);
      expect(screen.getByText("Persistent negative emotional state")).toBeInTheDocument();
    });

    it("detects positive trend", () => {
      // End - Start > 0.3
      // 0.8 - 0.1 = 0.7 > 0.3
      render(<VACTrajectoryPlot vacHistory={mockHistory} />);
      expect(screen.getByText("Positive emotional progression")).toBeInTheDocument();
    });

    it("detects arousal escalation", () => {
      // End - Start > 0.4
      // 0.7 - 0.2 = 0.5 > 0.4
      render(<VACTrajectoryPlot vacHistory={mockHistory} />);
      expect(screen.getByText("Arousal escalation detected")).toBeInTheDocument();
    });
  });

  it("shows tooltip on hover for all points", () => {
    const { container } = render(<VACTrajectoryPlot vacHistory={mockHistory} />);

    const divPoints = container.querySelectorAll("div.cursor-pointer");
    const circles = container.querySelectorAll("circle");
    const pointerCircles = Array.from(circles).filter((c) =>
      c.getAttribute("style")?.includes("cursor: pointer")
    );

    const allPoints = [...Array.from(divPoints), ...pointerCircles];
    expect(allPoints.length).toBeGreaterThanOrEqual(3);

    allPoints.forEach((point) => {
      fireEvent.mouseEnter(point);
      // Use refined regex to query ONLY the V: ... A: ... format
      // Default Quadrant label is "IV: Joyful" which matches /V:/.
      const tooltips = screen.getAllByText(/V:.*A:/); // "V: 0.80, A: 0.70"
      expect(tooltips.length).toBeGreaterThan(0);

      fireEvent.mouseLeave(point);
      expect(screen.queryByText(/V:.*A:/)).not.toBeInTheDocument();
    });
  });
});
