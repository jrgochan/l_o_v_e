import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "@/components/admin/ChatPanel";
import { logger } from "@/utils/logger";

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

jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock child components
jest.mock("@/components/admin/chat/ChatHeader", () => ({
  ChatHeader: ({ onToggleExpand }: any) => (
    <div data-testid="chat-header" onClick={onToggleExpand}>
      Chat Header
    </div>
  ),
}));
jest.mock("@/components/admin/chat/ChatInput", () => ({
  ChatInput: ({ setInputText, onSend, onSendAudio }: any) => (
    <div data-testid="chat-input">
      <button onClick={onSend} data-testid="send-btn">
        Send
      </button>
      <button onClick={() => onSendAudio("voice text")} data-testid="audio-btn">
        Audio
      </button>
      <input onChange={(e) => setInputText(e.target.value)} data-testid="input" />
    </div>
  ),
}));
jest.mock("@/components/admin/chat/ChatMessages", () => ({
  ChatMessages: ({ onEmotionClick }: any) => (
    <div data-testid="chat-messages">
      <button data-testid="nav-btn" onClick={() => onEmotionClick("Hope")}>
        Nav
      </button>
    </div>
  ),
}));
jest.mock("@/components/admin/panels/AnalysisPanel", () => ({
  AnalysisPanel: () => <div data-testid="analysis-panel">Analysis Panel</div>,
}));
jest.mock("@/components/admin/panels/EmotionHistoryPanel", () => ({
  EmotionHistoryPanel: () => <div data-testid="history-panel">History Panel</div>,
}));

import { useChatPanelState } from "@/hooks/chat/useChatPanelState";
import { useChatSessionState } from "@/hooks/chat/useChatSessionState";
import { useChatAnalysisState } from "@/hooks/chat/useChatAnalysisState";
import { useChatProgress } from "@/hooks/chat/useChatProgress";
import { useWebSocketChat } from "@/hooks/useWebSocketChat";
import { useEmotionNavigation } from "@/hooks/useEmotionNavigation";
import { useEmotionHistoryStore } from "@/stores/useEmotionHistoryStore";

