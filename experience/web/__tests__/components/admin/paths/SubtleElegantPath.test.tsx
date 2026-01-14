
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { SubtleElegantPath } from "@/components/admin/paths/SubtleElegantPath";
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

describe("SubtleElegantPath", () => {
  let useFrameCallback: (state: any) => void;

  beforeAll(() => {
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
      },
      // Material props
      opacity: {
        get() { return this._opacity ?? 1; },
        set(v) { this._opacity = v; },
        configurable: true
      },
      emissiveIntensity: {
        get() { return this._emissiveIntensity ?? 1; },
        set(v) { this._emissiveIntensity = v; },
        configurable: true
      },
      // Mesh prop to access material (optional here as it uses materialRef, but consistency is good)
      material: {
        get() {
          if (!this._material) {
            this._material = {
              opacity: 1,
              emissiveIntensity: 1
            };
          }
          return this._material;
        },
        configurable: true
      }
    });

    (useFrame as jest.Mock).mockImplementation((cb) => {
      useFrameCallback = cb;
    });
  });

  const mockProps = {
    tubeGeometry: new THREE.TubeGeometry(),
    color: new THREE.Color("blue"),
    opacity: 0.5,
    isSelected: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    useFrameCallback = () => { };
  });

  it("renders mesh", () => {
    const { container } = render(<SubtleElegantPath {...mockProps} />);
    expect(container.querySelector("mesh")).toBeInTheDocument();
  });

  it("registers animation loop and updates visuals", () => {
    const { container } = render(<SubtleElegantPath {...mockProps} />);
    expect(useFrame).toHaveBeenCalled();

    // Trigger frame update
    const mockState = { clock: { elapsedTime: 1.0 } };
    useFrameCallback(mockState);

    const mesh = container.querySelector("mesh") as unknown as THREE.Mesh;
    const materialElem = container.querySelector("meshStandardMaterial") as any;

    // 1. Check Breathe (scale)
    expect(mesh.scale.x).not.toBe(1);
    expect(mesh.scale.y).toBe(1);

    // 2. Check Wobble (position.y)
    expect(mesh.position.y).not.toBe(0);

    // 3. Check Opacity
    expect(materialElem.opacity).toBeLessThan(0.75); // Shimmer varies

    // 4. Check Glow (emissiveIntensity)
    expect(materialElem.emissiveIntensity).toBeGreaterThan(1.0);
  });

  it("handles isSelected state in animation", () => {
    const { container } = render(<SubtleElegantPath {...{ ...mockProps, isSelected: true }} />);

    const mockState = { clock: { elapsedTime: 1.0 } };
    useFrameCallback(mockState);

    const materialElem = container.querySelector("meshStandardMaterial") as any;

    // glow base is doubled when selected
    expect(materialElem.emissiveIntensity).toBeGreaterThan(2.0);
  });

  it("safe checks for missing refs", () => {
    useFrameCallback({ clock: { elapsedTime: 1 } });
  });
});
