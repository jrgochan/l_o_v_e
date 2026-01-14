
import { render, screen } from "@testing-library/react";
import { SessionTimeline } from "@/components/admin/clinical/SessionTimeline";
import type { EmotionTimelineEvent } from "@/types/chat";

describe("SessionTimeline", () => {
  const sessionStart = new Date("2024-01-01T12:00:00");
  const mockTimeline: EmotionTimelineEvent[] = [
    {
      id: "1",
      timestamp: sessionStart,
      emotion: "Joy",
      category: "joy",
      confidence: 0.9,
      vac: { valence: 0.8, arousal: 0.5, connection: 0.7 },
      alertLevel: "stable"
    },
    {
      id: "2",
      timestamp: new Date(sessionStart.getTime() + 65000), // +1:05
      emotion: "Anxiety",
      category: "fear",
      confidence: 0.7,
      vac: { valence: -0.5, arousal: 0.8, connection: -0.2 },
      alertLevel: "warning"
    },
    {
      id: "3",
      timestamp: new Date(sessionStart.getTime() + 125000), // +2:05
      emotion: "Panic",
      category: "fear",
      confidence: 0.6,
      vac: { valence: -0.9, arousal: 0.9, connection: -0.8 },
      alertLevel: "critical"
    }
  ];

  it("renders nothing if timeline empty", () => {
    const { container } = render(<SessionTimeline emotionTimeline={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders timeline events correctly", () => {
    render(<SessionTimeline emotionTimeline={mockTimeline} />);
    expect(screen.getByText("3 events")).toBeInTheDocument();

    // Check emotions
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Anxiety")).toBeInTheDocument();
    expect(screen.getByText("Panic")).toBeInTheDocument();

    // Check relative time
    expect(screen.getByText("+0:00")).toBeInTheDocument();
    expect(screen.getByText("+1:05")).toBeInTheDocument();
    expect(screen.getByText("+2:05")).toBeInTheDocument();
  });

  it("displays alert icons and messages", () => {
    render(<SessionTimeline emotionTimeline={mockTimeline} />);

    // Warning
    expect(screen.getByText("⚠️")).toBeInTheDocument();
    expect(screen.getByText("Monitor closely")).toBeInTheDocument();

    // Critical
    expect(screen.getByText("🔴")).toBeInTheDocument();
    expect(screen.getByText("High distress detected")).toBeInTheDocument();
  });

  it("renders legend", () => {
    render(<SessionTimeline emotionTimeline={mockTimeline} />);
    expect(screen.getByText("Alert Levels:")).toBeInTheDocument();
    expect(screen.getByText("Stable")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });
});
