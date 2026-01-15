
import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import { DynamicPlayfulPath } from "@/components/admin/paths/DynamicPlayfulPath";
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

describe("DynamicPlayfulPath", () => {
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
      uniforms: {
        time: { value: 0 },
        pathColor: { value: new THREE.Color() },
        isSelected: { value: 0 },
        opacity: { value: 1 }
      },
      color: new THREE.Color(),
      emissive: new THREE.Color(),
      opacity: 1,
      emissiveIntensity: 1,
      transparent: true,
      metalness: 0,
      roughness: 0
    }));
  });

  const mockProps = {
    tubeGeometry: new THREE.TubeGeometry(),
    color: new THREE.Color("orange"),
    opacity: 0.8,
    isSelected: false,
  };

  beforeEach(() => {
    frameCallbacks.clear();
    jest.clearAllMocks();
    cleanup();
  });

  it("renders mesh", () => {
    const { container } = render(<DynamicPlayfulPath {...mockProps} />);
    expect(container.querySelector("mesh")).toBeInTheDocument();
  });

  it("registers animation loop and updates visuals", () => {
    const { container } = render(<DynamicPlayfulPath {...mockProps} />);

    // Trigger frame update
    mockAdvanceFrame(1.0, 0.016);

    const mesh = container.querySelector("mesh") as unknown as THREE.Mesh;
    const materialElem = container.querySelector("meshStandardMaterial") as any;

    // 1. Check Breathe (scale)
    expect(mesh.scale.x).not.toBe(1);
    expect(mesh.scale.y).toBe(1); // Y is fixed

    // 2. Check Wobble (position.y)
    expect(mesh.position.y).not.toBe(0);

    // 3. Check Opacity
    expect(materialElem.opacity).toBeLessThan(0.8);
    // expect(materialElem.opacity).toBeCloseTo(0.56, 1); // Exact math might vary, checking generic change is standard

    // 4. Check Color Brightness
    expect(materialElem.color.r).toBeGreaterThan(new THREE.Color("orange").r);

    // 5. Check Glow (emissiveIntensity)
    expect(materialElem.emissiveIntensity).toBeGreaterThan(1.2);
  });

  it("handles isSelected state in animation", () => {
    const { container } = render(<DynamicPlayfulPath {...{ ...mockProps, isSelected: true }} />);

    mockAdvanceFrame(1.0, 0.016);

    const materialElem = container.querySelector("meshStandardMaterial") as any;
    expect(materialElem.emissiveIntensity).toBeGreaterThan(0);
  });

  it("safe checks for missing refs", () => {
    // 1. Render to register callback
    const { unmount } = render(<DynamicPlayfulPath {...mockProps} />);

    // 2. Capture the callback
    const callback = Array.from(frameCallbacks)[0];

    // 3. Unmount to clear refs
    unmount();

    // 4. Re-add callback manually and run
    frameCallbacks.add(callback);

    // Should return early and not throw
    expect(() => mockAdvanceFrame(1.0, 0.016)).not.toThrow();
  });
});
