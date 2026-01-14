
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { DynamicPlayfulPath } from "@/components/admin/paths/DynamicPlayfulPath";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Mock R3F
jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

// Suppress R3F tag warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      /Use PascalCase for React components/.test(args[0]) ||
      /The tag <.*> is unrecognized/.test(args[0]) ||
      /Received .* for a non-boolean attribute/.test(args[0]) ||
      /React does not recognize the .* prop/.test(args[0]) ||
      /is using incorrect casing/.test(args[0])
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

describe("DynamicPlayfulPath", () => {
  beforeAll(() => {
    // Patch Element for R3F props
    Object.defineProperties(window.Element.prototype, {
      position: {
        get() { if (!this._pos) this._pos = new THREE.Vector3(); return this._pos; },
        configurable: true
      },
      scale: {
        get() { if (!this._scale) this._scale = new THREE.Vector3(1, 1, 1); return this._scale; },
        configurable: true
      },
      rotation: {
        get() { if (!this._rot) this._rot = new THREE.Euler(); return this._rot; },
        configurable: true
      }
    });
  });

  const mockProps = {
    tubeGeometry: new THREE.TubeGeometry(),
    color: new THREE.Color("orange"),
    opacity: 0.8,
    isSelected: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  it("renders mesh", () => {
    const { container } = render(<DynamicPlayfulPath {...mockProps} />);
    expect(container.querySelector("mesh")).toBeInTheDocument();
  });

  it("registers animation loop", () => {
    render(<DynamicPlayfulPath {...mockProps} />);
    expect(useFrame).toHaveBeenCalled();
  });
});
