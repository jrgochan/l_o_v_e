
import { render, screen } from "@testing-library/react";
import { SessionTimeline } from "@/components/admin/clinical/SessionTimeline";
import type { EmotionTimelineEvent, VAC } from "@/types/chat";

describe("SessionTimeline", () => {
  const mockVAC: VAC = { valence: 0.5, arousal: 0.5, connection: 0.5 };
  const baseTime = new Date("2024-01-01T10:00:00");

  const mockEvents: EmotionTimelineEvent[] = [
    {
      timestamp: baseTime,
      emotion: "Neutral",
      confidence: 0.8,
      category: "Neutral",
      vac: mockVAC,
      alertLevel: "stable",
      intensity: 0.5,
      trigger: "start"
    },
    {
      timestamp: new Date(baseTime.getTime() + 60000), // +1 min
      emotion: "Joy",
      confidence: 0.9,
      category: "Positive",
      vac: { ...mockVAC, valence: 0.8 },
      alertLevel: "attention",
      intensity: 0.7,
      trigger: "joke"
    },
    {
      timestamp: new Date(baseTime.getTime() + 120000), // +2 min
      emotion: "Anxiety",
      confidence: 0.7,
      category: "Negative",
      vac: { ...mockVAC, arousal: 0.8 },
      alertLevel: "warning",
      intensity: 0.8,
      trigger: "stress"
    },
    {
      timestamp: new Date(baseTime.getTime() + 180000), // +3 min
      emotion: "Panic",
      confidence: 0.95,
      category: "Negative",
      vac: { ...mockVAC, arousal: 0.9 },
      alertLevel: "critical",
      intensity: 1.0,
      trigger: "trauma"
    },
    {
      timestamp: new Date(baseTime.getTime() + 240000), // +4 min
      emotion: "Depression",
      confidence: 0.85,
      category: "Negative",
      vac: { valence: -0.8, arousal: -0.5, connection: -0.6 },
      alertLevel: "attention",
      intensity: 0.6,
      trigger: "sadness"
    }
  ];

  it("renders nothing when timeline is empty", () => {
    const { container } = render(<SessionTimeline emotionTimeline={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders chronological timeline events", () => {
    render(<SessionTimeline emotionTimeline={mockEvents} />);

    expect(screen.getByText("🕐 Session Timeline")).toBeInTheDocument();

    // Check emotions present
    expect(screen.getAllByText("Neutral").length).toBeGreaterThan(0);
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Anxiety")).toBeInTheDocument();
    expect(screen.getByText("Panic")).toBeInTheDocument();

    // Check timestamps relative format
    expect(screen.getByText("+0:00")).toBeInTheDocument();
    expect(screen.getByText("+1:00")).toBeInTheDocument();
    expect(screen.getByText("+2:00")).toBeInTheDocument();
  });

  it("renders correct alert icons and styles", () => {
    render(<SessionTimeline emotionTimeline={mockEvents} />);

    // Critical - Panic
    expect(screen.getByText("High distress detected")).toBeInTheDocument();
    // Warning - Anxiety
    expect(screen.getByText("Monitor closely")).toBeInTheDocument();

    // Joy (Attention) - should have yellow dot icon
    // Note: The icon is unicode/emoji, so we check for presence in the DOM structure or specific class if needed.
    // The component uses emoji text for icons in specific spans.

    const panicEvent = screen.getByText("Panic").closest(".flex");
    expect(panicEvent).toBeInTheDocument();
  });

  it("renders VAC values correctly", () => {
    render(<SessionTimeline emotionTimeline={mockEvents} />);

    // Check formatted VAC strings
    // V: +0.50, +0.80
    // A: +0.50, +0.80, +0.90
    const vacElements = screen.getAllByText(/V:/);
    expect(vacElements.length).toBeGreaterThan(0);
  });
});
