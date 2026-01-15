
import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import { SubtleElegantPath } from "@/components/admin/paths/SubtleElegantPath";
import * as THREE from "three";

// --- Robust R3F Mock ---
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
    const proto = HTMLElement.prototype;
    definePolyfill(proto, 'position', () => new THREE.Vector3());
    definePolyfill(proto, 'rotation', () => new THREE.Euler());
    definePolyfill(proto, 'scale', () => new THREE.Vector3(1, 1, 1));
    definePolyfill(proto, 'color', () => new THREE.Color());
    definePolyfill(proto, 'emissive', () => new THREE.Color());
    definePolyfill(proto, 'emissiveIntensity', () => 1);
    definePolyfill(proto, 'opacity', () => 1);

    // Mesh prop to access material
    definePolyfill(proto, 'material', () => ({
      color: new THREE.Color(),
      emissive: new THREE.Color(),
      opacity: 1,
      emissiveIntensity: 1,
      metalness: 0,
      roughness: 0,
      transparent: true
    }));
  });

  const mockProps = {
    tubeGeometry: new THREE.TubeGeometry(),
    color: new THREE.Color("blue"),
    opacity: 0.5,
    isSelected: false,
  };

  beforeEach(() => {
    frameCallbacks.clear();
    jest.clearAllMocks();
    cleanup();
  });

  it("renders mesh", () => {
    const { container } = render(<SubtleElegantPath {...mockProps} />);
    expect(container.querySelector("mesh")).toBeInTheDocument();
  });

  it("registers animation loop and updates visuals", () => {
    const { container } = render(<SubtleElegantPath {...mockProps} />);

    // Trigger frame update
    mockAdvanceFrame(1.0, 0.016);

    const mesh = container.querySelector("mesh") as unknown as THREE.Mesh;
    const materialElem = container.querySelector("meshStandardMaterial") as any;

    // 1. Check Breathe (scale)
    expect(mesh.scale.x).not.toBe(1);
    expect(mesh.scale.y).toBe(1);

    // 2. Check Wobble (position.y)
    expect(mesh.position.y).not.toBe(0);

    // 3. Check Opacity
    expect(materialElem.opacity).toBeLessThan(0.75);

    // 4. Check Glow (emissiveIntensity)
    expect(materialElem.emissiveIntensity).toBeGreaterThan(1.0);
  });

  it("handles isSelected state in animation", () => {
    const { container } = render(<SubtleElegantPath {...{ ...mockProps, isSelected: true }} />);

    mockAdvanceFrame(1.0, 0.016);

    const materialElem = container.querySelector("meshStandardMaterial") as any;

    // glow base is doubled when selected
    expect(materialElem.emissiveIntensity).toBeGreaterThan(2.0);
  });

  it("safe checks for missing refs", () => {
    const { unmount } = render(<SubtleElegantPath {...mockProps} />);
    const callback = Array.from(frameCallbacks)[0];
    unmount();
    frameCallbacks.add(callback);
    expect(() => mockAdvanceFrame(1.0, 0.016)).not.toThrow();
  });
});
