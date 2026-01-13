import { renderHook } from "@testing-library/react";
import { useZenKeyboardShortcuts } from "@/hooks/interaction/useZenKeyboardShortcuts";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

// Mock dependencies
const mockInitAudio = jest.fn();
const mockToggleMute = jest.fn();
const mockSetHasAudioEnabled = jest.fn();
const mockSetShowDebug = jest.fn();
const mockEmotions: any[] = [
    { id: "e1", name: "Joy1", category: "Joy", vac: [1, 1, 1] },
    { id: "e2", name: "Joy2", category: "Joy", vac: [1.1, 1.1, 1.1] },
    { id: "e3", name: "Sadness1", category: "Sadness", vac: [-1, -1, -1] },
    { id: "e4", name: "Sadness2", category: "Sadness", vac: [-1.1, -1.1, -1.1] }
];

// Mock Stores
jest.mock("@/stores/useExperienceStore", () => ({
    useExperienceStore: jest.fn(),
}));

jest.mock("@/stores/useSettingsStore", () => ({
    useSettingsStore: jest.fn(),
}));

describe("useZenKeyboardShortcuts", () => {
    let mockSettings: any;
    let mockExperience: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSettings = {
            layers: {
                soulSphere: true,
                emotionPoints: true,
                emotionLabels: true,
                transitionPaths: false,
                cinematicOverlay: false,
            },
            pathAnimationMode: "subtle",
            showAxisLabels: false,
            focusMode: false,
            updateLayer: jest.fn(),
            updateVisualSetting: jest.fn(),
            updateBehaviorSetting: jest.fn(),
        };
        (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockSettings);

        mockExperience = {
            isFlying: false,
            setIsFlying: jest.fn(),
            transitionPath: null,
            setTransitionPath: jest.fn(),
        };

        // Correctly attach getState to the hook function mock itself
        (useExperienceStore as any).getState = jest.fn(() => mockExperience);
        (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) => selector(mockExperience));
    });

    const runHook = () => {
        renderHook(() =>
            useZenKeyboardShortcuts({
                initAudio: mockInitAudio,
                isMuted: true,
                toggleMute: mockToggleMute,
                setHasAudioEnabled: mockSetHasAudioEnabled,
                setShowDebug: mockSetShowDebug,
                emotions: mockEmotions,
            })
        );
    };

    const pressKey = (key: string, ctrlKey = false) => {
        const event = new KeyboardEvent("keydown", { key, ctrlKey });
        window.dispatchEvent(event);
    };

    it("handles audio toggle (m)", () => {
        runHook();
        pressKey("m");
        expect(mockInitAudio).toHaveBeenCalled();
        expect(mockToggleMute).toHaveBeenCalled();
        expect(mockSetHasAudioEnabled).toHaveBeenCalledWith(true);
    });

    it("handles overlay toggle (i)", () => {
        runHook();
        pressKey("i");
        expect(mockSettings.updateLayer).toHaveBeenCalledWith("cinematicOverlay", true);
    });

    it("cycles visual modes (v)", () => {
        runHook();
        pressKey("v");
        expect(mockSettings.updateVisualSetting).toHaveBeenCalledWith("pathAnimationMode", "dynamic");
    });

    it("toggles flyover (t) - requires path", () => {
        mockExperience.transitionPath = {};
        runHook();
        pressKey("t");
        expect(mockExperience.setIsFlying).toHaveBeenCalledWith(true);
    });

    it("toggles axis (a)", () => {
        runHook();
        pressKey("a");
        expect(mockSettings.updateVisualSetting).toHaveBeenCalledWith("showAxisLabels", true);
    });

    it("toggles sphere (s)", () => {
        runHook();
        pressKey("s");
        expect(mockSettings.updateLayer).toHaveBeenCalledWith("soulSphere", false);
    });

    it("toggles emotions (e)", () => {
        runHook();
        pressKey("e");
        expect(mockSettings.updateLayer).toHaveBeenCalledWith("emotionPoints", false);
    });

    it("toggles labels (l)", () => {
        runHook();
        pressKey("l");
        expect(mockSettings.updateLayer).toHaveBeenCalledWith("emotionLabels", false);
    });

    it("toggles focus mode (f)", () => {
        runHook();
        pressKey("f");
        expect(mockSettings.updateBehaviorSetting).toHaveBeenCalledWith("focusMode", true);
    });

    it("toggles paths (p)", () => {
        runHook();
        pressKey("p");
        expect(mockSettings.updateLayer).toHaveBeenCalledWith("transitionPaths", true);
    });

    it("toggles play/pause (Space) - enables layer if hidden", () => {
        mockExperience.transitionPath = {};
        runHook();
        pressKey(" ");
        expect(mockSettings.updateLayer).toHaveBeenCalledWith("transitionPaths", true);
        expect(mockExperience.setIsFlying).toHaveBeenCalledWith(true);
    });

    it("handles debug toggle (d)", () => {
        runHook();
        pressKey("d");
        expect(mockSetShowDebug).toHaveBeenCalled();
    });

    it("handles mock journey (j)", () => {
        runHook();
        pressKey("j");
        expect(mockExperience.setTransitionPath).toHaveBeenCalled();
        expect(mockExperience.setIsFlying).toHaveBeenCalledWith(true);
    });

    // Note: Arrow keys logic is complex (categories, random selection).
    // We should add test cases for ArrowRight/Left/Up/Down specifically if we want 100% on the hook.
    it("handles ArrowRight (Next Category)", () => {
        mockSettings.layers.transitionPaths = true;
        runHook();
        pressKey("ArrowRight");
        expect(mockExperience.setTransitionPath).toHaveBeenCalled();
    });

    it("handles ArrowLeft (Prev Category)", () => {
        mockSettings.layers.transitionPaths = true;
        runHook();
        pressKey("ArrowLeft");
        expect(mockExperience.setTransitionPath).toHaveBeenCalled();
    });

    it("handles ArrowUp/Down (Cycle Path in Category)", () => {
        mockSettings.layers.transitionPaths = true;
        // Set current path to exist so we cycle within its category
        mockExperience.transitionPath = { current_state: { emotion: "Joy1" } };

        runHook();
        pressKey("ArrowUp");
        expect(mockExperience.setTransitionPath).toHaveBeenCalled();

        (mockExperience.setTransitionPath as jest.Mock).mockClear();
        pressKey("ArrowDown");
        expect(mockExperience.setTransitionPath).toHaveBeenCalled();
    });

    it("ignores input fields", () => {
        runHook();
        const input = document.createElement("input");
        document.body.appendChild(input);
        input.focus();

        const event = new KeyboardEvent("keydown", { key: "m" });
        Object.defineProperty(event, 'target', { value: input });
        window.dispatchEvent(event);

        expect(mockInitAudio).not.toHaveBeenCalled();
        document.body.removeChild(input);
    });
});
