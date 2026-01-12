import { renderHook, act } from "@testing-library/react";
import { useAnalysisState } from "@/hooks/chat/useAnalysisState";
import { useCurrentAnalysisState } from "@/hooks/chat/analysis/useCurrentAnalysisState";
import { useMultiEmotionState } from "@/hooks/chat/analysis/useMultiEmotionState";

jest.mock("@/hooks/chat/analysis/useCurrentAnalysisState");
jest.mock("@/hooks/chat/analysis/useMultiEmotionState");

describe("useAnalysisState", () => {
    const mockCurrent = {
        currentAnalysis: { emotion: "Joy" },
        updateAnalysis: jest.fn(),
        clearCurrentAnalysis: jest.fn()
    };

    const mockMulti = {
        multiEmotionAnalysis: { id: "multi" },
        threeWayAnalysis: null,
        setMultiEmotionAnalysis: jest.fn(),
        clearMultiEmotionState: jest.fn(),
        addMultiEmotion: jest.fn(),
        addRelationship: jest.fn(),
        updateAggregateState: jest.fn(),
        updateThreeWayAnalysis: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useCurrentAnalysisState as jest.Mock).mockReturnValue(mockCurrent);
        (useMultiEmotionState as jest.Mock).mockReturnValue(mockMulti);
    });

    it("should compose underlying hooks", () => {
        const { result } = renderHook(() => useAnalysisState("session-1"));

        expect(result.current.currentAnalysis).toBe(mockCurrent.currentAnalysis);
        expect(result.current.multiEmotionAnalysis).toBe(mockMulti.multiEmotionAnalysis);
        expect(useCurrentAnalysisState).toHaveBeenCalled();
        expect(useMultiEmotionState).toHaveBeenCalledWith("session-1");
    });

    it("should expose update methods", () => {
        const { result } = renderHook(() => useAnalysisState("session-1"));
        expect(result.current.updateAnalysis).toBe(mockCurrent.updateAnalysis);
        expect(result.current.addMultiEmotion).toBe(mockMulti.addMultiEmotion);
    });

    it("should clear both states on clearAnalysis", () => {
        const { result } = renderHook(() => useAnalysisState("session-1"));

        act(() => {
            result.current.clearAnalysis();
        });

        expect(mockCurrent.clearCurrentAnalysis).toHaveBeenCalled();
        expect(mockMulti.clearMultiEmotionState).toHaveBeenCalled();
    });
});
