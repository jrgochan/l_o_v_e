import { render, screen, fireEvent } from "@testing-library/react";
import { ChatInput } from "@/components/admin/chat/ChatInput";

// Mock VoiceRecorder to test integration
jest.mock("@/components/admin/shared/VoiceRecorder", () => ({
  VoiceRecorder: ({ isOpen, onClose, onSend }: any) =>
    isOpen ? (
      <div data-testid="voice-recorder-modal">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSend("Transcribed text")}>Send Voice</button>
      </div>
    ) : null,
}));

describe("ChatInput", () => {
  const defaultProps = {
    inputText: "",
    setInputText: jest.fn(),
    onSend: jest.fn(),
    onSendAudio: jest.fn(),
    isConnected: true,
    isProcessing: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render input field and buttons", () => {
    render(<ChatInput {...defaultProps} />);

    expect(screen.getByPlaceholderText(/how are you feeling/i)).toBeInTheDocument();
    // Microphone button
    expect(screen.getByTitle(/record voice/i)).toBeInTheDocument();
    // Send button text
    expect(screen.getByText("Send")).toBeInTheDocument();
  });

  it("should handle text input changes", () => {
    render(<ChatInput {...defaultProps} />);

    const input = screen.getByPlaceholderText(/how are you feeling/i);
    fireEvent.change(input, { target: { value: "Hello" } });

    expect(defaultProps.setInputText).toHaveBeenCalledWith("Hello");
  });

  it("should send message on button click", () => {
    render(<ChatInput {...defaultProps} inputText="Hello" />);

    fireEvent.click(screen.getByText("Send"));
    expect(defaultProps.onSend).toHaveBeenCalled();
  });

  it("should send message on Enter key", () => {
    render(<ChatInput {...defaultProps} inputText="Hello" />);

    const input = screen.getByPlaceholderText(/how are you feeling/i);
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(defaultProps.onSend).toHaveBeenCalled();
  });

  it("should disable input and buttons when disconnected", () => {
    render(<ChatInput {...defaultProps} isConnected={false} />);

    expect(screen.getByPlaceholderText(/how are you feeling/i)).toBeDisabled();
    expect(screen.getByTitle(/record voice/i)).toBeDisabled();
    // Send button is disabled if empty text anyway, but let's check class or attribute behavior if relevant
  });

  it("should show processing state", () => {
    render(<ChatInput {...defaultProps} isProcessing={true} inputText="Sending..." />);

    const sendBtn = screen.getByRole("button", { name: "" }); // Spinner replaces text
    expect(sendBtn).toBeDisabled();
    expect(screen.queryByText("Send")).not.toBeInTheDocument();
  });

  it("should open voice recorder modal on mic click", () => {
    render(<ChatInput {...defaultProps} />);

    expect(screen.queryByTestId("voice-recorder-modal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle(/record voice/i));

    expect(screen.getByTestId("voice-recorder-modal")).toBeInTheDocument();
  });

  it("should handle voice message sending from modal", () => {
    render(<ChatInput {...defaultProps} />);

    // Open modal
    fireEvent.click(screen.getByTitle(/record voice/i));

    // Simulate send from mock modal
    fireEvent.click(screen.getByText("Send Voice"));

    expect(defaultProps.onSendAudio).toHaveBeenCalledWith("Transcribed text");
    expect(screen.queryByTestId("voice-recorder-modal")).not.toBeInTheDocument();
  });
});
