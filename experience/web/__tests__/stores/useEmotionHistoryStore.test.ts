import { renderHook, act } from "@testing-library/react";
import { useEmotionHistoryStore } from "../../stores/useEmotionHistoryStore";

describe("useEmotionHistoryStore", () => {
    beforeEach(() => {
        useEmotionHistoryStore.getState().clearHistory();
    });

    it("should add entries", () => {
        const { result } = renderHook(() => useEmotionHistoryStore());

        act(() => {
            result.current.addEntry({
                emotion: "Joy",
                category: "positive",
                vac: [1, 1, 1],
                confidence: 0.9,
                timestamp: new Date(),
                isVisibleInSphere: true,
                messageId: "msg-1"
            });
        });

        expect(result.current.entries).toHaveLength(1);
        expect(result.current.entries[0].emotion).toBe("Joy");
    });

    it("should remove entries", () => {
        const { result } = renderHook(() => useEmotionHistoryStore());

        act(() => {
            result.current.addEntry({
                emotion: "Joy",
                category: "positive",
                vac: [1, 1, 1],
                confidence: 0.9,
                timestamp: new Date(),
                isVisibleInSphere: true,
                messageId: "msg-1"
            });
        });

        const id = result.current.entries[0].id;

        act(() => {
            result.current.removeEntry(id);
        });

        expect(result.current.entries).toHaveLength(0);
    });

    it("should toggle visibility", () => {
        const { result } = renderHook(() => useEmotionHistoryStore());

        act(() => {
            result.current.addEntry({
                emotion: "Joy",
                category: "positive",
                vac: [1, 1, 1],
                confidence: 0.9,
                timestamp: new Date(),
                isVisibleInSphere: true,
                messageId: "msg-1"
            });
        });

        const id = result.current.entries[0].id;

        act(() => {
            result.current.toggleVisibility(id);
        });

        expect(result.current.entries[0].isVisibleInSphere).toBe(false);
    });

    it("should export history", () => {
        const mockUrl = "blob:test";
        global.URL.createObjectURL = jest.fn(() => mockUrl);
        global.URL.revokeObjectURL = jest.fn();

        // Mock anchor click
        const mockClick = jest.fn();
        const mockAnchor = document.createElement("a");
        mockAnchor.click = mockClick;

        // Spy on createElement to return our mocked anchor
        const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor);

        // Spy on body methods without replacing implementation completely, 
        // effectively letting RTL mount its container, but we can check calls if we want.
        // The implementation adds and removes the anchor. Since mockAnchor is a real DOM node (enhanced),
        // appendChild should work fine without mocking it, UNLESS we want to prevent actual DOM manipulation errors 
        // or if we passed a plain object before.
        // Previous error "Target container is not a DOM element" was because I returned a plain object from appendChild mock 
        // which RTL didn't like when mounting the hook container.

        const { result } = renderHook(() => useEmotionHistoryStore());

        act(() => {
            result.current.addEntry({
                emotion: "Joy",
                category: "positive",
                vac: [1, 1, 1],
                confidence: 0.9,
                timestamp: new Date(),
                isVisibleInSphere: true,
                messageId: "msg-1"
            });
            result.current.exportHistory();
        });

        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(mockAnchor.download).toContain("emotion-history-");
        expect(mockClick).toHaveBeenCalled();

        createElementSpy.mockRestore();
    });

    it("should toggle view mode and collapse state", () => {
        const { result } = renderHook(() => useEmotionHistoryStore());

        expect(result.current.viewMode).toBe("list");
        expect(result.current.isCollapsed).toBe(false);

        act(() => {
            result.current.toggleViewMode();
            result.current.toggleCollapsed();
        });

        expect(result.current.viewMode).toBe("timeline");
        expect(result.current.isCollapsed).toBe(true);
    });

    it("should handle bulk visibility actions", () => {
        const { result } = renderHook(() => useEmotionHistoryStore());

        act(() => {
            result.current.addEntry({
                emotion: "Joy",
                category: "positive",
                vac: [1, 1, 1],
                confidence: 0.9,
                timestamp: new Date(),
                isVisibleInSphere: true,
                messageId: "msg-1"
            });
            result.current.addEntry({
                emotion: "Sadness",
                category: "negative",
                vac: [0, 0, 0],
                confidence: 0.8,
                timestamp: new Date(),
                isVisibleInSphere: true,
                messageId: "msg-2"
            });
        });

        act(() => {
            result.current.deselectAllFromSphere();
        });

        expect(result.current.entries.every(e => !e.isVisibleInSphere)).toBe(true);

        act(() => {
            result.current.selectAllForSphere();
        });

        expect(result.current.entries.every(e => e.isVisibleInSphere)).toBe(true);
    });
    it("should enforce history limit of 50", () => {
        const { result } = renderHook(() => useEmotionHistoryStore());

        act(() => {
            for (let i = 0; i < 60; i++) {
                result.current.addEntry({
                    emotion: `Emotion ${i}`,
                    category: "positive",
                    vac: [1, 1, 1],
                    confidence: 0.9,
                    timestamp: new Date(),
                    isVisibleInSphere: true,
                    messageId: `msg-${i}`
                });
            }
        });

        expect(result.current.entries).toHaveLength(50);
        // Should have kept the last 50, so the last one should be "Emotion 59"
        expect(result.current.entries[49].emotion).toBe("Emotion 59");
    });

    it("should set specific visibility (setVisibility)", () => {
        const { result } = renderHook(() => useEmotionHistoryStore());

        act(() => {
            result.current.addEntry({
                emotion: "Joy",
                category: "positive",
                vac: [1, 1, 1],
                confidence: 0.9,
                timestamp: new Date(),
                isVisibleInSphere: true,
                messageId: "msg-1"
            });
        });

        const id = result.current.entries[0].id;

        act(() => {
            result.current.setVisibility(id, false);
        });
        expect(result.current.entries[0].isVisibleInSphere).toBe(false);

        act(() => {
            result.current.setVisibility(id, true);
        });
        expect(result.current.entries[0].isVisibleInSphere).toBe(true);
    });

    it("should return correct derived state (getters)", () => {
        const { result } = renderHook(() => useEmotionHistoryStore());

        act(() => {
            result.current.clearHistory();
            result.current.addEntry({
                emotion: "Joy",
                category: "positive",
                vac: [1, 1, 1],
                confidence: 0.9,
                timestamp: new Date(),
                isVisibleInSphere: true,
                messageId: "msg-1"
            });
            result.current.addEntry({
                emotion: "Hidden",
                category: "positive",
                vac: [1, 1, 1],
                confidence: 0.9,
                timestamp: new Date(),
                isVisibleInSphere: false,
                messageId: "msg-2"
            });
        });

        expect(result.current.getEntryCount()).toBe(2);
        expect(result.current.getVisibleEntries()).toHaveLength(1);
        expect(result.current.getVisibleEntries()[0].emotion).toBe("Joy");
    });
});
