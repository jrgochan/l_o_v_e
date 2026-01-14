
import { render, screen } from "@testing-library/react";
import { SessionTimeline } from "@/components/admin/clinical/SessionTimeline";
import { EmotionTimelineEvent } from "@/types/chat";

describe("SessionTimeline", () => {
  const baseTime = new Date("2024-01-01T10:00:00Z");

  const mockEvents: EmotionTimelineEvent[] = [
    {
      timestamp: baseTime,
      emotion: "Joy",
      confidence: 0.9,
      category: "Positive",
      vac: { valence: 0.8, arousal: 0.5, connection: 0.6 },
      alertLevel: "stable"
    },
    {
      timestamp: new Date(baseTime.getTime() + 65000), // +1:05
      emotion: "Anxiety",
      confidence: 0.7,
      category: "Negative",
      vac: { valence: -0.5, arousal: 0.8, connection: -0.2 },
      alertLevel: "warning"
    },
    {
      timestamp: new Date(baseTime.getTime() + 125000), // +2:05
      emotion: "Panic",
      confidence: 0.95,
      category: "Negative",
      vac: { valence: -0.9, arousal: 0.9, connection: -0.8 },
      alertLevel: "critical"
    }
  ];

  it("renders nothing when timeline is empty", () => {
    const { container } = render(<SessionTimeline emotionTimeline={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders timeline events correctly", () => {
    render(<SessionTimeline emotionTimeline={mockEvents} />);

    expect(screen.getByText("🕐 Session Timeline")).toBeInTheDocument();
    expect(screen.getByText("3 events")).toBeInTheDocument();

    // Check emotions
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Anxiety")).toBeInTheDocument();
    expect(screen.getByText("Panic")).toBeInTheDocument();

    // Check relative times
    expect(screen.getByText("+0:00")).toBeInTheDocument();
    expect(screen.getByText("+1:05")).toBeInTheDocument();
    expect(screen.getByText("+2:05")).toBeInTheDocument();
  });

  it("renders alert warnings and critical messages", () => {
    render(<SessionTimeline emotionTimeline={mockEvents} />);

    expect(screen.getByText("High distress detected")).toBeInTheDocument();
    expect(screen.getByText("Monitor closely")).toBeInTheDocument();
  });

  it("renders attention level correctly", () => {
    const attentionEvent: EmotionTimelineEvent[] = [{
      ...mockEvents[0],
      alertLevel: "attention",
      emotion: "Concern"
    }];

    render(<SessionTimeline emotionTimeline={attentionEvent} />);

    // Icon for attention is 🟡
    expect(screen.getByText("🟡")).toBeInTheDocument();
    // Should have orange border class (we can't easily check class but we check absence of crash)
  });

  it("renders stable level correctly (default)", () => {
    const stableEvent: EmotionTimelineEvent[] = [{
      ...mockEvents[0],
      alertLevel: undefined // Default fallback
    }];
    render(<SessionTimeline emotionTimeline={stableEvent} />);
    // Should not have alert icons
    expect(screen.queryByText("🔴")).not.toBeInTheDocument();
    expect(screen.queryByText("⚠️")).not.toBeInTheDocument();
    expect(screen.queryByText("High distress detected")).not.toBeInTheDocument();
  });

  it("renders explicit stable level correctly", () => {
    const stableEvent: EmotionTimelineEvent[] = [{
      ...mockEvents[0],
      alertLevel: "stable"
    }];
    render(<SessionTimeline emotionTimeline={stableEvent} />);
    expect(screen.queryByText("🔴")).not.toBeInTheDocument();
  });

  it("renders VAC values correctly", () => {
    render(<SessionTimeline emotionTimeline={[mockEvents[0]]} />);
    // V: +0.80 A: +0.50 C: +0.60
    // The component renders them in separate spans.
    // We can check text content roughly.
    expect(screen.getByText((content) => content.includes("V: +0.80"))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("A: +0.50"))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("C: +0.60"))).toBeInTheDocument();
  });

  it("renders negative VAC values correctly", () => {
    const negativeEvent: EmotionTimelineEvent[] = [{
      ...mockEvents[0],
      vac: { valence: -0.5, arousal: -0.2, connection: -0.1 }
    }];
    render(<SessionTimeline emotionTimeline={negativeEvent} />);
    // Should NOT have "+" sign
    expect(screen.getByText((content) => content.includes("V: -0.50"))).toBeInTheDocument();
    expect(screen.queryByText((content) => content.includes("V: +"))).not.toBeInTheDocument();
  });
});
