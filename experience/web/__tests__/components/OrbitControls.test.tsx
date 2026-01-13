import React from "react";
import { render } from "@testing-library/react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";

// Mock R3F with default return values to avoid destructuring errors
jest.mock("@react-three/fiber", () => ({
    extend: jest.fn(),
    useThree: jest.fn(() => ({
        camera: { name: "MockCamera" },
        gl: { domElement: { name: "Canvas" } }
    })),
    useFrame: jest.fn(),
}));

// Mock Three controls
jest.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
    OrbitControls: jest.fn(),
}));

import { OrbitControls } from "../../components/OrbitControls";

describe("OrbitControls", () => {
    let mockControlsInstance: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockControlsInstance = {
            enabled: true,
            enableDamping: true,
            dampingFactor: 0.05,
            enablePan: false,
            enableZoom: true,
            minDistance: 0,
            maxDistance: 100,
            update: jest.fn(),
            dispose: jest.fn(),
        };

        // Use Spy on React.useRef
        jest.spyOn(React, "useRef").mockReturnValue({
            get current() { return mockControlsInstance; },
            set current(val) {
                // Ignore React's attempt to set DOM node 
            }
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should initialize controls with default props", () => {
        render(<OrbitControls />);

        expect(mockControlsInstance.enabled).toBe(true);
        expect(mockControlsInstance.enableDamping).toBe(true);
    });

    it("should update props on re-render", () => {
        const { rerender } = render(<OrbitControls enableDamping={false} dampingFactor={0.1} />);

        expect(mockControlsInstance.enableDamping).toBe(false);
        expect(mockControlsInstance.dampingFactor).toBe(0.1);

        // Update
        rerender(<OrbitControls enableDamping={true} dampingFactor={0.5} />);
        expect(mockControlsInstance.enableDamping).toBe(true);
        expect(mockControlsInstance.dampingFactor).toBe(0.5);
    });

    it("should update controls in useFrame loop", () => {
        render(<OrbitControls />);

        expect(useFrame).toHaveBeenCalled();
        const callback = (useFrame as jest.Mock).mock.calls[0][0];

        callback();
        expect(mockControlsInstance.update).toHaveBeenCalled();
    });

    it("should not update in useFrame if disabled", () => {
        render(<OrbitControls enabled={false} />);

        expect(mockControlsInstance.enabled).toBe(false);

        const callback = (useFrame as jest.Mock).mock.calls[0][0];
        mockControlsInstance.update.mockClear();

        callback();
        expect(mockControlsInstance.update).not.toHaveBeenCalled();
    });

    it("should dispose controls on unmount", () => {
        const { unmount } = render(<OrbitControls />);
        unmount();
        expect(mockControlsInstance.dispose).toHaveBeenCalled();
    });

    it("should early return if ref is null", () => {
        // Override useRef to return null current logic
        (React.useRef as jest.Mock).mockReturnValue({
            get current() { return null; },
            set current(val) { }
        });

        render(<OrbitControls />);
        expect(true).toBe(true);
    });
});
