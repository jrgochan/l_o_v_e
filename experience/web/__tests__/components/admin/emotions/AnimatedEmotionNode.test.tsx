
import { render, cleanup } from "@testing-library/react";
import React from "react";
import * as THREE from "three";
import { AnimatedEmotionNode } from "@/components/admin/emotions/AnimatedEmotionNode";
import { useFrame } from "@react-three/fiber";

// Mock R3F
jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
  ThreeEvent: {}
}));

// Mock Utils
jest.mock("@/utils/emotionAnimationMapper", () => ({
  getEmotionAnimationParams: jest.fn(),
}));

jest.mock("@/utils/modeVisualConfigs", () => ({
  getModeConfig: jest.fn((mode) => ({
    colors: { hueShift: 0, saturation: 1, lightness: 1 },
    materials: { metalness: 0.5, roughness: 0.5, transparent: false, opacityBase: 1 },
    animations: {
      floatEnabled: mode === "mystical" || mode === "dynamic",
      floatSpeed: 0.5,
      floatAmplitude: 0.5,
    },
  })),
  applyColorConfig: jest.fn((color) => color),
  calculateEmissiveIntensity: jest.fn(() => 0.5),
}));

import { getEmotionAnimationParams } from "@/utils/emotionAnimationMapper";

describe("AnimatedEmotionNode", () => {
  // Patch Element prototype for 3D properties
  beforeAll(() => {
    Object.defineProperties(window.Element.prototype, {
      position: {
        get() {
          if (!this._position) this._position = new THREE.Vector3();
          return this._position;
        },
        configurable: true,
      },
      rotation: {
        get() {
          if (!this._rotation) this._rotation = new THREE.Euler();
          return this._rotation;
        },
        configurable: true,
      },
      scale: {
        get() {
          if (!this._scale) this._scale = new THREE.Vector3(1, 1, 1);
          return this._scale;
        },
        configurable: true,
      },
      color: {
        get() {
          if (!this._color) this._color = new THREE.Color();
          return this._color;
        },
        configurable: true,
      },
      emissive: {
        get() {
          if (!this._emissive) this._emissive = new THREE.Color();
          return this._emissive;
        },
        configurable: true,
      },
      emissiveIntensity: {
        get() { return this._emissiveIntensity || 0; },
        set(v) { this._emissiveIntensity = v; },
        configurable: true,
      },
      opacity: {
        get() { return this._opacity || 1; },
        set(v) { this._opacity = v; },
        configurable: true,
      },
    });
  });

  const mockEmotion = {
    id: "joy",
    name: "Joy",
    vac: [0.8, 0.6, 0.7] as [number, number, number],
    category: "Positive",
    definition: "Happy",
    quaternion: [0, 0, 0, 1] as [number, number, number, number]
  };

  const defaultProps = {
    emotion: mockEmotion,
    color: new THREE.Color("red"),
    size: 1,
    isSelected: false,
    isHovered: false,
    isFocused: false,
    isNeighbor: false,
    mode: "dynamic" as const, // dynamic is valid
    onPointerOver: jest.fn(),
    onPointerOut: jest.fn(),
    onClick: jest.fn(),
  };

  const defaultAnimParams = {
    breathingRate: 1,
    breathingAmplitude: 0.1,
    rotationSpeed: 0.1,
    secondaryMotion: "stable",
    secondaryAmplitude: 0.2,
    glowPulseSpeed: 1,
    colorBoost: 1.0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    (getEmotionAnimationParams as jest.Mock).mockReturnValue(defaultAnimParams);
  });

  it("renders and registers frame loop", () => {
    const { container } = render(<AnimatedEmotionNode {...defaultProps} />);
    expect(container.querySelector("mesh")).toBeInTheDocument();
    expect(useFrame).toHaveBeenCalled();
  });

  describe("Secondary Motion logic", () => {
    it("handles ORBITAL motion", () => {
      (getEmotionAnimationParams as jest.Mock).mockReturnValue({
        ...defaultAnimParams,
        secondaryMotion: "orbital"
      });
      const { container } = render(<AnimatedEmotionNode {...defaultProps} />);
      const mesh = container.querySelector("mesh") as any;
      const frameCallback = (useFrame as jest.Mock).mock.calls[0][0];

      // x = sin(t*0.5)*amp, z = cos(t*0.5)*amp
      // Need cos to match -1, so t*0.5 = PI => t = 2 * PI
      frameCallback({ clock: { elapsedTime: Math.PI * 2 } });

      // Expected: x=0, z = -0.2
      expect(mesh.position.z).toBeCloseTo(-0.2);
    });

    it("handles RECOIL motion", () => {
      (getEmotionAnimationParams as jest.Mock).mockReturnValue({
        ...defaultAnimParams,
        secondaryMotion: "recoil"
      });
      const { container } = render(<AnimatedEmotionNode {...defaultProps} mode="subtle" />);
      const mesh = container.querySelector("mesh") as any;
      const frameCallback = (useFrame as jest.Mock).mock.calls[0][0];

      // y = -abs(sin(t*1.5)*amp)*0.5
      frameCallback({ clock: { elapsedTime: 1.0 } });
      expect(mesh.position.y).toBeLessThan(0); // Should be downward
    });

    it("handles REACHING motion", () => {
      (getEmotionAnimationParams as jest.Mock).mockReturnValue({
        ...defaultAnimParams,
        secondaryMotion: "reaching"
      });
      const { container } = render(<AnimatedEmotionNode {...defaultProps} />);
      const mesh = container.querySelector("mesh") as any;
      const frameCallback = (useFrame as jest.Mock).mock.calls[0][0];

      frameCallback({ clock: { elapsedTime: 1.0 } });
      // y = abs(reach)*0.3 -> Upward
      expect(mesh.position.y).toBeGreaterThan(0);
    });
  });

  describe("Mode specific logic", () => {
    it("Dynamic mode: applies jitter when arousal > 0.5", () => {
      const highArousalEmotion = { ...mockEmotion, vac: [0.8, 0.9, 0.7] as [number, number, number] };

      const { container } = render(
        <AnimatedEmotionNode {...defaultProps} emotion={highArousalEmotion} mode="dynamic" />
      );
      const mesh = container.querySelector("mesh") as any;
      const frameCallback = (useFrame as jest.Mock).mock.calls[0][0];

      mesh.position.set(0, 0, 0);
      frameCallback({ clock: { elapsedTime: 1.0 } });

      // Should have accumulated some jitter offsets
      expect(mesh.position.y).not.toBe(0);
      expect(mesh.position.x).not.toBe(0); // Jitter X
      expect(mesh.position.z).not.toBe(0); // Jitter Z
    });

    it("Mystical mode: applies figure-8 drift", () => {
      const { container } = render(<AnimatedEmotionNode {...defaultProps} mode="mystical" />);
      const mesh = container.querySelector("mesh") as any;
      const frameCallback = (useFrame as jest.Mock).mock.calls[0][0];

      frameCallback({ clock: { elapsedTime: 1.0 } });

      // Applies vertical float, horizontal, depth drift + rotation wobble
      expect(mesh.position.x).not.toBe(0);
      expect(mesh.position.y).not.toBe(0);
      expect(mesh.rotation.x).not.toBe(0); // Precession wobble
    });
  });

  describe("Interactive States", () => {
    it("Scales up on hover", () => {
      const { container } = render(<AnimatedEmotionNode {...defaultProps} isHovered={true} />);
      const mesh = container.querySelector("mesh") as any;
      const frameCallback = (useFrame as jest.Mock).mock.calls[0][0];

      frameCallback({ clock: { elapsedTime: 0 } });
      expect(mesh.scale.x).toBeGreaterThan(1.0);
    });

    it("Brightens glow on selection", () => {
      const { container } = render(<AnimatedEmotionNode {...defaultProps} isSelected={true} />);
      // Targeting material which receives the updates
      const material = container.querySelector("meshStandardMaterial") as any;
      const frameCallback = (useFrame as jest.Mock).mock.calls[0][0];

      frameCallback({ clock: { elapsedTime: 0 } });
      // Expected 1.0 (0.5 * 2.0)
      expect(material.emissiveIntensity).toBe(1.0);
    });

    it("Transparency logic for transparent modes", () => {
      // Override mock for this test
      (require("@/utils/modeVisualConfigs").getModeConfig as jest.Mock).mockReturnValue({
        colors: { hueShift: 0, saturation: 1, lightness: 1 },
        materials: { metalness: 0.5, roughness: 0.5, transparent: true, opacityBase: 0.5 },
        animations: {
          floatEnabled: false,
          floatSpeed: 0.5,
          floatAmplitude: 0.5,
        },
      });

      const { container } = render(<AnimatedEmotionNode {...defaultProps} mode="mystical" />);
      const material = container.querySelector("meshStandardMaterial") as any;
      const frameCallback = (useFrame as jest.Mock).mock.calls[0][0];

      // Run frame
      frameCallback({ clock: { elapsedTime: 0 } });

      // Logic: opacity = lerp(opacityBase*0.7, opacityBase, connectionFactor)
      // connectionFactor for 0.7 is (0.7+1)/2 = 0.85
      // lerp(0.35, 0.5, 0.85) = 0.35 + (0.15 * 0.85) = 0.35 + 0.1275 = 0.4775
      expect(material.opacity).toBeCloseTo(0.4775);
    });
  });
});
