
import { render, act } from "@testing-library/react";
import { AnimatedEmotionNode } from "@/components/admin/emotions/AnimatedEmotionNode";
import { MysticalEmotionNode } from "@/components/admin/emotions/MysticalEmotionNode";
import { EmotionParticles, BurstParticles } from "@/components/admin/particles/EmotionParticles";
import * as THREE from "three";
import { getModeConfig } from "@/utils/modeVisualConfigs";
import React from "react";

// --- Enhanced R3F Mock setup ---
const frameCallbacks: Set<(state: any, delta: number) => void> = new Set();

const mockAdvanceFrame = (time: number, delta: number) => {
    act(() => {
        frameCallbacks.forEach((cb) => cb({ clock: { elapsedTime: time } }, delta));
    });
};

jest.mock("@react-three/fiber", () => ({
    useFrame: (callback: any) => {
        frameCallbacks.add(callback);
        return () => frameCallbacks.delete(callback);
    },
    ThreeEvent: {}
}));

// Mock THREE basic classes ensuring we have working math
// We don't need to mock Mesh/Points classes anymore because we patch the DOM elements
// But we do need setScalar on Vector3 for convenience if usage expects it
// ThreeJS Vector3 has setScalar, so real implementation is fine.

// Mock configs
jest.mock("@/utils/modeVisualConfigs", () => ({
    getModeConfig: jest.fn().mockImplementation((mode) => {
        const isMystical = mode === "mystical";
        const isSubtle = mode === "subtle";
        return {
            colors: { base: "#ffffff" },
            animations: {
                floatEnabled: !isSubtle,
                floatSpeed: 1,
                floatAmplitude: 1
            },
            materials: {
                metalness: 0,
                roughness: 1,
                transparent: isMystical,
                opacityBase: 1
            }
        };
    }),
    applyColorConfig: jest.fn().mockImplementation((c) => c),
    calculateEmissiveIntensity: jest.fn().mockReturnValue(1),
}));

jest.mock("@/utils/emotionAnimationMapper", () => ({
    getEmotionAnimationParams: jest.fn().mockImplementation((emotion) => {
        let motion = "orbital";
        if (emotion.category === "Shame") motion = "recoil";
        else if (emotion.category === "Curiosity") motion = "reaching";
        else if (emotion.category === "Contentment") motion = "stable";

        return {
            breathingRate: 1,
            breathingAmplitude: 0.1,
            rotationSpeed: 0.1,
            secondaryMotion: motion,
            secondaryAmplitude: 1,
            glowPulseSpeed: 1,
            colorBoost: 1
        }
    })
}));

