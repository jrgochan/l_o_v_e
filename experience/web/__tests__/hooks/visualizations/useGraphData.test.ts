import { renderHook } from "@testing-library/react";
import { useGraphData } from "@/hooks/visualizations/useGraphData";

// Mock logger to verify warnings
const mockWarn = jest.fn();
jest.mock("@/utils/logger", () => ({
    logger: { warn: (...args: any[]) => mockWarn(...args) }
}));

describe("useGraphData", () => {
    const mockEmotions = [
        { emotion_name: "Joy", confidence: 0.8, vac: { valence: 0.9 } },
        { emotion_name: "Sadness", confidence: 0.5, vac: { valence: -0.6 } }
    ] as any[];

    const mockRelationships = [
        { emotion_a: "Joy", emotion_b: "Sadness", type: "contradictory", strength: 0.7 },
        { emotion_a: "Joy", emotion_b: "Unknown", type: "amplifying", strength: 0.5 } // Should be filtered
    ] as any[];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should generate nodes correctly", () => {
        const { result } = renderHook(() => useGraphData({ emotions: mockEmotions, relationships: [] }));

        expect(result.current.nodes).toHaveLength(2);

        const joyNode = result.current.nodes.find(n => n.id === "Joy");
        expect(joyNode).toBeDefined();
        expect(joyNode?.radius).toBeGreaterThan(20); // 20 + 0.8*30 = 44
        expect(joyNode?.color).toBe("#22c55e"); // High valence
    });

    it("should generate links and filter invalid ones", () => {
        const { result } = renderHook(() => useGraphData({ emotions: mockEmotions, relationships: mockRelationships }));

        expect(result.current.links).toHaveLength(1);
        expect(result.current.links[0].source).toBe("Joy");
        expect(result.current.links[0].target).toBe("Sadness");

        expect(mockWarn).toHaveBeenCalled(); // Should warn about excluded link
    });

    it("should return helper functions", () => {
        const { result } = renderHook(() => useGraphData({ emotions: [], relationships: [] }));

        expect(result.current.getEmotionColor(0.9)).toBe("#22c55e");
        expect(result.current.getRelationshipColor("masking")).toBe("#8b5cf6");
    });

    it("should generate correct colors for all valence ranges (getEmotionColor)", () => {
        const { result } = renderHook(() => useGraphData({ emotions: [], relationships: [] }));
        const { getEmotionColor } = result.current;

        expect(getEmotionColor(0.6)).toBe("#22c55e"); // > 0.5
        expect(getEmotionColor(0.2)).toBe("#a3e635"); // > 0.1
        expect(getEmotionColor(0.0)).toBe("#fbbf24"); // > -0.1
        expect(getEmotionColor(-0.2)).toBe("#f97316"); // > -0.5
        expect(getEmotionColor(-0.6)).toBe("#ef4444"); // <= -0.5
    });

    it("should generate correct colors for all relationship types (getRelationshipColor)", () => {
        const { result } = renderHook(() => useGraphData({ emotions: [], relationships: [] }));
        const { getRelationshipColor } = result.current;

        expect(getRelationshipColor("complementary")).toBe("#3b82f6");
        expect(getRelationshipColor("contradictory")).toBe("#f97316");
        expect(getRelationshipColor("masking")).toBe("#8b5cf6");
        expect(getRelationshipColor("amplifying")).toBe("#22c55e");
        expect(getRelationshipColor("sequential")).toBe("#6b7280");
        expect(getRelationshipColor("unknown")).toBe("#6b7280"); // default
    });
});
