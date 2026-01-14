
import { render, cleanup } from "@testing-library/react";
import React from "react";
import * as THREE from "three";
import { MysticalEmotionNode } from "@/components/admin/emotions/MysticalEmotionNode";
import { useFrame } from "@react-three/fiber";

// Mock R3F
jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

describe("MysticalEmotionNode", () => {
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
      opacity: {
        get() { return this._opacity || 1; },
        set(v) { this._opacity = v; },
        configurable: true,
      },
      material: {
        get() {
          if (!this._material) {
            this._material = {
              opacity: 1,
              color: new THREE.Color(),
              transparent: true,
            };
          }
          return this._material;
        },
        configurable: true,
      },
    });
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

  it("renders multiple layers", () => {
    const { container } = render(<MysticalEmotionNode {...defaultProps} />);
    const meshes = container.querySelectorAll("mesh");
    expect(meshes.length).toBeGreaterThanOrEqual(5);
  });

  it("animates all layers", () => {
    const { container } = render(<MysticalEmotionNode {...defaultProps} />);
    const meshes = container.querySelectorAll("mesh");

    const frameCallback = (useFrame as jest.Mock).mock.calls[0][0];

    // Run with elapsed time
    frameCallback({ clock: { elapsedTime: 1.0 } });

    let movedCount = 0;
    meshes.forEach((mesh: any) => {
      if (mesh.rotation.y !== 0 || mesh.rotation.x !== 0 || mesh.scale.x !== 1) {
        movedCount++;
      }
    });

    expect(movedCount).toBeGreaterThan(0);
  });

  it("shows selection glow when selected", () => {
    const { container } = render(<MysticalEmotionNode {...defaultProps} isSelected={true} />);
    const meshes = container.querySelectorAll("mesh");

    const { container: unselectedContainer } = render(<MysticalEmotionNode {...defaultProps} isSelected={false} />);
    const baseCount = unselectedContainer.querySelectorAll("mesh").length;

    expect(meshes.length).toBe(baseCount + 1);
  });
});