describe("ChatPanel", () => {
  // Spies
  const mockSetIsExpanded = jest.fn();
  const mockSetHeight = jest.fn();
  const mockHandleToggleExpand = jest.fn();

  const createFunctionalSetter = (spy: jest.Mock) =>
    jest.fn((val) => {
      spy(val);
      if (typeof val === "function") {
        val({
          emotions: [],
          relationships: [],
          stages: [
            { id: "stage1", status: "pending", percentage: 0 },
            { id: "stage2", status: "pending", percentage: 0 },
          ],
          metrics: {},
          aggregate: { vac: {} },
          alertCount: { warning: 0, critical: 0, attention: 0 },
          emotionCount: 0,
          averageConfidence: 0,
        });
      }
    });

  const mockSetSessionMetricsSpy = jest.fn();
  const mockSetSessionMetrics = createFunctionalSetter(mockSetSessionMetricsSpy);

  const mockSetVacHistory = jest.fn();
  const mockSetEmotionTimeline = jest.fn();

  const mockSetCurrentAnalysisSpy = jest.fn();
  const mockSetCurrentAnalysis = createFunctionalSetter(mockSetCurrentAnalysisSpy);

  const mockSetMultiEmotionAnalysisSpy = jest.fn();
  const mockSetMultiEmotionAnalysis = createFunctionalSetter(mockSetMultiEmotionAnalysisSpy);

  const mockSetThreeWayAnalysis = jest.fn();
  const mockClearAnalysis = jest.fn();

  const mockSetProgressStateSpy = jest.fn();
  const mockSetProgressState = createFunctionalSetter(mockSetProgressStateSpy);

  const mockSetShowProgress = jest.fn();
  const mockStartProgressSimulation = jest.fn();

  const mockSendMessage = jest.fn();
  const mockSendAudio = jest.fn();
  const mockUpdateTone = jest.fn();
  const mockUpdateDeepFeeling = jest.fn();

  const mockAddHistoryEntry = jest.fn();
  const mockAutoFocusEmotion = jest.fn();
  const mockViewInSphere = jest.fn();

  const defaultWebSocketState = {
    isConnected: false,
    isConnecting: false,
    sendMessage: mockSendMessage,
    sendAudio: mockSendAudio,
    updateTonePreference: mockUpdateTone,
    updateDeepFeelingMode: mockUpdateDeepFeeling,
    error: null,
  };

  const defaultChatPanelState = {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useChatPanelState as jest.Mock).mockReturnValue({ ...defaultChatPanelState });

    (useChatSessionState as jest.Mock).mockReturnValue({
      sessionMetrics: {
        emotionCount: 0,
        averageConfidence: 0,
        alertCount: { critical: 0, attention: 0, warning: 0 },
      },
      setSessionMetrics: mockSetSessionMetrics,
      vacHistory: [],
      setVacHistory: mockSetVacHistory,
      emotionTimeline: [],
      setEmotionTimeline: mockSetEmotionTimeline,
    });

    (useChatAnalysisState as jest.Mock).mockReturnValue({
      currentAnalysis: {},
      setCurrentAnalysis: mockSetCurrentAnalysis,
      multiEmotionAnalysis: null,
      setMultiEmotionAnalysis: mockSetMultiEmotionAnalysis,
      threeWayAnalysis: null,
      setThreeWayAnalysis: mockSetThreeWayAnalysis,
      clearAnalysis: mockClearAnalysis,
    });

    (useChatProgress as jest.Mock).mockReturnValue({
      progressState: { stages: [] },
      setProgressState: mockSetProgressState,
      showProgress: false,
      setShowProgress: mockSetShowProgress,
      startProgressSimulation: mockStartProgressSimulation,
      progressSimulationRef: { current: null },
    });

    (useWebSocketChat as jest.Mock).mockReturnValue({ ...defaultWebSocketState });

    (useEmotionNavigation as jest.Mock).mockReturnValue({
      autoFocusEmotion: mockAutoFocusEmotion,
      viewInSphere: mockViewInSphere,
    });

    (useEmotionHistoryStore as unknown as jest.Mock).mockReturnValue(mockAddHistoryEntry);
  });

  const getSocketCallbacks = () => {
    const calls = (useWebSocketChat as jest.Mock).mock.calls;
    return calls[calls.length - 1][0];
  };

  it("renders collapsed state correctly", () => {
    render(<ChatPanel sessionId="test-session" />);
    expect(screen.getByText("Chat Header")).toBeInTheDocument();
  });

  it("renders expanded state correctly", () => {
    (useChatPanelState as jest.Mock).mockReturnValue({
      ...defaultChatPanelState,
      isExpanded: true,
    });

    render(<ChatPanel sessionId="test-session" />);
    expect(screen.getByTestId("chat-input")).toBeInTheDocument();
  });

  it("handles WebSocket callbacks: onAnalysis", async () => {
    (useChatPanelState as jest.Mock).mockReturnValue({
      ...defaultChatPanelState,
      isExpanded: true,
    });
    (useWebSocketChat as jest.Mock).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
    });

    render(<ChatPanel sessionId="sess1" />);

    const callbacks = getSocketCallbacks();
    const vac = { valence: -0.8, arousal: 0.9, connection: 0.5 };

    await act(async () => {
      callbacks.onAnalysis("Fear", "negative", vac, 0.9);
    });

    expect(mockSetCurrentAnalysisSpy).toHaveBeenCalled();
    expect(mockSetSessionMetricsSpy).toHaveBeenCalled();
    expect(mockSetSessionMetricsSpy).toHaveBeenCalled();
    expect(mockAutoFocusEmotion).toHaveBeenCalledWith("Fear");
  });

  it("syncs preferences on mount/change", () => {
    (useChatPanelState as jest.Mock).mockReturnValue({
      ...defaultChatPanelState,
      isExpanded: true,
      deepFeelingMode: true,
      toneMode: "analytical",
    });
    (useWebSocketChat as jest.Mock).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
    });

    render(<ChatPanel sessionId="sess1" />);

    expect(mockUpdateDeepFeeling).toHaveBeenCalledWith(true);
    expect(mockUpdateTone).toHaveBeenCalledWith("analytical");
  });

  it("handles WebSocket callbacks: onMultiEmotion", async () => {
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onMultiEmotion("Joy", "positive", { valence: 1, arousal: 0, connection: 0 }, 0.95, {
        intensity: 1,
      });
    });

    expect(mockSetMultiEmotionAnalysisSpy).toHaveBeenCalled();
  });

  it("handles WebSocket callbacks: onRelationship", async () => {
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onRelationship("Joy", "Hope", "synergistic", 0.8, "Good stuff");
    });

    expect(mockSetMultiEmotionAnalysisSpy).toHaveBeenCalled();
  });

  it("handles WebSocket callbacks: onInsight (Warning Alert)", async () => {
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();
    const insight = {
      summary: "Mismatch",
      voice_content_correlation: { discrepancy: 0.8 },
    };

    await act(async () => {
      callbacks.onInsight(insight);
    });

    expect(mockSetCurrentAnalysisSpy).toHaveBeenCalled();
    expect(mockSetSessionMetricsSpy).toHaveBeenCalled();
  });

  it("handles WebSocket callbacks: onProgressUpdate (Started -> Complete)", async () => {
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onProgressUpdate("stage1", "started", "Beginning", 0);
    });
    expect(mockSetShowProgress).toHaveBeenCalledWith(true);

    jest.useFakeTimers();
    await act(async () => {
      callbacks.onProgressUpdate("stage1", "complete", "Done", 100);
    });
    expect(mockSetShowProgress).toHaveBeenCalledWith(true);

    act(() => {
      jest.runAllTimers();
    });
    expect(mockSetShowProgress).toHaveBeenCalledWith(false);
    jest.useRealTimers();
  });

  it("handles WebSocket callbacks: onProgressUpdate (In Progress + Cleanup)", async () => {
    const mockRef = { current: 123 };
    (useChatProgress as jest.Mock).mockReturnValue({
      progressState: { stages: [{ id: "stage1", status: "pending", percentage: 0 }] }, // Add stage
      setProgressState: createFunctionalSetter(jest.fn()), // Execute setter to cover map logic
      showProgress: true,
      setShowProgress: jest.fn(),
      startProgressSimulation: jest.fn(),
      progressSimulationRef: mockRef,
    });

    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onProgressUpdate("stage1", "in_progress", "Working", 50);
    });

    await act(async () => {
      callbacks.onProgressUpdate("stage1", "complete", "Done", 100);
    });
    expect(mockRef.current).toBeNull();
  });

  it("handles user interactions: Send Message", async () => {
    (useChatPanelState as jest.Mock).mockReturnValue({
      ...defaultChatPanelState,
      isExpanded: true,
    });
    (useWebSocketChat as jest.Mock).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
    });

    render(<ChatPanel sessionId="sess1" />);
    const input = screen.getByTestId("input");
    const sendBtn = screen.getByTestId("send-btn");

    await userEvent.type(input, "Hello");
    fireEvent.change(input, { target: { value: "Hello" } });

    await userEvent.click(sendBtn);

    expect(mockClearAnalysis).toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith("Hello", "warm", false);
  });

  it("handles user interactions: Send Audio", async () => {
    (useChatPanelState as jest.Mock).mockReturnValue({
      ...defaultChatPanelState,
      isExpanded: true,
    });
    (useWebSocketChat as jest.Mock).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
    });

    render(<ChatPanel sessionId="sess1" />);
    const audioBtn = screen.getByTestId("audio-btn");

    await userEvent.click(audioBtn);

    expect(mockSendAudio).toHaveBeenCalledWith("voice text", "warm", false);
  });

  it("handles user interactions: Disconnected (No Send)", async () => {
    (useChatPanelState as jest.Mock).mockReturnValue({
      ...defaultChatPanelState,
      isExpanded: true,
    });
    (useWebSocketChat as jest.Mock).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: false,
    });

    render(<ChatPanel sessionId="sess1" />);
    const sendBtn = screen.getByTestId("send-btn");
    const audioBtn = screen.getByTestId("audio-btn");

    await userEvent.click(sendBtn);
    expect(mockSendMessage).not.toHaveBeenCalled();

    await userEvent.click(audioBtn);
    expect(mockSendAudio).not.toHaveBeenCalled();
  });

  it("handles WebSocket callbacks: onError", async () => {
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onError("Connection failed");
    });

    expect(logger.error).toHaveBeenCalled();
  });

  it("handles WebSocket callbacks: onMessage (Processing + Timeout)", async () => {
    jest.useFakeTimers();
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onMessage({ type: "message_received" });
    });

    act(() => {
      jest.advanceTimersByTime(120000);
    });
    jest.useRealTimers();
  });

  it("handles WebSocket callbacks: onAggregateState", async () => {
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onAggregateState({
        vac: { valence: 0, arousal: 0, connection: 0 },
        complexity_score: 0.5,
        emotional_clarity: 0.8,
        temporal_pattern: "sequential",
      });
    });

    expect(mockSetMultiEmotionAnalysisSpy).toHaveBeenCalled();
  });

  it("handles WebSocket callbacks: onThreeWayAnalysis", async () => {
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onThreeWayAnalysis({ some: "data" });
    });

    expect(mockSetThreeWayAnalysis).toHaveBeenCalled();
  });

  it("handles onEmotionClick navigation", async () => {
    (useChatPanelState as jest.Mock).mockReturnValue({
      ...defaultChatPanelState,
      isExpanded: true,
    });

    render(<ChatPanel sessionId="sess1" />);

    const navBtn = screen.getByTestId("nav-btn");
    await userEvent.click(navBtn);

    expect(mockViewInSphere).toHaveBeenCalledWith("Hope");
  });

  it("handles WebSocket callbacks: onAnalysis (Critical Alert)", async () => {
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();
    const vac = { valence: -0.6, arousal: 0.8, connection: 0 }; // Critical condition

    await act(async () => {
      callbacks.onAnalysis("Fear", "negative", vac, 0.9);
    });

    expect(mockSetSessionMetricsSpy).toHaveBeenCalled();
    // Verify specific alert update structure if possible, or at least that it fired
  });

  it("handles WebSocket callbacks: onAnalysis (Attention Alert)", async () => {
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();
    const vac = { valence: 0, arousal: 0, connection: 0 };

    await act(async () => {
      callbacks.onAnalysis("Unsure", "neutral", vac, 0.5); // Low confidence
    });

    expect(mockSetSessionMetricsSpy).toHaveBeenCalled();
  });

  it("handles WebSocket callbacks: onProgressUpdate (Cleanup Interval)", async () => {
    jest.useFakeTimers();
    const mockRef = { current: 123 as unknown as NodeJS.Timeout };
    const mockClearInterval = jest.spyOn(global, "clearInterval");

    (useChatProgress as jest.Mock).mockReturnValue({
      progressState: { stages: [{ id: "stage1", status: "pending", percentage: 0 }] },
      setProgressState: createFunctionalSetter(jest.fn()),
      showProgress: true,
      setShowProgress: mockSetShowProgress,
      startProgressSimulation: jest.fn(),
      progressSimulationRef: mockRef,
    });

    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    // Ensure ref is set before callback
    mockRef.current = 123 as unknown as NodeJS.Timeout;

    // Trigger complete to hit cleanup logic
    await act(async () => {
      callbacks.onProgressUpdate("stage1", "complete", "Done", 100);
    });

    expect(mockClearInterval).toHaveBeenCalledWith(123);
    expect(mockRef.current).toBeNull();

    act(() => {
      jest.runAllTimers();
    });
    expect(mockSetShowProgress).toHaveBeenCalledWith(false);
    jest.useRealTimers();
  });

  it("handles WebSocket callbacks: onTranscription", async () => {
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onTranscription("Transcribed text");
    });

    expect(mockSetCurrentAnalysisSpy).toHaveBeenCalled();
  });

  it("handles WebSocket callbacks: onMultiEmotion (First Emotion)", async () => {
    (useChatAnalysisState as jest.Mock).mockReturnValue({
      ...useChatAnalysisState({} as any),
      multiEmotionAnalysis: null,
      setMultiEmotionAnalysis: mockSetMultiEmotionAnalysis,
    });

    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onMultiEmotion("Joy", "positive", { valence: 1, arousal: 0, connection: 0 }, 0.95, {
        intensity: 1,
      });
    });

    expect(mockSetMultiEmotionAnalysisSpy).toHaveBeenCalled();
  });

  it("handles navigation callback", async () => {
    let navOptions: any;
    (useEmotionNavigation as jest.Mock).mockImplementation((opts) => {
      navOptions = opts;
      return {
        autoFocusEmotion: mockAutoFocusEmotion,
        viewInSphere: mockViewInSphere,
      };
    });

    render(<ChatPanel sessionId="sess1" />);

    act(() => {
      if (navOptions && navOptions.onNavigate) {
        navOptions.onNavigate();
      }
    });

    expect(mockSetIsExpanded).toHaveBeenCalledWith(false);
    expect(mockSetHeight).toHaveBeenCalledWith(60);
  });

  it("handles WebSocket callbacks: onProsody", async () => {
    // Mock setter to execute callback for coverage
    const mockSetCurrentAnalysis = jest.fn((cb) => cb({}));
    (useChatAnalysisState as jest.Mock).mockReturnValue({
      ...useChatAnalysisState({} as any),
      setCurrentAnalysis: mockSetCurrentAnalysis,
    });

    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();
    const prosodyData = { pitch: 100, energy: 0.5 };

    await act(async () => {
      callbacks.onProsody(prosodyData);
    });

    expect(mockSetCurrentAnalysis).toHaveBeenCalled();
  });

  it("executes state updates for MultiEmotion and Transformation", async () => {
    // This test ensures the functional updates (prev => ...) are actually executed
    // covering lines inside the setter callbacks.

    const mockSetMultiEmotionAnalysis = jest.fn((cb) => {
      // Simulate prev = null (First emotion)
      if (typeof cb === "function") cb(null);
      // Simulate prev = exists (Subsequent)
      if (typeof cb === "function") cb({ emotions: [], relationships: [], aggregate: { vac: {} } });
    });

    const mockSetCurrentAnalysis = jest.fn((cb) => {
      if (typeof cb === "function") cb({});
    });

    (useChatAnalysisState as jest.Mock).mockReturnValue({
      ...useChatAnalysisState({} as any),
      setMultiEmotionAnalysis: mockSetMultiEmotionAnalysis,
      setCurrentAnalysis: mockSetCurrentAnalysis,
      // Need to ensure transformation/prosody/etc use these
    });

    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      // Trigger multi-emotion (should hit null and non-null paths in mock)
      callbacks.onMultiEmotion("Joy", "positive", { valence: 1, arousal: 0, connection: 0 }, 0.95, {
        intensity: 1,
      });

      // Trigger transcription
      callbacks.onTranscription("test");

      // Trigger prosody
      callbacks.onProsody({} as any);

      // Trigger relationship (uses setMultiEmotionAnalysis)
      callbacks.onRelationship("Joy", "Sadness", "conflict", 0.5, "desc");

      // Trigger aggregate (uses setMultiEmotionAnalysis)
      callbacks.onAggregateState({ complexity_score: 0.5 });
    });

    expect(mockSetMultiEmotionAnalysis).toHaveBeenCalled();
    expect(mockSetCurrentAnalysis).toHaveBeenCalled();
  });
  it("renders resizing state styling", () => {
    (useChatPanelState as jest.Mock).mockReturnValue({
      ...defaultChatPanelState,
      isExpanded: true,
      isResizing: true,
    });

    // We need to render it to find the element
    const { container } = render(<ChatPanel sessionId="sess1" />);

    // The resize handle is the div with cursor-row-resize
    const resizeHandle = container.querySelector(".cursor-row-resize");
    expect(resizeHandle).toHaveClass("bg-cyan-500/50");

    // Test resize interaction
    if (resizeHandle) {
      fireEvent.mouseDown(resizeHandle);
      expect(defaultChatPanelState.handleMouseDown).toHaveBeenCalled();
    }
  });

  it("handles WebSocket callbacks: onAnalysis (Stable)", async () => {
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();
    const vac = { valence: 0.5, arousal: 0.2, connection: 0.5 };

    await act(async () => {
      callbacks.onAnalysis("Joy", "positive", vac, 0.9); // High confidence, mundane VAC
    });

    expect(mockSetSessionMetricsSpy).toHaveBeenCalled();
  });

  it("handles WebSocket callbacks: onInsight (No Alert)", async () => {
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();
    const insight = {
      summary: "Normal insight",
      // No voice_content_correlation
    };

    await act(async () => {
      callbacks.onInsight(insight);
    });

    expect(mockSetCurrentAnalysisSpy).toHaveBeenCalled();
  });

  it("handles WebSocket callbacks: onMessage (Other Type)", async () => {
    jest.useFakeTimers();
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onMessage({ type: "pong" }); // Not message_received
    });

    act(() => {
      jest.advanceTimersByTime(120000);
    });
    jest.useRealTimers();
  });

  it("handles WebSocket callbacks: onAggregateState (Empty Fields)", async () => {
    render(<ChatPanel sessionId="sess1" />);
    const callbacks = getSocketCallbacks();

    await act(async () => {
      callbacks.onAggregateState({
        vac: { valence: 0, arousal: 0, connection: 0 },
        // complexity_score and clarity missing
      });
    });

    expect(mockSetMultiEmotionAnalysisSpy).toHaveBeenCalled();
  });

  it("renders resizing active state", () => {
    (useChatPanelState as jest.Mock).mockReturnValue({
      ...defaultChatPanelState,
      isExpanded: true,
      isResizing: true,
    });

    const { container } = render(<ChatPanel sessionId="sess1" />);
    // The resize handle div
    const resizeHandle = container.querySelector(".cursor-row-resize");
    expect(resizeHandle).toHaveClass("bg-cyan-500/50");
  });

  it("renders analysis panel expanded state", () => {
    (useChatPanelState as jest.Mock).mockReturnValue({
      ...defaultChatPanelState,
      isExpanded: true,
      analysisExpandState: "expanded",
    });

    const { container } = render(<ChatPanel sessionId="sess1" />);
    // Find the div wrapping AnalysisPanel
    // It has "w-[calc(100%-18rem)]"
    const wrapper = screen.getByTestId("analysis-panel").parentElement;
    expect(wrapper).toHaveClass("w-[calc(100%-18rem)]");
  });

  it("renders analysis panel fullscreen state", () => {
    (useChatPanelState as jest.Mock).mockReturnValue({
      ...defaultChatPanelState,
      isExpanded: true,
      analysisExpandState: "fullscreen",
    });

    // In fullscreen, EmotionHistoryPanel is hidden (checked by existing logic?)
    // ChatMessages is hidden (if analysisExpandState !== "normal"?)
    // Wait, ChatPanel logic:
    // {analysisExpandState !== "fullscreen" && <EmotionHistoryPanel />}
    // {analysisExpandState === "normal" && <ChatMessages ... />}

    render(<ChatPanel sessionId="sess1" />);

    expect(screen.queryByTestId("history-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("chat-messages")).not.toBeInTheDocument();

    const wrapper = screen.getByTestId("analysis-panel").parentElement;
    expect(wrapper).toHaveClass("w-full");
  });

  it("renders fullscreen chat mode", () => {
    (useChatPanelState as jest.Mock).mockReturnValue({
      ...defaultChatPanelState,
      isFullscreen: true,
    });

    const { container } = render(<ChatPanel sessionId="sess1" />);
    // The main div should have style height: 100vh
    const mainDiv = container.firstChild;
    expect(mainDiv).toHaveStyle({ height: "100vh" });
    expect(mainDiv).toHaveClass("inset-0");
  });
});
