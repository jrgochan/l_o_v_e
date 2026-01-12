import { renderHook, act } from "@testing-library/react";
import { useCurrentAnalysisState } from "@/hooks/chat/analysis/useCurrentAnalysisState";

describe("useCurrentAnalysisState", () => {
  it("should initialize with null values", () => {
    const { result } = renderHook(() => useCurrentAnalysisState());
    expect(result.current.currentAnalysis).toEqual({
      transcription: null,
      prosody: null,
      emotion: null,
      category: null,
      vac: null,
      confidence: null,
      insights: null,
      audioBlob: null,
    });
  });

  it("should update analysis state partially", () => {
    const { result } = renderHook(() => useCurrentAnalysisState());

    act(() => {
      result.current.updateAnalysis({ emotion: "Joy", confidence: 0.9 });
    });

    expect(result.current.currentAnalysis.emotion).toBe("Joy");
    expect(result.current.currentAnalysis.confidence).toBe(0.9);
    expect(result.current.currentAnalysis.transcription).toBeNull(); // remains null
  });

  it("should clear analysis state", () => {
    const { result } = renderHook(() => useCurrentAnalysisState());

    act(() => {
      result.current.updateAnalysis({ emotion: "Joy" });
    });
    expect(result.current.currentAnalysis.emotion).toBe("Joy");

    act(() => {
      result.current.clearCurrentAnalysis();
    });
    expect(result.current.currentAnalysis.emotion).toBeNull();
  });
});
