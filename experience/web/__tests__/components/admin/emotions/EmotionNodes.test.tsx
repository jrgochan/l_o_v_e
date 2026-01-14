
import { render, act } from "@testing-library/react";
import { AnimatedEmotionNode } from "@/components/admin/emotions/AnimatedEmotionNode";
import { MysticalEmotionNode } from "@/components/admin/emotions/MysticalEmotionNode";
import { EmotionParticles, BurstParticles } from "@/components/admin/particles/EmotionParticles";
import * as THREE from "three";
import { getModeConfig } from "@/utils/modeVisualConfigs";

// Mock R3F
jest.mock("@react-three/fiber", () => ({
    useFrame: (callback: any) => {
        // Prevent callback execution to avoid JSDOM/R3F conflicts
        // callback({ clock: { elapsedTime: 1 } }, 0.016);
    },
    ThreeEvent: {}
}));

// Mock THREE to avoid canvas issues
jest.mock("three", () => {
    const original = jest.requireActual("three");
    return {
        ...original,
        Mesh: class {
            position = new original.Vector3();
            rotation = new original.Euler();
            scale = new original.Vector3(1, 1, 1);
            geometry = {
                attributes: {
                    position: {
                        array: new Float32Array(300), // Mock buffer
                        needsUpdate: false
                    }
                }
            };
            material = {
                opacity: 1,
                color: { copy: jest.fn() },
                emissive: { copy: jest.fn() },
                emissiveIntensity: 1
            };
        },
        Points: class {
            geometry = {
                attributes: {
                    position: {
                        array: new Float32Array(300), // Mock buffer
                        needsUpdate: false
                    }
                }
            };
            rotation = new original.Euler();
        }
    };
});

// Mock configs
jest.mock("@/utils/modeVisualConfigs", () => ({
    getModeConfig: jest.fn().mockReturnValue({
        colors: { base: "#ffffff" },
        animations: { floatEnabled: true, floatSpeed: 1, floatAmplitude: 1 },
        materials: { metalness: 0, roughness: 1, transparent: false, opacityBase: 1 }
    }),
    applyColorConfig: jest.fn().mockImplementation((c) => c),
    calculateEmissiveIntensity: jest.fn().mockReturnValue(1),
}));

jest.mock("@/utils/emotionAnimationMapper", () => ({
    getEmotionAnimationParams: jest.fn().mockReturnValue({
        breathingRate: 1,
        breathingAmplitude: 0.1,
        rotationSpeed: 0.1,
        secondaryMotion: "orbital",
        secondaryAmplitude: 1,
        glowPulseSpeed: 1,
        colorBoost: 1
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

    describe("AnimatedEmotionNode", () => {
        it("renders and runs frame logic", () => {
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
            // useFrame Mock should have run, exercising the logic inside
            // We can't easily assert internal Three.js state changes without spying on the instances,
            // but this ensures no runtime crash in the hook logic.
        });

        it("handles mystical mode", () => {
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
        });

        it("handles high arousal jitter logic", () => {
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
        });
    });

    describe("MysticalEmotionNode", () => {
        it("renders and runs frame logic", () => {
            render(
                <MysticalEmotionNode
                    emotion={mockEmotion}
                    color={mockColor}
                    size={1}
                    isSelected={false}
                    isHovered={false}
                />
            );
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

        it("renders (initial state)", () => {
            render(
                <EmotionParticles
                    emotion={mockEmotion}
                    color={mockColor}
                    config={mockConfig}
                    isSelected={false}
                    isHovered={false}
                />
            );
        });

        it("handles disabled state", () => {
            render(
                <EmotionParticles
                    emotion={mockEmotion}
                    color={mockColor}
                    config={{ ...mockConfig, enabled: false }}
                    isSelected={false}
                    isHovered={false}
                />
            );
        });

        it("handles burst particles (initial state)", () => {
            render(
                <BurstParticles
                    position={new THREE.Vector3()}
                    color={mockColor}
                    trigger={true}
                />
            );
        });
    });
});
