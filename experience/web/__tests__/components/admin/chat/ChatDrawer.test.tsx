import { render, screen, fireEvent, act } from "@testing-library/react";
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
});
