
import { render, cleanup } from "@testing-library/react";
import React from "react";
import * as THREE from "three";
import { AnimatedEmotionNode } from "@/components/admin/emotions/AnimatedEmotionNode";
import { useFrame } from "@react-three/fiber";

// Mock R3F
jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

// Mock Utils
jest.mock("@/utils/emotionAnimationMapper", () => ({
  getEmotionAnimationParams: jest.fn(() => ({
    breathingRate: 1,
    breathingAmplitude: 0.1,
    rotationSpeed: 0.1,
    secondaryMotion: "orbital",
    secondaryAmplitude: 0.2,
    glowPulseSpeed: 1,
    colorBoost: 1.0,
  })),
}));

jest.mock("@/utils/modeVisualConfigs", () => ({
  getModeConfig: jest.fn((mode) => ({
    colors: {
      hueShift: 0,
      saturation: 1,
      lightness: 1,
    },
    materials: {
      metalness: 0.5,
      roughness: 0.5,
      transparent: false,
      opacityBase: 1,
    },
    animations: {
      floatEnabled: mode === "mystical" || mode === "dynamic",
      floatSpeed: 0.5,
      floatAmplitude: 0.5,
    },
  })),
  applyColorConfig: jest.fn((color) => color),
  calculateEmissiveIntensity: jest.fn(() => 0.5),
}));

describe("AnimatedEmotionNode", () => {
  // Patch Element prototype for 3D properties
  beforeAll(() => {
    // We patch Element to be safe for all node types
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

  afterAll(() => {
    // Cleanup would go here
  });

  const mockEmotion = {
    id: "joy",
    name: "Joy",
    vac: [0.8, 0.6, 0.7],
    category: "joy",
    description: "Happy"
  };

  const defaultProps = {
    emotion: mockEmotion,
    color: new THREE.Color("yellow"),
    size: 1,
    mode: "scientific",
    isSelected: false,
    isHovered: false,
    onClick: jest.fn(),
    onPointerOver: jest.fn(),
    onPointerOut: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  it("renders and registers frame loop", () => {
    const { container } = render(<AnimatedEmotionNode {...defaultProps} />);
    expect(container.querySelector("mesh")).toBeInTheDocument();
    expect(useFrame).toHaveBeenCalled();
  });

  it("animates on frame loop", () => {
    const { container } = render(<AnimatedEmotionNode {...defaultProps} />);
    const meshElement = container.querySelector("mesh") as any;

    // Ensure values are fresh
    meshElement.position.set(0, 0, 0);
    meshElement.rotation.set(0, 0, 0);
    meshElement.scale.set(1, 1, 1);

    // Capture frame callback
    const frameCallback = (useFrame as jest.Mock).mock.calls[0][0];

    // Run callback
    frameCallback({ clock: { elapsedTime: 1.0 } });

    // Verify updates
    expect(meshElement.rotation.y).not.toBe(0);
    expect(meshElement.scale.x).not.toBe(1);
  });

  it("handles visibility logic for mystical/dynamic modes", () => {
    // Just verify it doesn't crash when logic runs
    const { container } = render(<AnimatedEmotionNode {...defaultProps} mode="mystical" />);
    const frameCallback = (useFrame as jest.Mock).mock.calls[0][0];
    frameCallback({ clock: { elapsedTime: 1.0 } });

    const meshElement = container.querySelector("mesh") as any;
    // Logic checks floatEnabled
    expect(meshElement.rotation.x).not.toBe(0); // Mystical adds wobbling
  });
});
