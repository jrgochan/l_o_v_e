import { render, screen, fireEvent } from "@testing-library/react";
import { ChatHeader } from "@/components/admin/chat/ChatHeader";

// Mock UI components
jest.mock("@/components/ui/Toggle", () => ({
  Toggle: ({ checked, onChange, leftLabel, rightLabel }: any) => (
    <div data-testid="mock-toggle" onClick={() => onChange(!checked)}>
      <span>{leftLabel}</span>
      <span>{checked ? rightLabel : leftLabel} (Active)</span>
    </div>
  ),
  ToggleGroup: ({ children }: any) => <div data-testid="mock-toggle-group">{children}</div>,
}));

describe("ChatHeader", () => {
  const defaultProps = {
    isExpanded: true,
    isFullscreen: false,
    isConnecting: false,
    isConnected: true,
    wsError: null,
    chatMode: "text" as const,
    toneMode: "clinical" as const,
    useAtlasMapping: false,
    deepFeelingMode: false,
    onToggleExpand: jest.fn(),
    onToggleFullscreen: jest.fn(),
    onChatModeChange: jest.fn(),
    onToneModeChange: jest.fn(),
    onUseAtlasMappingChange: jest.fn(),
    onDeepFeelingModeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders basic header elements", () => {
    render(<ChatHeader {...defaultProps} />);
    expect(screen.getByText("💬 Emotional Chat")).toBeInTheDocument();
    expect(screen.getByTitle("Collapse chat")).toBeInTheDocument();
  });

  it("handles expand/collapse toggle", () => {
    const onToggleExpand = jest.fn();
    render(<ChatHeader {...defaultProps} onToggleExpand={onToggleExpand} isExpanded={false} />);

    const toggleButton = screen.getByTitle("Expand chat");
    fireEvent.click(toggleButton);
    expect(onToggleExpand).toHaveBeenCalled();
  });

  it("shows connection status when expanded", () => {
    render(
      <ChatHeader {...defaultProps} isExpanded={true} isConnected={true} isConnecting={false} />
    );
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("shows connecting status", () => {
    render(
      <ChatHeader {...defaultProps} isExpanded={true} isConnected={false} isConnecting={true} />
    );
    expect(screen.getByText("Connecting...")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<ChatHeader {...defaultProps} isExpanded={true} wsError="Connection failed" />);
    expect(screen.getByText("⚠️ Connection failed")).toBeInTheDocument();
  });

  it("hides status and controls when collapsed", () => {
    render(<ChatHeader {...defaultProps} isExpanded={false} />);
    expect(screen.queryByText("Connected")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mock-toggle-group")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Fullscreen mode")).not.toBeInTheDocument();
  });

  it("handles fullscreen toggle", () => {
    const onToggleFullscreen = jest.fn();
    render(<ChatHeader {...defaultProps} onToggleFullscreen={onToggleFullscreen} />);

    const fsButton = screen.getByTitle("Fullscreen mode");
    fireEvent.click(fsButton);
    expect(onToggleFullscreen).toHaveBeenCalled();
  });

  it("renders correctly in fullscreen mode", () => {
    render(<ChatHeader {...defaultProps} isFullscreen={true} />);
    expect(screen.getByTitle("Exit fullscreen")).toBeInTheDocument();
  });

  it("handles tone mode toggle", () => {
    const onToneModeChange = jest.fn();
    render(<ChatHeader {...defaultProps} onToneModeChange={onToneModeChange} toneMode="warm" />);
    // Mock toggle logic: if toneMode is 'warm', checked is false (since checked={toneMode === 'clinical'}).
    // Clicking it should call onChange(!false) -> true.

    // Find specific toggle by label
    const toneToggle = screen.getByText("💗 Warm").closest("div");
    fireEvent.click(toneToggle!);
    expect(onToneModeChange).toHaveBeenCalledWith(true);
  });

  it("handles atlas mapping toggle", () => {
    const onUseAtlasMappingChange = jest.fn();
    render(<ChatHeader {...defaultProps} onUseAtlasMappingChange={onUseAtlasMappingChange} />);

    const mappingToggle = screen.getByText("🤖 AI").closest("div");
    fireEvent.click(mappingToggle!);
    expect(onUseAtlasMappingChange).toHaveBeenCalledWith(true);
  });

  it("handles deep feeling mode toggle", () => {
    const onDeepFeelingModeChange = jest.fn();
    render(<ChatHeader {...defaultProps} onDeepFeelingModeChange={onDeepFeelingModeChange} />);

    const deepToggle = screen.getByText("🎯 Single").closest("div");
    fireEvent.click(deepToggle!);
    expect(onDeepFeelingModeChange).toHaveBeenCalledWith(true);
  });
  it("renders correctly in voice mode", () => {
    const onChatModeChange = jest.fn();
    render(<ChatHeader {...defaultProps} chatMode="voice" onChatModeChange={onChatModeChange} />);

    const voiceButton = screen.getByTitle("Switch to text mode");
    expect(voiceButton).toHaveTextContent("🎙️ Voice");
    expect(voiceButton).toHaveClass("bg-purple-600");

    fireEvent.click(voiceButton);
    expect(onChatModeChange).toHaveBeenCalled();
  });
});
