import { render, screen, fireEvent } from "@testing-library/react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  BaseSphere,
  getColorFromValence,
  getColorFromCategory,
  blendColors,
  StandardLighting,
} from "@/components/admin/spheres/BaseSphere";

// Mock React Three Fiber
jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn((callback) => callback({ clock: { elapsedTime: 1 } })),
  extend: jest.fn(),
}));

// Mock Three.js
// We don't verify specific Three.js logic, just that the component passes correct props
// But let's mock the Color class since helpers use it
jest.mock("three", () => {
  const originalModule = jest.requireActual("three");
  return {
    ...originalModule,
    // Ensure Color behaves correctly for equality checks if needed,
    // or just rely on actual three implementation for helpers which is safer.
    // Actually, we can use the real THREE for helpers.
  };
});

describe("BaseSphere Helpers", () => {
  describe("getColorFromValence", () => {
    it("should return green for high valence", () => {
      const color = getColorFromValence(0.8);
      expect(color.getHexString()).toBe(new THREE.Color(0x22c55e).getHexString());
    });

    it("should return red for low valence", () => {
      const color = getColorFromValence(-0.8);
      expect(color.getHexString()).toBe(new THREE.Color(0xef4444).getHexString());
    });
  });

  describe("getColorFromCategory", () => {
    const categoryColors = { joy: "#ffff00", sadness: "#0000ff" };

    it("should return mapped color", () => {
      const color = getColorFromCategory("joy", categoryColors);
      expect(color.getHexString()).toBe(new THREE.Color("#ffff00").getHexString());
    });

    it("should return fallback for unknown category", () => {
      const color = getColorFromCategory("unknown", categoryColors);
      expect(color.getHexString()).toBe(new THREE.Color("#888888").getHexString());
    });
  });

  describe("blendColors", () => {
    it("should blend colors based on weights", () => {
      const c1 = new THREE.Color(1, 0, 0); // Red
      const c2 = new THREE.Color(0, 0, 1); // Blue
      const blended = blendColors([c1, c2], [0.5, 0.5]);

      expect(blended.r).toBeCloseTo(0.5);
      expect(blended.b).toBeCloseTo(0.5);
      expect(blended.g).toBe(0);
    });

    it("should handle empty inputs", () => {
      const result = blendColors([], []);
      expect(result).toBeDefined();
    });
  });
});

// Since we are testing a R3F component in a DOM environment
describe("BaseSphere Component", () => {
  // Patch Element prototype for R3F props (needed here too)
  beforeAll(() => {
    Object.defineProperties(window.Element.prototype, {
      position: {
        get() { if (!this._pos) this._pos = new THREE.Vector3(); return this._pos; },
        configurable: true
      },
      rotation: {
        get() { if (!this._rot) this._rot = new THREE.Euler(); return this._rot; },
        configurable: true
      },
      scale: {
        get() { if (!this._scale) this._scale = new THREE.Vector3(1, 1, 1); return this._scale; },
        configurable: true
      }
    });
  });

  it("registers animation loop and updates mesh", () => {
    let frameCallback: any;
    (useFrame as jest.Mock).mockImplementation((cb) => {
      frameCallback = cb;
    });

    const { container } = render(
      <BaseSphere
        color="#ff0000"
        animation={{
          rotation: { enabled: true, speed: 0.1, axis: 'y' },
          breathing: { enabled: true, rate: 1, amplitude: 0.1 },
          glow: { enabled: true, intensity: 1, pulseSpeed: 1 }
        }}
      />
    );

    const mesh = container.querySelector("mesh") as any;
    expect(mesh).toBeInTheDocument();

    // Run frame
    if (frameCallback) frameCallback({ clock: { elapsedTime: 0.25 } });

    // Verify rotation
    expect(mesh.rotation.y).toBeCloseTo(0.1);

    // Verify scale (breathing)
    // At t=0.25, rate=1 => sin(2*PI*0.25) = sin(PI/2) = 1.
    // scale = 1 + 1 * 0.1 = 1.1
    expect(mesh.scale.x).toBeCloseTo(1.1);
  });

  it("renders children via render prop", () => {
    const { getByTestId } = render(
      <BaseSphere color="red">
        {(meshRef, matRef) => <group data-testid="child-content" />}
      </BaseSphere>
    );
    expect(getByTestId("child-content")).toBeInTheDocument();
  });
});
