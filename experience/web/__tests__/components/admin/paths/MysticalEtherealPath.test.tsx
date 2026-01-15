import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import { MysticalEtherealPath } from "@/components/admin/paths/MysticalEtherealPath";
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
  useThree: jest.fn(() => ({ camera: { position: new THREE.Vector3() } })),
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
      },
    });
  };

  beforeAll(() => {
    const proto = HTMLElement.prototype;
    definePolyfill(proto, "position", () => new THREE.Vector3());
    definePolyfill(proto, "rotation", () => new THREE.Euler());
    definePolyfill(proto, "scale", () => new THREE.Vector3(1, 1, 1));

    // Mesh prop to access material
    definePolyfill(proto, "material", () => ({
      uniforms: {
        time: { value: 0 },
        pathColor: { value: new THREE.Color() },
        isSelected: { value: 0 },
        opacity: { value: 1 },
      },
    }));
  });

  const mockProps = {
    tubeGeometry: new THREE.TubeGeometry(),
    color: new THREE.Color("yellow"),
    opacity: 0.7,
    isSelected: false,
  };

  beforeEach(() => {
    frameCallbacks.clear();
    jest.clearAllMocks();
    cleanup();
  });

  it("renders mesh", () => {
    const { container } = render(<MysticalEtherealPath {...mockProps} />);
    expect(container.querySelector("mesh")).toBeInTheDocument();
  });

  it("registers animation loop and updates shader uniforms", () => {
    const { container } = render(<MysticalEtherealPath {...{ ...mockProps, isSelected: true }} />);

    // Trigger frame update
    mockAdvanceFrame(2.0, 0.016);

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

    mockAdvanceFrame(1.0, 0.016);

    const mesh = container.querySelector("mesh") as unknown as THREE.Mesh;
    const material = mesh.material as THREE.ShaderMaterial;

    expect(material.uniforms.isSelected.value).toBe(0.0);
  });

  it("safe checks for missing refs", () => {
    const { unmount } = render(<MysticalEtherealPath {...mockProps} />);
    const callback = Array.from(frameCallbacks)[0];
    unmount();
    frameCallbacks.add(callback);
    expect(() => mockAdvanceFrame(1.0, 0.016)).not.toThrow();
  });
});
