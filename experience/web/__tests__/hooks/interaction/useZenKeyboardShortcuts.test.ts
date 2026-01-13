
import { renderHook, act } from "@testing-library/react";
import { useZenKeyboardShortcuts } from "../../../hooks/interaction/useZenKeyboardShortcuts";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { AtlasEmotion } from "@/types";

// Mock stores
jest.mock("@/stores/useExperienceStore");
jest.mock("@/stores/useSettingsStore");

describe("useZenKeyboardShortcuts", () => {
    const mockInitAudio = jest.fn();
    const mockToggleMute = jest.fn();
    const mockSetHasAudioEnabled = jest.fn();
    const mockSetShowDebug = jest.fn();

    const mockEmotions: AtlasEmotion[] = [
        { id: "1", name: "Joy", category: "Happiness", vac: [0.8, 0.8, 0.8] } as AtlasEmotion,
        { id: "2", name: "Contentment", category: "Happiness", vac: [0.6, 0.5, 0.5] } as AtlasEmotion,
        { id: "3", name: "Sadness", category: "Sadness", vac: [-0.8, -0.5, -0.5] } as AtlasEmotion,
        { id: "4", name: "Grief", category: "Sadness", vac: [-0.9, -0.6, -0.6] } as AtlasEmotion,
    ];

    let mockSettingsStore: any;
    let mockExpStore: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSettingsStore = {
            layers: {
                cinematicOverlay: false,
                soulSphere: true,
                emotionPoints: true,
                emotionLabels: true,
                transitionPaths: true,
            },
            pathAnimationMode: "subtle",
            showAxisLabels: true,
            focusMode: false,
            updateLayer: jest.fn(),
            updateVisualSetting: jest.fn(),
            updateBehaviorSetting: jest.fn(),
        };

        mockExpStore = {
            isFlying: false,
            setIsFlying: jest.fn(),
            transitionPath: null,
            setTransitionPath: jest.fn(),
        };

        (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockSettingsStore);

        // Setup ExperienceStore mock
        (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) => selector(mockExpStore));

        // Explicitly add getState to the mock function object
        const mockStateGetter = () => {
            // console.log("Calling getState, returning:", mockExpStore);
            return mockExpStore;
        };
        Object.assign(useExperienceStore, { getState: mockStateGetter });
    });

    const getProps = () => ({
        initAudio: mockInitAudio,
        isMuted: false,
        toggleMute: mockToggleMute,
        setHasAudioEnabled: mockSetHasAudioEnabled,
        setShowDebug: mockSetShowDebug,
        emotions: mockEmotions,
    });

    const dispatchKey = (key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean } = {}) => {
        const event = new KeyboardEvent("keydown", {
            key,
            ctrlKey: modifiers.ctrlKey || false,
            metaKey: modifiers.metaKey || false,
            bubbles: true,
            cancelable: true
        });
        window.dispatchEvent(event);
        return event;
    };

    it("should ignore input elements", () => {
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        const event = new KeyboardEvent("keydown", { key: "m" });

        // Mock target
        Object.defineProperty(event, "target", { value: document.createElement("input") });

        window.dispatchEvent(event);
        expect(mockToggleMute).not.toHaveBeenCalled();
    });

    it("should handle 'm' for audio mute", () => {
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("m");
        expect(mockInitAudio).toHaveBeenCalled();
        expect(mockToggleMute).toHaveBeenCalled();
        expect(mockSetHasAudioEnabled).toHaveBeenCalledWith(true);
    });

    it("should handle 'i' for cinematic overlay", () => {
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("i");
        expect(mockSettingsStore.updateLayer).toHaveBeenCalledWith("cinematicOverlay", true);
    });

    it("should handle 'v' for visual mode cycle", () => {
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("v"); // subtle -> dynamic
        expect(mockSettingsStore.updateVisualSetting).toHaveBeenCalledWith("pathAnimationMode", "dynamic");
    });

    it("should handle 't' for flyover toggle", () => {
        mockExpStore.transitionPath = { id: "path" } as any;
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("t");
        expect(mockExpStore.setIsFlying).toHaveBeenCalledWith(true);
    });

    it("should ignore 't' if no transition path", () => {
        mockExpStore.transitionPath = null;
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("t");
        expect(mockExpStore.setIsFlying).not.toHaveBeenCalled();
    });

    it("should handle 'a' for axis toggle", () => {
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("a");
        expect(mockSettingsStore.updateVisualSetting).toHaveBeenCalledWith("showAxisLabels", false);
    });

    it("should handle 's' for sphere toggle", () => {
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("s");
        expect(mockSettingsStore.updateLayer).toHaveBeenCalledWith("soulSphere", false);
    });

    it("should handle 'e' for points toggle", () => {
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("e");
        expect(mockSettingsStore.updateLayer).toHaveBeenCalledWith("emotionPoints", false);
    });

    it("should handle 'f' for focus toggle", () => {
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("f");
        expect(mockSettingsStore.updateBehaviorSetting).toHaveBeenCalledWith("focusMode", true);
    });

    it("should handle 'l' for labels toggle", () => {
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("l");
        expect(mockSettingsStore.updateLayer).toHaveBeenCalledWith("emotionLabels", false);
    });

    it("should handle 'p' for paths toggle", () => {
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("p");
        expect(mockSettingsStore.updateLayer).toHaveBeenCalledWith("transitionPaths", false);
    });

    it("should handle 'd' for debug toggle", () => {
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("d");
        expect(mockSetShowDebug).toHaveBeenCalled();
    });

    it("should handle 'j' for mock journey", () => {
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("j");
        expect(mockExpStore.setTransitionPath).toHaveBeenCalledWith(expect.objectContaining({ path_id: "mock-journey" }));
        expect(mockExpStore.setIsFlying).toHaveBeenCalledWith(true);
    });

    it("should handle ' ' (Space) for play/pause with path", () => {
        mockExpStore.transitionPath = { id: "p1" } as any;
        mockSettingsStore.layers.transitionPaths = false; // logic checks if hidden and auto-shows

        renderHook(() => useZenKeyboardShortcuts(getProps()));
        const event = dispatchKey(" ");

        // Should enable paths
        expect(mockSettingsStore.updateLayer).toHaveBeenCalledWith("transitionPaths", true);
        // Should toggle flying
        expect(mockExpStore.setIsFlying).toHaveBeenCalledWith(true);
    });

    it("should handle ArrowRight (Next Category)", () => {
        // Current: Happiness (Joy). Next in sort order: Sadness.
        mockExpStore.transitionPath = {
            current_state: { emotion: "Joy" }
        } as any;
        mockExpStore.isFlying = true;

        renderHook(() => useZenKeyboardShortcuts(getProps()));
        const event = dispatchKey("ArrowRight");

        expect(mockExpStore.setTransitionPath).toHaveBeenCalled();
        const newPath = (mockExpStore.setTransitionPath as jest.Mock).mock.calls[0][0];

        // Expect next category to be Sadness
        expect(newPath.current_state.category).toBe("Sadness");
        expect(mockExpStore.setIsFlying).toHaveBeenCalledWith(false);
    });

    it("should handle ArrowLeft (Prev Category)", () => {
        // Categories: Happiness, Sadness.
        // Current: Happiness. Prev (wrap): Sadness.
        mockExpStore.transitionPath = {
            current_state: { emotion: "Joy" }
        } as any;

        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("ArrowLeft");

        expect(mockExpStore.setTransitionPath).toHaveBeenCalled();
        const newPath = (mockExpStore.setTransitionPath as jest.Mock).mock.calls[0][0];
        expect(newPath.current_state.category).toBe("Sadness");
    });

    it("should handle ArrowUp/Down (Cycle Path in Category)", () => {
        mockExpStore.transitionPath = {
            current_state: { emotion: "Joy" }
        } as any;

        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("ArrowUp");

        expect(mockExpStore.setTransitionPath).toHaveBeenCalled();
        const newPath = (mockExpStore.setTransitionPath as jest.Mock).mock.calls[0][0];

        // Should stay in same category
        expect(newPath.current_state.category).toBe("Happiness");
    });

    it("should retry random selection on collision", () => {
        // Mock Math.random to return:
        // 1. 0 (start = index 0)
        // 2. 0 (end = index 0) -> Collision loop
        // 3. 0.5 (end = index 1) -> Success
        // 4. 0 (start for next)
        // 5. 0.5 (end for next)
        const mockRandom = jest.spyOn(Math, "random");
        mockRandom
            .mockReturnValueOnce(0)   // start: index 0
            .mockReturnValueOnce(0)   // end: index 0 (collision)
            .mockReturnValueOnce(0.5); // end: index 1

        mockExpStore.transitionPath = {
            current_state: { emotion: "Joy" }
        } as any;

        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("ArrowRight"); // Trigger path generation

        expect(mockExpStore.setTransitionPath).toHaveBeenCalled();
        mockRandom.mockRestore();
    });

    it("should retry random selection on collision (ArrowUp)", () => {
        const mockRandom = jest.spyOn(Math, "random");
        mockRandom
            .mockReturnValueOnce(0)   // start: index 0
            .mockReturnValueOnce(0)   // end: index 0 (collision)
            .mockReturnValueOnce(0.5); // end: index 1

        mockExpStore.transitionPath = {
            current_state: { emotion: "Joy" }
        } as any;

        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("ArrowUp");

        expect(mockExpStore.setTransitionPath).toHaveBeenCalled();
        mockRandom.mockRestore();
    });

    it("should retry random selection on collision (ArrowLeft)", () => {
        const mockRandom = jest.spyOn(Math, "random");
        mockRandom
            .mockReturnValueOnce(0)   // start: index 0
            .mockReturnValueOnce(0)   // end: index 0 (collision)
            .mockReturnValueOnce(0.5); // end: index 1

        mockExpStore.transitionPath = {
            current_state: { emotion: "Joy" }
        } as any;

        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("ArrowLeft");

        expect(mockExpStore.setTransitionPath).toHaveBeenCalled();
        mockRandom.mockRestore();
    });

    it("should ignore shortcuts with modifiers", () => {
        renderHook(() => useZenKeyboardShortcuts(getProps()));
        dispatchKey("m", { ctrlKey: true });
        expect(mockToggleMute).not.toHaveBeenCalled();
    });
});
