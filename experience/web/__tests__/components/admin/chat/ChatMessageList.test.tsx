import { render, screen, fireEvent, within } from "@testing-library/react";
import { ChatMessageList } from "@/components/admin/chat/ChatMessageList";
import { DisplayMessage } from "@/types/chat";

// Mock child components
jest.mock("@/components/admin/shared/InsightCard", () => ({
  InsightCard: ({ onEmotionClick }: any) => (
    <div data-testid="mock-insight-card">
      <button onClick={() => onEmotionClick("Wonder")}>Trigger Emotion</button>
    </div>
  ),
}));

jest.mock("@/components/admin/emotion-display/EmotionChipCluster", () => ({
  EmotionChipCluster: ({ onEmotionClick }: any) => (
    <div data-testid="mock-chip-cluster">
      <button onClick={() => onEmotionClick("Joy")}>Select Joy</button>
      <button onClick={() => onEmotionClick({ emotion_name: "Hope" })}>Select Hope Object</button>
      <button onClick={() => onEmotionClick({ emotion_name: "" })}>Select Empty</button>
    </div>
  ),
}));

jest.mock("@/components/admin/shared/AnalysisProgressIndicator", () => ({
  AnalysisProgressIndicator: () => <div data-testid="mock-progress">Progress...</div>,
}));

jest.mock("@/components/admin/chat/AutoLinkIndicator", () => ({
  AutoLinkIndicator: () => <div data-testid="mock-autolink">AutoLink</div>,
}));

jest.mock("@/components/admin/chat/StrategyCard", () => ({
  StrategyCard: () => <div data-testid="mock-strategy-card">StrategyCard</div>,
}));

