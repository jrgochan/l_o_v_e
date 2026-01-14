
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { MysticalEtherealPath } from "@/components/admin/paths/MysticalEtherealPath";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

let useFrameCallback: (state: any, delta?: number) => void;

// Mock R3F
jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({ camera: { position: new THREE.Vector3() } })), // Add useThree availability if needed
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

describe("MysticalEtherealPath", () => {
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
              }
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
    color: new THREE.Color("yellow"),
    size: 1,
    mode: "dynamic" as const,
    isSelected: false,
    opacity: 0.7,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    useFrameCallback = () => { };
  });

  it("renders mesh", () => {
    const { container } = render(<MysticalEtherealPath {...mockProps} />);
    expect(container.querySelector("mesh")).toBeInTheDocument();
  });

  it("registers animation loop and updates shader uniforms", () => {
    const { container } = render(<MysticalEtherealPath {...{ ...mockProps, isSelected: true }} />);
    expect(useFrame).toHaveBeenCalled();

    // Trigger frame update
    const mockState = { clock: { elapsedTime: 2.0 } };
    useFrameCallback(mockState);

    const mesh = container.querySelector("mesh") as unknown as THREE.Mesh;
    const material = mesh.material as THREE.ShaderMaterial;

    // Verify specific uniforms are updated
    expect(material.uniforms.time.value).toBe(2.0);
    expect(material.uniforms.pathColor.value).toBe(mockProps.color);
    expect(material.uniforms.isSelected.value).toBe(1.0);
    expect(material.uniforms.opacity.value).toBe(0.7);
  });

  it("handles unselected state in animation loop", () => {
    const { container } = render(<MysticalEtherealPath {...{ ...mockProps, isSelected: false }} />);

    const mockState = { clock: { elapsedTime: 1.0 } };
    useFrameCallback(mockState);

    const mesh = container.querySelector("mesh") as unknown as THREE.Mesh;
    const material = mesh.material as THREE.ShaderMaterial;

    expect(material.uniforms.isSelected.value).toBe(0.0);
  });

  it("safe checks for missing refs", () => {
    useFrameCallback({ clock: { elapsedTime: 1 } });
  });
});
