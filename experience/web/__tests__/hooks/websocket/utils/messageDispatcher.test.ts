import { dispatchMessage } from "@/hooks/websocket/utils/messageDispatcher";
import { logger } from "@/utils/logger";

jest.mock("@/utils/logger");

describe("messageDispatcher", () => {
  const mockHandlers = {
    onTranscription: jest.fn(),
    onAnalysis: jest.fn(),
    onProsody: jest.fn(),
    onInsight: jest.fn(),
    onError: jest.fn(),
    onMultiEmotion: jest.fn(),
    onRelationship: jest.fn(),
    onAggregateState: jest.fn(),
    onThreeWayAnalysis: jest.fn(),
    onProgressUpdate: jest.fn(),
    setError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should dispatch transcription message", () => {
    dispatchMessage({ type: "transcription", text: "Hello" } as any, mockHandlers);
    expect(mockHandlers.onTranscription).toHaveBeenCalledWith("Hello");
  });

  it("should dispatch analysis message", () => {
    const payload = {
      type: "analysis",
      emotion: "Joy",
      category: "High",
      vac: { valence: 0.8, arousal: 0.5, control: 0.7 },
      confidence: 0.9,
    };
    dispatchMessage(payload as any, mockHandlers);
    expect(mockHandlers.onAnalysis).toHaveBeenCalledWith("Joy", "High", payload.vac, 0.9);
  });

  it("should dispatch error message", () => {
    dispatchMessage({ type: "error", message: "Something went wrong" } as any, mockHandlers);
    expect(mockHandlers.setError).toHaveBeenCalledWith("Something went wrong");
    expect(mockHandlers.onError).toHaveBeenCalledWith("Something went wrong");
  });

  it("should dispatch multi_emotion message", () => {
    const payload = {
      type: "multi_emotion",
      emotion: "Awe",
      category: "Deep",
      vac: { valence: 0.9 },
      confidence: 0.85,
      prominence: "primary",
    };
    dispatchMessage(payload as any, mockHandlers);
    expect(mockHandlers.onMultiEmotion).toHaveBeenCalledWith(
      "Awe",
      "Deep",
      payload.vac,
      0.85,
      "primary"
    );
  });

  it("should dispatch aggregate_state message", () => {
    const payload = {
      type: "aggregate_state",
      aggregate_vac: { valence: 0.5 },
      complexity_score: 0.7,
      emotional_clarity: 0.8,
      temporal_pattern: "stable",
    };
    dispatchMessage(payload as any, mockHandlers);
    expect(mockHandlers.onAggregateState).toHaveBeenCalledWith({
      vac: payload.aggregate_vac,
      complexity_score: 0.7,
      emotional_clarity: 0.8,
      temporal_pattern: "stable",
    });
  });

  it("should dispatch emotion_relationship message", () => {
    const payload = {
      type: "emotion_relationship",
      emotion_a: "Joy",
      emotion_b: "Sadness",
      relationship_type: "contradictory",
      strength: 0.7,
      description: "Mixed feelings",
    };
    dispatchMessage(payload as any, mockHandlers);
    expect(mockHandlers.onRelationship).toHaveBeenCalledWith(
      "Joy",
      "Sadness",
      "contradictory",
      0.7,
      "Mixed feelings"
    );
  });

  it("should dispatch three_way_analysis message", () => {
    const payload = {
      type: "three_way_analysis",
      data: { some: "data" },
    };
    dispatchMessage(payload as any, mockHandlers);
    expect(mockHandlers.onThreeWayAnalysis).toHaveBeenCalledWith({ some: "data" });
  });

  it("should dispatch progress_update message", () => {
    const payload = {
      type: "progress_update",
      stage: "semantic",
      status: "processing",
      message: "Analyzing...",
      percentage: 50,
      elapsed_ms: 100,
    };
    dispatchMessage(payload as any, mockHandlers);
    expect(mockHandlers.onProgressUpdate).toHaveBeenCalledWith(
      "semantic",
      "processing",
      "Analyzing...",
      50,
      100
    );
  });

  it("should ignore malformed messages safely", () => {
    // Missing required fields
    dispatchMessage({ type: "multi_emotion", emotion: "Joy" } as any, mockHandlers);
    expect(mockHandlers.onMultiEmotion).not.toHaveBeenCalled();

    dispatchMessage({ type: "emotion_relationship", emotion_a: "Joy" } as any, mockHandlers);
    expect(mockHandlers.onRelationship).not.toHaveBeenCalled();
  });

  it("should dispatch prosody message", () => {
    const payload = {
      type: "prosody",
      data: { pitch: 100, energy: 0.8 },
    };
    dispatchMessage(payload as any, mockHandlers);
    expect(mockHandlers.onProsody).toHaveBeenCalledWith(payload.data);
  });

  it("should dispatch insight message", () => {
    const payload = {
      type: "insight",
      insights: { some: "insight" },
    };
    dispatchMessage(payload as any, mockHandlers);
    expect(mockHandlers.onInsight).toHaveBeenCalledWith(payload.insights);
  });

  it("should handle missing optional handlers", () => {
    // Should not throw if handler is undefined
    const partialHandlers = { setError: jest.fn() } as any;
    dispatchMessage({ type: "transcription", text: "Test" } as any, partialHandlers);
    expect(partialHandlers.setError).not.toHaveBeenCalled();
  });
});
