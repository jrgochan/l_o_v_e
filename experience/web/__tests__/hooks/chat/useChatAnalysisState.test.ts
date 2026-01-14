import { renderHook, act } from "@testing-library/react";
import { useChatAnalysisState } from "@/hooks/chat/useChatAnalysisState";

describe("useChatAnalysisState", () => {
  it("should initialize with default states", () => {
    const { result } = renderHook(() => useChatAnalysisState());

    expect(result.current.currentAnalysis.emotion).toBeNull();
    expect(result.current.multiEmotionAnalysis).toBeNull();
    expect(result.current.threeWayAnalysis).toBeNull();
  });

  it("should update current analysis directly", () => {
    const { result } = renderHook(() => useChatAnalysisState());

    act(() => {
      result.current.setCurrentAnalysis((prev) => ({ ...prev, emotion: "Joy" }));
    });

    expect(result.current.currentAnalysis.emotion).toBe("Joy");
  });

  it("should update multi-emotion analysis", () => {
    const { result } = renderHook(() => useChatAnalysisState());
    const mockMulti = {
      emotions: [],
      relationships: [],
      aggregate_state: { vac: [0, 0, 0], category: "test" },
    };

    act(() => {
      // @ts-ignore - mock minimal
      result.current.setMultiEmotionAnalysis(mockMulti);
    });

    expect(result.current.multiEmotionAnalysis).toBe(mockMulti);
  });

  it("should update three-way analysis", () => {
    const { result } = renderHook(() => useChatAnalysisState());
    const mockThreeWay = {
      overall_alignment: 0.8,
      voice_content_gap: 0,
      modality_weights: { text: 0.5, audio: 0.5 },
    };

    act(() => {
      // @ts-ignore - mock minimal
      result.current.setThreeWayAnalysis(mockThreeWay);
    });

    expect(result.current.threeWayAnalysis).toBe(mockThreeWay);
  });

  it("should clear analysis with optional blob", () => {
    const { result } = renderHook(() => useChatAnalysisState());

    // Set dirty state
    act(() => {
      result.current.setCurrentAnalysis((prev) => ({ ...prev, emotion: "Joy" }));
      // @ts-ignore
      result.current.setMultiEmotionAnalysis({});
    });

    const mockBlob = new Blob([]);
    act(() => {
      result.current.clearAnalysis(mockBlob);
    });

    expect(result.current.currentAnalysis.emotion).toBeNull();
    expect(result.current.currentAnalysis.audioBlob).toBe(mockBlob);
    expect(result.current.multiEmotionAnalysis).toBeNull();
  });

  it("should clear analysis with default arguments", () => {
    const { result } = renderHook(() => useChatAnalysisState());

    act(() => {
      result.current.setCurrentAnalysis((prev) => ({ ...prev, emotion: "Joy" }));
    });

    act(() => {
      result.current.clearAnalysis();
    });

    expect(result.current.currentAnalysis.emotion).toBeNull();
    expect(result.current.currentAnalysis.audioBlob).toBeNull();
  });
});
