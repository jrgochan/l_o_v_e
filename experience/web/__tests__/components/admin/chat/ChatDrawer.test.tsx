import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatDrawer } from "@/components/admin/chat/ChatDrawer";
import { logger } from "@/utils/logger";
import { useWebSocketChat } from "@/hooks/useWebSocketChat";

// Mocks
jest.mock("@/hooks/useWebSocketChat", () => ({
  useWebSocketChat: jest.fn(),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock child components to facilitate interaction testing
jest.mock("@/components/admin/chat/AutoLinkIndicator", () => ({
  AutoLinkIndicator: ({ onRelationshipClick }: any) => (
    <button onClick={() => onRelationshipClick({ target_message_id: "thread-1" })}>
      View Thread
    </button>
  ),
}));

jest.mock("@/components/admin/chat/StrategyCard", () => ({
  StrategyCard: () => <div data-testid="mock-strategy">Strategy</div>,
}));

jest.mock("@/components/admin/chat/ThreadView", () => ({
  ThreadView: ({ rootMessageId, onClose }: any) => (
    <div data-testid="thread-view">
      Thread: {rootMessageId}
      <button onClick={onClose}>Close Thread</button>
    </div>
  ),
}));

describe("ChatDrawer", () => {
  const mockOnToggle = jest.fn();
  const mockSendMessage = jest.fn();
  const mockUpdateTone = jest.fn();

  const defaultWebSocketState = {
    isConnected: false,
    isConnecting: false,
    sendMessage: mockSendMessage,
    updateTonePreference: mockUpdateTone,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useWebSocketChat as jest.Mock).mockReturnValue({ ...defaultWebSocketState });
  });

  const getSocketCallbacks = () => {
    const calls = (useWebSocketChat as jest.Mock).mock.calls;
    // Last call
    return calls[calls.length - 1][0];
  };

  it("renders closed state", () => {
    // When closed, it renders a button "Chat"
    render(<ChatDrawer isOpen={false} onToggle={mockOnToggle} sessionId="sess1" />);
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("renders open state", () => {
    (useWebSocketChat as jest.Mock).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
    });
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);

    expect(screen.getByPlaceholderText(/How are you feeling/i)).toBeInTheDocument();
    expect(screen.getByText("Emotional Chat")).toBeInTheDocument();
  });

  it("handles sending messages", async () => {
    (useWebSocketChat as jest.Mock).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
    });
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);

    const input = screen.getByPlaceholderText(/How are you feeling/i);
    const sendBtn = screen.getByText("Send");

    await userEvent.type(input, "Hello World");

    await userEvent.click(sendBtn);

    expect(mockSendMessage).toHaveBeenCalledWith("Hello World", expect.any(String)); // Corrected expectation
  });

  it("handles websocket events: onMessage", async () => {
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onMessage({ type: "message_received", content: "" });
    });

    expect(logger.debug).toHaveBeenCalledWith(
      "websocket",
      "Chat message received",
      expect.anything()
    );
    // Verify processing state
    expect(screen.getByText("Analyzing...")).toBeInTheDocument();
  });

  it("handles Enter key to send", async () => {
    (useWebSocketChat as jest.Mock).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
    });
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);

    const input = screen.getByPlaceholderText(/How are you feeling/i);
    await userEvent.type(input, "Message via Enter{enter}");

    expect(mockSendMessage).toHaveBeenCalledWith("Message via Enter", expect.any(String));
  });

  it("handles websocket events: Transcription", async () => {
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onTranscription("Voice text");
    });

    expect(screen.getByText("Voice text")).toBeInTheDocument();
  });

  it("handles websocket events: Analysis", async () => {
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onAnalysis("Joy", "positive", { valence: 1, arousal: 0.5, connection: 0 }, 0.9);
    });

    expect(screen.getByText(/Detected: Joy/)).toBeInTheDocument();
  });

  it("handles websocket events: Analysis with Mapping", async () => {
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onAnalysis(
        "Joy",
        "Happy",
        { valence: 0.8, arousal: 0.5, connection: 0.6 },
        0.95,
        "Ecstatic", // originalEmotion
        "fuzzy", // matchMethod
        0.88 // matchConfidence
      );
    });

    // Check content string construction (Line 86)
    expect(screen.getByText('Detected: Joy (mapped from "Ecstatic")')).toBeInTheDocument();

    // Check mapping details (Lines 303-307)
    expect(screen.getByText("Mapping:")).toBeInTheDocument();
    expect(screen.getByText("fuzzy (88%)")).toBeInTheDocument();
  });

  it("handles websocket events: Analysis with Mapping (no confidence)", async () => {
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onAnalysis(
        "Joy",
        "Happy",
        { valence: 0.8, arousal: 0.5, connection: 0.6 },
        0.95,
        "Ecstatic", // originalEmotion
        "fuzzy", // matchMethod
        undefined // matchConfidence missing
      );
    });

    expect(screen.getByText("fuzzy (0%)")).toBeInTheDocument();
  });

  it("handles websocket events: Insight", async () => {
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onInsight({ summary: "Deep Insight", voice_content_correlation: {} });
    });

    expect(screen.getByText("Deep Insight")).toBeInTheDocument();
  });

  it("handles websocket events: Error", async () => {
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onError("Oops");
    });

    expect(logger.error).toHaveBeenCalled();
  });

  it("handles resizing", () => {
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);

    const handle = screen.getByTestId("resize-handle");

    fireEvent.mouseDown(handle, { clientY: 500 });
    fireEvent.mouseMove(document, { clientY: 400 });
    fireEvent.mouseMove(document, { clientY: 400 });
    fireEvent.mouseUp(document);
  });

  it("handles passive mouse move (not resizing)", () => {
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);
    // Just move mouse without down
    fireEvent.mouseMove(document, { clientY: 400 });
    // Should hit guard and do nothing
  });

  it("toggles tone", async () => {
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);
    const btn = screen.getByText(/Warm/); // Default is Warm
    await userEvent.click(btn);
    expect(screen.getByText(/Clinical/)).toBeInTheDocument();

    // Toggle back
    await userEvent.click(screen.getByText(/Clinical/));
    expect(screen.getByText(/Warm/)).toBeInTheDocument();
  });

  it("cleans up event listeners on unmount", () => {
    const addSpy = jest.spyOn(document, "addEventListener");
    const removeSpy = jest.spyOn(document, "removeEventListener");

    const { unmount } = render(
      <ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />
    );

    // Trigger resize start to attach listeners
    const handle = screen.getByTestId("resize-handle");
    fireEvent.mouseDown(handle);

    expect(addSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("ignores messages with unknown type", async () => {
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    // Should not throw or process
    await act(async () => {
      callbacks.onMessage({ type: "unknown_type", content: "" });
    });

    expect(screen.queryByText("Analyzing...")).not.toBeInTheDocument();
  });

  it("does not send message if content empty", async () => {
    (useWebSocketChat as jest.Mock).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
    });
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);

    const input = screen.getByPlaceholderText(/How are you feeling/i);
    await userEvent.type(input, "   ");

    // Enter key
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });
    expect(mockSendMessage).not.toHaveBeenCalled();

    // Click button
    const sendBtn = screen.getByText("Send");
    fireEvent.click(sendBtn);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("does not send message if disconnected", () => {
    (useWebSocketChat as jest.Mock).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: false,
    });
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);

    const input = screen.getByPlaceholderText(/How are you feeling/i) as HTMLInputElement;
    expect(input).toBeDisabled();

    // Force event to verify guard despite disabled UI
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("opens ThreadView when relationship is clicked", async () => {
    (useWebSocketChat as jest.Mock).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
    });
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);

    // Inject a message with relationship
    const callbacks = getSocketCallbacks();

    // Use fake timers to control ID generation
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));
    const fixedTimestamp = new Date().getTime().toString();

    await act(async () => {
      callbacks.onAnalysis("Joy", "positive", { valence: 1, arousal: 1, connection: 1 }, 1);

      // Now dispatch relationship for this ID
      callbacks.onMessageRelationship({
        id: "rel1",
        source_message_id: fixedTimestamp,
        target_message_id: "thread-1",
        relationship_type: "reply",
        created_at: new Date(),
      });
    });

    // Check for "View Thread" button from AutoLinkIndicator mock
    await waitFor(() => {
      expect(screen.queryByText(/View Thread/)).toBeInTheDocument();
    });

    const viewBtn = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === "button" && content.includes("View Thread");
    });

    fireEvent.click(viewBtn);

    expect(screen.getByText("Thread: thread-1")).toBeInTheDocument();

    // Close
    fireEvent.click(screen.getByText("Close Thread"));
    expect(screen.queryByText("Thread: thread-1")).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  it("updates existing message with relationship but ignores non-matching messages", async () => {
    (useWebSocketChat as jest.Mock).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
    });
    render(<ChatDrawer isOpen={true} onToggle={mockOnToggle} sessionId="sess1" />);
    // Inject a message with ID "msg-1"
    const callbacks = getSocketCallbacks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));
    // We can't control the ID easily unless we mock Date for the first message too.
    // The previous test did this.

    await act(async () => {
      // Message 1
      callbacks.onAnalysis("Joy", "positive", { valence: 1, arousal: 1, connection: 1 }, 1);
    });

    // Now advance time to get a different ID if we added another message?
    // But we just need to ensure the map function handles "false" case.
    // If we have 1 message, and we send relationship for a DIFFERENT ID, it should NOT update the message.

    await act(async () => {
      // Relationship for non-existent message
      callbacks.onMessageRelationship({
        id: "rel2",
        source_message_id: "non-existent-id",
        target_message_id: "thread-2",
        relationship_type: "reply",
        created_at: new Date(),
      });
    });

    // Check that our message is still there and valid (render didn't crash)
    // And ideally that it DOESN'T have the relationship.
    // But since it didn't have one before, we can't distinguish "didn't add" from "didn't have".
    // Wait, if it updated, it would have "relationships" array.
    // We can check that "View Thread" is NOT present.
    expect(screen.queryByText(/View Thread/)).not.toBeInTheDocument();

    jest.useRealTimers();
  });
});
