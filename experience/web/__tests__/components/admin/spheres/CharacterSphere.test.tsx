import { render, screen } from "@testing-library/react";
import { CharacterSphere } from "@/components/admin/spheres/CharacterSphere";
import React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// Mock R3F & Three
jest.mock("@react-three/fiber", () => ({
  ...jest.requireActual("@react-three/fiber"),
  Canvas: ({ children }: any) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: jest.fn(),
}));

jest.mock("@/components/admin/spheres/BaseSphere", () => ({
  StandardLighting: () => <group data-testid="standard-lighting" />,
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

describe("CharacterSphere", () => {
  // Patch Element prototype for R3F props
  beforeAll(() => {
    Object.defineProperties(window.Element.prototype, {
      position: {
        get() {
          if (!this._pos) this._pos = new THREE.Vector3();
          return this._pos;
        },
        configurable: true,
      },
      rotation: {
        get() {
          if (!this._rot) this._rot = new THREE.Euler();
          return this._rot;
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
    });
  });

  const mockEmotion: import("@/types/visualization").Emotion = {
    id: "1",
    name: "Joy",
    category: "joy",
    vac: [0.8, 0.5, 0.7],
    definition: "Happy",
    quaternion: [0, 0, 0, 1],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders canvas and wrapper", () => {
    render(<CharacterSphere emotion={mockEmotion} />);
    expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
    expect(screen.getByText("Joy")).toBeInTheDocument();
  });

  it("registers animation loop via inner component", () => {
    render(<CharacterSphere emotion={mockEmotion} />);
    expect(useFrame).toHaveBeenCalled();
  });
});