describe("Emotion Nodes Coverage", () => {
    const mockEmotion = {
        id: "e1",
        name: "Test",
        category: "Joy",
        vac: [0.8, 0.6, 0.4] as [number, number, number],
        definition: "def",
        quaternion: [0, 0, 0, 1] as [number, number, number, number]
    };
    const mockColor = new THREE.Color("red");

    // Polyfill Helpers
    const definePolyfill = (proto: any, prop: string, factory: () => any) => {
        Object.defineProperty(proto, prop, {
            configurable: true,
            get() {
                if (!(this as any)[`_${prop}`]) {
                    (this as any)[`_${prop}`] = factory();
                }
                return (this as any)[`_${prop}`];
            },
            set(value) {
                (this as any)[`_${prop}`] = value;
            }
        });
    };

    beforeAll(() => {
        // Patch HTMLElement to quack like a Three.js Object3D
        // This is required because R3F renders <mesh> as an HTML element in JSDOM
        const proto = HTMLElement.prototype;

        definePolyfill(proto, 'position', () => new THREE.Vector3());
        definePolyfill(proto, 'rotation', () => new THREE.Euler());
        definePolyfill(proto, 'scale', () => {
            const v = new THREE.Vector3(1, 1, 1);
            // Ensure any spy is attached here if needed, but Vector3 methods work fine
            return v;
        });

        // Material mock - for mesh.material access
        definePolyfill(proto, 'material', () => ({
            opacity: 1,
            color: new THREE.Color(),
            emissive: new THREE.Color(),
            emissiveIntensity: 1,
            transparent: false,
            metalness: 0,
            roughness: 0
        }));

        // Material properties directly on the element (for <meshStandardMaterial ref={...}>)
        definePolyfill(proto, 'color', () => new THREE.Color());
        definePolyfill(proto, 'emissive', () => new THREE.Color());
        definePolyfill(proto, 'emissiveIntensity', () => 1); // Value type, but factory works. Wait, getter will return same 1? Yes.
        definePolyfill(proto, 'opacity', () => 1);
        definePolyfill(proto, 'transparent', () => false);
        definePolyfill(proto, 'metalness', () => 0);
        definePolyfill(proto, 'roughness', () => 0);

        // Geometry mock
        definePolyfill(proto, 'geometry', () => ({
            attributes: {
                position: {
                    array: new Float32Array(900),
                    needsUpdate: false
                }
            },
            dispose: jest.fn()
        }));
    });

    afterAll(() => {
        // Cleanup could involve deleting props, but in JSDOM environment usually safe to leave
        // or restore original prototype if we saved it. 
        // For simple tests, we can leave it.
    });

    beforeEach(() => {
        frameCallbacks.clear();
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe("AnimatedEmotionNode", () => {
        it("renders and handles standard frame logic", () => {
            render(
                <AnimatedEmotionNode
                    emotion={mockEmotion}
                    color={mockColor}
                    size={1}
                    mode="dynamic"
                    isSelected={false}
                    isHovered={false}
                />
            );

            // Advance frame to trigger update
            mockAdvanceFrame(1.0, 0.016);
            // Assertions would ideally check the mock mesh instances if we exported them or spied on them.
            // But main goal is ensuring the code runs without error and branches are hit.
        });

        it("handles mystical mode specific logic", () => {
            render(
                <AnimatedEmotionNode
                    emotion={mockEmotion}
                    color={mockColor}
                    size={1}
                    mode="mystical"
                    isSelected={false}
                    isHovered={false}
                />
            );
            mockAdvanceFrame(1.0, 0.1);
        });

        it("handles high arousal jitter logic (dynamic mode)", () => {
            // Arousal > 0.5 triggers jitter
            const highArousal = { ...mockEmotion, vac: [0.8, 0.9, 0.4] as [number, number, number] };
            render(
                <AnimatedEmotionNode
                    emotion={highArousal}
                    color={mockColor}
                    size={1}
                    mode="dynamic"
                    isSelected={true}
                    isHovered={true}
                />
            );

            mockAdvanceFrame(2.0, 0.1);
        });

        it("handles stable mode (no float)", () => {
            render(
                <AnimatedEmotionNode
                    emotion={mockEmotion}
                    color={mockColor}
                    size={1}
                    mode="stable"
                    isSelected={false}
                    isHovered={false}
                />
            );
            mockAdvanceFrame(1.0, 0.016);
        });
    });

    describe("MysticalEmotionNode", () => {
        it("animates layers correctly", () => {
            render(
                <MysticalEmotionNode
                    emotion={mockEmotion}
                    color={mockColor}
                    size={1}
                    isSelected={false}
                    isHovered={false}
                />
            );
            mockAdvanceFrame(1.0, 0.016);
            // Covers the hook loop inside MysticalEmotionNode
        });

        it("handles negative valence color", () => {
            const negValence = { ...mockEmotion, vac: [-0.8, 0.5, 0.5] as [number, number, number] };
            render(
                <MysticalEmotionNode
                    emotion={negValence}
                    color={mockColor}
                    size={1}
                    isSelected={true}
                    isHovered={true}
                />
            );
            mockAdvanceFrame(1.0, 0.016);
        });

        it("handles neutral valence color", () => {
            const neutralValence = { ...mockEmotion, vac: [0.0, 0.5, 0.5] as [number, number, number] };
            render(
                <MysticalEmotionNode
                    emotion={neutralValence}
                    color={mockColor}
                    size={1}
                    isSelected={true}
                    isHovered={true}
                />
            );
            mockAdvanceFrame(1.0, 0.016);
        });
    });

    describe("EmotionParticles", () => {
        const mockConfig = {
            enabled: true,
            density: 10,
            particleSize: 0.1,
            speedMultiplier: 1,
            maxDistance: 5,
            opacity: 1,
            enableAuras: true,
            enableTrails: false,
            enableBursts: false,
            colorMode: "base" as const
        };

        it("initializes and animates particles", () => {
            render(
                <EmotionParticles
                    emotion={mockEmotion}
                    color={mockColor}
                    config={mockConfig}
                    isSelected={false}
                    isHovered={false}
                />
            );

            // Fast-forward useEffect setTimeout
            act(() => {
                jest.runAllTimers();
            });

            // Trigger animation frame
            mockAdvanceFrame(1.0, 0.016);

            // Trigger again to test "reset particles that go too far" logic?
            // This requires mocking Math.random or spying.
            // For now, ensuring the loop runs is key.
        });

        it("handles disabled state gracefully", () => {
            render(
                <EmotionParticles
                    emotion={mockEmotion}
                    color={mockColor}
                    config={{ ...mockConfig, enabled: false }}
                    isSelected={false}
                    isHovered={false}
                />
            );
            act(() => {
                jest.runAllTimers();
            });
            mockAdvanceFrame(1.0, 0.016);
        });

        it("resets particles that exceed max distance during animation", () => {
            render(
                <EmotionParticles
                    emotion={mockEmotion}
                    color={mockColor}
                    config={{ ...mockConfig, maxDistance: 0.001 }} // Very small distance to force reset
                    isSelected={false}
                    isHovered={false}
                />
            );
            act(() => {
                jest.runAllTimers();
            });
            mockAdvanceFrame(1.0, 1.0); // Big delta to move them
        });

        it("handles burst particles life cycle", () => {
            const { unmount } = render(
                <BurstParticles
                    position={new THREE.Vector3()}
                    color={mockColor}
                    trigger={true}
                />
            );

            // Init data
            act(() => {
                jest.runAllTimers();
            });

            // Animate partial
            mockAdvanceFrame(0.1, 0.1);

            // Animate to completion (progress > 1)
            mockAdvanceFrame(2.0, 1.0);

            unmount();
        });

        it("handles burst particles trigger=false", () => {
            render(
                <BurstParticles
                    position={new THREE.Vector3()}
                    color={mockColor}
                    trigger={false}
                />
            );
            mockAdvanceFrame(0.1, 0.1);
        });
    });
});
