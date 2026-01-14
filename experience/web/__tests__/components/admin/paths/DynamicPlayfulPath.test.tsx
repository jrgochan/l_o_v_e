
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
  let useFrameCallback: (state: any) => void;

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
      },
      // Material props
      color: {
        get() { if (!this._color) this._color = new THREE.Color(); return this._color; },
        configurable: true
      },
      emissive: {
        get() { if (!this._emissive) this._emissive = new THREE.Color(); return this._emissive; },
        configurable: true
      },
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
      // Mesh prop to access material
      material: {
        get() {
          if (!this._material) {
            this._material = {
              uniforms: {
                time: { value: 0 },
                pathColor: { value: new THREE.Color() },
                isSelected: { value: 0 },
                opacity: { value: 1 }
              },
              color: new THREE.Color(),
              emissive: new THREE.Color(),
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
    color: new THREE.Color("orange"),
    opacity: 0.8,
    isSelected: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    useFrameCallback = () => { };
  });

  it("renders mesh", () => {
    const { container } = render(<DynamicPlayfulPath {...mockProps} />);
    expect(container.querySelector("mesh")).toBeInTheDocument();
  });

  it("registers animation loop and updates visuals", () => {
    const { container } = render(<DynamicPlayfulPath {...mockProps} />);
    expect(useFrame).toHaveBeenCalled();

    // Trigger frame update
    const mockState = { clock: { elapsedTime: 1.0 } };
    useFrameCallback(mockState);

    const mesh = container.querySelector("mesh") as unknown as THREE.Mesh;
    const materialElem = container.querySelector("meshStandardMaterial") as any;

    // 1. Check Breathe (scale)
    expect(mesh.scale.x).not.toBe(1);
    expect(mesh.scale.y).toBe(1); // Y is fixed

    // 2. Check Wobble (position.y)
    expect(mesh.position.y).not.toBe(0);

    // 3. Check Opacity
    expect(materialElem.opacity).toBeLessThan(0.8);
    expect(materialElem.opacity).toBeCloseTo(0.56, 1);

    // 4. Check Color Brightness
    expect(materialElem.color.r).toBeGreaterThan(new THREE.Color("orange").r);

    // 5. Check Glow (emissiveIntensity)
    expect(materialElem.emissiveIntensity).toBeGreaterThan(1.2);
  });

  it("handles isSelected state in animation", () => {
    const { container } = render(<DynamicPlayfulPath {...{ ...mockProps, isSelected: true }} />);

    const mockState = { clock: { elapsedTime: 1.0 } };
    useFrameCallback(mockState);

    const materialElem = container.querySelector("meshStandardMaterial") as any;

    expect(materialElem.emissiveIntensity).toBeGreaterThan(0);
  });

  it("safe checks for missing refs", () => {
    useFrameCallback({ clock: { elapsedTime: 1 } });
  });
});
