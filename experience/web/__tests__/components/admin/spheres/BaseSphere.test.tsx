
import { render, cleanup, act } from "@testing-library/react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import React from 'react';
import { BaseSphere, getColorFromValence, getColorFromCategory, blendColors, StandardLighting } from "@/components/admin/spheres/BaseSphere";

// Mock R3F
jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
  extend: jest.fn(),
}));

describe("BaseSphere Component & Helpers", () => {

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'scale', {
      get() {
        if (!this._scale) this._scale = new THREE.Vector3(1, 1, 1);
        return this._scale;
      },
      configurable: true
    });
    Object.defineProperty(HTMLElement.prototype, 'rotation', {
      get() {
        if (!this._rotation) this._rotation = new THREE.Euler(0, 0, 0);
        return this._rotation;
      },
      configurable: true
    });
    Object.defineProperty(HTMLElement.prototype, 'emissiveIntensity', {
      get() { return this._emissiveIntensity || 0; },
      set(v) { this._emissiveIntensity = v; },
      configurable: true
    });
  });

  afterEach(cleanup);

  describe("BaseSphere", () => {
    // Basic rendering test
    it("renders without crashing", () => {
      render(<BaseSphere color="red" />);
    });
  });

  describe("Helpers", () => {
    it("getColorFromValence returns correct colors", () => {
      expect(getColorFromValence(0.6)).toBeInstanceOf(THREE.Color);
      expect(getColorFromValence(0.2)).toBeInstanceOf(THREE.Color);
      expect(getColorFromValence(0)).toBeInstanceOf(THREE.Color);
      expect(getColorFromValence(-0.2)).toBeInstanceOf(THREE.Color);
      expect(getColorFromValence(-0.6)).toBeInstanceOf(THREE.Color);
    });
    it("getColorFromCategory handles unknown", () => {
      const pal = { test: '#fff' };
      expect(getColorFromCategory('test', pal).getHexString()).toBe('ffffff');
      expect(getColorFromCategory('missing', pal).getHexString()).toBe('888888');
    });

    it("blendColors handles weights", () => {
      const c1 = new THREE.Color('red');
      const c2 = new THREE.Color('blue');
      expect(blendColors([c1, c2], [0.5, 0.5]).r).toBeCloseTo(0.5);
      expect(blendColors([], []).getHexString()).toBe('fbbf24');
      expect(blendColors([c1], [0]).getHexString()).toBe('fbbf24');
      expect(blendColors([c1], []).r).toBe(1);
    });

    it("StandardLighting renders", () => {
      const { container } = render(<StandardLighting />);
      expect(container).toBeDefined();
    });
  });

  describe("BaseSphere Animation", () => {
    it("executes animation loop branches correctly (Sequential)", () => {
      let frameCallback: any;
      (useFrame as jest.Mock).mockImplementation((cb) => {
        frameCallback = cb;
      });

      // 1. Test X Axis & Breathing & Glow explicitly enabled
      const { container: containerX, unmount: unmountX } = render(
        <BaseSphere
          color="red"
          animation={{
            breathing: { enabled: true, rate: 1, amplitude: 0.1 },
            rotation: { enabled: true, speed: 0.1, axis: 'x' },
            glow: { enabled: true, intensity: 1, pulseSpeed: 1 }
          }}
        />
      );

      const meshNodeX = containerX.querySelector("mesh") as any;
      expect(meshNodeX).toBeDefined();

      // Execute frame inside act
      if (frameCallback) {
        act(() => {
          // Use 0.25 to hit max amplitude of Sin(2PI * 0.25 / 1) = Sin(PI/2) = 1
          frameCallback({ clock: { elapsedTime: 0.25 } }, 1.0);
        });
      }

      // Assertions
      expect(meshNodeX.rotation.x).toBeCloseTo(0.1); // Rotation X
      expect(meshNodeX.scale.x).not.toBe(1); // Breathing should change scale from 1
      expect(meshNodeX._emissiveIntensity).not.toBe(0); // Glow should set intensity

      unmountX();
      frameCallback = null;

      // 2. Test Y Axis
      const { container: containerY, unmount: unmountY } = render(
        <BaseSphere color="blue" animation={{ rotation: { enabled: true, speed: 0.1, axis: 'y' } }} />
      );
      if (frameCallback) act(() => frameCallback({ clock: { elapsedTime: 0.5 } }, 1.0));
      const meshNodeY = containerY.querySelector("mesh") as any;
      expect(meshNodeY.rotation.y).toBeCloseTo(0.1);
      unmountY();
      frameCallback = null;

      // 3. Test Z Axis
      const { container: containerZ, unmount: unmountZ } = render(
        <BaseSphere color="green" animation={{ rotation: { enabled: true, speed: 0.1, axis: 'z' } }} />
      );
      if (frameCallback) act(() => frameCallback({ clock: { elapsedTime: 0.5 } }, 1.0));
      const meshNodeZ = containerZ.querySelector("mesh") as any;
      expect(meshNodeZ.rotation.z).toBeCloseTo(0.1);
      unmountZ();
    });

    it("handles disabled animations (Branch Coverage)", () => {
      let frameCallback: any;
      (useFrame as jest.Mock).mockImplementation((cb) => {
        frameCallback = cb;
      });

      const { container } = render(
        <BaseSphere
          color="red"
          animation={{
            // Provide dummy values for required props even if disabled
            breathing: { enabled: false, rate: 1, amplitude: 1 },
            rotation: { enabled: false, speed: 1, axis: 'y' },
            glow: { enabled: false, intensity: 1, pulseSpeed: 1 }
          }}
        />
      );

      const mesh = container.querySelector("mesh") as any;

      // Run frame
      if (frameCallback) {
        act(() => {
          frameCallback({ clock: { elapsedTime: 1 } }, 1.0);
        });
      }

      // Assert that nothing changed from defaults
      expect(mesh.scale.x).toBe(1);
      expect(mesh.rotation.x).toBe(0);
      expect(mesh.emissiveIntensity).toBe(0);
    });

    it("handles guard clause (missing refs)", () => {
      let frameCallback: any;
      (useFrame as jest.Mock).mockImplementation((cb) => {
        frameCallback = cb;
      });

      const { unmount } = render(<BaseSphere color="red" />);
      unmount();

      if (frameCallback) {
        expect(() => frameCallback({ clock: { elapsedTime: 1 } })).not.toThrow();
      }
    });

    it("renders children and accepts object color", () => {
      const { getByTestId } = render(
        <BaseSphere color={new THREE.Color('blue')}>
          {(mesh, mat) => <group data-testid="child" />}
        </BaseSphere>
      );
      expect(getByTestId("child")).toBeInTheDocument();
    });
  });
});
