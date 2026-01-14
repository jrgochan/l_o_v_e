import { render, screen } from "@testing-library/react";
import { ChatMessages } from "@/components/admin/chat/ChatMessages";
import type { DisplayMessage, ProgressStage } from "@/types/chat";
import React from "react";

// Mock Child Component
jest.mock("@/components/admin/chat/ChatMessageList", () => ({
  ChatMessageList: (props: any) => {
    // Render a div that we can find, and attach the ref if provided so we can test the effect
    return (
      <div data-testid="mock-message-list">
        <div ref={props.messagesEndRef} data-testid="mock-scroll-anchor" />
        <span>Count: {props.messages.length}</span>
        <span>Progress: {props.showProgress ? "shown" : "hidden"}</span>
      </div>
    );
  },
}));

describe("ChatMessages", () => {
  const mockScrollIntoView = jest.fn();

  beforeAll(() => {
    // Mock scrollIntoView on HTMLElement prototype
    window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView;
  });

  beforeEach(() => {
    jest.clearAllMocks();
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

  it("renders ChatMessageList with correct props", () => {
    const messages: DisplayMessage[] = [
      { id: "1", type: "user", content: "test", timestamp: new Date() },
    ];
    render(<ChatMessages {...defaultProps} messages={messages} />);

    expect(screen.getByTestId("mock-message-list")).toBeInTheDocument();
    expect(screen.getByText("Count: 1")).toBeInTheDocument();
  });

  it("triggers scrollIntoView when messages change", () => {
    const { rerender } = render(<ChatMessages {...defaultProps} />);
    // Initial render might trigger it depending on ref attachment timing, 
    // but usually ref is null on first pass execution of effect if rendered strictly? 
    // Actually in React Testing Library, refs update synchronously after render.
    // The effect runs after render. So ref.current should be populated.
    // However, if messages are empty, effect runs.

    // Clear initial call if any
    mockScrollIntoView.mockClear();

    const messages: DisplayMessage[] = [
      { id: "1", type: "user", content: "new", timestamp: new Date() },
    ];
    rerender(<ChatMessages {...defaultProps} messages={messages} />);

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("triggers scrollIntoView when showProgress changes", () => {
    const { rerender } = render(<ChatMessages {...defaultProps} />);
    mockScrollIntoView.mockClear();

    rerender(<ChatMessages {...defaultProps} showProgress={true} />);
    expect(mockScrollIntoView).toHaveBeenCalled();
  });
});
