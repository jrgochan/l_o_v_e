import React from "react";
import { render } from "@testing-library/react";
import { AdvancedPath } from "@/components/admin/paths/AdvancedPath";
import * as THREE from "three";
import { PathAnimationMode } from "@/types/atlas-admin";

// Mock React Three Fiber
jest.mock("@react-three/fiber", () => ({
    useFrame: jest.fn((cb) => cb({ clock: { elapsedTime: 1 } })), // Execute callback immediately with mock state
    extend: jest.fn(),
}));

describe("AdvancedPath", () => {
    let mockTubeGeometry: THREE.TubeGeometry;
    let mockColor: THREE.Color;
    let meshRefMock: any;
    let materialRefMock: any;
    let initialYRefMock: any;

    beforeEach(() => {
        mockTubeGeometry = new THREE.TubeGeometry();
        mockColor = new THREE.Color("red");

        // Reset mutable mocks for each test
        // Use getter/setter to prevent React from overwriting "current" with the DOM node
        // when it renders <mesh>. We want to keep our THREE object mock.
        const createSafeRef = (initialValue: any) => {
            let _val = initialValue;
            return {
                get current() { return _val; },
                set current(newVal) {
                    // Only accept updates if it's NOT a DOM node (which has no position property)
                    // or if it matches our expected shape.
                    // Simplest check: if newVal has 'position' (our mock) or is null, accept it.
                    // If it's a DOM node (no position), ignore it.
                    if (newVal === null || (typeof newVal === 'object' && 'position' in newVal)) {
                        _val = newVal;
                    }
                    // Otherwise ignore the DOM node assignment
                }
            };
        };

        meshRefMock = createSafeRef({
            position: { y: 0, x: 0, z: 0 },
            id: 1,
        });

        materialRefMock = createSafeRef({
            opacity: 1,
            color: { copy: jest.fn(), clone: jest.fn(() => new THREE.Color("red")) },
            emissive: { copy: jest.fn() },
            emissiveIntensity: 1,
        });

        initialYRefMock = { current: 10 };

        // Mock useRef sequentially matching the component:
        // 1. meshRef
        // 2. materialRef
        // 3. initialY
        jest.spyOn(React, "useRef")
            .mockReturnValueOnce(meshRefMock)
            .mockReturnValueOnce(materialRefMock)
            .mockReturnValueOnce(initialYRefMock)
            .mockReturnValue({ current: null }); // fallback
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Helper to suppress console warning about useLayoutEffect/useFrame in jest
    const originalConsoleError = console.error;
    beforeAll(() => {
        console.error = (...args) => {
            if (/useLayoutEffect/.test(args[0])) return;
            originalConsoleError(...args);
        };
    });
    afterAll(() => {
        console.error = originalConsoleError;
    });

    it("renders crystalline mode and updates geometry", () => {
        render(
            <AdvancedPath
                mode="crystalline"
                tubeGeometry={mockTubeGeometry}
                color={mockColor}
                opacity={0.5}
                isSelected={false}
            />
        );

        // Crystalline: meshRef.current.position.y = initialY.current
        expect(meshRefMock.current.position.y).toBe(10);

        // Flash effect calculated from time=1
        // flash = Math.pow(Math.sin(1 * 2.0 + 1), 20.0) -> sin(3)^20 -> tiny number
        // We just check that emissiveIntensity was set
        expect(materialRefMock.current.emissiveIntensity).toBeDefined();
        expect(materialRefMock.current.opacity).toBeLessThanOrEqual(1.0);
    });

    it("renders luminous mode and pulses", () => {
        render(
            <AdvancedPath
                mode="luminous"
                tubeGeometry={mockTubeGeometry}
                color={mockColor}
                opacity={0.5}
                isSelected={true}
            />
        );

        // Luminous: changes emissive intensity based on pulse
        // pulse = sin(4)*0.5 + 0.5 ~> sin(4) is -0.75 -> pulse ~ 0.12
        // targetEmissiveIntensity = (isSelected?3.0:1.5) + pulse -> 3.12ish
        expect(materialRefMock.current.emissiveIntensity).toBeGreaterThan(2.0);
    });

    it("renders liquid mode and waves", () => {
        render(
            <AdvancedPath
                mode="liquid"
                tubeGeometry={mockTubeGeometry}
                color={mockColor}
                opacity={0.5}
                isSelected={false}
            />
        );

        // Liquid: y = initialY + wave
        // wave = sin(1.5 + x) * 0.05
        // y should not be exactly initialY (unless sin is 0)
        expect(meshRefMock.current.position.y).not.toBe(10);
    });

    it("renders glitch mode and flickers", () => {
        // Mock Math.random to trigger the glitch effects
        jest.spyOn(Math, "random").mockReturnValue(0.99); // trigger all (>0.95, >0.9, >0.98)

        render(
            <AdvancedPath
                mode="glitch"
                tubeGeometry={mockTubeGeometry}
                color={mockColor}
                opacity={0.5}
                isSelected={false}
            />
        );

        // Glitch:
        // 1. Position offset (random > 0.95)
        expect(meshRefMock.current.position.y).not.toBe(10);

        // 2. Opacity flicker (random > 0.9)
        expect(materialRefMock.current.opacity).toBe(0.1); // 0.5 * 0.2

        // 3. Color split (random > 0.98) -> Green
        // targetEmissiveIntensity = 5.0
        expect(materialRefMock.current.emissiveIntensity).toBe(5.0);
    });

    it("renders subtle mode (fallback)", () => {
        render(
            <AdvancedPath
                mode="subtle"
                tubeGeometry={mockTubeGeometry}
                color={mockColor}
                opacity={0.5}
                isSelected={true}
            />
        );

        // No specific mode logic, uses shared defaults
        // targetEmissiveIntensity = isSelected ? 2.0 : 1.0
        // targetEmissiveIntensity = isSelected ? 2.0 : 1.0
        expect(materialRefMock.current.emissiveIntensity).toBe(2.0);
    });

    it("renders luminous mode not selected", () => {
        // Line 73 false branch
        render(
            <AdvancedPath
                mode="luminous"
                tubeGeometry={mockTubeGeometry}
                color={mockColor}
                opacity={0.5}
                isSelected={false}
            />
        );
        // pulse is ~0.12 (time=1)
        // target = 1.5 + 0.12 = 1.62
        expect(materialRefMock.current.emissiveIntensity).toBeLessThan(2.0);
    });

    it("renders glitch mode without triggering effects (random=0)", () => {
        // Lines 91-102 false branches
        jest.spyOn(Math, "random").mockReturnValue(0.0);

        render(
            <AdvancedPath
                mode="glitch"
                tubeGeometry={mockTubeGeometry}
                color={mockColor}
                opacity={0.5}
                isSelected={false}
            />
        );

        // Should NOT shift position (remains 0)
        expect(meshRefMock.current.position.y).toBe(0);
        // Should NOT flicker opacity
        expect(materialRefMock.current.opacity).toBe(0.5);
    });

    it("handles initialization with missing ref safely", () => {
        // Lines 39-46 missing ref/position branch
        // We override the default spy for this test to return null for meshRef
        jest.restoreAllMocks(); // Clear default mocks

        // Re-mock with null meshRef
        jest.spyOn(React, "useRef")
            .mockReturnValueOnce({ current: null }) // meshRef
            .mockReturnValueOnce(materialRefMock) // materialRef
            .mockReturnValueOnce(initialYRefMock) // initialY
            .mockReturnValue({ current: null });

        render(
            <AdvancedPath
                mode="subtle"
                tubeGeometry={mockTubeGeometry}
                color={mockColor}
                opacity={0.5}
                isSelected={false}
            />
        );

        // initialY should NOT be updated from 10 if there is no mesh
        // Wait, initialYRefMock.current was 10. `initialY` is a ref.
        // If `meshRef.current` is null, line 40 is skipped.
        // So initialY.current remains 10 (or whatever it started as).
        // Actually in the valid case, it sets `initialY.current = meshRef.current.position.y`.
        // In valid case, mesh y is 0. So initialY becomes 0.
        // In this null case, it should remain 10.

        expect(initialYRefMock.current).toBe(10);
    });
});
