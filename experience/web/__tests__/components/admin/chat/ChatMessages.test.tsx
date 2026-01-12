import { render, screen } from "@testing-library/react";
import { ChatMessages } from "@/components/admin/chat/ChatMessages";
import type { DisplayMessage, ProgressStage } from "@/types/chat";

// Mock child components
jest.mock("@/components/admin/shared/InsightCard", () => ({
  InsightCard: ({ insights }: any) => <div data-testid="insight-card">{insights.summary}</div>,
}));

jest.mock("@/components/admin/emotion-display/EmotionChipCluster", () => ({
  EmotionChipCluster: ({ emotions }: any) => (
    <div data-testid="emotion-cluster">
      {emotions.map((e: any) => (
        <span key={e.emotion_name}>{e.emotion_name}</span>
      ))}
    </div>
  ),
}));

jest.mock("@/components/admin/shared/AnalysisProgressIndicator", () => ({
  AnalysisProgressIndicator: () => <div data-testid="progress-indicator">Progress</div>,
}));

// Mock logger
jest.mock("@/utils/logger", () => ({
  logger: {
    debug: jest.fn(),
  },
}));

describe("ChatMessages", () => {
  const mockScrollIntoView = jest.fn();

  beforeAll(() => {
    Element.prototype.scrollIntoView = mockScrollIntoView;
  });

  const defaultProps = {
    messages: [],
    showProgress: false,
    progressState: {
      stages: [] as ProgressStage[],
      currentStage: "",
      overallPercentage: 0,
      currentMessage: "",
    },
    toneMode: "warm" as const,
    deepFeelingMode: false,
    onEmotionClick: jest.fn(),
  };

  it("renders empty state", () => {
    render(<ChatMessages {...defaultProps} />);
    expect(screen.getByText(/How are you feeling/)).toBeInTheDocument();
  });

  it("renders user message", () => {
    const messages: DisplayMessage[] = [
      {
        id: "1",
        type: "user",
        content: "I feel happy",
        timestamp: new Date(),
      },
    ];

    render(<ChatMessages {...defaultProps} messages={messages} />);
    expect(screen.getByText("I feel happy")).toBeInTheDocument();
    expect(screen.queryByText(/How are you feeling/)).not.toBeInTheDocument();
  });

  it("renders analysis message with VAC", () => {
    const messages: DisplayMessage[] = [
      {
        id: "2",
        type: "analysis",
        content: "Detected: Joy",
        emotion: "Joy",
        category: "Positive",
        vac: { valence: 0.8, arousal: 0.6, connection: 0.5 },
        confidence: 0.9,
        timestamp: new Date(),
      } as any,
    ]; // Allow partial/extras

    render(<ChatMessages {...defaultProps} messages={messages} />);
    expect(screen.getByText("Detected: Joy")).toBeInTheDocument();
    expect(screen.getByText("Valence:")).toBeInTheDocument();
    expect(screen.getByText("0.80")).toBeInTheDocument();
  });

  it("renders multi-emotion message", () => {
    const messages: DisplayMessage[] = [
      {
        id: "3",
        type: "multi_emotion",
        content: "Complex state detected",
        multiEmotionData: {
          id: "me-1",
          emotions: [
            { emotion_name: "Joy", confidence: 0.8 },
            { emotion_name: "Excitement", confidence: 0.7 },
          ],
        },
        timestamp: new Date(),
      } as any,
    ];

    render(<ChatMessages {...defaultProps} messages={messages} />);
    expect(screen.getByText("Complex state detected")).toBeInTheDocument();
    expect(screen.getByTestId("emotion-cluster")).toBeInTheDocument();
  });

  it("renders insight message", () => {
    const messages: DisplayMessage[] = [
      {
        id: "4",
        type: "insight",
        content: "Insight Summary",
        insights: { summary: "Insight Summary", patterns: [] },
        timestamp: new Date(),
      } as any,
    ];

    render(<ChatMessages {...defaultProps} messages={messages} />);
    expect(screen.getByTestId("insight-card")).toBeInTheDocument();
    expect(screen.getByText("Insight Summary")).toBeInTheDocument();
  });

  it("renders progress indicator when showProgress is true", () => {
    render(<ChatMessages {...defaultProps} showProgress={true} />);
    expect(screen.getByTestId("progress-indicator")).toBeInTheDocument();
  });

  it("scrolls into view on new messages", () => {
    const { rerender } = render(<ChatMessages {...defaultProps} />);

    // Initial render might trigger effect depending on impl, usually does.
    // Let's add a message
    const messages: DisplayMessage[] = [
      {
        id: "1",
        type: "user",
        content: "New msg",
        timestamp: new Date(),
      },
    ];

    rerender(<ChatMessages {...defaultProps} messages={messages} />);
    expect(mockScrollIntoView).toHaveBeenCalled();
  });
});
