import { render, screen } from "@testing-library/react";
import { SessionTimeline } from "@/components/admin/clinical/SessionTimeline";
import type { EmotionTimelineEvent } from "@/types/chat";

describe("SessionTimeline", () => {
  const baseTime = new Date("2024-01-01T10:00:00");
  const mockEvents: EmotionTimelineEvent[] = [
    {
      timestamp: baseTime,
      emotion: "Calm",
      category: "Peaceful",
      vac: { valence: 0.1, arousal: 0.1, connection: 0.5 },
      confidence: 0.9,
      alertLevel: "stable",
    },
    {
      timestamp: new Date(baseTime.getTime() + 65000), // +1m 5s
      emotion: "Anger",
      category: "Negative",
      vac: { valence: -0.8, arousal: 0.9, connection: 0.2 },
      confidence: 0.85,
      alertLevel: "critical",
    },
    {
      timestamp: new Date(baseTime.getTime() + 130000), // +2m 10s
      emotion: "Anxiety",
      category: "Negative",
      vac: { valence: -0.4, arousal: 0.6, connection: 0.3 },
      confidence: 0.5,
      alertLevel: "warning",
    },
    {
      timestamp: new Date(baseTime.getTime() + 195000), // +3m 15s
      emotion: "Slight Worry",
      category: "Negative",
      vac: { valence: -0.2, arousal: 0.3, connection: 0.4 },
      confidence: 0.6,
      alertLevel: "attention",
    }
  ];

  it("renders nothing when timeline is empty", () => {
    const { container } = render(<SessionTimeline emotionTimeline={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders timeline events correctly", () => {
    render(<SessionTimeline emotionTimeline={mockEvents} />);

    expect(screen.getByText(/Session Timeline/)).toBeInTheDocument();
    expect(screen.getByText(/4 events/)).toBeInTheDocument();

    // Check emotions
    expect(screen.getByText(/Calm/)).toBeInTheDocument();
    expect(screen.getByText(/Anger/)).toBeInTheDocument();
    expect(screen.getByText(/Anxiety/)).toBeInTheDocument();
    expect(screen.getByText(/Slight Worry/)).toBeInTheDocument();
  });

  it("calculates relative time correctly", () => {
    render(<SessionTimeline emotionTimeline={mockEvents} />);

    // First event is +0:00
    expect(screen.getByText("+0:00")).toBeInTheDocument();
    // Second is +1:05
    expect(screen.getByText("+1:05")).toBeInTheDocument();
    // Third is +2:10
    expect(screen.getByText("+2:10")).toBeInTheDocument();
    // Fourth +3:15
    expect(screen.getByText("+3:15")).toBeInTheDocument();
  });

  it("formats single digit seconds correctly", () => {
    const shortEvent = [{ ...mockEvents[0], timestamp: new Date(baseTime.getTime() + 6000) }]; // +0:06
    render(<SessionTimeline emotionTimeline={[mockEvents[0], ...shortEvent]} />);
    expect(screen.getByText("+0:06")).toBeInTheDocument();
  });

  it("displays correct alert indicators", () => {
    render(<SessionTimeline emotionTimeline={mockEvents} />);

    // Critical event (Anger)
    expect(screen.getByText("High distress detected")).toBeInTheDocument();

    // Warning event (Anxiety)
    expect(screen.getByText("Monitor closely")).toBeInTheDocument();

    // Attention event (Slight Worry) - No specific text block in code?
    // Checking code: only Critical and Warning have text blocks (lines 132-141).
    // Attention just has yellow/orange Icon (line 98) and color logic (line 25).
    // Let's verify the dot color class.
    const attentionText = screen.getByText("Slight Worry");
    // Find the marker. It's in the same parent structure.
    // We can rely on visual verification or logic.
    // The icon '🟡' should be present.
    expect(screen.getByText("🟡")).toBeInTheDocument();
  });

  it("displays VAC scores", () => {
    render(<SessionTimeline emotionTimeline={mockEvents} />);

    // Calm VAC: 0.1, 0.1, 0.5
    // V: +0.10, A: +0.10, C: +0.50
    expect(screen.getAllByText(/V: \+0.10/)[0]).toBeInTheDocument();
  });
});
