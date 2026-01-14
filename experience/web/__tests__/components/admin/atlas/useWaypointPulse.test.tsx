import { useWaypointPulse } from "../../../../components/admin/atlas/useWaypointPulse";
import { render } from "@testing-library/react";
import React from "react";
import * as THREE from "three";

// Mock R3F
const mockUseFrame = jest.fn();
jest.mock("@react-three/fiber", () => ({
    useFrame: (cb: any) => mockUseFrame(cb),
}));

describe("useWaypointPulse", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should register frame loop and animate", () => {
        const meshRef = { current: { scale: { setScalar: jest.fn() } } };

        // Render a dummy component to use the hook
        const TestComponent = ({ mode }: { mode: any }) => {
            useWaypointPulse(meshRef as any, mode);
            return null;
        };

        render(<TestComponent mode="dynamic" />);

        expect(mockUseFrame).toHaveBeenCalled();
        const frameCallback = mockUseFrame.mock.calls[0][0];

        // Execute callback
        const state = { clock: { elapsedTime: 1 } };
        frameCallback(state);

        expect(meshRef.current.scale.setScalar).toHaveBeenCalled();
    });

    it("should handle subtle mode", () => {
        const meshRef = { current: { scale: { setScalar: jest.fn() } } };
        const TestComponent = () => {
            useWaypointPulse(meshRef as any, "subtle");
            return null;
        };
        render(<TestComponent />);

        const frameCallback = mockUseFrame.mock.calls[0][0];
        frameCallback({ clock: { elapsedTime: 1 } });
        expect(meshRef.current.scale.setScalar).toHaveBeenCalled();
    });

    it("should handle mystical mode", () => {
        const meshRef = { current: { scale: { setScalar: jest.fn() } } };
        const TestComponent = () => {
            useWaypointPulse(meshRef as any, "mystical");
            return null;
        };
        render(<TestComponent />);

        const frameCallback = mockUseFrame.mock.calls[0][0];
        frameCallback({ clock: { elapsedTime: 1 } });
        expect(meshRef.current.scale.setScalar).toHaveBeenCalled();
    });
});
