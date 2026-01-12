import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "@/components/admin/ChatPanel";

// Mock all the hooks
jest.mock("@/hooks/chat/useChatPanelState", () => ({
  useChatPanelState: jest.fn(),
}));
jest.mock("@/hooks/chat/useChatSessionState", () => ({
  useChatSessionState: jest.fn(),
}));
jest.mock("@/hooks/chat/useChatAnalysisState", () => ({
  useChatAnalysisState: jest.fn(),
}));
jest.mock("@/hooks/chat/useChatProgress", () => ({
  useChatProgress: jest.fn(),
  initializeProgressStages: jest.fn(),
  getAdaptiveMessage: jest.fn(),
}));
jest.mock("@/hooks/useWebSocketChat", () => ({
  useWebSocketChat: jest.fn(),
}));
jest.mock("@/hooks/useEmotionNavigation", () => ({
  useEmotionNavigation: jest.fn(),
}));
jest.mock("@/hooks/useHistorySphereSync", () => ({
  useHistorySphereSync: jest.fn(),
}));
jest.mock("@/stores/useEmotionHistoryStore", () => ({
  useEmotionHistoryStore: jest.fn(),
}));

// Mock child components to simplify testing
jest.mock("@/components/admin/chat/ChatHeader", () => ({
  ChatHeader: () => <div data-testid="chat-header">Chat Header</div>,
}));
jest.mock("@/components/admin/chat/ChatInput", () => ({
  ChatInput: () => <div data-testid="chat-input">Chat Input</div>,
}));
jest.mock("@/components/admin/chat/ChatMessages", () => ({
  ChatMessages: () => <div data-testid="chat-messages">Chat Messages</div>,
}));
jest.mock("@/components/admin/panels/AnalysisPanel", () => ({
  AnalysisPanel: () => <div data-testid="analysis-panel">Analysis Panel</div>,
}));
jest.mock("@/components/admin/panels/EmotionHistoryPanel", () => ({
  EmotionHistoryPanel: () => <div data-testid="history-panel">History Panel</div>,
}));

// Import hooks to mock return values
import { useChatPanelState } from "@/hooks/chat/useChatPanelState";
import { useChatSessionState } from "@/hooks/chat/useChatSessionState";
import { useChatAnalysisState } from "@/hooks/chat/useChatAnalysisState";
import { useChatProgress } from "@/hooks/chat/useChatProgress";
import { useWebSocketChat } from "@/hooks/useWebSocketChat";
import { useEmotionNavigation } from "@/hooks/useEmotionNavigation";
import { useEmotionHistoryStore } from "@/stores/useEmotionHistoryStore";

describe("ChatPanel", () => {
  const mockSetIsExpanded = jest.fn();
  const mockSetHeight = jest.fn();
  const mockHandleToggleExpand = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (useChatPanelState as jest.Mock).mockReturnValue({
      isExpanded: false,
      setIsExpanded: mockSetIsExpanded,
      isFullscreen: false,
      height: 400,
      setHeight: mockSetHeight,
      toneMode: "warm",
      deepFeelingMode: false,
      analysisExpandState: "normal",
      handleToggleExpand: mockHandleToggleExpand,
      handleToggleFullscreen: jest.fn(),
      handleToggleAnalysisExpansion: jest.fn(),
      handleMouseDown: jest.fn(),
      useAtlasMapping: false,
    });

    (useChatSessionState as jest.Mock).mockReturnValue({
      sessionMetrics: { emotionCount: 0 },
      vacHistory: [],
      emotionTimeline: [],
    });

    (useChatAnalysisState as jest.Mock).mockReturnValue({
      currentAnalysis: {},
      multiEmotionAnalysis: null,
      threeWayAnalysis: null,
      clearAnalysis: jest.fn(),
    });

    (useChatProgress as jest.Mock).mockReturnValue({
      progressState: {},
      showProgress: false,
      startProgressSimulation: jest.fn(),
      progressSimulationRef: { current: null },
    });

    (useWebSocketChat as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      sendMessage: jest.fn(),
      sendAudio: jest.fn(),
      updateTonePreference: jest.fn(),
      updateDeepFeelingMode: jest.fn(),
      error: null,
    });

    (useEmotionNavigation as jest.Mock).mockReturnValue({
      autoFocusEmotion: jest.fn(),
      viewInSphere: jest.fn(),
    });

    (useEmotionHistoryStore as unknown as jest.Mock).mockReturnValue(jest.fn()); // addHistoryEntry
  });

  it("renders collapsed state correctly", () => {
    render(<ChatPanel sessionId="test-session" />);

    expect(screen.getByText("Chat Header")).toBeInTheDocument();
    expect(
      screen.getByText("Click here or press ▲ to open chat and analyze your emotions")
    ).toBeInTheDocument();

    // Sub-panels should not be visible
    expect(screen.queryByTestId("chat-input")).not.toBeInTheDocument();
    expect(screen.queryByTestId("analysis-panel")).not.toBeInTheDocument();
  });

  it("renders expanded state correctly", () => {
    (useChatPanelState as jest.Mock).mockReturnValue({
      isExpanded: true,
      setIsExpanded: mockSetIsExpanded,
      isFullscreen: false,
      height: 400,
      setHeight: mockSetHeight,
      toneMode: "warm",
      deepFeelingMode: false,
      analysisExpandState: "normal",
      handleToggleExpand: mockHandleToggleExpand,
      handleToggleFullscreen: jest.fn(),
      handleToggleAnalysisExpansion: jest.fn(),
      handleMouseDown: jest.fn(),
      useAtlasMapping: false,
    });

    render(<ChatPanel sessionId="test-session" />);

    expect(screen.getByTestId("chat-header")).toBeInTheDocument();
    expect(
      screen.queryByText("Click here or press ▲ to open chat and analyze your emotions")
    ).not.toBeInTheDocument();

    // Sub-components should be visible
    expect(screen.getByTestId("chat-input")).toBeInTheDocument();
    expect(screen.getByTestId("chat-messages")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-panel")).toBeInTheDocument();
    expect(screen.getByTestId("history-panel")).toBeInTheDocument();
  });

  it("calls handleToggleExpand when prompt is clicked", async () => {
    const user = userEvent.setup();
    render(<ChatPanel sessionId="test-session" />);

    // Note: Use text match regex or getByText
    const prompt = screen.getByText("Click here or press ▲ to open chat and analyze your emotions");
    await user.click(prompt);

    expect(mockHandleToggleExpand).toHaveBeenCalled();
  });
});
