import { render, act } from "@testing-library/react";
import { InnerCharacterSphere, MotionIndicator } from "@/components/admin/spheres/InnerCharacterSphere";
import React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// Mock emotionAnimationMapper
jest.mock("@/utils/emotionAnimationMapper", () => ({
    getEmotionAnimationParams: jest.fn(() => ({
        breathingRate: 2,
        breathingAmplitude: 0.1,
        rotationSpeed: 0.1, // Ensure fast rotation
        glowIntensity: 1.0,
        glowPulseSpeed: 2.0,
        secondaryMotion: "orbital",
        secondaryAmplitude: 1.0,
        colorBoost: 1.0,
    })),
}));

// Mock R3F & Three
jest.mock("@react-three/fiber", () => ({
    ...jest.requireActual("@react-three/fiber"),
    Canvas: ({ children }: any) => <div data-testid="r3f-canvas">{children}</div>,
    useFrame: jest.fn(),
}));

describe("InnerCharacterSphere", () => {
    // Patch Element prototype for R3F props
    beforeAll(() => {
        Object.defineProperties(window.HTMLElement.prototype, {
            position: {
                get() { if (!this._pos) this._pos = new THREE.Vector3(); return this._pos; },
                configurable: true
            },
            rotation: {
                get() { if (!this._rot) this._rot = new THREE.Euler(); return this._rot; },
                configurable: true
            },
            scale: {
                get() { if (!this._scale) this._scale = new THREE.Vector3(1, 1, 1); return this._scale; },
                configurable: true
            },
            // Material properties
            color: {
                get() { if (!this._color) this._color = new THREE.Color(); return this._color; },
                configurable: true
            },
            emissive: {
                get() { if (!this._emissive) this._emissive = new THREE.Color(); return this._emissive; },
                configurable: true
            },
            emissiveIntensity: {
                get() { return this._emissiveIntensity || 1; },
                set(v) { this._emissiveIntensity = v; },
                configurable: true
            }
        });
    });

    const mockEmotion = {
        id: "1",
        name: "Joy",
        category: "joy",
        vac: [0.8, 0.5, 0.7],
        definition: "Happy"
    };

    it("registers animation loop and updates mesh", () => {
        const frameCallbacks: Set<any> = new Set();
        (useFrame as jest.Mock).mockImplementation((cb) => {
            frameCallbacks.add(cb);
            return () => frameCallbacks.delete(cb);
        });

        const { container } = render(<InnerCharacterSphere emotion={mockEmotion as any} mode="dynamic" />);

        expect(frameCallbacks.size).toBeGreaterThan(0);

        // Advance frame manually
        act(() => {
            frameCallbacks.forEach(cb => cb({ clock: { elapsedTime: 0.25 } }));
        });

        const mesh = container.querySelector("mesh") as any;

        // Check rotation update (y axis)
        // animParams.rotationSpeed for Joy (high arousal/valence) -> likely positive
        expect(mesh.rotation.y).toBeGreaterThan(0);

        // Check breathing scale
        // At t=0.25, breathing should be max amplitude
        expect(mesh.scale.x).toBeGreaterThan(1.0);
    });

    it("handles orbital motion", () => {
        const frameCallbacks: Set<any> = new Set();
        (useFrame as jest.Mock).mockImplementation((cb) => {
            frameCallbacks.add(cb);
            return () => frameCallbacks.delete(cb);
        });

        // Force orbital motion via category
        const orbitalEmotion = { ...mockEmotion, category: "places we go with others" }; // Known social category

        const { container } = render(<InnerCharacterSphere emotion={orbitalEmotion as any} mode="dynamic" />);
        const mesh = container.querySelector("mesh") as any;

        expect(frameCallbacks.size).toBeGreaterThan(0);
        // Trigger all
        act(() => {
            frameCallbacks.forEach(cb => cb({ clock: { elapsedTime: 1 } }));
        });

        // Orbital updates x and z
        expect(mesh.position.x).not.toBe(0);
        expect(mesh.position.z).not.toBe(0);
    });

    it("handles stable motion", () => {
        const frameCallbacks: Set<any> = new Set();
        (useFrame as jest.Mock).mockImplementation((cb) => {
            frameCallbacks.add(cb);
            return () => frameCallbacks.delete(cb);
        });

        // Override mock for stable
        const { getEmotionAnimationParams } = require("@/utils/emotionAnimationMapper");
        getEmotionAnimationParams.mockReturnValue({
            breathingRate: 2,
            breathingAmplitude: 0.1,
            rotationSpeed: 0.1,
            glowIntensity: 1.0,
            glowPulseSpeed: 2.0,
            secondaryMotion: "stable",
            secondaryAmplitude: 0,
            colorBoost: 1.0
        });

        const { container } = render(<InnerCharacterSphere emotion={mockEmotion as any} mode="dynamic" />);
        const mesh = container.querySelector("mesh") as any;

        expect(frameCallbacks.size).toBeGreaterThan(0);
        // Trigger all
        act(() => {
            frameCallbacks.forEach(cb => cb({ clock: { elapsedTime: 1 } }));
        });

        // Stable updates nothing
        // (Assuming initial pos is 0,0,0)
        expect(mesh.position.x).toBe(0);
        expect(mesh.position.z).toBe(0);
    });

    it("handles recoil motion", () => {
        const frameCallbacks: Set<any> = new Set();
        (useFrame as jest.Mock).mockImplementation((cb) => {
            frameCallbacks.add(cb);
            return () => frameCallbacks.delete(cb);
        });

        const { getEmotionAnimationParams } = require("@/utils/emotionAnimationMapper");
        getEmotionAnimationParams.mockReturnValue({
            breathingRate: 2,
            breathingAmplitude: 0.1,
            rotationSpeed: 0.1,
            glowIntensity: 1.0,
            glowPulseSpeed: 2.0,
            secondaryMotion: "recoil",
            secondaryAmplitude: 1.0,
            colorBoost: 1.0
        });

        const { container } = render(<InnerCharacterSphere emotion={mockEmotion as any} mode="dynamic" />);
        const mesh = container.querySelector("mesh") as any;

        act(() => {
            frameCallbacks.forEach(cb => cb({ clock: { elapsedTime: 1 } }));
        });

        // Recoil updates y
        expect(mesh.position.y).not.toBe(0);
    });

    it("handles reaching motion", () => {
        const frameCallbacks: Set<any> = new Set();
        (useFrame as jest.Mock).mockImplementation((cb) => {
            frameCallbacks.add(cb);
            return () => frameCallbacks.delete(cb);
        });

        const { getEmotionAnimationParams } = require("@/utils/emotionAnimationMapper");
        getEmotionAnimationParams.mockReturnValue({
            breathingRate: 2,
            breathingAmplitude: 0.1,
            rotationSpeed: 0.1,
            glowIntensity: 1.0,
            glowPulseSpeed: 2.0,
            secondaryMotion: "reaching",
            secondaryAmplitude: 1.0,
            colorBoost: 1.0
        });

        const { container } = render(<InnerCharacterSphere emotion={mockEmotion as any} mode="dynamic" />);
        const mesh = container.querySelector("mesh") as any;

        act(() => {
            frameCallbacks.forEach(cb => cb({ clock: { elapsedTime: 1 } }));
        });

        // Reaching updates x and y
        expect(mesh.position.x).not.toBe(0);
        expect(mesh.position.y).not.toBe(0);
    });

    describe("MotionIndicator", () => {
        it("renders ring for stable type", () => {
            (useFrame as jest.Mock).mockImplementation(jest.fn());
            const { container } = render(<MotionIndicator type="stable" />);
            expect(container.querySelector("coneGeometry")).toBeInTheDocument();
        });

        it("renders torus for other types", () => {
            (useFrame as jest.Mock).mockImplementation(jest.fn());
            let { container } = render(<MotionIndicator type="orbital" />);
            expect(container.querySelector("torusGeometry")).toBeInTheDocument();

            // Test other types for coverage
            ({ container } = render(<MotionIndicator type="recoil" />));
            expect(container.querySelector("torusGeometry")).toBeInTheDocument();

            ({ container } = render(<MotionIndicator type="reaching" />));
            expect(container.querySelector("torusGeometry")).toBeInTheDocument();
        });
    });
});