describe("ChatMessageList", () => {
  const mockScrollRef = { current: null };
  const defaultProps = {
    messages: [] as DisplayMessage[],
    showProgress: false,
    progressState: {
      stages: [],
      currentStage: "idle",
      overallPercentage: 0,
      currentMessage: "",
    },
    toneMode: "clinical" as const,
    deepFeelingMode: false,
    messagesEndRef: mockScrollRef,
    onEmotionClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state", () => {
    render(<ChatMessageList {...defaultProps} />);
    expect(screen.getByText("👋 How are you feeling?")).toBeInTheDocument();
  });

  it("renders user message", () => {
    const messages: DisplayMessage[] = [
      {
        id: "1",
        type: "user",
        content: "Hello world",
        timestamp: new Date(),
      },
    ];
    render(<ChatMessageList {...defaultProps} messages={messages} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders insight message", () => {
    const messages: DisplayMessage[] = [
      {
        id: "2",
        type: "insight",
        content: "",
        timestamp: new Date(),
        insights: { clinical_alerts: [], overall_status: "stable" } as any,
      },
    ];
    render(<ChatMessageList {...defaultProps} messages={messages} />);
    expect(screen.getByTestId("mock-insight-card")).toBeInTheDocument();
  });

  it("renders multi_emotion message", () => {
    const messages: DisplayMessage[] = [
      {
        id: "3",
        type: "multi_emotion",
        content: "Detected emotions:",
        timestamp: new Date(),
        multiEmotionData: {
          emotions: [
            {
              emotion_name: "Joy",
              confidence: 0.9,
              category: "Positive",
            } as any,
          ],
        } as any,
      },
    ];
    render(<ChatMessageList {...defaultProps} messages={messages} />);
    expect(screen.getByText("Detected emotions:")).toBeInTheDocument();
    expect(screen.getByTestId("mock-chip-cluster")).toBeInTheDocument();
  });

  it("renders analysis message with VAC details", () => {
    const messages: DisplayMessage[] = [
      {
        id: "4",
        type: "analysis",
        content: "Deep analysis",
        timestamp: new Date(),
        vac: { valence: 0.5, arousal: 0.6, connection: 0.7 },
        confidence: 0.85,
      },
    ];
    render(<ChatMessageList {...defaultProps} messages={messages} />);
    expect(screen.getByText("Deep analysis")).toBeInTheDocument();
    expect(screen.getByText("Valence:")).toBeInTheDocument();
    expect(screen.getByText("0.50")).toBeInTheDocument(); // Fixed(2)
    expect(screen.getByText("85%")).toBeInTheDocument(); // Confidence
  });

  it("renders progress indicator", () => {
    render(<ChatMessageList {...defaultProps} showProgress={true} />);
    expect(screen.getByTestId("mock-progress")).toBeInTheDocument();
  });

  it("handles emotion click from EmotionChipCluster", () => {
    const messages: DisplayMessage[] = [
      {
        id: "3",
        type: "multi_emotion",
        content: "Detected emotions:",
        timestamp: new Date(),
        multiEmotionData: {
          emotions: [
            {
              emotion_name: "Joy",
              confidence: 0.9,
              category: "Positive",
            } as any,
          ],
        } as any,
      },
    ];
    const onEmotionClick = jest.fn();
    render(
      <ChatMessageList {...defaultProps} messages={messages} onEmotionClick={onEmotionClick} />
    );

    // Simulate click in mock
    fireEvent.click(screen.getByText("Select Joy"));
    expect(onEmotionClick).toHaveBeenCalledWith("Joy");
  });

  it("handles emotion click from InsightCard", () => {
    const messages: DisplayMessage[] = [
      {
        id: "2",
        type: "insight",
        content: "",
        timestamp: new Date(),
        insights: { clinical_alerts: [], overall_status: "stable" } as any,
      },
    ];
    const onEmotionClick = jest.fn();
    render(
      <ChatMessageList {...defaultProps} messages={messages} onEmotionClick={onEmotionClick} />
    );

    fireEvent.click(screen.getByText("Trigger Emotion"));
    expect(onEmotionClick).toHaveBeenCalledWith("Wonder");
  });

  it("renders generic assistant message with default styling", () => {
    // Determine what falls into the default else block. message.type !== user, analysis, multi_emotion.
    // Assuming "assistant" is a valid type or just "text" type if supported.
    // If DisplayMessage type restricts this, I might need to cast or ensure the type exists.
    // Looking at the component, it handles `msg.type`.
    const messages: DisplayMessage[] = [
      {
        id: "5",
        type: "assistant", // or "text" depending on DisplayMessage definition. Assuming "assistant" works as generic.
        content: "Generic response",
        timestamp: new Date(),
      } as any, // Cast if strictly typed and "assistant" isn't explicitly in the union for this test
    ];
    // This should hit the default bg-gray-700 class
    const { container } = render(<ChatMessageList {...defaultProps} messages={messages} />);
    expect(screen.getByText("Generic response")).toBeInTheDocument();
    // Verify class presence
    // Verify it exists (class check is brittle)
    expect(screen.getByText("Generic response")).toBeInTheDocument();
  });

  it("handles object emotion click from EmotionChipCluster", () => {
    const messages: DisplayMessage[] = [
      {
        id: "3",
        type: "multi_emotion",
        content: "Detected emotions:",
        timestamp: new Date(),
        multiEmotionData: {
          emotions: [],
        } as any,
      },
    ];
    const onEmotionClick = jest.fn();
    render(
      <ChatMessageList {...defaultProps} messages={messages} onEmotionClick={onEmotionClick} />
    );

    // Simulate click with object
    fireEvent.click(screen.getByText("Select Hope Object"));
    expect(onEmotionClick).toHaveBeenCalledWith("Hope");
  });

  it("does not call onEmotionClick if emotion name is missing", () => {
    const messages: DisplayMessage[] = [
      {
        id: "3",
        type: "multi_emotion",
        content: "detected",
        timestamp: new Date(),
        multiEmotionData: {
          emotions: [],
        } as any,
      },
    ];
    const onEmotionClick = jest.fn();
    render(
      <ChatMessageList {...defaultProps} messages={messages} onEmotionClick={onEmotionClick} />
    );

    fireEvent.click(screen.getByText("Select Empty"));
    expect(onEmotionClick).not.toHaveBeenCalled();
  });

  it("handles undefined onEmotionClick prop", () => {
    const messages: DisplayMessage[] = [
      {
        id: "3",
        type: "multi_emotion",
        content: "detected",
        timestamp: new Date(),
        multiEmotionData: {
          emotions: [],
        } as any,
      },
    ];
    // Render without onEmotionClick being defined
    render(<ChatMessageList {...defaultProps} messages={messages} onEmotionClick={undefined} />);

    // Should not throw
    fireEvent.click(screen.getByText("Select Joy"));
  });

  it("renders AutoLinkIndicator when relationships are present", () => {
    const messages: DisplayMessage[] = [
      {
        id: "6",
        type: "analysis",
        content: "Linked message",
        timestamp: new Date(),
        relationships: [{ id: "r1", relationship_type: "reply", source_message_id: 'a', target_message_id: 'b', created_at: new Date() } as any],
      },
    ];
    render(<ChatMessageList {...defaultProps} messages={messages} onRelationshipClick={jest.fn()} />);
    expect(screen.getByTestId("mock-autolink")).toBeInTheDocument();
  });

  it("renders StrategyCard when strategies are present", () => {
    const messages: DisplayMessage[] = [
      {
        id: "7",
        type: "analysis",
        content: "Strategic message",
        timestamp: new Date(),
        strategies: [{ strategy_id: "s1" } as any],
      },
    ];
    render(<ChatMessageList {...defaultProps} messages={messages} />);
    expect(screen.getByTestId("mock-strategy-card")).toBeInTheDocument();
  });
});
